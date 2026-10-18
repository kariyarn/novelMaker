/* ---------- 관계망: 포스트잇에 함께 나온 횟수로 자동 계산 (노드 스타일 / 원형 스타일) ---------- */
/* 관계 종류: 선의 색 · 모양 · 라벨 (굵기는 그대로 '함께 나온 횟수') — 색이 잘 안 보여도 구분되게 점선 · 이중선도 씀
   한 사이에 관계를 여러 개 (예: 적대 + 애증) · camp 는 진영 나누기용 (+1 같은 편 · -1 적 · 0 어느 쪽도 아님) */
const RELG=[['우호','#4fb286'],['애정','#d9739a'],['인연','#8d7be0'],['대립','#e2675a'],['복합','#c48a2c']];
const RELT=[
  {k:'trust',l:'신뢰',g:'우호',c:'#5b8def',camp:1},
  {k:'ally',l:'협력',g:'우호',c:'#4fb286',camp:1},
  {k:'friend',l:'우정',g:'우호',c:'#3fb0c4',camp:1},
  {k:'comrade',l:'동료',g:'우호',c:'#6aa84f',camp:1,d:[8,3]},
  {k:'respect',l:'존경',g:'우호',c:'#2f8f9d',camp:1,d:[1,3]},
  {k:'love',l:'호감',g:'애정',c:'#e58fb0',camp:1},
  {k:'lover',l:'연인',g:'애정',c:'#d9467a',camp:1,dbl:true},
  {k:'crush',l:'짝사랑',g:'애정',c:'#e58fb0',camp:0,d:[6,4]},
  {k:'family',l:'가족',g:'인연',c:'#8d7be0',camp:1,dbl:true},
  {k:'mentor',l:'사제',g:'인연',c:'#7a5cc7',camp:1,d:[8,3]},
  {k:'lord',l:'주종',g:'인연',c:'#5d4fa8',camp:1,d:[1,3]},
  {k:'debt',l:'은혜',g:'인연',c:'#a58fd8',camp:0,d:[6,4]},
  {k:'hostile',l:'적대',g:'대립',c:'#e2675a',camp:-1},
  {k:'grudge',l:'원한',g:'대립',c:'#b8322a',camp:-1,dbl:true},
  {k:'rival',l:'라이벌',g:'대립',c:'#e8833d',camp:0,d:[8,3]},
  {k:'wary',l:'경계',g:'대립',c:'#e8a33d',camp:0,d:[6,5]},
  {k:'jealous',l:'질투',g:'대립',c:'#c9a227',camp:0,d:[1,3]},
  {k:'scorn',l:'멸시',g:'대립',c:'#9a5b4f',camp:-1,d:[6,4]},
  {k:'lovehate',l:'애증',g:'복합',c:'#b0457a',camp:0,dbl:true},
  {k:'use',l:'이용',g:'복합',c:'#8a8f98',camp:0,d:[2,4]},
  {k:'deal',l:'거래',g:'복합',c:'#9aa84a',camp:0,d:[8,3]},
  {k:'secret',l:'비밀',g:'복합',c:'#6b6f78',camp:0,d:[1,3]},
  {k:'subtle',l:'미묘',g:'복합',c:'#a3a7ae',camp:0,d:[6,4]}];
const RELC=['#5b8def','#4fb286','#d9467a','#8d7be0','#e2675a','#e8a33d','#3fb0c4','#9aa84a','#c76fd6','#6b6f78'];      // 직접 만든 관계 색 차례
const RELT0=[];
let RELC_={src:null,n:-1,all:null,by:null};      // 관계 종류 목록 캐시: 선마다 · 프레임마다 새로 만들지 않게 (직접 만든 관계를 더하거나 지우면 다시)
function relCache(){
  const tags=(S&&S.relTags)||RELT0;
  if(RELC_.all&&RELC_.src===tags&&RELC_.n===tags.length)return RELC_;
  const all=[...RELT,...tags.map(t=>({...t,g:'직접',camp:t.camp||0,mine:true}))];
  RELC_={src:tags,n:tags.length,all,by:new Map(all.map(t=>[t.k,t]))};return RELC_;
}
const relAll=()=>relCache().all.slice();
const relT=k=>relCache().by.get(k)||null;
const relOf=(from,to)=>{const e=charById(from);return e&&(e.relations||[]).find(r=>r.to===to)||null};      // from 이 보는 to
const relTs=r=>r&&Array.isArray(r.types)?r.types.filter(k=>relT(k)):[];      // 그 방향의 관계들 (없어진 종류는 빼고)
const relSet=(from,to,f)=>{const e=charById(from);if(!e)return;e.relations=e.relations||[];let r=e.relations.find(x=>x.to===to);
  if(!r){r={id:uid(),to,note:''};e.relations.push(r)}r.types=Array.isArray(r.types)?r.types:[];f(r);if(!r.types.length)delete r.types;
  if(!r.types&&!(r.note||'').trim()&&!r.stage)e.relations=e.relations.filter(x=>x!==r)};      // 종류도 메모도 없으면 지움
const relTog=(list,k)=>list.includes(k)?list.filter(x=>x!==k):[...list,k];      // 누른 순서대로 쌓임 (첫 번째가 선 색)
const relCamp=ts=>{const cs=ts.map(k=>(relT(k)||{}).camp||0),host=cs.includes(-1),fr=cs.includes(1);return host&&!fr?-1:fr&&!host?1:0};
const iga=n=>{const c=String(n).charCodeAt(String(n).length-1);return n+(c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?'이':'가')};      // 받침 따라 이/가
const relSelEl=(val,fn,cls)=>{      // 관계 고르는 드롭다운 (묶음별)
  const s=h('select',{class:cls||'',onchange:e=>fn(e.target.value)});s.append(h('option',{value:'all',selected:!val},'관계: 전체'));
  const gs=[...RELG.map(g=>g[0]),'직접'];gs.forEach(g=>{const ts=relAll().filter(t=>t.g===g);if(!ts.length)return;const og=h('optgroup',{label:g});ts.forEach(t=>og.append(h('option',{value:t.k,selected:t.k===val},t.l+'만')));s.append(og)});
  return s};
/* 선을 눌렀을 때: 둘 사이 관계 정하기 (여러 개 · 기본은 양쪽 같이 · 필요하면 방향마다 따로) */
function relEditor(a,b,cx,cy){
  closePop();
  const A=charById(a),B=charById(b);if(!A||!B)return;
  const m=h('div',{class:'pop grel'});let split=null,side=0;
  const chips=(cur,fn)=>{
    const box=h('div',{class:'grgrid'});
    [...RELG.map(g=>g[0]),'직접'].forEach(g=>{const ts=relAll().filter(t=>t.g===g);
      box.append(h('div',{class:'grg'},h('span',{class:'grgl'},g),h('div',{class:'grchips'},
        ...ts.map(t=>{const i=cur.indexOf(t.k);return h('button',{class:'grc'+(i>=0?' on':''),style:`--rc:${t.c}`,title:t.mine?'직접 만든 관계 · 오른쪽 클릭으로 지우기':'',
          oncontextmenu:t.mine?async e=>{e.preventDefault();if(!await askConfirm(`'${t.l}' 관계를 목록에서 지울까요?\n이 관계를 붙인 선에서도 함께 빠져요. 되돌리기(⌘Z)로 복구할 수 있어요.`,{ok:'지우기',danger:true}))return;
            act(()=>{S.relTags=S.relTags.filter(x=>x.k!==t.k);S.characters.forEach(c=>(c.relations||[]).forEach(r=>{if(r.types){r.types=r.types.filter(x=>x!==t.k);if(!r.types.length)delete r.types}}))});build()}:null,
          onclick:()=>fn(relTog(cur,t.k))},t.l,cur.length>1&&i>=0?h('small',{},String(i+1)):null)}),
        g==='직접'?h('button',{class:'grc grc0',title:'목록에 없는 관계를 직접 만들어요',onclick:async()=>{const l=((await askText('새 관계 이름 (예: 맞수, 의형제, 정략혼)'))||'').trim();if(!l)return;
          const ex=relAll().find(t=>t.l===l);if(ex){fn(cur.includes(ex.k)?cur:[...cur,ex.k]);return}
          const k='u_'+uid(),c=RELC[(S.relTags||[]).length%RELC.length];act(()=>{S.relTags=S.relTags||[];S.relTags.push({k,l,c})});fn([...cur,k]);if(!m.isConnected)relEditor(a,b,cx,cy)}},'＋ 직접 추가'):null)))});      // 이름 묻는 창을 닫으며 이 창도 닫혔으면 다시 엶
    box.append(h('div',{class:'grfoot'},cur.length>1?h('span',{class:'muted'},'숫자: 고른 순서 · 1번 색으로 선을 그려요'):h('span'),h('button',{class:'grc grc0'+(!cur.length?' on':''),title:'관계 모두 지우기',onclick:()=>fn([])},'미정')));
    return box};
  const build=()=>{
    const ta=relTs(relOf(a,b)),tb=relTs(relOf(b,a)),same=ta.join()===tb.join();
    if(split===null)split=!same;
    const setBoth=ks=>{act(()=>{relSet(a,b,r=>r.types=ks.slice());relSet(b,a,r=>r.types=ks.slice())});build()};
    const setOne=(x,y)=>ks=>{act(()=>relSet(x,y,r=>r.types=ks));build()};
    const note=(x,y,lab)=>{const r=relOf(x,y);return h('label',{class:'grn'},h('span',{},lab),h('input',{value:r&&r.note||'',placeholder:'한 줄 메모 (예: 가문의 원수)',
      oninput:e=>edit(()=>relSet(x,y,r=>r.note=e.target.value)),onchange:()=>commit(),onkeydown:e=>{if(e.key==='Enter'&&!e.isComposing)e.target.blur();if(e.key==='Escape')closePop()}}))};
    m.replaceChildren(h('div',{class:'ptitle'},`${A.name} ↔ ${B.name}`,h('span',{class:'grhint'},'여러 개 골라도 돼요')),
      ...(split?[h('div',{class:'seg grtabs'},...[[a,b,ta],[b,a,tb]].map(([x,y,ts],i)=>h('button',{class:side===i?'on':'',onclick:()=>{side=i;build()}},`${charById(x).name} → ${charById(y).name}`,ts.length?h('small',{},' '+ts.map(k=>relT(k).l).join('·')):null))),
          side?chips(tb,setOne(b,a)):chips(ta,setOne(a,b))]      // 방향마다: 탭으로 한쪽씩 (창이 길어지지 않게)
        :[chips(ta.length?ta:tb,setBoth)]),
      h('button',{class:'grsplit',onclick:()=>{split=!split;build()}},split?'양쪽 같은 관계로':'방향마다 다르게 (예: 한쪽만 짝사랑)'),
      h('div',{class:'psep'}),note(a,b,`${iga(A.name)} 보는 ${B.name}`),note(b,a,`${iga(B.name)} 보는 ${A.name}`));
  };
  build();document.body.append(m);
  m.style.left=Math.max(8,Math.min(innerWidth-m.offsetWidth-8,cx-m.offsetWidth/2))+'px';
  m.style.top=Math.max(8,cy+12+m.offsetHeight>innerHeight-8?cy-12-m.offsetHeight:cy+12)+'px';
  POP=m;
}
function graphData(upTo){
  const type=UIP.gtype||'all';
  const ents=S.characters.filter(e=>type==='all'||(type==='setting'?e.kind==='setting':e.kind!=='setting'));
  const idset=new Set(ents.map(e=>e.id)),cnt={},eps={},pc={},pe={};
  const key=(a,b)=>a<b?a+'|'+b:b+'|'+a;
  const pairs=(ids,map)=>{for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const k=key(ids[i],ids[j]);map[k]=(map[k]||0)+1}};
  const episodes=upTo==null?S.episodes:S.episodes.slice(0,upTo);      // 시점: N화까지 (없으면 포스트잇 전부)
  const cards=upTo==null?S.cards:[...new Set(episodes.flatMap(ep=>ep.cardIds))].map(cardById).filter(Boolean);
  cards.forEach(c=>{if(c.discarded)return;const ids=eff(c).filter(id=>idset.has(id));ids.forEach(id=>cnt[id]=(cnt[id]||0)+1);pairs(ids,pc)});
  episodes.forEach(ep=>{const set=new Set();ep.cardIds.forEach(id=>{const c=cardById(id);if(c&&!c.discarded)eff(c).forEach(x=>{if(idset.has(x))set.add(x)})});
    [...set].forEach(id=>eps[id]=(eps[id]||0)+1);pairs([...set],pe)});
  const nodes=ents.filter(e=>cnt[e.id]>0).map(e=>({id:e.id,e,n:cnt[e.id],eps:eps[e.id]||0}));
  const ok=new Set(nodes.map(n=>n.id)),edges=[];
  const ks=new Set([...Object.keys(pc),...Object.keys(pe)]);
  ents.forEach(e=>(e.relations||[]).forEach(r=>{if(relTs(r).length&&ok.has(e.id)&&ok.has(r.to)&&r.to!==e.id)ks.add(key(e.id,r.to))}));      // 관계를 정해 두면 함께 나온 적이 없어도 가는 선으로
  ks.forEach(k=>{const [a,b]=k.split('|');if(!ok.has(a)||!ok.has(b))return;
    const ta=relTs(relOf(a,b)),tb=relTs(relOf(b,a));      // 한쪽만 정했으면 양쪽 같은 관계로 봄
    edges.push({a,b,w:(pc[k]||0)+.5*(pe[k]||0),cards:pc[k]||0,eps:pe[k]||0,sa:ta.length?ta:tb,sb:tb.length?tb:ta,typed:!!(ta.length||tb.length)})});
  return {nodes,edges};
}
const hashN=s=>{let h2=2166136261;for(const ch of s)h2=Math.imul(h2^ch.charCodeAt(0),16777619);return ((h2>>>0)%10000)/10000};
const GC={pos:{},view:null,playT:0,reset(){clearInterval(this.playT);this.playT=0;this.pos={};this.view=null}};      // 관계망 안에서 다시 그려도 노드 위치 · 화면을 이어가기 위한 기억
const GPAL=['#e8a33d','#4fb286','#5b8def','#c76fd6','#e2675a','#3fb0c4','#9aa84a','#d98aa0','#8d7be0','#c58b5a'];
const graphColor=n=>{const e=n.e;if(e.kind!=='setting')return e.color;const f=folderOf(e);return f&&f!=='f_setting'?GPAL[Math.floor(hashN(f)*GPAL.length)]:'#8a8f98'};      // 설정 노드는 소속 폴더 색
/* 힘으로 자리 잡기: 함께 나온 횟수 = 당기는 힘 · 포스트잇이 많은 노드 = 중력이 세서 중앙 쪽 */
function graphSim(nodes,edges,style,opts={}){
  const circle=style==='circle',N=nodes.length,by={};
  const maxN=Math.max(1,...nodes.map(n=>n.n));
  nodes.forEach(n=>{
    n.r=circle?Math.min(46,9+5.2*Math.sqrt(n.n)):Math.min(15,3.4+2.1*Math.sqrt(n.n));
    n.mass=Math.pow(n.n/maxN,.85);
    const c=GC.pos[n.id];
    if(c){n.x=c[0];n.y=c[1]}else{const a=hashN(n.id)*Math.PI*2,d=8+hashN(n.id+'r')*26;n.x=Math.cos(a)*d;n.y=Math.sin(a)*d}
    n.vx=0;n.vy=0;n.fx=0;by[n.id]=n});
  const E=edges.map(e=>({a:by[e.a],b:by[e.b],w:e.w,camp:e.camp||0}));
  nodes.forEach(n=>n.ws=0);E.forEach(e=>{e.a.ws+=e.w;e.b.ws+=e.w});
  const known=nodes.filter(n=>GC.pos[n.id]).length;
  const sim={nodes,E,alpha:known>N*.6?.55:1,circle,center:opts.center||null};
  sim.step=()=>{
    const al=sim.alpha;
    for(let i=0;i<N;i++){const A=nodes[i];
      for(let j=i+1;j<N;j++){const B=nodes[j];let dx=B.x-A.x,dy=B.y-A.y,d2=dx*dx+dy*dy+.01,d=Math.sqrt(d2);
        const minD=A.r+B.r+(circle?.6:7);
        if(d<minD){const f=(minD-d)/d*.5;if(!A.fx){A.x-=dx*f;A.y-=dy*f}if(!B.fx){B.x+=dx*f;B.y+=dy*f}}
        if(d<900){const k=(circle?1400:3400+(A.r+B.r)*60)/d2*al;dx/=d;dy/=d;if(!A.fx){A.vx-=dx*k;A.vy-=dy*k}if(!B.fx){B.vx+=dx*k;B.vy+=dy*k}}}}
    sim.E.forEach(e=>{let dx=e.b.x-e.a.x,dy=e.b.y-e.a.y,d=Math.hypot(dx,dy)+.01;
      let L=circle?(e.a.r+e.b.r+Math.max(0,150-52*e.w)):(26+e.a.r+e.b.r+170/(1+e.w*.8)),st=Math.min(1,.28+e.w*.22);
      if(e.camp<0){L=L*1.8+(circle?140:200);st=Math.max(st,.5)}else if(e.camp>0){L*=.75;st=Math.max(st,.45)}      // 진영: 적대는 멀리 · 같은 편은 가까이
      const k=(d-L)*(circle?.05:.045)*st*al;dx/=d;dy/=d;
      if(!e.a.fx){e.a.vx+=dx*k;e.a.vy+=dy*k}if(!e.b.fx){e.b.vx-=dx*k;e.b.vy-=dy*k}});
    if(!circle&&sim.E.length<=N*4)sim.E.forEach(e=>{      // 선이 상관없는 노드를 뚫고 지나가지 않게 (선이 너무 빽빽하면 모두 바깥으로 밀려나니 하지 않음): 선 가까이 있는 노드는 옆으로 비키고, 선 양 끝은 반대로 조금
      const A=e.a,B=e.b,dx=B.x-A.x,dy=B.y-A.y,L2=dx*dx+dy*dy;if(L2<1)return;
      const x0=Math.min(A.x,B.x)-40,x1=Math.max(A.x,B.x)+40,y0=Math.min(A.y,B.y)-40,y1=Math.max(A.y,B.y)+40;
      for(let i=0;i<N;i++){const n=nodes[i];if(n===A||n===B||n.x<x0||n.x>x1||n.y<y0||n.y>y1)continue;
        const t=((n.x-A.x)*dx+(n.y-A.y)*dy)/L2;if(t<=.03||t>=.97)continue;
        let ox=n.x-(A.x+t*dx),oy=n.y-(A.y+t*dy),d=Math.hypot(ox,oy);const minD=n.r+20;if(d>=minD)continue;
        if(d<.01){ox=-dy;oy=dx;d=Math.hypot(ox,oy)}
        const p=(minD-d)/d*.8;if(!n.fx){n.x+=ox*p;n.y+=oy*p}
        const q=p*.5;if(!A.fx){A.x-=ox*q*(1-t);A.y-=oy*q*(1-t)}if(!B.fx){B.x-=ox*q*t;B.y-=oy*q*t}}});
    nodes.forEach(n=>{if(n.fx)return;
      const g=(circle?.006:.0045)+(circle?.02:.016)*n.mass+(sim.center&&n.id===sim.center?.08:0);      // 큰 노드일수록 중력이 세서 가운데로
      n.vx-=n.x*g*al;n.vy-=n.y*g*al;n.vx*=.74;n.vy*=.74;n.x+=n.vx;n.y+=n.vy});
    sim.alpha=Math.max(.015,sim.alpha*.9895);
  };
  return sim;
}
/* 관계망 (Canvas): 노드가 수백 개여도 부드럽게 */
function renderGraph(m){
  const offs={push:onMidClear};      // document 에 건 것들은 가운데 화면을 다시 그리거나 다른 화면으로 갈 때 뗌 (다시 그릴 때마다 쌓이지 않게)
  const style=UIP.gstyle==='circle'?'circle':'node',type=UIP.gtype||'all',local=UIP.gscope==='local',depth=Math.max(1,Math.min(3,UIP.gdepth||1));
  const nEp=S.episodes.length;let tpos=nEp?Math.max(1,Math.min(nEp+1,UIP.gtime||nEp+1)):1;
  const cs=getComputedStyle(document.documentElement),CV=n=>cs.getPropertyValue(n).trim();
  const col={sub:CV('--sub')||'#888',ink:CV('--ink')||'#222',bg:CV('--bg')||'#fff',acc:CV('--acc')||'#0a84ff'};
  const wrap=h('div',{class:'gview'}),canvas=h('canvas',{class:'gcv'}),box=h('div',{class:'gbox'},canvas),info=h('div',{class:'ginfo',hidden:true}),tip=h('div',{class:'gtip',hidden:true});
  m.append(wrap);
  let nodes=[],vis=[],allE=[],sim=null,byId={},centerId=null,search='',sel1=null,hov=null,raf=0,auto=!GC.view||!!GC.playT,dragN=null,t0=performance.now(),dpr=1,Wd=800,Hh=600;
  const view=GC.view?{...GC.view,tk:GC.view.k,anc:null,tc:null}:{cx:0,cy:0,k:.7,tk:.7,anc:null,tc:null};
  const strLab=h('span',{class:'gstr'}),tlab=h('span',{class:'gstr gtl'}),minIn=h('input',{type:'range',min:1,max:2,step:1,style:'width:96px;padding:0;background:transparent'}),tIn=h('input',{type:'range',min:1,max:Math.max(2,nEp+1),step:1,style:'width:min(340px,40vw);padding:0;background:transparent'});
  const kick=()=>{if(!raf)raf=requestAnimationFrame(loop)};
  const near=id=>{const s=new Set([id]);vis.forEach(e=>{if(e.a===id)s.add(e.b);if(e.b===id)s.add(e.a)});return s};
  /* ---- 데이터 → 노드 · 선 (시점 · 세기 · 핵심 · 로컬 반영) ---- */
  let maxI=1,relN=null,hovE=null;
  const grel=relT(UIP.grel)?UIP.grel:null;
  function rebuild(){
    const upTo=(nEp&&tpos<=nEp)?tpos:null,all=graphData(upTo);
    maxI=Math.max(1,Math.ceil(Math.max(1,...all.edges.map(e=>e.w))));
    const minW=Math.max(1,Math.min(maxI,Math.round(UIP.gmin||1)));
    minIn.max=Math.max(2,maxI);minIn.value=minW;strLab.textContent=`${minW}회 이상`;
    tIn.value=tpos;tlab.textContent=tpos>nEp?'전체':`${tpos}화까지`;
    let E=all.edges.filter(e=>e.w>=minW||e.typed),N=all.nodes;
    allE=E;
    if(UIP.gcore!==false&&E.length){      // 핵심 연결만: 노드마다 가장 가까운 3개 (허브가 유리하지 않게 두 노드의 포스트잇 수로 나눈 값)
      const cnt=Object.fromEntries(N.map(n=>[n.id,n.n])),per={};
      E.forEach(e=>{e.s=e.w/Math.sqrt(cnt[e.a]*cnt[e.b]);(per[e.a]=per[e.a]||[]).push(e);(per[e.b]=per[e.b]||[]).push(e)});
      const keep=new Set();Object.values(per).forEach(l=>l.sort((a,b)=>b.s-a.s).slice(0,3).forEach(e=>keep.add(e)));
      E=E.filter(e=>keep.has(e)||e.typed);
    }
    if(grel)E=E.filter(e=>e.typed&&(e.sa.includes(grel)||e.sb.includes(grel)));      // 관계 종류로 거르기: 그 관계 선만 (사람은 남기고 흐리게)
    relN=grel?new Set(E.flatMap(e=>[e.a,e.b])):null;
    const camp=UIP.gcamp!==false;
    E.forEach(e=>{e.camp=camp&&e.typed?relCamp([...e.sa,...e.sb]):0});      // 애증처럼 섞이면 어느 쪽도 아님
    centerId=null;
    if(local&&N.length){      // 로컬: 한 노드를 가운데 두고 n단계 이웃까지만
      const ok=id=>N.some(n=>n.id===id);
      centerId=ok(UIP.gcenter)?UIP.gcenter:(ok(UI.sel)?UI.sel:N.slice().sort((a,b)=>b.n-a.n)[0].id);
      const seen=new Set([centerId]);let front=[centerId];
      for(let d=0;d<depth;d++){const nx=[];E.forEach(e=>{if(front.includes(e.a)&&!seen.has(e.b)){seen.add(e.b);nx.push(e.b)}if(front.includes(e.b)&&!seen.has(e.a)){seen.add(e.a);nx.push(e.a)}});front=nx}
      N=N.filter(n=>seen.has(n.id));E=E.filter(e=>seen.has(e.a)&&seen.has(e.b));
    }
    nodes=N;vis=E;byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
    nodes.forEach(n=>{n.col=graphColor(n);n.set=n.e.kind==='setting'});
    sim=graphSim(nodes,vis,style,{center:centerId});
    if(sel1&&!byId[sel1])sel1=null;if(local)sel1=centerId;
    if(sel1)showInfo();else info.hidden=true;
    t0=performance.now();kick();
  }
  /* ---- 그리기 ---- */
  const matches=n=>search&&(n.e.name.toLowerCase().includes(search.toLowerCase())||(n.e.aliases||[]).some(a=>a.toLowerCase().includes(search.toLowerCase())));
  let ctx=null;
  function draw(){
    if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,Wd,Hh);
    if(!nodes.length){ctx.fillStyle=col.sub;ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText(tpos<=nEp?'이 시점에는 아직 그릴 게 없어요':'아직 그릴 게 없어요 — 포스트잇에 인물 · 설정이 나오면 자동으로 그려져요',Wd/2,Hh/2);return}
    const k=view.k,f=sel1||hov,nb=f?near(f):null,qs=!!search,appear=Math.min(1,(performance.now()-t0)/600);
    const X=x=>(x-view.cx)*k+Wd/2,Y=y=>(y-view.cy)*k+Hh/2,mx=Math.max(1,...vis.map(e=>e.w));
    if(style!=='circle'){ctx.lineCap='round';ctx.strokeStyle=col.sub;
      const line=(x1,y1,x2,y2,t,lw,al)=>{ctx.globalAlpha=al;ctx.strokeStyle=t?t.c:col.sub;ctx.setLineDash(t&&t.d&&t.d.length?t.d.map(v=>v*Math.max(1,lw*.7)):[]);
        if(t&&t.dbl&&al>.2){ctx.lineWidth=lw+3.4;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.globalAlpha=1;ctx.strokeStyle=col.bg;ctx.lineWidth=Math.max(1,lw+3.4-2.6)}
        else ctx.lineWidth=lw;
        ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()};
      vis.forEach(e=>{const A=byId[e.a],B=byId[e.b],on=!nb||(e.a===f||e.b===f),q=Math.pow(e.w/mx,1.1);
        const dx=B.x-A.x,dy=B.y-A.y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d,x1=X(A.x+ux*A.r),y1=Y(A.y+uy*A.r),x2=X(B.x-ux*B.r),y2=Y(B.y-uy*B.r);
        const lw=(.6+2.2*q)*Math.max(.7,Math.min(1.4,k));
        if(!e.typed){line(x1,y1,x2,y2,null,lw,(on?(.14+.5*q):.04)*appear*(qs?.5:1));return}
        const ta=relT(e.sa[0]),tb=relT(e.sb[0]),al=(on?(.55+.4*q):.08)*appear*(qs?.5:1),w2=Math.max(1.3,lw)*(e===hovE?1.6:1);      // 선 색은 처음 고른 관계
        if(ta===tb)line(x1,y1,x2,y2,ta,w2,al);
        else{const mx2=(x1+x2)/2,my2=(y1+y2)/2;line(x1,y1,mx2,my2,ta,w2,al);line(mx2,my2,x2,y2,tb,w2,al)}});      // 방향마다 다르면 반씩: 각자 쪽 반이 '내가 보는 상대'
      ctx.setLineDash([])}
    nodes.forEach(n=>{const hit=qs&&matches(n),rr=Math.max(2.5,n.r*k),px=X(n.x),py=Y(n.y);
      if(px<-60||px>Wd+60||py<-60||py>Hh+60)return;
      ctx.globalAlpha=(nb&&!nb.has(n.id)?.2:(qs&&!hit?.25:(relN&&!relN.has(n.id)?.22:1)))*appear*((style==='circle'&&n.set)?.78:1);ctx.fillStyle=n.col;
      ctx.beginPath();if(n.set&&style!=='circle'){const s=rr;if(ctx.roundRect)ctx.roundRect(px-s,py-s,s*2,s*2,s*.35);else ctx.rect(px-s,py-s,s*2,s*2)}else ctx.arc(px,py,rr,0,Math.PI*2);ctx.fill();
      if(style!=='circle'){ctx.lineWidth=2.5;ctx.strokeStyle=col.bg;ctx.stroke()}      // 배경색 테두리: 선이 노드 밑으로 지나가는 게 보이게
      if(n.id===sel1||hit||n.id===hov){ctx.globalAlpha=appear;ctx.lineWidth=2;ctx.strokeStyle=n.id===hov&&n.id!==sel1&&!hit?col.ink:col.acc;ctx.stroke()}});
    // 이름: 큰 노드부터, 겹치지 않는 것만 (강조된 노드는 항상)
    ctx.font='650 11px -apple-system,"Apple SD Gothic Neo",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
    const rects=[],circleIn=style==='circle',few=nodes.length<=14;
    nodes.slice().sort((a,b)=>b.n-a.n).forEach(n=>{const rr=Math.max(2.5,n.r*k),px=X(n.x),py=Y(n.y),w=ctx.measureText(n.e.name).width;
      const must=(nb&&nb.has(n.id))||matches(n)||n.id===centerId||n.id===hov;
      let inside=false;if(circleIn&&w+6<=rr*2){inside=true}
      const ly=inside?py:py+rr+9,rc=[px-w/2-3,ly-8,px+w/2+3,ly+8];
      let ok=inside||must||(few&&k>.35)||(k>.5&&!rects.some(r=>rc[0]<r[2]&&rc[2]>r[0]&&rc[1]<r[3]&&rc[3]>r[1]));
      if(px<-80||px>Wd+80||py<-40||py>Hh+40)ok=false;if(!ok)return;
      if(!inside)rects.push(rc);
      ctx.globalAlpha=(nb&&!nb.has(n.id)?.25:(qs&&!matches(n)?.3:1))*appear;
      if(inside){ctx.fillStyle='#fff';ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=2.5;ctx.strokeText(n.e.name,px,ly);ctx.fillText(n.e.name,px,ly)}
      else{ctx.strokeStyle=col.bg;ctx.lineWidth=3;ctx.strokeText(n.e.name,px,ly);ctx.fillStyle=col.ink;ctx.fillText(n.e.name,px,ly)}});
    if(style!=='circle'){      // 관계 라벨: 항상 보기 · 가리킨 선 · 고르거나 가리킨 사람의 선 · 크게 확대했을 때
      ctx.font='650 10.5px -apple-system,"Apple SD Gothic Neo",sans-serif';
      const pills=(x,y,ks)=>{const ts=ks.map(relT).filter(Boolean),ws=ts.map(t=>ctx.measureText(t.l).width+12);let x0=x-(ws.reduce((a,b)=>a+b,0)+3*(ts.length-1))/2;      // 관계가 여럿이면 나란히
        ctx.globalAlpha=appear;ts.forEach((t,i)=>{const w=ws[i];ctx.fillStyle=t.c;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x0,y-8,w,16,8);else ctx.rect(x0,y-8,w,16);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(t.l,x0+w/2,y+.5);x0+=w+3})};
      const placed=[],spot=(ax,ay,bx,by,ks,tsT)=>{const w=ks.map(relT).filter(Boolean).reduce((a,t)=>a+ctx.measureText(t.l).width+15,0);      // 다른 라벨과 겹치면 선을 따라 비켜 놓기
        let best=null;for(const t of tsT){const x=ax+(bx-ax)*t,y=ay+(by-ay)*t,r=[x-w/2,y-9,x+w/2,y+9];if(!placed.some(q=>r[0]<q[2]&&r[2]>q[0]&&r[1]<q[3]&&r[3]>q[1])){best=r;break}}
        if(!best){const t=tsT[0],x=ax+(bx-ax)*t,y=ay+(by-ay)*t;best=[x-w/2,y-9,x+w/2,y+9]}
        placed.push(best);pills((best[0]+best[2])/2,(best[1]+best[3])/2,ks)};
      vis.slice().sort((a,b)=>(b===hovE)-(a===hovE)||b.w-a.w).forEach(e=>{if(!e.typed)return;if(!(UIP.glabels||e===hovE||(f&&(e.a===f||e.b===f))||k>1.6))return;
        const A=byId[e.a],B=byId[e.b],ax=X(A.x),ay=Y(A.y),bx=X(B.x),by=Y(B.y);
        if(Math.min(ax,bx)>Wd+40||Math.max(ax,bx)<-40||Math.min(ay,by)>Hh+20||Math.max(ay,by)<-20)return;
        if(e.sa.join()===e.sb.join())spot(ax,ay,bx,by,e.sa,[.5,.38,.62,.27,.73]);else{spot(ax,ay,bx,by,e.sa,[.3,.2,.4]);spot(ax,ay,bx,by,e.sb,[.7,.8,.6])}})}
    ctx.globalAlpha=1;
  }
  function bounds(){const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y),R=Math.max(...nodes.map(n=>n.r))+(style==='node'?26:10);return {x0:Math.min(...xs)-R,x1:Math.max(...xs)+R,y0:Math.min(...ys)-R,y1:Math.max(...ys)+R}}
  function stepView(){
    if(!nodes.length)return false;
    if(auto){const b=bounds(),tk=Math.min(Math.min(Wd/(b.x1-b.x0+60),Hh/(b.y1-b.y0+60)),style==='circle'?1.6:1.5),tx=(b.x0+b.x1)/2,ty=(b.y0+b.y1)/2;
      view.cx+=(tx-view.cx)*.12;view.cy+=(ty-view.cy)*.12;view.tk=tk}
    if(view.tc&&!auto){view.cx+=(view.tc[0]-view.cx)*.14;view.cy+=(view.tc[1]-view.cy)*.14;if(Math.hypot(view.tc[0]-view.cx,view.tc[1]-view.cy)<.5)view.tc=null}
    const dk=view.tk-view.k;
    if(view.anc&&!auto&&!view.tc){view.k+=dk*.2;const a=view.anc;view.cx=a.wx-(a.fx-.5)*Wd/view.k;view.cy=a.wy-(a.fy-.5)*Hh/view.k;
      if(Math.abs(view.tk-view.k)<=view.k*.002){view.k=view.tk;view.anc=null}}      // 확대가 끝나면 기준점을 뗌 (안 떼면 이후 스크롤 · 끌기를 매번 되돌림)
    else view.k+=dk*.12;
    GC.view={cx:view.cx,cy:view.cy,k:view.k};
    return Math.abs(dk)>view.k*.002||!!view.tc||auto;
  }
  function loop(){raf=0;if(!canvas.isConnected)return;
    if(sim&&(sim.alpha>.0155||dragN))sim.step();
    const moving=stepView();draw();nodes.forEach(n=>GC.pos[n.id]=[n.x,n.y]);
    if(auto&&sim&&sim.alpha<.03&&performance.now()-t0>2400&&!GC.playT)auto=false;      // 자리를 잡으면 따라가기를 멈추고 사용자가 보는 대로
    if((sim&&sim.alpha>.0155)||dragN||moving||performance.now()-t0<700)raf=requestAnimationFrame(loop)}
  function resize(){const r=box.getBoundingClientRect();if(!r.width)return;dpr=Math.min(2,devicePixelRatio||1);Wd=r.width;Hh=r.height;canvas.width=Math.round(Wd*dpr);canvas.height=Math.round(Hh*dpr);canvas.style.width=Wd+'px';canvas.style.height=Hh+'px';ctx=canvas.getContext('2d');kick()}
  const toWorld=(px,py)=>[view.cx+(px-Wd/2)/view.k,view.cy+(py-Hh/2)/view.k];
  const hit=(px,py)=>{const k=view.k;for(let i=nodes.length-1;i>=0;i--){const n=nodes[i],rr=Math.max(6,n.r*k),dx=(n.x-view.cx)*k+Wd/2-px,dy=(n.y-view.cy)*k+Hh/2-py;if(dx*dx+dy*dy<=rr*rr)return n}return null};
  const hitE=(px,py)=>{if(style==='circle')return null;const k=view.k;let best=null,bd=6;      // 가리킨 선 (6px 안)
    vis.forEach(e=>{const A=byId[e.a],B=byId[e.b],x1=(A.x-view.cx)*k+Wd/2,y1=(A.y-view.cy)*k+Hh/2,x2=(B.x-view.cx)*k+Wd/2,y2=(B.y-view.cy)*k+Hh/2;
      const dx=x2-x1,dy=y2-y1,L=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/L)),d=Math.hypot(x1+t*dx-px,y1+t*dy-py);if(d<bd){bd=d;best=e}});
    return best};
  const relLine=(x,y)=>{const r=relOf(x,y),ts=relTs(r).map(k=>relT(k).l);return ts.length||(r&&r.note)?`${charById(x).name} → ${charById(y).name}: ${ts.length?ts.join(' · '):'미정'}${r.note?' — '+r.note:''}`:null};
  const zoomBy=f=>{auto=false;view.anc={wx:view.cx,wy:view.cy,fx:.5,fy:.5};view.tk=Math.max(.12,Math.min(5,view.tk*f));kick()};
  /* ---- 정보 창 ---- */
  function showInfo(){
    const f=sel1;if(!f||!byId[f]){info.hidden=true;return}
    const n=byId[f],list=allE.filter(e=>(e.a===f||e.b===f)&&byId[e.a]&&byId[e.b]).map(e=>({o:byId[e.a===f?e.b:e.a],e})).sort((a,b)=>b.e.w-a.e.w);
    const pick=id=>{if(local){UIP.gcenter=id;saveUIP();renderMid();return}sel1=id;UIP.gsel=id;auto=false;view.tc=[byId[id].x,byId[id].y];showInfo();kick()};
    info.hidden=false;info.replaceChildren(...[h('div',{class:'gih'},h('i',{style:`background:${n.col}`}),h('b',{},n.e.name),h('span',{class:'muted'},`${n.set?'설정':'인물'} · 포스트잇 ${n.n}장 · ${n.eps}화`)),
      list.length?h('div',{class:'muted',style:'font-size:.82em;margin:6px 0 2px'},'가까운 순 (함께 나온 횟수)'):h('div',{class:'muted',style:'font-size:.86em;margin-top:6px'},'함께 나온 적이 없어요 — 그래서 멀리 있어요'),
      ...list.slice(0,6).map(({o,e})=>{const ks=e.typed?(e.a===f?e.sa:e.sb):[],t=relT(ks[0]);
        return h('div',{class:'gil',title:'눌러서 이 노드로',onclick:()=>pick(o.id)},h('i',{style:`background:${o.col}`}),h('span',{},o.e.name),
          h('button',{class:'grtag'+(t?'':' grtag0'),style:t?`--rc:${t.c}`:'',title:'관계 정하기',onclick:ev=>{ev.stopPropagation();const r=ev.currentTarget.getBoundingClientRect();relEditor(f,o.id,r.left+r.width/2,r.bottom)}},t?t.l+(ks.length>1?` +${ks.length-1}`:''):'＋ 관계'),
          h('small',{},e.cards?`${e.cards}장${e.eps?` · ${e.eps}화`:''}`:'정한 관계'))}),
      list.length>6?h('div',{class:'muted',style:'font-size:.8em'},`외 ${list.length-6}`):null,
      h('div',{class:'row',style:'margin-top:8px;gap:6px;flex-wrap:wrap'},
        h('button',{class:'quiet',title:'인물 시트와 코르크보드',onclick:()=>{UI.mode='story';setSel(n.id)}},'구상에서 열기'),
        h('button',{class:'quiet',title:'타임라인에서 이 노드가 나오는 카드만',onclick:()=>{UI.tlChar=n.id;UIP.tlScope=null;goMode('tl')}},'타임라인에서 보기'),
        !local?h('button',{class:'quiet',title:'이 노드를 가운데 두고 이웃만 보기',onclick:()=>{UIP.gscope='local';UIP.gcenter=n.id;saveUIP();renderMid()}},'로컬로 보기'):null)].filter(Boolean))}
  /* ---- 위 막대 ---- */
  const searchIn=h('input',{class:'gsearch',placeholder:'노드 찾기',oninput:e=>{search=e.target.value.trim();kick()},onkeydown:e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();const q=search.toLowerCase(),n=nodes.find(x=>x.e.name.toLowerCase().includes(q)||(x.e.aliases||[]).some(a=>a.toLowerCase().includes(q)));
      if(!q||!n)return toast(q?'그런 노드가 없어요':'찾을 이름을 적어 주세요');
      if(local){UIP.gcenter=n.id;saveUIP();renderMid();return}sel1=n.id;UIP.gsel=n.id;auto=false;view.tc=[n.x,n.y];view.tk=Math.max(view.k,.9);showInfo();kick()}}});
  minIn.addEventListener('input',e=>{UIP.gmin=+e.target.value;strLab.textContent=`${+e.target.value}회 이상`;cancelAnimationFrame(rebuild.r);rebuild.r=requestAnimationFrame(()=>{saveUIPNow();rebuild()})});
  tIn.addEventListener('input',e=>{tpos=+e.target.value;UIP.gtime=tpos;cancelAnimationFrame(rebuild.r);rebuild.r=requestAnimationFrame(rebuild)});
  const speed=[1,2,5,10].includes(UIP.gspeed)?UIP.gspeed:1;
  const pb=h('button',{class:'quiet gplay',title:'1화부터 차례로 재생',onclick:()=>{
    if(GC.playT){clearInterval(GC.playT);GC.playT=0;pb.textContent='▶ 재생';return}
    tpos=1;UIP.gtime=1;auto=true;rebuild();pb.textContent='⏸ 정지';
    const base=nEp<=30?900:450,stepN=nEp<=30?1:Math.ceil(nEp/30);
    GC.playT=setInterval(()=>{if(!canvas.isConnected||UI.mode!=='graph'){clearInterval(GC.playT);GC.playT=0;return}
      tpos+=stepN;if(tpos>nEp+1)tpos=nEp+1;UIP.gtime=tpos;auto=true;rebuild();
      if(tpos>=nEp+1){clearInterval(GC.playT);GC.playT=0;pb.textContent='▶ 재생';saveUIP()}},Math.max(110,base/speed))}},GC.playT?'⏸ 정지':'▶ 재생');
  const relSel=relSelEl(grel,v=>{UIP.grel=v==='all'?null:v;saveUIP();renderMid()},'seg2 grsel');
  relSel.title='이 관계의 선만 보기 (선을 눌러 관계를 정해요)';
  const chk=(cls,label,title,on,fn)=>h('label',{class:'gchk '+cls,title},h('input',{type:'checkbox',checked:on,onchange:e=>fn(e.target.checked)}),label);
  const labChk=chk('grlab','관계 라벨 항상 보기','끄면 선이나 사람을 가리킬 때 · 크게 확대했을 때만 보여요',!!UIP.glabels,v=>{UIP.glabels=v;saveUIP();kick()});
  const campChk=chk('gcamp','진영 나누기','적대 관계는 멀리, 협력 · 신뢰 · 가족 · 호감은 가까이 배치해요',UIP.gcamp!==false,v=>{UIP.gcamp=v;saveUIP();rebuild()});
  const bar=h('div',{class:'mbar gbar'},h('b',{},'관계망'),
    seg([['global','전체'],['local','로컬']],local?'local':'global',k=>{UIP.gscope=k;saveUIP();renderMid()}),
    local?seg([[1,'1단계'],[2,'2단계'],[3,'3단계']],depth,k=>{UIP.gdepth=+k;saveUIP();renderMid()}):null,
    seg([['node','노드'],['circle','원형']],style,k=>{UIP.gstyle=k;saveUIP();renderMid()}),
    seg(U2()?[['all','인물 + 설정'],['char','인물만'],['setting','설정만']]:[['all','전체'],['char','인물'],['setting','설정']],type,k=>{UIP.gtype=k;UIP.gsel=null;saveUIP();renderMid()}),
    h('span',{class:'gcore',title:'핵심: 노드마다 가장 가까운 3개만 선으로 · 전체: 함께 나온 모든 연결'},seg([[true,'핵심'],[false,'전체 연결']],UIP.gcore!==false,k=>{UIP.gcore=k===true||k==='true';saveUIP();rebuild();bar.querySelectorAll('.gcore .seg button').forEach(b=>b.classList.toggle('on',(b.textContent==='핵심')===(UIP.gcore!==false)))})),
    h('label',{class:'muted gstrl',title:'함께 나온 횟수가 이 값 이상인 연결만 반영해요 (포스트잇에 같이 나오면 1회, 같은 화에 같이 쓰이면 0.5회로 셈)'},'함께 나온 횟수',minIn,strLab),
    relSel,labChk,campChk,searchIn,h('span',{class:'sp'}),
    h('span',{class:'seg gzoom'},h('button',{title:'축소 ( − )',onclick:()=>zoomBy(.8)},'−'),h('button',{title:'화면에 맞추기 ( 0 )',onclick:()=>{auto=true;kick()}},'맞춤'),h('button',{title:'확대 ( + )',onclick:()=>zoomBy(1.25)},'＋')));
  if(U2()){      // 새 디자인: 검색 · 대상 드롭다운 · “보기 옵션” 한 곳 · 확대/축소는 캔버스 오른쪽 위
    const kids=[...bar.children],pick=sel=>kids.find(x=>x.matches&&x.matches(sel));
    const typeEl=kids[3+(local?1:0)],zoomEl=pick('.gzoom');      // [제목, 범위, (단계), 배치, 대상, 연결, 횟수, 검색, 빈칸, 확대]
    const optEls=kids.slice(1,3+(local?1:0));
    const nOn=[local,style==='circle',UIP.gcore===false,(UIP.gmin||1)>1,!!UIP.glabels,UIP.gcamp===false].filter(Boolean).length;
    const panel=h('div',{class:'gopts',hidden:!UI.gopts},
      h('div',{class:'ghd'},'보기'),
      h('div',{class:'gpr'},h('span',{},'범위'),optEls[0]),
      local?h('div',{class:'gpr'},h('span',{},'단계'),optEls[1]):null,
      h('div',{class:'gpr'},h('span',{},'배치'),optEls[local?2:1]),
      h('div',{class:'gpr'},h('span',{},'연결'),pick('.gcore')),
      h('div',{class:'ghd'},'관계'),
      h('div',{class:'gpr gprs'},labChk),h('div',{class:'gpr gprs'},campChk),
      h('div',{class:'ghd'},'걸러 내기'),
      h('div',{class:'gpr gprs'},pick('.gstrl')));
    const ob=h('button',{class:'gob'+(UI.gopts?' on':''),'data-pop':'1',onclick:e=>{e.stopPropagation();UI.gopts=!UI.gopts;panel.hidden=!UI.gopts;ob.classList.toggle('on',UI.gopts)}},icon('sliders'),'보기 옵션',nOn?h('small',{},nOn):null);
    const off=e=>{if(!panel.isConnected){document.removeEventListener('pointerdown',off,true);return}if(!panel.hidden&&!panel.contains(e.target)&&!ob.contains(e.target)){UI.gopts=false;panel.hidden=true;ob.classList.remove('on')}};
    document.addEventListener('pointerdown',off,true);offs.push(()=>document.removeEventListener('pointerdown',off,true));
    bar.textContent='';bar.classList.add('gbar-n');
    bar.append(searchIn,typeEl,relSel,h('span',{class:'gobw'},ob,panel),h('span',{class:'sp'}));
    if(zoomEl){zoomEl.classList.add('gzoom-n');box.append(zoomEl)}
  }
  wrap.append(bar);
  if(nEp&&U2()){      // 아래쪽 바 하나: 재생 · 시점 · 배속 (설명은 툴팁으로)
    const spd=sel([1,2,5,10].map(v=>[String(v),'×'+v]),String(speed),v=>{UIP.gspeed=+v;saveUIP();if(GC.playT){clearInterval(GC.playT);GC.playT=0;pb.textContent='▶ 재생'}},'seg2');
    pb.classList.add('gplay-n');
    wrap.append(h('div',{class:'gbar2 gbar2-n'},pb,h('span',{class:'muted',title:'1화부터 어디까지 쌓였는지 · 쌓일수록 가까워져요'},'시점'),tIn,tlab,spd));
  }
  else if(nEp)wrap.append(h('div',{class:'gbar2'},h('span',{class:'muted'},'시점'),tIn,tlab,pb,
    h('span',{class:'seg gspd',title:'재생 속도'},...[1,2,5,10].map(v=>h('button',{class:v===speed?'on':'',onclick:e=>{UIP.gspeed=v;saveUIP();bar.parentNode&&wrap.querySelectorAll('.gspd button').forEach(b=>b.classList.toggle('on',b.textContent==='×'+v));if(GC.playT){clearInterval(GC.playT);GC.playT=0;pb.textContent='▶ 재생'}}},'×'+v))),
    h('span',{class:'muted',style:'font-size:.82em'},'1화부터 어디까지 쌓였는지 · 쌓일수록 가까워져요')));
  wrap.append(box,info,tip);
  /* ---- 입력 ---- */
  canvas.addEventListener('wheel',e=>{e.preventDefault();
    if(e.ctrlKey||e.metaKey){auto=false;const r=canvas.getBoundingClientRect(),fx=(e.clientX-r.left)/r.width,fy=(e.clientY-r.top)/r.height;
      view.anc={wx:view.cx+(fx-.5)*Wd/view.k,wy:view.cy+(fy-.5)*Hh/view.k,fx,fy};view.tk=Math.max(.12,Math.min(5,view.tk*Math.exp(-e.deltaY*.012)));kick()}
    else{auto=false;const dx=e.deltaX/view.k,dy=e.deltaY/view.k;view.cx+=dx;view.cy+=dy;view.tc=null;
      if(view.anc){view.anc.wx+=dx;view.anc.wy+=dy}      // 확대 중이면 확대는 이어가고 기준점만 함께 옮김
      GC.view={cx:view.cx,cy:view.cy,k:view.k};kick()}},{passive:false});
  const keyH=e=>{if(!canvas.isConnected){document.removeEventListener('keydown',keyH);return}
    if(UI.mode!=='graph'||e.metaKey||e.ctrlKey||e.altKey)return;const a=document.activeElement;if(a&&(a.tagName==='INPUT'&&a.type!=='range'||a.tagName==='TEXTAREA'))return;
    if(e.key==='+'||e.key==='='){e.preventDefault();zoomBy(1.25)}else if(e.key==='-'||e.key==='_'){e.preventDefault();zoomBy(.8)}else if(e.key==='0'){e.preventDefault();auto=true;kick()}};
  document.addEventListener('keydown',keyH);offs.push(()=>document.removeEventListener('keydown',keyH));
  const pt=e=>{const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]};
  canvas.addEventListener('pointermove',e=>{if(dragN)return;const [px,py]=pt(e),n=hit(px,py),id=n?n.id:null;
    if(id!==hov){hov=id;canvas.style.cursor=n?'pointer':'grab';kick()}
    const he=n?null:hitE(px,py);if(he!==hovE){hovE=he;if(he)canvas.style.cursor='pointer';kick()}
    if(he){const A=byId[he.a].e,B=byId[he.b].e;tip.hidden=false;tip.style.whiteSpace='pre-line';
      tip.textContent=[`${A.name} ↔ ${B.name}${he.cards?` · 함께 나온 포스트잇 ${he.cards}장`:''}`,relLine(he.a,he.b),relLine(he.b,he.a),'눌러서 관계 정하기'].filter(Boolean).join('\n');
      tip.style.left=Math.min(Wd-230,px+14)+'px';tip.style.top=(py+16)+'px';return}
    tip.style.whiteSpace='';
    if(n){tip.hidden=false;tip.textContent=`${n.e.name} · ${n.set?'설정':'인물'} · 포스트잇 ${n.n}장${n.eps?` · ${n.eps}화`:''}`;tip.style.left=Math.min(Wd-210,px+14)+'px';tip.style.top=(py+16)+'px'}else tip.hidden=true});
  canvas.addEventListener('pointerleave',()=>{tip.hidden=true;if(hov||hovE){hov=null;hovE=null;kick()}});
  canvas.addEventListener('pointerdown',e=>{
    const [px,py]=pt(e),n=hit(px,py),sx=e.clientX,sy=e.clientY;let moved=false;e.preventDefault();canvas.setPointerCapture(e.pointerId);tip.hidden=true;
    if(n){dragN=n;const [wx,wy]=toWorld(px,py),ox=n.x-wx,oy=n.y-wy;
      const mv=ev=>{if(Math.hypot(ev.clientX-sx,ev.clientY-sy)>3)moved=true;if(!moved)return;auto=false;const [qx,qy]=pt(ev),[x,y]=toWorld(qx,qy);n.fx=1;n.x=x+ox;n.y=y+oy;sim.alpha=Math.max(sim.alpha,.3);kick()};
      const up=()=>{canvas.removeEventListener('pointermove',mv);canvas.removeEventListener('pointerup',up);dragN=null;n.fx=0;      // 놓으면 다시 자연스럽게 자리 잡음
        if(!moved){if(local&&n.id!==centerId){UIP.gcenter=n.id;saveUIP();renderMid();return}sel1=sel1===n.id?(local?centerId:null):n.id;UIP.gsel=sel1;showInfo()}kick()};
      canvas.addEventListener('pointermove',mv);canvas.addEventListener('pointerup',up);return}
    const e0=hitE(px,py);
    canvas.style.cursor='grabbing';view.anc=null;view.tc=null;view.tk=view.k;const c0=[view.cx,view.cy];
    const mv=ev=>{if(Math.hypot(ev.clientX-sx,ev.clientY-sy)>3){moved=true;auto=false}view.cx=c0[0]-(ev.clientX-sx)/view.k;view.cy=c0[1]-(ev.clientY-sy)/view.k;view.tk=view.k;GC.view={cx:view.cx,cy:view.cy,k:view.k};kick()};
    const up=()=>{canvas.removeEventListener('pointermove',mv);canvas.removeEventListener('pointerup',up);canvas.style.cursor='grab';if(!moved&&e0){relEditor(e0.a,e0.b,sx,sy);return}if(!moved&&sel1&&!local){sel1=null;UIP.gsel=null;showInfo();kick()}};
    canvas.addEventListener('pointermove',mv);canvas.addEventListener('pointerup',up)});
  canvas.addEventListener('dblclick',e=>{const [px,py]=pt(e),n=hit(px,py);if(n){UI.mode='story';setSel(n.id)}});
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>resize());ro.observe(box);offs.push(()=>ro.disconnect())}
  offs.push(()=>{cancelAnimationFrame(raf);raf=0});
  sel1=local?null:(UIP.gsel||null);
  requestAnimationFrame(()=>{resize();rebuild();if(!local&&sel1&&!byId[sel1])sel1=null})
}

registerMidView({id:'graph',order:10,match:()=>UI.mode==='graph',appClass:()=>'m-graph',render:renderGraph});      // 관계망
