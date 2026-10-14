// 양쪽 기기에서 같은 작품을 고쳤을 때 카드 · 인물 단위로 합치기 (3-way: 마지막으로 맞춘 버전 · 이 기기 · 다른 기기)
//   한쪽만 바꾼 것    → 바꾼 쪽
//   새로 생긴 것      → 둘 다 넣음
//   한쪽이 지운 것    → 다른 쪽이 안 고쳤으면 지움, 고쳤으면 남김 (고친 글을 잃지 않게)
//   같은 글을 둘 다 고침 → 일단 이 기기 것, 다른 기기 것은 conflicts 로 돌려줘서 사용자가 고르게
//   자리 · 크기 같은 나머지 → 이 기기 것 (z 는 큰 쪽)
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function eq(a,b){
  if(a===b)return true;
  if(typeof a!==typeof b||a===null||b===null||typeof a!=='object')return false;
  if(Array.isArray(a)!==Array.isArray(b))return false;
  if(Array.isArray(a))return a.length===b.length&&a.every((x,i)=>eq(x,b[i]));
  const ka=Object.keys(a).filter(k=>a[k]!==undefined),kb=Object.keys(b).filter(k=>b[k]!==undefined);
  return ka.length===kb.length&&ka.every(k=>eq(a[k],b[k]));
}
const keyOf=x=>isObj(x)?(x.id!=null?String(x.id):x.label!=null?'label:'+x.label:null):null;
const keyed=arr=>{const m=new Map();for(const x of arr){const k=keyOf(x);if(k==null||m.has(k))return null;m.set(k,x)}return m};
const prim=arr=>arr.every(x=>x===null||typeof x!=='object')&&new Set(arr).size===arr.length;
const NO_ASK=new Set(['settings','trash']);      // 취향 · 휴지통은 묻지 않고 이 기기 것

function merge3(base,local,remote,path,out){
  if(eq(local,remote))return local;
  if(eq(base,local))return remote;
  if(eq(base,remote))return local;
  if(local===undefined)return remote;      // 한쪽은 지우고 한쪽은 고침: 고친 쪽을 남김
  if(remote===undefined)return local;
  if(isObj(local)&&isObj(remote)){
    const b=isObj(base)?base:{},o={};
    for(const k of new Set([...Object.keys(local),...Object.keys(remote)])){
      const v=merge3(b[k],local[k],remote[k],[...path,k],out);
      if(v!==undefined)o[k]=v;
    }
    return o;
  }
  if(Array.isArray(local)&&Array.isArray(remote)){
    const b=Array.isArray(base)?base:[];
    const L=keyed(local),R=keyed(remote),B=keyed(b)||new Map();
    if(L&&R){      // 카드 · 인물 · 화처럼 id 가 있는 목록: 하나씩 합침 (순서는 이 기기 것, 새로 생긴 건 뒤에)
      const o=[];
      for(const k of [...L.keys(),...[...R.keys()].filter(k=>!L.has(k))]){
        const v=merge3(B.get(k),L.get(k),R.get(k),[...path,k],out);
        if(v!==undefined)o.push(v);
      }
      return o;
    }
    if(prim(local)&&prim(remote)){      // 화에 든 카드 목록 같은 것: 더한 건 더하고 뺀 건 뺌
      const bs=new Set(b),ls=new Set(local),rs=new Set(remote);
      const keep=local.filter(x=>!(bs.has(x)&&!rs.has(x)));
      return [...keep,...remote.filter(x=>!ls.has(x)&&!bs.has(x))];
    }
  }
  if(path[path.length-1]==='z'&&typeof local==='number'&&typeof remote==='number')return Math.max(local,remote);
  if(typeof local==='string'&&typeof remote==='string'&&!NO_ASK.has(path[0]))out.push({path,mine:local,theirs:remote});
  return local;
}

/* 고를 때 보여 줄 이름: "카드 · 짜증나는군…" / "조균 · 한 줄 소개" */
const TOP={cards:'카드',characters:'인물',episodes:'화',work:'작품 노트',kinds:'분류',folders:'폴더',shelves:'보관 칸',links:'연결',relTags:'관계 종류'};
const FIELD={fields:'',goals:'목표',summary:'소개',memo:'메모',name:'이름',title:'제목',longGoal:'긴 목표',role:'역할',note:'메모',text:'',value:''};
const snip=t=>{t=String(t||'').replace(/\s+/g,' ').trim();return t.length>24?t.slice(0,24)+'…':t};
function findIn(arr,k){return Array.isArray(arr)?arr.find(x=>keyOf(x)===k):arr&&arr[k]}
function describe(state,c){
  const [top,id]=c.path,item=findIn(state[top],id),field=c.path[c.path.length-1];
  if(top==='cards')return `카드 · ${snip(c.mine)||snip(c.theirs)||'(빈 카드)'}`;
  const name=item&&(item.name||item.title||item.label);
  const sub=c.path.length>2?c.path.slice(2).map(k=>{const s=String(k);return s.startsWith('label:')?s.slice(6):s}).filter(s=>!/^[a-z0-9]{8}$/.test(s)).map(s=>s in FIELD?FIELD[s]:s).filter(Boolean).join(' · '):'';
  return [TOP[top]||top,name,sub].filter(Boolean).join(' · ');
}

/* 작품 데이터 셋을 합침: {merged, conflicts:[{path,mine,theirs,label}]} — 고를 것은 merged.syncConflicts 에도 넣어 둠 */
function mergeWork(base,local,remote,newId){
  const out=[];
  const merged=merge3(base||{},local,remote,[],out);
  const list=(merged.syncConflicts||[]).filter(x=>!out.some(c=>eq(c.path,x.path)));
  const fresh=out.map(c=>({id:newId(),path:c.path,mine:c.mine,theirs:c.theirs,label:describe(merged,c),at:Date.now()}));
  merged.syncConflicts=[...list,...fresh];
  if(!merged.syncConflicts.length)delete merged.syncConflicts;
  return {merged,conflicts:fresh};
}
module.exports={merge3,mergeWork,eq};
