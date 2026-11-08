/* ============ 위키: 메모를 행으로 정리하는 곳 (위쪽 탭 '위키') ============
   - 맥 파인더 같은 열 보기: 인물 · 설정 → 행 → 하위 행 → … → 편집기. 글을 쓰기 시작하면 좁은 창에선 앞쪽 열이 얇은 띠로 접힘
   - 행 하나 = 문서 하나. 메모 카드를 끌어 놓거나 '위키로 ▸'를 누르면 행이 되고, 메모 첫 줄이 제목 · 나머지가 본문
   - 넣은 메모는 '정리됨'(card.filed = 행 id): 오른쪽 목록에서 빠지고 무덤에도 안 감. 행에서 되돌리면 다시 오른쪽 목록으로
   - 본문은 허용 목록으로 거른 HTML 만 저장 (동기화로 다른 기기에서 들어온 글도 그릴 때 한 번 더 거름)
   - [[ 로 인물 · 설정 · 다른 행 · 화를 연결. id 로 저장하고 이름은 그릴 때 찾아 붙여서, 이름을 바꿔도 링크가 안 깨짐 */
const WK_COLW=212,WK_ENTW=208,WK_EDMIN=560;

/* ---------- 본문 거르기 ---------- */
const WK_BLOCK={p:'p',div:'p',h1:'h3',h2:'h3',h3:'h3',h4:'h4',h5:'h4',h6:'h4',ul:'ul',ol:'ol',li:'li',blockquote:'blockquote'};
const WK_INLINE={b:'b',strong:'b',i:'i',em:'i',u:'u',s:'s',strike:'s',del:'s',mark:'mark'};
const WK_DROP=new Set(['script','style','iframe','object','embed','svg','math','template','noscript','textarea','select','button','form','head','title','img','video','audio','canvas','input','link','meta']);
const WK_REF=/^[A-Za-z0-9_-]{1,40}$/;
function wkClean(html){
  const doc=document.implementation.createHTMLDocument('');      // 스크립트가 돌지 않는 따로 된 문서에서 읽음
  doc.body.innerHTML=String(html||'');
  const out=document.createElement('div');
  const walk=(src,dst)=>{
    for(const n of [...src.childNodes]){
      if(n.nodeType===3){dst.append(n.data);continue}
      if(n.nodeType!==1)continue;
      const t=n.tagName.toLowerCase();
      if(WK_DROP.has(t))continue;
      if(t==='br'){dst.append(document.createElement('br'));continue}
      if(t==='a'&&n.classList.contains('lk')){
        const k=n.getAttribute('data-k'),ref=n.getAttribute('data-ref');
        if(['ent','row','ep'].includes(k)&&WK_REF.test(ref||'')){const a=document.createElement('a');a.className='lk';a.setAttribute('data-k',k);a.setAttribute('data-ref',ref);a.textContent=n.textContent.slice(0,120);dst.append(a)}
        else dst.append(n.textContent);
        continue;
      }
      const tag=WK_BLOCK[t]||WK_INLINE[t];
      if(!tag){walk(n,dst);continue}      // 모르는 태그는 벗기고 안의 글만
      const e=document.createElement(tag);walk(n,e);
      if(tag==='li'&&!/^(ul|ol)$/.test(dst.tagName&&dst.tagName.toLowerCase())){const u=document.createElement('ul');u.append(e);dst.append(u)}
      else dst.append(e);
    }
  };
  walk(doc.body,out);
  {let p=null;for(const n of [...out.childNodes]){      // 맨 위에 떠 있는 글 · 굵게 · 링크는 문단 하나로 묶음
    const blk=n.nodeType===1&&/^(P|H3|H4|UL|OL|BLOCKQUOTE)$/.test(n.tagName);
    if(blk){p=null;continue}
    if(n.nodeType===1&&n.tagName==='BR'&&p){p.append(n);p=null;continue}
    if(!p){p=document.createElement('p');out.insertBefore(p,n)}p.append(n)}}
  out.querySelectorAll('p').forEach(e=>{while(e.lastChild&&e.lastChild.nodeName==='BR')e.lastChild.remove();const f=e.firstChild;if(f&&f.nodeType===3)f.data=f.data.replace(/^[\s\u00a0]+/,'')});
  out.querySelectorAll('p,h3,h4,blockquote,b,i,u,s,mark').forEach(e=>{if(!e.childNodes.length)e.remove()});      // 빈 껍데기 정리
  out.querySelectorAll('ul,ol').forEach(e=>{if(!e.querySelector('li'))e.remove()});
  const s=out.innerHTML;return s.length>500000?s.slice(0,500000):s;
}
function wkText(html){      // 검색 · 미리보기 · 내보내기용 글만
  const d=document.createElement('div');d.innerHTML=wkClean(html);
  d.querySelectorAll('p,h3,h4,li,blockquote,br').forEach(e=>e.after('\n'));
  return d.textContent.replace(/\n{3,}/g,'\n\n').trim();
}

/* ---------- 인물 · 설정 문서 ---------- */
const wkOwnerName=o=>((charById(o)||{}).name||'(지운 항목)');
function wkOwnerIc(o){
  const c=charById(o);if(!c)return h('span',{class:'wkic'},'·');
  return c.icon?h('span',{class:'wkic'},c.icon):h('span',{class:'wkdot',style:`--c:${c.color}`});
}
const wkWorkName=()=>{try{return (Repo.novels&&LIB&&curNovel().name)||'작품'}catch(e){return '작품'}};
const wkLive=c=>!c.discarded&&!c.filed&&!episodeOf(c.id)&&!shelfOf(c.id)&&isWikiKind(c.kind);      // 아직 정리 안 한 위키 분류 카드
function wkMemos(ent){return S.cards.filter(c=>wkLive(c)&&(ent==null||eff(c).includes(ent)))}
const wkCount=ent=>{const d=entRow(ent);return d?rowDesc(d.id).length:0};      // 그 인물 · 설정 문서 아래 행 수
const wkEnsure=ent=>wikiEnsureEnt(S,ent);      // 문서가 없으면 처음 자리(구상 폴더를 따라간 묶음)에 만듦 (state.js) — act 안에서 부름
function goWikiEnt(ent,opt={}){      // 인물 · 설정 문서로 (없으면 만들기)
  if(!charById(ent))return;
  let d=entRow(ent);
  if(!d){if(opt.noCreate)return;act(()=>{d=wkEnsure(ent)})}
  goWikiRow(d.id);
}
const wkRowIc=r=>r.ent?wkOwnerIc(r.ent):(r.from?h('span',{class:'fm',title:'메모에서 만든 행'},'✎'):null);

/* ---------- 지금 연 자리: [맨 위 행, 하위 행, …] (비어 있으면 작품 첫 화면) ---------- */
function wkPath(){
  const p=Array.isArray(UIP.wpath)?UIP.wpath:[],out=[];
  for(const id of p){const r=rowById(id);if(!r||(r.parent||null)!==(out[out.length-1]||null))break;out.push(id)}
  return out;
}
const wkPathOf=r=>rowChain(r).map(x=>x.id);
const wkKey=p=>p.length?p[p.length-1]:'@root';
function wkSetPath(p,opt={}){UIP.wpath=p;saveUIP();UI.wkRead=null;if(opt.focusCol!=null)UI.wkFocus=opt.focusCol;renderMid()}
function goWikiRow(id,opt={}){const r=rowById(id);if(!r)return;UIP.wpath=wkPathOf(r);saveUIP();UI.wkRead=null;if(opt.edit)UI.wkEdit=id;if(UI.mode!=='wiki')goMode('wiki');else renderAll();setTimeout(()=>flashEl(document.querySelector(`#mid .wkrow[data-row="${id}"]`)),60)}

/* ---------- 행 만들기 · 옮기기 · 지우기 ---------- */
function wkInsert(row,before){      // 같은 층에서 before 행 앞에 (없으면 그 층 맨 뒤)
  const L=wikiRows(),i=before?L.findIndex(r=>r.id===before):-1;
  if(i>=0)L.splice(i,0,row);
  else{const sib=rowKids(row.parent).filter(x=>x!==row),last=sib[sib.length-1],j=last?L.indexOf(last):-1;if(j>=0)L.splice(j+1,0,row);else L.push(row)}
}
const wkCurParent=()=>{const p=wkPath();return p.length?(rowById(p[p.length-1]).parent||null):null};      // 지금 고른 행과 같은 층
function wkNewRow(parent,before){
  if(parent===undefined)parent=wkCurParent();
  const r=newWikiRow(parent,'','');
  act(()=>{wkInsert(r,before);UIP.wpath=wkPathOf(r);UI.wkEdit=r.id;UI.wkTitle=true});saveUIP();
  (UI.wkNew=UI.wkNew||new Set()).add(r.id);
}
function wkNewEntDoc(at,parent){      // '＋ 인물 · 설정 문서': 아직 문서가 없는 인물 · 설정을 골라 이 자리에 만듦
  const free=S.characters.filter(c=>!entRow(c.id)),has=S.characters.filter(c=>entRow(c.id));
  const it=c=>({label:`${c.icon?c.icon+' ':''}${c.name}`,hint:c.kind==='setting'?'설정':'인물',fn:()=>{const r={id:'we_'+c.id,parent:parent||null,ent:c.id,title:c.name,body:'',created:Date.now(),updated:Date.now()};
    if(rowById(r.id))r.id=uid();act(()=>{wkInsert(r);UIP.wpath=wkPathOf(r)});saveUIP()}});
  const items=[{title:'이 자리에 만들 인물 · 설정 문서'}];
  if(free.length){const ch=free.filter(c=>c.kind!=='setting'),st=free.filter(c=>c.kind==='setting');if(ch.length)items.push({title:'인물'},...ch.map(it));if(st.length)items.push({title:'설정'},...st.map(it))}
  else items.push({label:S.characters.length?'모든 인물 · 설정에 문서가 있어요':'구상 화면에서 인물 · 설정을 먼저 만들어요',fn:()=>{}});
  if(has.length)items.push('sep',{title:'이미 있는 문서로 가기'},...has.slice(0,12).map(c=>({label:c.name,fn:()=>goWikiEnt(c.id)})));
  popMenu(wkAnchor(at),items);
}
function wkMove(id,parent,before){
  const r=rowById(id);if(!r)return;
  if(parent&&(parent===id||rowDesc(id).some(x=>x.id===parent)))return toast('자기 안으로는 옮길 수 없어요');
  if(before===id)return;
  act(()=>{const L=wikiRows();L.splice(L.indexOf(r),1);r.parent=parent||null;wkInsert(r,before);r.updated=Date.now();UIP.wpath=wkPathOf(r)});saveUIP();
}
/* 메모 카드 → 행: 한 장이면 첫 줄 = 제목 · 나머지 = 본문, 여러 장이면 첫 장의 첫 줄이 제목이고 나머지 장은 본문 목록
   parent 가 '@ent:<id>' 면 그 인물 · 설정 문서 아래 (문서가 없으면 만듦) */
function wkFile(ids,parent,before){
  const cs=ids.map(cardById).filter(c=>c&&!c.filed&&isWikiKind(c.kind));
  if(!cs.length){if(ids.length)toast('위키로 가는 분류의 카드만 넣을 수 있어요');return}
  const lines=t=>String(t||'').split('\n').map(x=>x.trim()).filter(Boolean);
  const first=lines(cs[0].text),title=(first[0]||'메모').slice(0,200);
  let body=textToHtml(first.slice(1).join('\n'));
  if(cs.length>1)body+='<ul>'+cs.slice(1).map(c=>`<li>${lines(c.text).map(escHtml).join('<br>')}</li>`).join('')+'</ul>';
  const r=newWikiRow(null,title,body);r.from=cs[0].id;if(cs.length>1)r.froms=cs.map(c=>c.id);
  act(()=>{r.parent=typeof parent==='string'&&parent.startsWith('@ent:')?wkEnsure(parent.slice(5)).id:(parent||null);
    wkInsert(r,before);cs.forEach(c=>{c.filed=r.id;delete c.clock;delete c.discarded;delete c.graveAt});UIP.wpath=wkPathOf(r)});
  saveUIP();MSEL.clear();msRender();
  toast(cs.length>1?`메모 ${cs.length}장을 행 하나로 정리했어요`:`‘${title.slice(0,20)}’ 행으로 정리했어요`,{undo:true});
}
const wkFrom=r=>(r.froms||[r.from]).filter(Boolean).map(cardById).filter(Boolean);
function wkUnfile(cards){cards.forEach(c=>{delete c.filed;c.clock=Date.now()})}      // 오른쪽 목록으로 (무덤 타이머는 처음부터)
function wkRevert(id){      // 메모로 되돌리기: 행은 휴지통 · 메모는 오른쪽 목록 · 하위 행은 한 칸 위로
  const r=rowById(id);if(!r)return;const cs=wkFrom(r);
  act(()=>{const L=wikiRows(),i=L.indexOf(r);L.filter(x=>x.parent===id).forEach(x=>{x.parent=r.parent});L.splice(i,1);
    S.trash.push({id:uid(),type:'wiki',data:{rows:[r],cards:cs.map(c=>c.id)},at:Date.now()});wkUnfile(cs);UIP.wpath=wkPathOf(r).slice(0,-1)});
  saveUIP();toast(cs.length?'메모를 오른쪽 목록으로 돌려놓았어요':'행을 휴지통으로 보냈어요',{undo:true});
}
async function wkDelete(id){
  const r=rowById(id);if(!r)return;const ds=rowDesc(id);
  if(ds.length&&!await askConfirm(`‘${rowTitle(r)}’ 아래 하위 행 ${ds.length}개도 함께 휴지통으로 가요. 지울까요?`,{ok:'휴지통으로',danger:true}))return;
  const rows=[r,...ds],ids=new Set(rows.map(x=>x.id)),cs=S.cards.filter(c=>ids.has(c.filed));
  act(()=>{S.wiki=wikiRows().filter(x=>!ids.has(x.id));S.trash.push({id:uid(),type:'wiki',data:{rows,cards:cs.map(c=>c.id)},at:Date.now()});wkUnfile(cs);UIP.wpath=wkPathOf(r).slice(0,-1)});
  saveUIP();toast(cs.length?`휴지통으로 보냈어요 · 넣어 둔 메모 ${cs.length}장은 오른쪽 목록으로`:'휴지통으로 보냈어요',{undo:true});
}
function wkRestore(t){      // 휴지통에서 되살리기 (modals/settings.js)
  const rows=(t.data&&t.data.rows)||[];
  rows.forEach(r=>{if(rowById(r.id))return;delete r.owner;if(r.ent&&entRow(r.ent))delete r.ent;if(r.parent&&!rowById(r.parent)&&!rows.some(x=>x.id===r.parent))r.parent=null;wikiRows().push(r)});
  ((t.data&&t.data.cards)||[]).map(cardById).forEach(c=>{if(c&&!c.filed&&!c.discarded){const r=rows.find(x=>(x.froms||[x.from]).includes(c.id))||rows[0];if(r){c.filed=r.id;delete c.clock}}});
}

/* ---------- 메모를 넣을 자리 고르기 ('위키로 ▸' · 우클릭 · 여러 장 선택 막대) ---------- */
function wkAnchor(at){
  if(at&&at.nodeType&&document.contains(at))return at;
  const x=at&&at.x!=null?at.x:PTR.x,y=at&&at.y!=null?at.y:PTR.y,a=h('div',{class:'wkanchor',style:`position:fixed;left:${Math.max(8,x)}px;top:${Math.max(8,y)}px;width:1px;height:1px`});
  document.body.append(a);setTimeout(()=>a.remove(),0);return a;
}
function wkPlaceMenu(at,ids){
  ids=ids.filter(id=>{const c=cardById(id);return c&&!c.filed&&isWikiKind(c.kind)});
  if(!ids.length)return toast('위키로 가는 분류의 메모만 넣을 수 있어요');
  const ents=[...new Set(ids.flatMap(id=>eff(cardById(id))))].filter(charById);
  const items=[{title:ids.length>1?`메모 ${ids.length}장을 넣을 곳`:'이 메모를 넣을 곳'}];
  ents.slice(0,6).forEach(o=>{const c=charById(o);items.push({label:`${c.icon?c.icon+' ':''}${c.name} 문서 아래`,hint:entRow(o)?'연결됨':'새 문서',fn:()=>wkFile(ids,'@ent:'+o)})});
  if(UI.mode==='wiki'){const p=wkPath(),last=p.length?rowById(p[p.length-1]):null;
    if(last&&!(last.ent&&ents.includes(last.ent)))items.push({label:`지금 연 행 아래: ${rowTitle(last)}`.slice(0,40),fn:()=>wkFile(ids,last.id)})}
  items.push({label:`📚 ${wkWorkName()} 바로 아래`,fn:()=>wkFile(ids,null)});
  items.push('sep',{label:'다른 곳 고르기…',fn:()=>setTimeout(()=>wkPickRow(wkAnchor(),pid=>wkFile(ids,pid)),0)});
  popMenu(wkAnchor(at),items);
}
function wkPickRow(at,fn,except){      // 위키 나무에서 자리 고르기 (세 단계까지 · except 와 그 아래는 뺌)
  const no=except?new Set([except,...rowDesc(except).map(x=>x.id)]):new Set();
  const items=[{title:'어디 아래에 둘까요'},{label:`📚 ${wkWorkName()} 바로 아래`,fn:()=>fn(null)}];
  const walk=(pid,d)=>rowKids(pid).forEach(r=>{if(no.has(r.id)||items.length>60)return;items.push({label:`${'　'.repeat(d)}${r.ent?((charById(r.ent)||{}).icon||'●')+' ':''}${rowTitle(r)}`,fn:()=>fn(r.id)});if(d<2)walk(r.id,d+1)});
  walk(null,0);
  popMenu(wkAnchor(at),items);
}

/* ---------- 가운데: 열 보기 + 편집기 ---------- */
let WDRAG=null;      // 끌고 있는 행 id
function wkDropEmpty(keep){      // 이번에 새로 만든 행 중 제목 · 본문 · 하위 행이 모두 빈 채로 남은 것은 조용히 지움 (포스트잇과 같음)
  if(!UI.wkNew||!UI.wkNew.size)return;let n=0;
  [...UI.wkNew].forEach(id=>{const r=rowById(id);if(!r){UI.wkNew.delete(id);return}if(keep.includes(id))return;
    if(!r.title.trim()&&!wkText(r.body)&&!/data-ref/.test(r.body)&&!rowKids(id).length){S.wiki=wikiRows().filter(x=>x!==r);n++}UI.wkNew.delete(id)});
  if(n){idxClear();save()}
}
function renderWiki(m){
  wkDropEmpty(Array.isArray(UIP.wpath)?UIP.wpath:[]);
  const old=m.querySelector('.wkcols'),sl0=old?old.scrollLeft:0;
  const p=wkPath(),wrap=h('div',{class:'wk'}),cols=h('div',{class:'wkcols',role:'tree'});
  cols.append(wkCol(p,0));
  for(let i=1;i<=p.length;i++){if(!rowKids(p[i-1]).length)break;cols.append(wkCol(p,i))}      // 하위 행이 없는 행은 열을 더 열지 않음 (편집기만)
  const ed=h('div',{class:'wked'});
  wrap.append(cols,ed);m.append(wrap);
  if(UI.wkRead===wkKey(p))wkReadView(ed,p);else if(p.length)wkEditor(ed,rowById(p[p.length-1]),p);else wkWorkPage(ed);
  wkFit(cols,m);
  cols.addEventListener('keydown',wkColKey);
  cols.addEventListener('scroll',()=>cols.classList.toggle('wkcut',cols.scrollLeft>2),{passive:true});
  const f=UI.wkFocus;UI.wkFocus=null;
  if(f!=null){const el=cols.querySelector(`.wkcol[data-col="${f}"] .wkrow.sel`)||cols.querySelector(`.wkcol[data-col="${f}"] .wkrow.path`)||cols.querySelector(`.wkcol[data-col="${f}"] .wkrow`);if(el)el.focus({preventScroll:true})}
  cols.scrollLeft=sl0;
  requestAnimationFrame(()=>{cols.querySelectorAll('.wkrow.sel,.wkrow.path').forEach(el=>el.scrollIntoView({block:'nearest',inline:'nearest'}));
    const end=cols.scrollWidth-cols.clientWidth,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    cols.scrollTo({left:end,behavior:reduce||Math.abs(end-sl0)<4?'auto':'smooth'});cols.classList.toggle('wkcut',end>2)});
}
/* 파인더처럼: 열은 폭을 그대로 두고, 편집기 자리(WK_EDMIN)를 남긴 만큼만 보임. 넘치면 앞쪽 열이 왼쪽으로 밀려 나가고(가로 스크롤) 왼쪽 가장자리가 흐려짐
   ← 키 · 경로 · 트랙패드로 다시 보기 */
function wkFit(cols,m){
  m=m||$('mid');const W=m.clientWidth||innerWidth;
  cols.style.maxWidth=Math.max(WK_ENTW,W-WK_EDMIN)+'px';
}
/* 열 하나: i=0 은 작품 바로 아래, i>0 은 p[i-1] 행 아래 */
function wkCol(p,i){
  const parent=i?p[i-1]:null,kids=rowKids(parent);
  const head=i?rowTitle(rowById(parent)):wkWorkName();
  const col=h('div',{class:'wkcol'+(i?'':' wkroot'),'data-col':i});
  const plus=h('button',{class:'cbtn wkplus','data-pop':'1',title:'새 행 (⌘N) · 인물 · 설정 문서',onclick:()=>popMenu(plus,[{label:'새 행',hint:'⌘N',fn:()=>wkNewRow(parent)},{label:'인물 · 설정 문서…',fn:()=>setTimeout(()=>wkNewEntDoc(plus,parent),0)}])},'＋');
  col.append(h('div',{class:'wkch'},i?null:h('span',{class:'wkic'},'📚'),h('button',{class:'tt',title:i?head:'작품 첫 화면',onclick:()=>wkSetPath(p.slice(0,i),{focusCol:Math.max(0,i-1)})},head),h('span',{class:'sp'}),plus));
  const list=h('div',{class:'wklist'});
  kids.forEach(r=>list.append(wkRowEl(r,p,i)));
  if(!kids.length)list.append(h('div',{class:'wkempty'},i?'아직 하위 행이 없어요.':'아직 행이 없어요.',h('br'),i?'＋ 를 누르거나 메모를 여기로 끌어 놓아요.':'＋ 로 ‘세계관’ · ‘인물’ 같은 묶음을 만들거나 오른쪽 메모를 끌어 놓아요.'));
  wkDropOn(list,{parent,end:true});
  col.append(list);
  if(!i)col.append(h('div',{class:'wkcf'},h('span',{class:'fm'},'✎'),' 메모에서 만든 행 · ',h('span',{class:'wkdot',style:'--c:var(--acc)'}),' 인물 · 설정 문서'));
  return col;
}
function wkRowEl(r,p,i){
  const kids=rowKids(r.id).length,on=p[i]===r.id,isLast=on&&i===p.length-1,n=r.ent?wkMemos(r.ent).length:0;
  const el=h('div',{class:'wkrow'+(r.ent?' ent':'')+(on?(isLast?' sel':' path'):''),'data-row':r.id,tabindex:on||(!p[i]&&i===p.length)?0:-1,draggable:true,role:'treeitem','aria-selected':on?'true':'false'},
    wkRowIc(r),
    h('span',{class:'t'+(r.title||r.ent?'':' none')},rowTitle(r)),
    n?h('button',{class:'wkmb'+(UI.wpOwner===r.ent?' on':''),title:`아직 정리 안 한 메모 ${n}장 — 눌러서 오른쪽 목록에 이 메모만 보기`,onclick:e=>{e.stopPropagation();UI.wpOwner=UI.wpOwner===r.ent?null:r.ent;renderPool();renderMid()}},n):null,
    r.oldMemo?h('span',{class:'n',title:'예전 설정 메모 칸에서 옮겨 온 행'},'옛 메모'):null,
    kids?h('span',{class:'chev'},'›'):null);
  el.addEventListener('click',()=>{if(el._rn)return;wkSetPath([...p.slice(0,i),r.id],{focusCol:i})});
  el.addEventListener('dblclick',()=>wkRename(el,r));
  el.addEventListener('contextmenu',e=>{e.preventDefault();wkRowMenu({x:e.clientX,y:e.clientY},r)});
  el.addEventListener('dragstart',e=>{WDRAG=r.id;e.dataTransfer.setData('text/plain',rowTitle(r));e.dataTransfer.effectAllowed='move';setTimeout(()=>el.classList.add('dragging'))});
  el.addEventListener('dragend',()=>{WDRAG=null;wkDropClear();el.classList.remove('dragging')});
  wkDropOn(el,{parent:r.parent,row:r});
  return el;
}
function wkRename(el,r){      // 이어진 문서는 인물 · 설정 이름을 바꿈
  const t=el.querySelector('.t');if(!t||el._rn)return;el._rn=true;el.draggable=false;
  const c=r.ent&&charById(r.ent),cur=c?c.name:r.title;
  const inp=h('input',{class:'wkrn',value:cur,placeholder:c?'이름':'제목'});t.replaceWith(inp);inp.focus();inp.select();
  let done=false;const fin=ok=>{if(done)return;done=true;el._rn=false;const v=inp.value.trim().slice(0,200);
    if(!ok||v===cur)return renderMid();
    if(c){const d=v&&dupName(v,c.id);if(!v||d){toast(!v?'이름은 비워둘 수 없어요':`'${d.name}'은(는) 이미 있는 이름이에요`);return renderMid()}act(()=>{c.name=v;r.title=v;autoLinkAll()})}
    else act(()=>{r.title=v;r.updated=Date.now()})};
  inp.addEventListener('keydown',e=>{if(e.isComposing)return;if(e.key==='Enter'){e.preventDefault();e.stopPropagation();fin(true)}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fin(false)}e.stopPropagation()});
  inp.addEventListener('blur',()=>fin(true));inp.addEventListener('click',e=>e.stopPropagation());
}
function wkRowMenu(at,r){
  const cs=wkFrom(r);
  popMenu(wkAnchor(at),[{title:rowTitle(r)},
    {label:r.ent?'이름 바꾸기 (인물 · 설정 이름)':'이름 바꾸기',hint:'Enter',fn:()=>{const el=document.querySelector(`#mid .wkrow[data-row="${r.id}"]`);if(el)wkRename(el,r)}},
    {label:'새 하위 행',fn:()=>wkNewRow(r.id)},
    {label:'아래에 인물 · 설정 문서…',fn:()=>setTimeout(()=>wkNewEntDoc(at,r.id),0)},
    {label:'다른 곳으로 옮기기…',fn:()=>setTimeout(()=>wkPickRow(wkAnchor(at),pid=>wkMove(r.id,pid),r.id),0)},
    {label:'여기부터 몰아 보기',fn:()=>{UIP.wpath=wkPathOf(r);saveUIP();UI.wkRead=r.id;renderMid()}},
    {label:'이 행 아래 .md로 내보내기',fn:()=>exportWikiMd({row:r.id})},
    ...(r.ent&&charById(r.ent)?['sep',{label:'구상 보드에서 보기',fn:()=>{UI.mode='story';setSel(r.ent)}}]:[]),
    ...(cs.length?['sep',{label:cs.length>1?`원본 메모 ${cs.length}장 보기`:'원본 메모 보기',fn:()=>frOpen(cs[0].id,'left')},{label:'메모로 되돌리기',fn:()=>wkRevert(r.id)}]:[]),
    'sep',{label:'휴지통으로',hint:'⌘⌫',fn:()=>wkDelete(r.id)}]);
}

/* ---------- 끌어다 놓기: 행 순서 · 층 바꾸기, 메모 카드 넣기 ---------- */
function wkDropClear(){document.querySelectorAll('.wkdb,.wkda,.wkdi,.wkover').forEach(x=>x.classList.remove('wkdb','wkda','wkdi','wkover'))}
function wkDropOn(el,t){
  const zone=e=>{if(!t.row)return 'in';const r=el.getBoundingClientRect(),y=(e.clientY-r.top)/r.height;return y<.28?'b':y>.72?'a':'in'};
  el.addEventListener('dragover',e=>{
    if(!WDRAG&&!DRAG)return;
    if(WDRAG&&t.row&&(WDRAG===t.row.id||rowDesc(WDRAG).some(x=>x.id===t.row.id)))return;
    e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='move';
    wkDropClear();const z=zone(e);
    if(t.row)el.classList.add(z==='b'?'wkdb':z==='a'?'wkda':'wkdi');else el.classList.add('wkover');
    const openable=t.row&&z==='in'&&rowKids(t.row.id).length&&!wkPath().includes(t.row.id);      // 파인더처럼: 하위 행이 있는 행 위에 머무르면 열림
    if(openable&&!el._ho)el._ho=setTimeout(()=>{el._ho=0;if(!(WDRAG||DRAG))return;
      const col=+el.closest('.wkcol').dataset.col;UIP.wpath=[...wkPath().slice(0,col),t.row.id];saveUIP();renderMid()},700);
    else if(!openable&&el._ho){clearTimeout(el._ho);el._ho=0}
  });
  el.addEventListener('dragleave',e=>{if(!el.contains(e.relatedTarget)){el.classList.remove('wkdb','wkda','wkdi','wkover');clearTimeout(el._ho);el._ho=0}});
  el.addEventListener('drop',e=>{
    if(!WDRAG&&!DRAG)return;e.preventDefault();e.stopPropagation();
    const z=zone(e);wkDropClear();
    let parent=t.parent||null,before=null;
    if(t.row){if(z==='in'){parent=t.row.id}else if(z==='b'){before=t.row.id}else{const sib=rowKids(t.row.parent),j=sib.indexOf(t.row);before=sib[j+1]?sib[j+1].id:null}}
    if(WDRAG){const id=WDRAG;WDRAG=null;if(before===id)return;wkMove(id,parent,before)}
    else{const id=DRAG.id;DRAG=null;const ids=MSEL.has(id)&&MSEL.size>1?[...MSEL]:[id];wkFile(ids,parent,before)}
  });
}

document.addEventListener('dragend',()=>{setTimeout(()=>{WDRAG=null;wkDropClear()},0)},true);      // 끄는 중에 열이 다시 그려져 원래 행이 사라져도 정리되게

/* ---------- 키보드: 파인더처럼 ---------- */
let WKTYPE='',WKTYPET=0;
function wkColKey(e){
  if(e.target.tagName==='INPUT')return;
  const el=e.target.closest('.wkrow');if(!el)return;
  const col=+el.closest('.wkcol').dataset.col,p=wkPath();
  const items=[...el.closest('.wklist').querySelectorAll('.wkrow')],i=items.indexOf(el);
  const pick=x=>{if(x)wkSetPath([...p.slice(0,col),x.dataset.row],{focusCol:col})};
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();pick(items[i+(e.key==='ArrowDown'?1:-1)])}
  else if(e.key==='ArrowRight'){e.preventDefault();const kids=rowKids(el.dataset.row);
    if(kids.length)wkSetPath([...p.slice(0,col),el.dataset.row,kids[0].id],{focusCol:col+1});else{const t=document.querySelector('#mid .wkbody');if(t)t.focus()}}
  else if(e.key==='ArrowLeft'){e.preventDefault();if(col>0)wkSetPath(p.slice(0,col),{focusCol:col-1});else wkSetPath([],{focusCol:0})}
  else if(e.key==='Enter'&&!e.isComposing){e.preventDefault();const r=rowById(el.dataset.row);if(r)wkRename(el,r)}
  else if((e.key==='Backspace'||e.key==='Delete')&&modKey(e)){e.preventDefault();e.stopPropagation();if(el.dataset.row)wkDelete(el.dataset.row)}
  else if(e.key.length===1&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&e.key!==' '){      // 글자를 치면 그 글자로 시작하는 항목으로
    clearTimeout(WKTYPET);WKTYPE+=e.key.toLowerCase();WKTYPET=setTimeout(()=>{WKTYPE=''},800);
    const hit=items.find(x=>nameKey(x.querySelector('.t').textContent).startsWith(nameKey(WKTYPE)));if(hit){e.preventDefault();pick(hit)}
  }
}

/* ---------- 편집기 ---------- */
let WKSAVE=0,WKFLUSH=null,WKAUTO=null;
const wkFlushNow=()=>{if(WKFLUSH&&document.querySelector('#mid .wkbody'))WKFLUSH()};
function wkLinkName(k,ref){
  if(k==='ent'){const c=charById(ref);return c?c.name:null}
  if(k==='row'){const r=rowById(ref);return r?rowTitle(r):null}
  if(k==='ep'){const i=S.episodes.findIndex(e=>e.id===ref);return i<0?null:`${i+1}화${S.episodes[i].title?' · '+S.episodes[i].title:''}`}
  return null;
}
function wkLinksFix(root,editable){      // 링크 이름을 지금 이름으로 · 사라진 곳은 흐리게
  root.querySelectorAll('a.lk').forEach(a=>{const n=wkLinkName(a.dataset.k,a.dataset.ref);if(n){a.textContent=n;a.classList.remove('gone')}else a.classList.add('gone');
    a.title=n?(a.dataset.k==='ep'?'눌러서 타임라인의 그 화로':'눌러서 열기'):'연결된 곳이 사라졌어요';if(editable)a.contentEditable='false';
    if(a.dataset.k==='ent')a.dataset.ent=a.dataset.ref;else delete a.dataset.ent;
    if(a.dataset.k==='ent'){const c=charById(a.dataset.ref);if(c)a.style.setProperty('--c',c.color)}});
}
function wkGoLink(a){
  const k=a.dataset.k,ref=a.dataset.ref;if(!wkLinkName(k,ref))return toast('연결된 곳이 사라졌어요');
  if(k==='ent')goWikiEnt(ref);
  else if(k==='row')goWikiRow(ref);
  else{const i=S.episodes.findIndex(e=>e.id===ref);UI.tlScope=null;if((UIP.tlMode||'kanban')==='matrix')UIP.tlMode='kanban';UI.scrollEp=i;goMode('tl')}
}
function wkEpisodesOf(o){      // 이 인물 · 설정이 나온 화
  if(!o)return [];const set=new Set();cardsOf(o).forEach(c=>{const e=episodeOf(c.id);if(e)set.add(e.i)});return [...set].sort((a,b)=>a-b);
}
function wkBack(k,ref){return wikiRows().filter(r=>r.body.includes(`data-k="${k}" data-ref="${ref}"`))}
const wkTrail=r=>rowChain(r).map(rowTitle).join(' › ');
function wkBackEl(row){
  const ent=row&&row.ent,back=row?[...new Set([...wkBack('row',row.id),...(ent?wkBack('ent',ent):[])])].filter(x=>x!==row):[],eps=wkEpisodesOf(ent);
  const rowLink=r=>h('button',{class:'wkbl',onclick:()=>goWikiRow(r.id)},wkTrail(r));
  return h('div',{class:'wkback'},
    h('div',{},h('b',{},ent?'이 인물 · 설정을 가리키는 행':'이 행을 가리키는 행'),back.length?h('div',{class:'wkbls'},...back.slice(0,12).map(rowLink)):h('span',{class:'muted'},'아직 없어요 · 다른 행에서 [[ 로 연결해요')),
    ent?h('div',{},h('b',{},`${wkOwnerName(ent)}이(가) 나온 화`),eps.length?h('div',{class:'wkeps'},...eps.slice(0,24).map(i=>h('button',{class:'wkep',title:S.episodes[i].title||'',onclick:()=>{UI.tlScope=null;if((UIP.tlMode||'kanban')==='matrix')UIP.tlMode='kanban';UI.scrollEp=i;goMode('tl')}},h('em',{},i+1),S.episodes[i].title||'화'))):h('span',{class:'muted'},'아직 화에 넣은 카드가 없어요')):null);
}
function wkCrumb(p,extra){
  const segs=[h('button',{class:'wkcb',onclick:()=>wkSetPath([])},'📚 '+wkWorkName())];
  p.forEach((id,j)=>{const r=rowById(id);segs.push(h('i',{},'›'),h('button',{class:'wkcb',onclick:()=>wkSetPath(p.slice(0,j+1))},rowTitle(r)))});
  const key=wkKey(p),on=UI.wkRead===key;
  const rb=h('button',{class:'wkrdbtn'+(on?' on':''),'aria-pressed':on?'true':'false',title:p.length?'이 행과 하위 행 전부를 한 화면에 이어서 읽기':'위키 전체를 한 화면에 이어서 읽기',onclick:()=>{wkFlushNow();UI.wkRead=on?null:key;renderMid()}},icon('book'),'몰아 보기');
  return h('div',{class:'wkcrumb'},h('div',{class:'wkcbs'},...segs),h('span',{class:'sp'}),rb,...(extra||[]));
}
/* 몰아 보기: 이 행과 하위 행 전부(작품 첫 화면에서는 위키 전체)를 한 화면에 이어서 읽음 — 읽기 전용
   위에 목차(누르면 그 행으로 스크롤) · 행마다 번호(1.2.3) · 경로 · '고치기'(그 행 편집기로). 연결은 그대로 눌림 */
function wkReadList(p){
  const L=[],walk=(r,d,num)=>{L.push({r,d,num});rowKids(r.id).forEach((x,i)=>walk(x,d+1,num?`${num}.${i+1}`:String(i+1)))};
  if(p.length)walk(rowById(p[p.length-1]),0,'');
  else rowKids(null).forEach((r,i)=>walk(r,0,String(i+1)));
  return L;
}
function wkReadView(ed,p){
  const L=wkReadList(p),base=p.length?rowById(p[p.length-1]):null;
  ed.append(wkCrumb(p,[h('button',{class:'cbtn',title:'몰아 본 내용을 .md로 내보내기',onclick:()=>exportWikiMd(base?{row:base.id}:{})},icon('download'))]));
  const bar=h('div',{class:'wkrdbar'},h('b',{},icon('book'),'몰아 보기'),h('span',{class:'muted'},`${base?`‘${rowTitle(base)}’ 부터`:'위키 전체'} · 행 ${L.length}개`),h('span',{class:'sp'}),
    h('button',{class:'quiet',onclick:()=>{UI.wkRead=null;renderMid()}},'편집으로 돌아가기'));
  const page=h('div',{class:'wkrd'});
  if(L.length>1)page.append(h('nav',{class:'wkrdtoc','aria-label':'목차'},...L.map(({r,d,num},i)=>h('button',{style:`padding-left:${6+Math.min(d,6)*14}px`,onclick:()=>{const s=page.querySelector(`[data-rdi="${i}"]`);if(s)s.scrollIntoView({block:'start',behavior:'smooth'})}},num?h('span',{class:'no'},num):null,rowTitle(r)))));
  L.forEach(({r,d,num},i)=>{
    const b=h('div',{class:'wkrdb'});b.innerHTML=wkClean(r.body);wkLinksFix(b);
    const c=r.ent&&charById(r.ent),trail=rowChain(r).slice(0,-1).map(rowTitle).join(' › ');
    page.append(h('section',{class:'wkrds','data-rdi':i,'data-d':Math.min(d,3)},
      h('div',{class:'wkrdh'},h('div',{class:'t'},num?h('span',{class:'no'},num):null,r.ent?wkOwnerIc(r.ent):null,r.ent?' ':null,r.from?h('span',{class:'fm',title:'메모에서 만든 행'},'✎ '):null,rowTitle(r)),
        h('button',{class:'quiet',title:'이 행을 편집기로 열어요',onclick:()=>wkSetPath(wkPathOf(r))},'고치기')),
      d&&trail?h('div',{class:'wkrdp'},trail):null,
      c&&c.summary?h('p',{class:'wkrdsum'},c.summary):null,b));
  });
  if(!L.length)page.append(h('div',{class:'wkempty big'},'몰아 볼 행이 없어요.'));
  page.addEventListener('click',e=>{const a=e.target.closest('a.lk');if(a){e.preventDefault();wkGoLink(a)}});
  ed.append(bar,h('div',{class:'wkdoc wkrdwrap'},page));
}
function wkWorkPage(ed){      // 작품 첫 화면: 맨 위 묶음들 · 정리할 메모 · 위키 전체 몰아 보기
  const rows=rowKids(null),memos=wkMemos(null),noDoc=S.characters.filter(c=>!entRow(c.id)).length;
  ed.append(wkCrumb([],[h('button',{class:'cbtn',title:'위키 전체를 .md로 내보내기',onclick:()=>exportWikiMd({})},icon('download'))]));
  const doc=h('div',{class:'wkdoc'});
  const plus=h('button',{class:'quiet','data-pop':'1',onclick:()=>wkNewEntDoc(plus,null)},'＋ 인물 · 설정 문서');
  doc.append(h('div',{class:'wkoh'},h('span',{class:'wkic'},'📚'),h('h2',{class:'wkot'},wkWorkName()),h('span',{class:'wkkind'},'위키')),
    h('p',{class:'wksum'},'작품 하나가 뿌리예요. ‘세계관’ · ‘인물’ · ‘세력’ · ‘연표’처럼 묶음을 자유롭게 만들고, 인물 · 설정 문서도 그 안 어디에든 둬요.'),
    h('div',{class:'wkstat'},h('span',{},`행 ${wikiRows().length}개`),memos.length?h('span',{class:'wkmb on'},`정리할 메모 ${memos.length}장`):h('span',{class:'muted'},'정리할 메모 없음'),
      noDoc?h('span',{class:'muted'},`문서가 없는 인물 · 설정 ${noDoc}개`):null,h('span',{class:'sp'}),plus,h('button',{class:'on',onclick:()=>wkNewRow(null)},'＋ 새 행')));
  const grid=h('div',{class:'wkcards'});
  rows.forEach(r=>{const t=wkText(r.body),n=rowDesc(r.id).length;
    grid.append(h('button',{class:'wkcard',onclick:()=>wkSetPath([r.id])},h('b',{},r.ent?wkOwnerIc(r.ent):null,r.ent?' ':null,r.from?h('span',{class:'fm'},'✎ '):null,rowTitle(r)),
      t?h('span',{class:'s'},t.slice(0,90)):(n?h('span',{class:'s'},rowKids(r.id).slice(0,5).map(rowTitle).join(' · ')):h('span',{class:'s muted'},'비어 있음')),n?h('small',{},`하위 행 ${n}개`):null))});
  if(!rows.length)grid.append(h('div',{class:'wkempty big'},'아직 행이 없어요. ＋ 새 행으로 ‘세계관’ 같은 묶음을 만들거나, 오른쪽 메모의 ‘위키로 ▸’를 눌러요.'));
  doc.append(grid);ed.append(doc);
}
function wkEditor(ed,r,p){
  const cs=wkFrom(r),c=r.ent&&charById(r.ent);
  ed.append(wkCrumb(p,[h('button',{class:'cbtn','data-pop':'1',title:'메뉴',onclick:e=>wkRowMenu(e.currentTarget,r)},icon('more'))]));
  const body=h('div',{class:'wkbody',contenteditable:'true',spellcheck:'false','data-ph':c?`${c.name}에 대해 정리해요 · [[ 로 다른 인물 · 설정 · 행 · 화를 연결`:'여기에 정리해요 · [[ 로 인물 · 설정 · 다른 행 · 화를 연결'});
  body.innerHTML=wkClean(r.body);wkLinksFix(body,true);
  const tb=wkToolbar(body);
  let title;
  if(r.ent){      // 인물 · 설정 문서: 이름 · 역할 · 소개는 인물을 따라감 (이름은 열에서 Enter 로 바꿈)
    title=h('div',{class:'wkenth'},h('div',{class:'wkoh'},wkOwnerIc(r.ent),h('h2',{class:'wkot'},rowTitle(r)),c?h('span',{class:'wkkind'},c.kind==='setting'?'설정':(c.role||'인물')):h('span',{class:'wkkind'},'지운 항목'),
        c?h('button',{class:'quiet',title:'구상 화면의 이 인물 · 설정 보드로',onclick:()=>{UI.mode='story';setSel(c.id)}},'구상에서 보기 ›'):null),
      c&&c.summary?h('p',{class:'wksum'},c.summary):null);
  }else title=h('textarea',{class:'wktitle autofit',rows:1,placeholder:'제목',maxlength:200,
    oninput:e=>{const v=e.target.value.replace(/\n/g,' ');edit(()=>{r.title=v;r.updated=Date.now()});fitOne(e.target);document.querySelectorAll(`#mid .wkrow[data-row="${r.id}"] .t`).forEach(t=>{t.textContent=v||'제목 없음';t.classList.toggle('none',!v)});const cb=document.querySelector('#mid .wkcbs .wkcb:last-child');if(cb)cb.textContent=v||'제목 없음'},
    onkeydown:e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();body.focus();const s=getSelection();s.selectAllChildren(body);s.collapseToStart()}}},r.title);
  const n=r.ent?wkMemos(r.ent).length:0;
  const meta=h('div',{class:'wkmeta'},
    cs.length?h('span',{class:'wkfrom',title:'이 행은 메모에서 만들었어요'},`✎ 메모에서${cs.length>1?` ${cs.length}장`:''} · ${wkDate(r.created)}`):null,
    cs.length?h('button',{class:'wkml',onclick:()=>frOpen(cs[0].id,'left')},'원본 메모 보기'):null,
    cs.length?h('button',{class:'wkml',onclick:()=>wkRevert(r.id)},'메모로 되돌리기'):null,
    n?h('button',{class:'wkmb'+(UI.wpOwner===r.ent?' on':''),onclick:()=>{UI.wpOwner=UI.wpOwner===r.ent?null:r.ent;renderPool();renderMid()}},`정리할 메모 ${n}장`):null,
    h('span',{class:'muted'},`고친 날 ${wkDate(r.updated)}`));
  const doc=h('div',{class:'wkdoc'},title,meta,body);
  ed.append(tb,doc,wkBackEl(r));
  const flush=WKFLUSH=()=>{clearTimeout(WKSAVE);WKSAVE=0;const v=wkClean(body.innerHTML);if(v!==r.body)edit(()=>{r.body=v;r.updated=Date.now()})};
  body.addEventListener('input',e=>{body.classList.toggle('empty',wkEmpty(body));clearTimeout(WKSAVE);WKSAVE=setTimeout(flush,350);wkAcCheck(body,r)});
  body.addEventListener('blur',()=>{flush();setTimeout(()=>{if(document.activeElement!==body)wkAcClose()},120)});
  body.addEventListener('keydown',e=>wkBodyKey(e,body,r,flush));
  body.addEventListener('paste',e=>{e.preventDefault();const d=e.clipboardData,ht=d.getData('text/html'),tx=d.getData('text/plain');
    document.execCommand('insertHTML',false,ht?wkClean(ht):textToHtml(tx).replace(/^<p>|<\/p>$/g,'').replace(/<\/p><p>/g,'<br>'))});
  body.addEventListener('click',e=>{const a=e.target.closest('a.lk');if(a){e.preventDefault();wkGoLink(a)}});
  body.classList.toggle('empty',wkEmpty(body));
  try{document.execCommand('defaultParagraphSeparator',false,'p')}catch(x){}
  requestAnimationFrame(()=>{if(title.tagName==='TEXTAREA')fitOne(title);
    if(UI.wkEdit===r.id){UI.wkEdit=null;if(title.tagName==='TEXTAREA'&&(UI.wkTitle||!r.title)){UI.wkTitle=false;title.focus()}else{body.focus();const s=getSelection();s.selectAllChildren(body);s.collapseToEnd()}}});
}
const wkEmpty=b=>!b.textContent.trim()&&!b.querySelector('li,a.lk');
const wkDate=t=>{if(!t)return '';const d=new Date(t);return `${d.getMonth()+1}월 ${d.getDate()}일`};
function wkBlock(){const s=getSelection();let n=s.anchorNode;while(n&&n.nodeType!==1)n=n.parentNode;return n&&n.closest?n.closest('.wkbody>*,.wkbody li'):null}
function wkFormat(cmd,body){
  body.focus();
  if(cmd==='h3'||cmd==='h4'||cmd==='blockquote'){const b=wkBlock(),cur=b&&b.tagName.toLowerCase();document.execCommand('formatBlock',false,cur===cmd?'p':cmd)}
  else if(cmd==='mark'){
    const s=getSelection();let n=s.anchorNode;while(n&&n.nodeType!==1)n=n.parentNode;const m=n&&n.closest('mark');
    if(m&&body.contains(m)){m.replaceWith(...m.childNodes)}
    else if(!s.isCollapsed){const t=s.toString();document.execCommand('insertHTML',false,`<mark>${escHtml(t).replace(/\n/g,'<br>')}</mark>`)}
    body.dispatchEvent(new Event('input'));
  }
  else document.execCommand(cmd);
}
function wkToolbar(body){
  const b=(label,cmd,tip,cls)=>h('button',{class:'wktb '+(cls||''),title:tip,onmousedown:e=>{e.preventDefault();cmd==='link'?wkLinkStart(body):wkFormat(cmd,body)}},label);
  return h('div',{class:'wktbar'},b(h('b',{},'B'),'bold','굵게 (⌘B)'),b(h('i',{},'I'),'italic','기울임 (⌘I)'),h('span',{class:'sep'}),
    b('제목','h3','제목 (⌘⌥1 · 줄 맨 앞에서 # 띄어쓰기)'),b('소제목','h4','소제목 (⌘⌥2 · ## 띄어쓰기)'),b('• 목록','insertUnorderedList','목록 (- 띄어쓰기)'),b('1. 목록','insertOrderedList','번호 목록 (1. 띄어쓰기)'),b('❝','blockquote','인용 (> 띄어쓰기)'),
    h('span',{class:'sep'}),b('형광펜','mark','형광펜 (⌘⇧H)','hl'),h('span',{class:'sep'}),b('[[ 연결','link','인물 · 설정 · 다른 행 · 화 연결 ([[ 입력)'));
}
function wkLinkStart(body){body.focus();document.execCommand('insertText',false,'[[');wkAcCheck(body)}
function wkIndent(li,out,body){
  const s=getSelection(),an=s.anchorNode,ao=s.anchorOffset,fn=s.focusNode,fo=s.focusOffset;      // 옮긴 뒤에도 커서를 같은 글자에
  const list=li.parentNode;
  if(!out){
    const prev=li.previousElementSibling;if(!prev||prev.tagName!=='LI')return;      // 맨 첫 항목은 더 들어갈 곳이 없음
    let sub=prev.lastElementChild&&/^(UL|OL)$/.test(prev.lastElementChild.tagName)?prev.lastElementChild:null;
    if(!sub){sub=document.createElement(list.tagName);prev.append(sub)}
    sub.append(li);
  }else{
    const outer=list.parentNode&&list.parentNode.tagName==='LI'?list.parentNode:null;
    if(!outer){document.execCommand('outdent');body.dispatchEvent(new Event('input'));return}      // 맨 바깥: 목록을 끝내고 보통 문단으로
    const rest=[];for(let x=li.nextElementSibling;x;x=x.nextElementSibling)rest.push(x);
    if(rest.length){let sub=li.lastElementChild&&/^(UL|OL)$/.test(li.lastElementChild.tagName)?li.lastElementChild:null;if(!sub){sub=document.createElement(list.tagName);li.append(sub)}rest.forEach(y=>sub.append(y))}      // 뒤따르던 항목은 이 항목 아래로 (순서 유지)
    outer.after(li);if(!list.children.length)list.remove();
  }
  try{const r=document.createRange();r.setStart(an,ao);s.removeAllRanges();s.addRange(r);s.extend(fn,fo)}catch(x){}
  body.dispatchEvent(new Event('input'));
}
function wkBodyKey(e,body,r,flush){
  if(WKAC&&wkAcKey(e))return;
  if(WKAUTO){const a=WKAUTO;WKAUTO=null;
    if(e.key==='Backspace'&&!e.isComposing&&Date.now()-a.at<8000){const s=getSelection();let n=s.anchorNode;while(n&&n.nodeType!==1)n=n.parentNode;const b=n&&n.closest('li,h3,h4,blockquote');
      if(b&&body.contains(b)&&s.isCollapsed&&!b.textContent.slice(0,1).trim()&&b.textContent.trim().length<=a.len){e.preventDefault();document.execCommand('undo');document.execCommand('insertText',false,a.mark+' ');body.dispatchEvent(new Event('input'));return}}}
  if(e.key==='Tab'&&!e.isComposing&&!e.metaKey&&!e.ctrlKey&&!e.altKey){      // 목록 안: Tab = 한 단계 안으로 · ⇧Tab = 한 단계 밖으로
    const s=getSelection();let n=s.anchorNode;while(n&&n.nodeType!==1)n=n.parentNode;const li=n&&n.closest('li');
    if(li&&body.contains(li)){e.preventDefault();e.stopPropagation();wkIndent(li,e.shiftKey,body);return}
  }
  const mod=modKey(e);
  if(mod&&!e.altKey&&!e.shiftKey&&/^Key[BIU]$/.test(e.code)){e.preventDefault();e.stopPropagation();wkFormat({KeyB:'bold',KeyI:'italic',KeyU:'underline'}[e.code],body);return}      // ⌘B 가 분류 단축키로 새 포스트잇을 만들지 않게
  if(mod&&e.shiftKey&&e.code==='KeyH'){e.preventDefault();e.stopPropagation();wkFormat('mark',body);return}
  if(mod&&e.altKey&&/^Digit[120]$/.test(e.code)){e.preventDefault();e.stopPropagation();const d=e.code.slice(5);if(d==='0'){document.execCommand('formatBlock',false,'p')}else wkFormat(d==='1'?'h3':'h4',body);return}
  if(mod&&!e.shiftKey&&!e.altKey&&/^(Digit|Key)/.test(e.code)&&!/^Key[ZYSFAXCV]$/.test(e.code)&&e.code!=='KeyN')e.stopPropagation();      // 그 밖의 ⌘+글자는 편집기 안에서만 (분류별 새 포스트잇 단축키와 겹치지 않게)
  if(e.key===' '&&!e.isComposing&&!mod){      // 마크다운처럼: 줄 맨 앞의 - · 1. · # · ## · > 뒤에 띄어쓰기
    const s=getSelection();if(!s.isCollapsed)return;const n=s.anchorNode;if(!n||n.nodeType!==3)return;
    const blk=wkBlock();if(!blk||blk.tagName==='LI')return;
    const before=n.data.slice(0,s.anchorOffset);if(blk.firstChild!==n&&!(blk===n.parentNode&&blk.firstChild===n))return;
    const map={'-':'insertUnorderedList','*':'insertUnorderedList','1.':'insertOrderedList','#':'h3','##':'h4','>':'blockquote'},cmd=map[before];if(!cmd)return;
    e.preventDefault();const rg=document.createRange();rg.setStart(n,0);rg.setEnd(n,s.anchorOffset);rg.deleteContents();
    if(!blk.textContent){blk.append(document.createElement('br'))}
    wkFormat(cmd,body);body.dispatchEvent(new Event('input'));
    WKAUTO={mark:before,at:Date.now(),len:(blk.textContent||'').trim().length+1};      // 바로 뒤 Backspace 면 글자로 되돌림
  }
}

/* ---------- [[ 연결 자동 완성 ---------- */
let WKAC=null;
function wkCands(q,selfId){
  const k=nameKey(q),out=[];
  S.characters.forEach(c=>{const hit=!k||[c.name,...(c.aliases||[])].some(x=>nameKey(x).includes(k));if(hit)out.push({k:'ent',ref:c.id,label:c.name,sub:c.kind==='setting'?'설정':'인물',ic:c.icon||'',col:c.color,score:nameKey(c.name).startsWith(k)?0:1})});
  wikiRows().forEach(r=>{if(r.id===selfId||r.ent||!r.title)return;if(!k||nameKey(r.title).includes(k))out.push({k:'row',ref:r.id,label:r.title,sub:'행 · '+(rowChain(r).slice(0,-1).map(rowTitle).pop()||wkWorkName()),ic:'📄',score:nameKey(r.title).startsWith(k)?2:3})});
  S.episodes.forEach((e,i)=>{const lab=`${i+1}화${e.title?' · '+e.title:''}`;if(k&&(nameKey(lab).includes(k)||String(i+1)===q.trim()))out.push({k:'ep',ref:e.id,label:lab,sub:'화',ic:'🎬',score:String(i+1)===q.trim()?0:4})});
  return out.sort((a,b)=>a.score-b.score).slice(0,8);
}
function wkAcCheck(body,r){
  const s=getSelection();if(!s.rangeCount||!s.isCollapsed)return wkAcClose();
  const n=s.anchorNode;if(!n||n.nodeType!==3||!body.contains(n))return wkAcClose();
  const before=n.data.slice(0,s.anchorOffset),m=/\[\[([^\[\]\n]{0,30})$/.exec(before);if(!m)return wkAcClose();
  const row=r||rowById(wkPath().slice(-1)[0]),list=wkCands(m[1],row&&row.id);
  const rg=document.createRange();rg.setStart(n,s.anchorOffset-m[0].length);rg.setEnd(n,s.anchorOffset);
  const rect=rg.getBoundingClientRect();
  if(!WKAC){WKAC={el:h('div',{class:'wkac',role:'listbox'})};document.body.append(WKAC.el)}
  Object.assign(WKAC,{body,node:n,start:s.anchorOffset-m[0].length,list,cur:Math.min(WKAC.cur||0,Math.max(0,list.length-1))});
  const el=WKAC.el;el.replaceChildren(h('div',{class:'h'},list.length?'연결할 곳 · ↑↓ Enter':'맞는 곳이 없어요'));
  list.forEach((c,i)=>el.append(h('button',{class:'o'+(i===WKAC.cur?' on':''),onmousedown:e=>{e.preventDefault();WKAC.cur=i;wkAcPick()}},c.ic?h('span',{class:'ic2'},c.ic):h('span',{class:'wkdot',style:`--c:${c.col}`}),h('span',{class:'l'},c.label),h('small',{},c.sub))));
  const top=rect.bottom+6,left=Math.min(innerWidth-270,Math.max(8,rect.left));el.style.left=left+'px';el.style.top=(top+el.offsetHeight>innerHeight-8?rect.top-6-el.offsetHeight:top)+'px';
}
function wkAcClose(){if(WKAC){WKAC.el.remove();WKAC=null}}
function wkAcKey(e){
  if(e.isComposing)return false;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();const n=WKAC.list.length;if(!n)return true;WKAC.cur=(WKAC.cur+(e.key==='ArrowDown'?1:n-1))%n;[...WKAC.el.querySelectorAll('.o')].forEach((x,i)=>x.classList.toggle('on',i===WKAC.cur));return true}
  if((e.key==='Enter'||e.key==='Tab')&&WKAC.list.length){e.preventDefault();e.stopPropagation();wkAcPick();return true}
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();wkAcClose();return true}
  return false;
}
function wkAcPick(){
  const A=WKAC;if(!A)return;const c=A.list[A.cur];if(!c)return wkAcClose();
  const s=getSelection(),end=s.anchorNode===A.node?s.anchorOffset:A.node.data.length;
  const rg=document.createRange();rg.setStart(A.node,Math.min(A.start,A.node.data.length));rg.setEnd(A.node,Math.max(end,A.start));rg.deleteContents();
  const a=h('a',{class:'lk','data-k':c.k,'data-ref':c.ref},c.label),sp=document.createTextNode(' ');
  rg.insertNode(sp);rg.insertNode(a);wkLinksFix(a.parentNode,true);
  const r2=document.createRange();r2.setStartAfter(sp);r2.collapse(true);s.removeAllRanges();s.addRange(r2);
  wkAcClose();A.body.dispatchEvent(new Event('input'));
}
document.addEventListener('pointerdown',e=>{if(WKAC&&!WKAC.el.contains(e.target)&&!(e.target.closest&&e.target.closest('.wkbody')))wkAcClose()},true);

/* ---------- 오른쪽: 정리할 메모 (위키 탭에서만) ---------- */
function renderWikiPool(p){
  const own=UI.wpOwner&&charById(UI.wpOwner)?UI.wpOwner:(UI.wpOwner=null);
  const all=wkMemos(own==null?null:own);
  const ord=c=>{const d=graveLeft(c);return d?d:9};
  all.sort((a,b)=>ord(a)-ord(b)||(b.star?1:0)-(a.star?1:0)||(b.created||0)-(a.created||0));      // 곧 무덤 갈 메모가 맨 위 → 별 → 최신
  const wk=S.kinds.filter(k=>kindDest(k)==='wiki'),qk=(wk.find(k=>k.id===UI.wqkind)||wk[0]);
  p.append(h('div',{class:'phead'},h('b',{title:'아직 위키에 넣지 않은 메모'},'정리할 메모'),h('small',{class:'wkpn'},`${all.length}장`),h('span',{class:'sp'}),ptog('pool')));
  const qi=h('input',{placeholder:qk?`한 줄 쓰고 Enter → ${qk.name}`:'위키로 가는 분류가 없어요',disabled:!qk,
    onkeydown:e=>{if(e.key!=='Enter'||e.isComposing||!qk)return;const v=qi.value.trim();if(!v)return;
      act(()=>{const c=newCard(qk.id,v);autoLinkCard(c);if(own&&!eff(c).includes(own))c.chars.push(own);S.cards.unshift(c)});setTimeout(()=>{const i=document.querySelector('#pool .wkpq input');if(i)i.focus()})}});
  p.append(h('div',{class:'pquick wkpq'},qi,
    wk.length>1?h('div',{class:'pkchips'},...wk.map(k=>h('button',{class:'pkchip'+(k===qk?' on':''),style:`--kd:${kdark(k.color)}`,onclick:()=>{UI.wqkind=k.id;renderPool()}},h('i'),k.name))):null,
    own?h('div',{class:'wkpf'},h('span',{},wkOwnerIc(own),`${wkOwnerName(own)}의 메모만`),h('button',{class:'cbtn',title:'모든 메모 보기',onclick:()=>{UI.wpOwner=null;renderPool();renderMid()}},'✕')):null));
  const list=h('div',{class:'wkpl'});
  all.slice(0,UI.wpLimit||120).forEach(c=>list.append(wkMemoEl(c)));
  if(all.length>(UI.wpLimit||120))list.append(h('button',{class:'quiet morebtn',onclick:()=>{UI.wpLimit=(UI.wpLimit||120)+200;renderPool()}},`＋ ${all.length-(UI.wpLimit||120)}장 더 보기`));
  if(!all.length)list.append(h('div',{class:'empty'},own?'이 인물 · 설정의 메모는 다 정리했어요.':(S.cards.some(c=>isWikiKind(c.kind))?'메모를 다 정리했어요.':'위에 메모를 한 줄씩 적어 보세요. 구상 보드에서 붙인 메모도 여기 모여요.')));
  p.append(list,h('div',{class:'wkpfoot'},'끌어서 왼쪽 열에 놓거나 ‘위키로 ▸’ · ⌘ 클릭으로 여러 장 골라 한 행으로'));
}
function wkMemoEl(c){
  const d=graveLeft(c),cast=eff(c).map(charById).filter(Boolean);
  const el=h('div',{class:'kcard wkm'+(MSEL.has(c.id)?' msel':'')+(SELCARD===c.id?' selc':'')+(d?' wilt':''),'data-id':c.id,draggable:true,tabindex:0,style:`--kc0:${cardColor(c)}`},
    d?h('span',{class:'dday',title:`위키에 넣거나 별을 붙이지 않으면 ${d}일 뒤 무덤으로 가요`},'D-'+d):null,
    c.star?h('span',{class:'wkst',title:'꼭 쓸 것'},'★'):null,
    h('div',{class:'tx'},c.text||'(빈 메모)'),
    h('div',{class:'ft'},h('span',{class:'who'},...cast.slice(0,4).map(x=>h('i',{style:`--c:${x.color}`,title:x.name,'data-ent':x.id},frInitial(x.name)))),h('span',{class:'sp'}),
      h('button',{class:'wkto','data-pop':'1',title:'위키에 넣기 — 넣을 곳 고르기',onclick:e=>{e.stopPropagation();wkPlaceMenu(e.currentTarget,MSEL.has(c.id)&&MSEL.size>1?[...MSEL]:[c.id])}},'위키로 ▸')));
  el.addEventListener('click',e=>{if(e.target.closest('button')||e.metaKey||e.ctrlKey||e.shiftKey)return;selectCard(c.id)});
  el.addEventListener('dblclick',e=>{if(!e.target.closest('button'))frOpen(c.id,'left')});
  el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();wkPlaceMenu(el.querySelector('.wkto'),[c.id])}});
  el.addEventListener('contextmenu',e=>{e.preventDefault();const ids=MSEL.has(c.id)&&MSEL.size>1?[...MSEL]:[c.id];
    popMenu(wkAnchor({x:e.clientX,y:e.clientY}),[{label:'위키에 넣기…',fn:()=>setTimeout(()=>wkPlaceMenu({x:e.clientX,y:e.clientY},ids),0)},{label:'고치기',fn:()=>frOpen(c.id,'left')},
      c.star?{label:'별 떼기',fn:()=>act(()=>{delete c.star})}:{label:'별 붙이기 (무덤에 안 가요)',fn:()=>act(()=>{c.star=true})},'sep',{label:'무덤으로 보내기',fn:()=>{buryCards(ids);toast(`${ids.length}장을 무덤으로 보냈어요`,{undo:true})}}])});
  el.addEventListener('dragstart',e=>{DRAG={id:c.id};e.dataTransfer.setData('text/plain',c.text||'');e.dataTransfer.effectAllowed='move';setTimeout(()=>el.classList.add('dragging'))});
  el.addEventListener('dragend',()=>{DRAG=null;wkDropClear();el.classList.remove('dragging')});
  return el;
}

/* ---------- 인물 시트 · 설정 노트 안의 위키 칸 ---------- */
function wkSheetBlock(c){
  const d=entRow(c.id),rows=d?rowKids(d.id):[],n=wkMemos(c.id).length;
  return h('div',{class:'sgrp wksheet'},
    h('div',{class:'wksh'},h('b',{},'위키'),h('span',{class:'muted'},d?`행 ${wkCount(c.id)}개${n?` · 정리할 메모 ${n}장`:''}`:(n?`정리할 메모 ${n}장`:'문서 없음')),h('span',{class:'sp'}),
      h('button',{class:'quiet',onclick:()=>goWikiEnt(c.id)},d?'위키에서 열기 ›':'위키 문서 만들기 ›')),
    rows.length?h('div',{class:'wkshl'},...rows.slice(0,8).map(r=>h('button',{class:'wkbl',onclick:()=>goWikiRow(r.id)},r.from?'✎ ':'',rowTitle(r))),rows.length>8?h('span',{class:'muted'},`외 ${rows.length-8}개`):null)
      :h('p',{class:'muted wkshe'},c.kind==='setting'?'세계관 · 장소 · 조직 · 규칙은 위키 탭에서 행으로 정리해요.':'설정 · 비밀 · 메모는 위키 탭에서 행으로 정리해요.'));
}

/* ---------- 글 속 이름 표시: 카드 글의 거울 층(card.js hlFill)에서 인물 · 설정 이름을 span 으로 감쌈 (모양은 그대로) ---------- */
let WKNRE=null,WKNSIG='';
function wkNameRe(){
  const sig=S.characters.map(c=>c.id+':'+c.name+':'+(c.aliases||[]).join(',')).join('|');if(sig===WKNSIG)return WKNRE;WKNSIG=sig;
  const m=new Map();S.characters.forEach(c=>[c.name,...(c.aliases||[])].map(x=>String(x).trim()).filter(x=>x.length>=2).forEach(x=>{if(!m.has(x.toLowerCase()))m.set(x.toLowerCase(),c.id)}));
  const ks=[...m.keys()].sort((a,b)=>b.length-a.length).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  WKNRE=ks.length?{re:new RegExp(ks.join('|'),'gi'),m}:null;return WKNRE;
}
function wkMarkNames(box){
  const N=wkNameRe();if(!N)return;
  const tw=document.createTreeWalker(box,NodeFilter.SHOW_TEXT),list=[];while(tw.nextNode())list.push(tw.currentNode);
  list.forEach(t=>{const s=t.data;N.re.lastIndex=0;if(!N.re.test(s))return;N.re.lastIndex=0;
    const f=document.createDocumentFragment();let p=0,m;
    while((m=N.re.exec(s))){if(m.index>p)f.append(s.slice(p,m.index));f.append(h('span',{class:'wkn','data-ent':N.m.get(m[0].toLowerCase())},m[0]));p=m.index+m[0].length}
    if(p<s.length)f.append(s.slice(p));t.replaceWith(f)});
}
let WKNT=0,WKNCUR=null,WKNLAST=0;
document.addEventListener('mousemove',e=>{      // 글(textarea)이 거울 층을 덮고 있어서, 그 자리의 이름을 거울 층에서 찾음
  const now=Date.now();if(now-WKNLAST<90)return;WKNLAST=now;
  const wrap=e.target&&e.target.closest&&e.target.closest('.kwrap'),ta=wrap&&wrap.querySelector('textarea'),mir=wrap&&wrap.querySelector('.kmir');
  if(!ta||!mir||!ta.readOnly||DRAG||WDRAG){if(WKNCUR){WKNCUR=null;clearTimeout(WKNT);if(WKPEEK)WKPEEKH=setTimeout(()=>{if(!(WKPEEK&&WKPEEK.matches(':hover')))wkPeekHide()},250)}return}
  const pe=ta.style.pointerEvents,me=mir.style.pointerEvents;ta.style.pointerEvents='none';mir.style.pointerEvents='auto';
  let el=null;try{el=document.elementFromPoint(e.clientX,e.clientY)}finally{ta.style.pointerEvents=pe;mir.style.pointerEvents=me}
  const n=el&&el.closest&&el.closest('.wkn[data-ent]');
  if(n===WKNCUR)return;WKNCUR=n;clearTimeout(WKNT);
  if(n){clearTimeout(WKPEEKH);WKNT=setTimeout(()=>{if(WKNCUR===n)wkPeekShow(n)},450)}else if(WKPEEK)WKPEEKH=setTimeout(()=>{if(!(WKPEEK&&WKPEEK.matches(':hover')))wkPeekHide()},250);
},{passive:true});

/* ---------- 쓰는 중에 위키 엿보기: 인물 · 설정 표시(data-ent)에 마우스를 올리면 그 위키 행 목록 ---------- */
let WKPEEK=null,WKPEEKT=0,WKPEEKH=0;
function wkPeekHide(){clearTimeout(WKPEEKT);if(WKPEEK){WKPEEK.remove();WKPEEK=null}}
function wkPeekShow(t){
  const o=t.dataset.ent;if(!charById(o))return;
  wkPeekHide();
  const d=entRow(o),rows=d?rowKids(d.id):[],memos=wkMemos(o).length,box=h('div',{class:'wkpeek'});
  const prev=h('div',{class:'wkpv'});
  const item=(r,d)=>{const b=h('button',{class:'wkpr',style:`--d:${d}`,onclick:()=>{const on=b.classList.toggle('on');box.querySelectorAll('.wkpr').forEach(x=>{if(x!==b)x.classList.remove('on')});
      prev.innerHTML=on?wkClean(r.body)||'<p class="muted">본문이 비어 있어요</p>':'';wkLinksFix(prev);prev.classList.toggle('on',on)}},r.from?'✎ ':'',rowTitle(r));return b};
  const lst=h('div',{class:'wkpl2'});
  const walk=(list,dp)=>list.forEach(r=>{if(lst.children.length>=14)return;lst.append(item(r,dp));if(dp<2)walk(rowKids(r.id),dp+1)});walk(rows,0);
  box.append(h('div',{class:'wkph'},wkOwnerIc(o),h('b',{},wkOwnerName(o)),h('span',{class:'sp'}),h('button',{class:'quiet',onclick:()=>{wkPeekHide();goWikiEnt(o)}},d?'위키에서 열기 ›':'문서 만들기 ›')),
    rows.length?lst:h('div',{class:'muted wkpe'},d?'문서 아래 행이 아직 없어요':'아직 위키 문서가 없어요'),prev,
    ...(memos?[h('div',{class:'wkpm'},`정리할 메모 ${memos}장`)]:[]));
  document.body.append(box);WKPEEK=box;
  const r=t.getBoundingClientRect(),bw=box.offsetWidth,bh=box.offsetHeight;
  box.style.left=Math.max(8,Math.min(innerWidth-bw-8,r.left+r.width/2-bw/2))+'px';
  box.style.top=(r.bottom+8+bh>innerHeight-8?Math.max(8,r.top-8-bh):r.bottom+8)+'px';
  box.addEventListener('mouseenter',()=>clearTimeout(WKPEEKH));box.addEventListener('mouseleave',()=>{WKPEEKH=setTimeout(wkPeekHide,250)});
}
document.addEventListener('mouseover',e=>{
  const t=e.target.closest&&e.target.closest('[data-ent]');if(!t||DRAG||WDRAG||(UI.mode==='wiki'&&t.closest('#mid')&&!t.closest('.wkbody')))return;
  clearTimeout(WKPEEKH);clearTimeout(WKPEEKT);WKPEEKT=setTimeout(()=>{if(t.matches(':hover'))wkPeekShow(t)},450);
  t.addEventListener('mouseleave',()=>{clearTimeout(WKPEEKT);WKPEEKH=setTimeout(wkPeekHide,250)},{once:true});
});
document.addEventListener('pointerdown',e=>{if(WKPEEK&&!WKPEEK.contains(e.target))wkPeekHide()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&WKPEEK)wkPeekHide()},true);

/* ---------- 내보내기 (.md): 행은 머리말, 본문은 Markdown 으로 · 연결은 [[이름]] ---------- */
function wkMd(html){
  const d=document.createElement('div');d.innerHTML=wkClean(html);wkLinksFix(d);
  const inl=n=>[...n.childNodes].map(x=>{if(x.nodeType===3)return x.data.replace(/\u00a0/g,' ');const t=x.tagName.toLowerCase(),c=inl(x);
    return t==='b'?`**${c}**`:t==='i'?`*${c}*`:t==='s'?`~~${c}~~`:t==='mark'?`==${c}==`:t==='br'?'  \n':t==='a'?`[[${x.textContent}]]`:c}).join('');
  const out=[];
  [...d.children].forEach(b=>{const t=b.tagName.toLowerCase();
    if(t==='h3')out.push(`**${inl(b)}**`,'');else if(t==='h4')out.push(`*${inl(b)}*`,'');
    else if(t==='ul'||t==='ol'){const lst=(l,d)=>[...l.children].forEach((li,i)=>{const subs=[...li.children].filter(x=>/^(UL|OL)$/.test(x.tagName));subs.forEach(x=>x.remove());
        out.push(`${'   '.repeat(d)}${l.tagName==='OL'?(i+1)+'.':'-'} ${inl(li).trim()}`);subs.forEach(x=>lst(x,d+1))});lst(b,0);out.push('')}
    else if(t==='blockquote')out.push(...inl(b).split('\n').map(x=>'> '+x),'');
    else out.push(inl(b),'')});
  return out.join('\n').trim();
}
function exportWikiMd(opt={}){
  const L=[],rowMd=(r,d)=>{L.push(`${'#'.repeat(Math.min(6,d))} ${rowTitle(r)}`,'');const c=r.ent&&charById(r.ent);if(c&&c.summary)L.push(`> ${c.summary}`,'');const b=wkMd(r.body);if(b)L.push(b,'');rowKids(r.id).forEach(x=>rowMd(x,d+1))};
  let name='wiki';
  if(opt.row){const r=rowById(opt.row);if(!r)return;name='wiki-'+rowTitle(r).slice(0,20);L.push(`> ${wkTrail(r)} · 내보낸 날짜: ${new Date().toLocaleString()}`,'');rowMd(r,1)}
  else{L.push(`# ${wkWorkName()} · 위키`,'',`> 내보낸 날짜: ${new Date().toLocaleString()}`,'');rowKids(null).forEach(r=>rowMd(r,2));if(!wikiRows().length)return toast('내보낼 위키 행이 없어요')}
  dlBlob(`${fileBase()}-${name.replace(/[\\/:*?"<>|]/g,'_')}-${todayStr()}.md`,new Blob([L.join('\n')],{type:'text/markdown'}));toast('위키를 Markdown으로 내보냈어요');
}

registerMidView({id:'wiki',order:5,match:()=>UI.mode==='wiki',appClass:()=>'m-wiki',render:renderWiki});      // 위키
addEventListener('resize',()=>{const c=document.querySelector('#mid .wkcols');if(c&&UI.mode==='wiki')wkFit(c)});
