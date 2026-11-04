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

/* ---------- 인물 · 설정 (첫 열) ---------- */
const wkOwnerName=o=>o==='work'?'작품 전체':((charById(o)||{}).name||'(지운 항목)');
function wkOwnerIc(o){
  if(o==='work')return h('span',{class:'wkic'},'📚');
  const c=charById(o);if(!c)return h('span',{class:'wkic'},'·');
  return c.icon?h('span',{class:'wkic'},c.icon):h('span',{class:'wkdot',style:`--c:${c.color}`});
}
function wkGroups(){      // 왼쪽 목록과 같은 묶음: 폴더 안이면 폴더 경로, 아니면 인물 · 설정
  const g=new Map(),add=(k,c)=>{if(!g.has(k))g.set(k,[]);g.get(k).push(c)};
  S.characters.filter(c=>c.kind!=='setting'&&!folderOf(c)).forEach(c=>add('👤 인물',c));
  S.folders.forEach(f=>{const key=(f.icon||'📁')+' '+folderPath(f);S.characters.filter(c=>folderOf(c)===f.id).forEach(c=>add(key,c))});
  return [...g.entries()];
}
const wkLive=c=>!c.discarded&&!c.filed&&!episodeOf(c.id)&&!shelfOf(c.id)&&isWikiKind(c.kind);      // 아직 정리 안 한 위키 분류 카드
function wkMemos(owner){return S.cards.filter(c=>wkLive(c)&&(owner==null||(owner==='work'?!eff(c).length:eff(c).includes(owner))))}
const wkCount=o=>wikiRows().filter(r=>rowOwner(r)===o).length;

/* ---------- 지금 연 자리: [owner, 행, 하위 행, …] ---------- */
function wkPath(){
  let p=Array.isArray(UIP.wpath)?UIP.wpath.slice():[];
  const o=p[0];if(!(o==='work'||charById(o)))p=[S.characters[0]?S.characters[0].id:'work'];
  const out=[p[0]];
  for(let i=1;i<p.length;i++){const r=rowById(p[i]);if(!r)break;const ok=i===1?(!r.parent&&rowOwner(r)===out[0]):r.parent===out[i-1];if(!ok)break;out.push(r.id)}
  return out;
}
const wkPathOf=r=>[rowOwner(rowChain(r)[0]),...rowChain(r).map(x=>x.id)];
function wkSetPath(p,opt={}){UIP.wpath=p;saveUIP();if(opt.focusCol!=null)UI.wkFocus=opt.focusCol;renderMid()}
function goWikiRow(id,opt={}){const r=rowById(id);if(!r)return;UIP.wpath=wkPathOf(r);saveUIP();if(opt.edit)UI.wkEdit=id;if(UI.mode!=='wiki')goMode('wiki');else renderAll();setTimeout(()=>flashEl(document.querySelector(`#mid .wkrow[data-row="${id}"]`)),60)}
function goWikiOwner(o){UIP.wpath=[o];saveUIP();if(UI.mode!=='wiki')goMode('wiki');else renderAll()}

/* ---------- 행 만들기 · 옮기기 · 지우기 ---------- */
function wkInsert(row,before){      // 같은 층에서 before 행 앞에 (없으면 그 층 맨 뒤)
  const L=wikiRows(),i=before?L.findIndex(r=>r.id===before):-1;
  if(i>=0)L.splice(i,0,row);
  else{const sib=rowKids(row.owner,row.parent),last=sib[sib.length-1],j=last?L.indexOf(last):-1;if(j>=0)L.splice(j+1,0,row);else L.push(row)}
}
function wkNewRow(owner,parent,before){
  const p=wkPath();owner=owner||p[0];if(parent===undefined)parent=p.length>2?p[p.length-2]:null;
  const r=newWikiRow(owner,parent,'','');
  act(()=>{wkInsert(r,before);UIP.wpath=parent?[...wkPathOf(rowById(parent)),r.id]:[owner,r.id];UI.wkEdit=r.id;UI.wkTitle=true});saveUIP();
}
function wkMove(id,owner,parent,before){
  const r=rowById(id);if(!r)return;
  if(parent&&(parent===id||rowDesc(id).some(x=>x.id===parent)))return toast('자기 안으로는 옮길 수 없어요');
  if(before===id)return;
  act(()=>{const L=wikiRows();L.splice(L.indexOf(r),1);r.owner=owner;r.parent=parent||null;rowDesc(id).forEach(x=>x.owner=owner);wkInsert(r,before);r.updated=Date.now();UIP.wpath=wkPathOf(r)});saveUIP();
}
/* 메모 카드 → 행: 한 장이면 첫 줄 = 제목 · 나머지 = 본문, 여러 장이면 첫 장의 첫 줄이 제목이고 나머지 장은 본문 목록 */
function wkFile(ids,owner,parent,before){
  const cs=ids.map(cardById).filter(c=>c&&!c.filed&&isWikiKind(c.kind));
  if(!cs.length){if(ids.length)toast('위키로 가는 분류의 카드만 넣을 수 있어요');return}
  const lines=t=>String(t||'').split('\n').map(x=>x.trim()).filter(Boolean);
  const first=lines(cs[0].text),title=(first[0]||'메모').slice(0,200);
  let body=textToHtml(first.slice(1).join('\n'));
  if(cs.length>1)body+='<ul>'+cs.slice(1).map(c=>`<li>${lines(c.text).map(escHtml).join('<br>')}</li>`).join('')+'</ul>';
  const r=newWikiRow(owner,parent||null,title,body);r.from=cs[0].id;if(cs.length>1)r.froms=cs.map(c=>c.id);
  act(()=>{wkInsert(r,before);cs.forEach(c=>{c.filed=r.id;delete c.clock;delete c.discarded;delete c.graveAt});UIP.wpath=wkPathOf(r)});
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
  if(ds.length&&!await askConfirm(`‘${r.title||'제목 없음'}’ 아래 하위 행 ${ds.length}개도 함께 휴지통으로 가요. 지울까요?`,{ok:'휴지통으로',danger:true}))return;
  const rows=[r,...ds],ids=new Set(rows.map(x=>x.id)),cs=S.cards.filter(c=>ids.has(c.filed));
  act(()=>{S.wiki=wikiRows().filter(x=>!ids.has(x.id));S.trash.push({id:uid(),type:'wiki',data:{rows,cards:cs.map(c=>c.id)},at:Date.now()});wkUnfile(cs);UIP.wpath=wkPathOf(r).slice(0,-1)});
  saveUIP();toast(cs.length?`휴지통으로 보냈어요 · 넣어 둔 메모 ${cs.length}장은 오른쪽 목록으로`:'휴지통으로 보냈어요',{undo:true});
}
function wkRestore(t){      // 휴지통에서 되살리기 (modals/settings.js)
  const rows=(t.data&&t.data.rows)||[];
  rows.forEach(r=>{if(rowById(r.id))return;if(r.parent&&!rowById(r.parent)&&!rows.some(x=>x.id===r.parent))r.parent=null;wikiRows().push(r)});
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
  const owners=[...new Set(ids.flatMap(id=>eff(cardById(id))))].filter(charById);
  const items=[{title:ids.length>1?`메모 ${ids.length}장을 넣을 곳`:'이 메모를 넣을 곳'}];
  owners.slice(0,6).forEach(o=>items.push({label:`${charById(o).icon?charById(o).icon+' ':''}${wkOwnerName(o)} 아래`,hint:'연결됨',fn:()=>wkFile(ids,o,null)}));
  if(UI.mode==='wiki'){const p=wkPath(),last=p.length>1?rowById(p[p.length-1]):null;
    if(last)items.push({label:`지금 연 행 아래: ${last.title||'제목 없음'}`.slice(0,40),fn:()=>wkFile(ids,p[0],last.id)});
    else if(!owners.includes(p[0]))items.push({label:`지금 연 곳: ${wkOwnerName(p[0])} 아래`,fn:()=>wkFile(ids,p[0],null)})}
  if(!owners.length)items.push({label:'📚 작품 전체 아래',fn:()=>wkFile(ids,'work',null)});
  items.push('sep',{label:'다른 곳 고르기…',fn:()=>setTimeout(()=>wkPickOwner(wkAnchor(),o=>wkFile(ids,o,null)),0)});
  popMenu(wkAnchor(at),items);
}
function wkPickOwner(at,fn){
  const items=[{title:'어디 아래에 둘까요'}];
  wkGroups().forEach(([g,cs])=>{items.push({title:g});cs.forEach(c=>items.push({label:`${c.icon?c.icon+' ':''}${c.name}`,fn:()=>fn(c.id)}))});
  items.push('sep',{label:'📚 작품 전체',fn:()=>fn('work')});
  popMenu(wkAnchor(at),items);
}

/* ---------- 가운데: 열 보기 + 편집기 ---------- */
let WDRAG=null;      // 끌고 있는 행 id
function renderWiki(m){
  const old=m.querySelector('.wkcols'),sl0=old?old.scrollLeft:0;
  const p=wkPath(),wrap=h('div',{class:'wk'}),cols=h('div',{class:'wkcols',role:'tree'});
  cols.append(wkEntCol(p));
  for(let i=1;i<=p.length;i++){
    const parent=i===1?null:p[i-1];
    if(i>1&&!rowKids(p[0],parent).length)break;      // 하위 행이 없는 행은 열을 더 열지 않음 (편집기만)
    cols.append(wkRowCol(p,i));
  }
  const ed=h('div',{class:'wked'});
  wrap.append(cols,ed);m.append(wrap);
  if(p.length>1)wkEditor(ed,rowById(p[p.length-1]),p);else wkOwnerPage(ed,p[0]);
  wkFit(cols,m);
  cols.addEventListener('keydown',wkColKey);
  cols.addEventListener('scroll',()=>cols.classList.toggle('wkcut',cols.scrollLeft>2),{passive:true});
  const f=UI.wkFocus;UI.wkFocus=null;
  if(f!=null){const el=cols.querySelector(`.wkcol[data-col="${f}"] .wkrow.sel`)||cols.querySelector(`.wkcol[data-col="${f}"] .wkrow`);if(el)el.focus({preventScroll:true})}
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

function wkEntCol(p){
  const col=h('div',{class:'wkcol wkent','data-col':0});
  col.append(h('div',{class:'wkch'},h('span',{},'인물 · 설정'),h('span',{class:'sp'})));
  const list=h('div',{class:'wklist'});
  const row=(o,c)=>{
    const n=wkMemos(o).length,cnt=wkCount(o);
    const el=h('div',{class:'wkrow ent'+(p[0]===o?(p.length>1?' path':' sel'):''),'data-owner':o,tabindex:p[0]===o?0:-1,role:'treeitem'},
      wkOwnerIc(o),h('span',{class:'t'},wkOwnerName(o)),
      n?h('button',{class:'wkmb'+(UI.wpOwner===o?' on':''),title:`아직 정리 안 한 메모 ${n}장 — 눌러서 오른쪽 목록에 이 메모만 보기`,onclick:e=>{e.stopPropagation();UI.wpOwner=UI.wpOwner===o?null:o;renderPool();renderMid()}},n):null,
      cnt?h('span',{class:'n'},cnt):null,cnt?h('span',{class:'chev'},'›'):null);
    el.addEventListener('click',()=>wkSetPath([o],{focusCol:0}));
    wkDropOn(el,{owner:o,parent:null,into:true});
    return el;
  };
  wkGroups().forEach(([g,cs])=>{list.append(h('div',{class:'wkgrp'},g));cs.forEach(c=>list.append(row(c.id,c)))});
  list.append(h('div',{class:'wkgrp'},'📚 작품 전체'),row('work'));
  if(!S.characters.length)list.prepend(h('div',{class:'wkempty'},'구상 화면 왼쪽에서 인물 · 설정을 만들면 여기에 나와요.'));
  col.append(list,h('div',{class:'wkcf'},'인물 · 설정 · 폴더는 구상 화면 왼쪽 목록에서 만들고 옮겨요'));
  return col;
}
function wkRowCol(p,i){
  const owner=p[0],parent=i===1?null:p[i-1],kids=rowKids(owner,parent),selId=p[i];
  const head=parent?(rowById(parent).title||'제목 없음'):wkOwnerName(owner);
  const col=h('div',{class:'wkcol','data-col':i});
    col.append(h('div',{class:'wkch'},h('span',{class:'tt',title:head},head),h('span',{class:'sp'}),
    h('button',{class:'cbtn wkplus',title:'새 행 (⌘N)',onclick:()=>wkNewRow(owner,parent)},'＋')));
  const list=h('div',{class:'wklist'});
  kids.forEach(r=>list.append(wkRowEl(r,p,i)));
  if(!kids.length)list.append(h('div',{class:'wkempty'},'아직 행이 없어요.',h('br'),'＋ 를 누르거나 오른쪽 메모를 여기로 끌어 놓아요.'));
  wkDropOn(list,{owner,parent,end:true});
  col.append(list);
  if(i===1)col.append(h('div',{class:'wkcf'},h('span',{class:'fm'},'✎'),' 메모에서 만든 행'));
  return col;
}
function wkRowEl(r,p,i){
  const kids=rowKids(null,r.id).length,on=p[i]===r.id,isLast=on&&i===p.length-1;
  const el=h('div',{class:'wkrow'+(on?(isLast?' sel':' path'):''),'data-row':r.id,tabindex:on||(!p[i]&&i===p.length)?0:-1,draggable:true,role:'treeitem','aria-selected':on?'true':'false'},
    r.from?h('span',{class:'fm',title:'메모에서 만든 행'},'✎'):null,
    h('span',{class:'t'+(r.title?'':' none')},r.title||'제목 없음'),
    r.oldMemo?h('span',{class:'n',title:'예전 설정 메모 칸에서 옮겨 온 행'},'옛 메모'):null,
    kids?h('span',{class:'chev'},'›'):null);
  el.addEventListener('click',()=>{if(el._rn)return;wkSetPath([...p.slice(0,i),r.id],{focusCol:i})});
  el.addEventListener('dblclick',()=>wkRename(el,r));
  el.addEventListener('contextmenu',e=>{e.preventDefault();wkRowMenu({x:e.clientX,y:e.clientY},r)});
  el.addEventListener('dragstart',e=>{WDRAG=r.id;e.dataTransfer.setData('text/plain',r.title||'');e.dataTransfer.effectAllowed='move';setTimeout(()=>el.classList.add('dragging'))});
  el.addEventListener('dragend',()=>{WDRAG=null;wkDropClear();el.classList.remove('dragging')});
  wkDropOn(el,{owner:p[0],parent:r.parent,row:r});
  return el;
}
function wkRename(el,r){
  const t=el.querySelector('.t');if(!t||el._rn)return;el._rn=true;el.draggable=false;
  const inp=h('input',{class:'wkrn',value:r.title,placeholder:'제목'});t.replaceWith(inp);inp.focus();inp.select();
  let done=false;const fin=ok=>{if(done)return;done=true;el._rn=false;const v=inp.value.trim().slice(0,200);if(ok&&v!==r.title)act(()=>{r.title=v;r.updated=Date.now()});else renderMid()};
  inp.addEventListener('keydown',e=>{if(e.isComposing)return;if(e.key==='Enter'){e.preventDefault();e.stopPropagation();fin(true)}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fin(false)}e.stopPropagation()});
  inp.addEventListener('blur',()=>fin(true));inp.addEventListener('click',e=>e.stopPropagation());
}
function wkRowMenu(at,r){
  const cs=wkFrom(r);
  popMenu(wkAnchor(at),[{title:r.title||'제목 없음'},
    {label:'이름 바꾸기',hint:'Enter',fn:()=>{const el=document.querySelector(`#mid .wkrow[data-row="${r.id}"]`);if(el)wkRename(el,r)}},
    {label:'새 하위 행',fn:()=>wkNewRow(rowOwner(r),r.id)},
    {label:'다른 곳으로 옮기기…',fn:()=>setTimeout(()=>wkPickOwner(wkAnchor(at),o=>wkMove(r.id,o,null)),0)},
    {label:'이 행 아래 .md로 내보내기',fn:()=>exportWikiMd({row:r.id})},
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
  });
  el.addEventListener('dragleave',e=>{if(!el.contains(e.relatedTarget))el.classList.remove('wkdb','wkda','wkdi','wkover')});
  el.addEventListener('drop',e=>{
    if(!WDRAG&&!DRAG)return;e.preventDefault();e.stopPropagation();
    const z=zone(e);wkDropClear();
    let owner=t.owner,parent=t.parent,before=null;
    if(t.row){if(z==='in'){parent=t.row.id}else if(z==='b'){before=t.row.id}else{const sib=rowKids(owner,t.row.parent),j=sib.indexOf(t.row);before=sib[j+1]?sib[j+1].id:null}}
    if(WDRAG){const id=WDRAG;WDRAG=null;if(before===id)return;wkMove(id,owner,parent,before)}
    else{const id=DRAG.id;DRAG=null;const ids=MSEL.has(id)&&MSEL.size>1?[...MSEL]:[id];wkFile(ids,owner,parent,before)}
  });
}

/* ---------- 키보드: 파인더처럼 ---------- */
let WKTYPE='',WKTYPET=0;
function wkColKey(e){
  if(e.target.tagName==='INPUT')return;
  const el=e.target.closest('.wkrow');if(!el)return;
  const col=+el.closest('.wkcol').dataset.col,p=wkPath();
  const items=[...el.closest('.wklist').querySelectorAll('.wkrow')],i=items.indexOf(el);
  const pick=x=>{if(!x)return;if(x.dataset.owner)wkSetPath([x.dataset.owner],{focusCol:0});else wkSetPath([...p.slice(0,col),x.dataset.row],{focusCol:col})};
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();pick(items[i+(e.key==='ArrowDown'?1:-1)])}
  else if(e.key==='ArrowRight'){e.preventDefault();const o=p[0],kids=col===0?rowKids(o,null):rowKids(o,el.dataset.row);
    if(kids.length)wkSetPath([...p.slice(0,col+1),kids[0].id],{focusCol:col+1});else{const t=document.querySelector('#mid .wkbody');if(t&&col>0)t.focus()}}
  else if(e.key==='ArrowLeft'){e.preventDefault();if(col>0)wkSetPath(p.slice(0,col),{focusCol:col-1})}
  else if(e.key==='Enter'&&!e.isComposing){e.preventDefault();const r=rowById(el.dataset.row);if(r)wkRename(el,r)}
  else if((e.key==='Backspace'||e.key==='Delete')&&modKey(e)){e.preventDefault();e.stopPropagation();if(el.dataset.row)wkDelete(el.dataset.row)}
  else if(e.key.length===1&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&e.key!==' '){      // 글자를 치면 그 글자로 시작하는 항목으로
    clearTimeout(WKTYPET);WKTYPE+=e.key.toLowerCase();WKTYPET=setTimeout(()=>{WKTYPE=''},800);
    const hit=items.find(x=>nameKey(x.querySelector('.t').textContent).startsWith(nameKey(WKTYPE)));if(hit){e.preventDefault();pick(hit)}
  }
}

/* ---------- 편집기 ---------- */
let WKSAVE=0;
function wkLinkName(k,ref){
  if(k==='ent'){const c=charById(ref);return c?c.name:null}
  if(k==='row'){const r=rowById(ref);return r?(r.title||'제목 없음'):null}
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
  if(k==='ent')goWikiOwner(ref);
  else if(k==='row')goWikiRow(ref);
  else{const i=S.episodes.findIndex(e=>e.id===ref);UI.tlScope=null;if((UIP.tlMode||'kanban')==='matrix')UIP.tlMode='kanban';UI.scrollEp=i;goMode('tl')}
}
function wkEpisodesOf(o){      // 이 인물 · 설정이 나온 화
  if(o==='work')return [];const set=new Set();cardsOf(o).forEach(c=>{const e=episodeOf(c.id);if(e)set.add(e.i)});return [...set].sort((a,b)=>a-b);
}
function wkBack(k,ref){return wikiRows().filter(r=>r.body.includes(`data-k="${k}" data-ref="${ref}"`))}
function wkBackEl(row,owner){
  const back=row?wkBack('row',row.id):wkBack('ent',owner),eps=wkEpisodesOf(owner);
  const rowLink=r=>h('button',{class:'wkbl',onclick:()=>goWikiRow(r.id)},`${wkOwnerName(rowOwner(r))} › ${r.title||'제목 없음'}`);
  return h('div',{class:'wkback'},
    h('div',{},h('b',{},row?'이 행을 가리키는 행':'이 인물 · 설정을 가리키는 행'),back.length?h('div',{class:'wkbls'},...back.slice(0,12).map(rowLink)):h('span',{class:'muted'},'아직 없어요 · 다른 행에서 [[ 로 연결해요')),
    owner!=='work'?h('div',{},h('b',{},`${wkOwnerName(owner)}이(가) 나온 화`),eps.length?h('div',{class:'wkeps'},...eps.slice(0,24).map(i=>h('button',{class:'wkep',title:S.episodes[i].title||'',onclick:()=>{UI.tlScope=null;if((UIP.tlMode||'kanban')==='matrix')UIP.tlMode='kanban';UI.scrollEp=i;goMode('tl')}},h('em',{},i+1),S.episodes[i].title||'화'))):h('span',{class:'muted'},'아직 화에 넣은 카드가 없어요')):null);
}
function wkCrumb(p,extra){
  const segs=[h('button',{class:'wkcb',onclick:()=>wkSetPath([p[0]])},wkOwnerName(p[0]))];
  p.slice(1).forEach((id,j)=>{const r=rowById(id);segs.push(h('i',{},'›'),h('button',{class:'wkcb',onclick:()=>wkSetPath(p.slice(0,j+2))},r.title||'제목 없음'))});
  const cols=document.querySelector('#mid .wkcols');
  return h('div',{class:'wkcrumb'},h('div',{class:'wkcbs'},...segs),h('span',{class:'sp'}),...(extra||[]));
}
function wkOwnerPage(ed,o){
  const c=charById(o),rows=rowKids(o,null),memos=wkMemos(o),p=[o];
  ed.append(wkCrumb(p,[h('button',{class:'cbtn',title:'이 인물 · 설정의 위키를 .md로 내보내기',onclick:()=>exportWikiMd({owner:o})},icon('download'))]));
  const doc=h('div',{class:'wkdoc'});
  doc.append(...[h('div',{class:'wkoh'},wkOwnerIc(o),h('h2',{class:'wkot'},wkOwnerName(o)),c?h('span',{class:'wkkind'},c.kind==='setting'?'설정':(c.role||'인물')):null),
    c&&c.summary?h('p',{class:'wksum'},c.summary):o==='work'?h('p',{class:'wksum'},'어느 인물 · 설정에도 묶이지 않는 이야기 — 시대 배경, 세계의 규칙, 연재 메모 같은 것'):null,
    h('div',{class:'wkstat'},h('span',{},`행 ${wkCount(o)}개`),memos.length?h('button',{class:'wkmb'+(UI.wpOwner===o?' on':''),onclick:()=>{UI.wpOwner=UI.wpOwner===o?null:o;renderPool();renderMid()}},`정리할 메모 ${memos.length}장`):h('span',{class:'muted'},'정리할 메모 없음'),
      h('span',{class:'sp'}),h('button',{class:'on',onclick:()=>wkNewRow(o,null)},'＋ 새 행'))].filter(Boolean));
  const grid=h('div',{class:'wkcards'});
  rows.forEach(r=>{const t=wkText(r.body),n=rowDesc(r.id).length;
    grid.append(h('button',{class:'wkcard',onclick:()=>wkSetPath([o,r.id])},h('b',{},r.from?h('span',{class:'fm'},'✎ '):null,r.title||'제목 없음'),t?h('span',{class:'s'},t.slice(0,90)):h('span',{class:'s muted'},'본문 없음'),n?h('small',{},`하위 행 ${n}개`):null))});
  if(!rows.length)grid.append(h('div',{class:'wkempty big'},'아직 행이 없어요. 오른쪽 메모를 왼쪽 열에 끌어 놓거나, 메모의 ‘위키로 ▸’를 누르거나, ＋ 새 행을 만들어요.'));
  doc.append(grid);ed.append(doc,wkBackEl(null,o));
}
function wkEditor(ed,r,p){
  const cs=wkFrom(r),owner=p[0];
  ed.append(wkCrumb(p,[h('button',{class:'cbtn','data-pop':'1',title:'메뉴',onclick:e=>wkRowMenu(e.currentTarget,r)},icon('more'))]));
  const body=h('div',{class:'wkbody',contenteditable:'true',spellcheck:'false','data-ph':'여기에 정리해요 · [[ 로 인물 · 설정 · 다른 행 · 화를 연결'});
  body.innerHTML=wkClean(r.body);wkLinksFix(body,true);
  const tb=wkToolbar(body);
  const title=h('textarea',{class:'wktitle autofit',rows:1,placeholder:'제목',maxlength:200,
    oninput:e=>{const v=e.target.value.replace(/\n/g,' ');edit(()=>{r.title=v;r.updated=Date.now()});fitOne(e.target);document.querySelectorAll(`#mid .wkrow[data-row="${r.id}"] .t`).forEach(t=>{t.textContent=v||'제목 없음';t.classList.toggle('none',!v)});const cb=document.querySelector('#mid .wkcbs .wkcb:last-child');if(cb)cb.textContent=v||'제목 없음'},
    onkeydown:e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();body.focus();const s=getSelection();s.selectAllChildren(body);s.collapseToStart()}}},r.title);
  const meta=h('div',{class:'wkmeta'},
    cs.length?h('span',{class:'wkfrom',title:'이 행은 메모에서 만들었어요'},`✎ 메모에서${cs.length>1?` ${cs.length}장`:''} · ${wkDate(r.created)}`):null,
    cs.length?h('button',{class:'wkml',onclick:()=>frOpen(cs[0].id,'left')},'원본 메모 보기'):null,
    cs.length?h('button',{class:'wkml',onclick:()=>wkRevert(r.id)},'메모로 되돌리기'):null,
    h('span',{class:'muted'},`고친 날 ${wkDate(r.updated)}`));
  const doc=h('div',{class:'wkdoc'},title,meta,body);
  ed.append(tb,doc,wkBackEl(r,owner));
  const flush=()=>{clearTimeout(WKSAVE);WKSAVE=0;const v=wkClean(body.innerHTML);if(v!==r.body)edit(()=>{r.body=v;r.updated=Date.now()})};
  body.addEventListener('input',e=>{body.classList.toggle('empty',wkEmpty(body));clearTimeout(WKSAVE);WKSAVE=setTimeout(flush,350);wkAcCheck(body,r)});
  body.addEventListener('blur',()=>{flush();setTimeout(()=>{if(document.activeElement!==body)wkAcClose()},120)});
  body.addEventListener('keydown',e=>wkBodyKey(e,body,r,flush));
  body.addEventListener('paste',e=>{e.preventDefault();const d=e.clipboardData,ht=d.getData('text/html'),tx=d.getData('text/plain');
    document.execCommand('insertHTML',false,ht?wkClean(ht):textToHtml(tx).replace(/^<p>|<\/p>$/g,'').replace(/<\/p><p>/g,'<br>'))});
  body.addEventListener('click',e=>{const a=e.target.closest('a.lk');if(a){e.preventDefault();wkGoLink(a)}});
  body.classList.toggle('empty',wkEmpty(body));
  try{document.execCommand('defaultParagraphSeparator',false,'p')}catch(x){}
  requestAnimationFrame(()=>{fitOne(title);
    if(UI.wkEdit===r.id){UI.wkEdit=null;if(UI.wkTitle||!r.title){UI.wkTitle=false;title.focus()}else{body.focus();const s=getSelection();s.selectAllChildren(body);s.collapseToEnd()}}});
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
function wkBodyKey(e,body,r,flush){
  if(WKAC&&wkAcKey(e))return;
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
  }
}

/* ---------- [[ 연결 자동 완성 ---------- */
let WKAC=null;
function wkCands(q,selfId){
  const k=nameKey(q),out=[];
  S.characters.forEach(c=>{const hit=!k||[c.name,...(c.aliases||[])].some(x=>nameKey(x).includes(k));if(hit)out.push({k:'ent',ref:c.id,label:c.name,sub:c.kind==='setting'?'설정':'인물',ic:c.icon||'',col:c.color,score:nameKey(c.name).startsWith(k)?0:1})});
  wikiRows().forEach(r=>{if(r.id===selfId||!r.title)return;if(!k||nameKey(r.title).includes(k))out.push({k:'row',ref:r.id,label:r.title,sub:'행 · '+wkOwnerName(rowOwner(r)),ic:'📄',score:nameKey(r.title).startsWith(k)?2:3})});
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
  const own=UI.wpOwner&&(UI.wpOwner==='work'||charById(UI.wpOwner))?UI.wpOwner:(UI.wpOwner=null);
  const all=wkMemos(own==null?null:own);
  const ord=c=>{const d=graveLeft(c);return d?d:9};
  all.sort((a,b)=>ord(a)-ord(b)||(b.star?1:0)-(a.star?1:0)||(b.created||0)-(a.created||0));      // 곧 무덤 갈 메모가 맨 위 → 별 → 최신
  const wk=S.kinds.filter(k=>kindDest(k)==='wiki'),qk=(wk.find(k=>k.id===UI.wqkind)||wk[0]);
  p.append(h('div',{class:'phead'},h('b',{title:'아직 위키에 넣지 않은 메모'},'정리할 메모'),h('small',{class:'wkpn'},`${all.length}장`),h('span',{class:'sp'}),ptog('pool')));
  const qi=h('input',{placeholder:qk?`한 줄 쓰고 Enter → ${qk.name}`:'위키로 가는 분류가 없어요',disabled:!qk,
    onkeydown:e=>{if(e.key!=='Enter'||e.isComposing||!qk)return;const v=qi.value.trim();if(!v)return;
      act(()=>{const c=newCard(qk.id,v);autoLinkCard(c);if(own&&own!=='work'&&!eff(c).includes(own))c.chars.push(own);S.cards.unshift(c)});setTimeout(()=>{const i=document.querySelector('#pool .wkpq input');if(i)i.focus()})}});
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
  const rows=rowKids(c.id,null),n=wkMemos(c.id).length;
  return h('div',{class:'sgrp wksheet'},
    h('div',{class:'wksh'},h('b',{},'위키'),h('span',{class:'muted'},`행 ${wkCount(c.id)}개${n?` · 정리할 메모 ${n}장`:''}`),h('span',{class:'sp'}),h('button',{class:'quiet',onclick:()=>goWikiOwner(c.id)},'위키에서 열기 ›')),
    rows.length?h('div',{class:'wkshl'},...rows.slice(0,8).map(r=>h('button',{class:'wkbl',onclick:()=>goWikiRow(r.id)},r.from?'✎ ':'',r.title||'제목 없음')),rows.length>8?h('span',{class:'muted'},`외 ${rows.length-8}개`):null)
      :h('p',{class:'muted wkshe'},c.kind==='setting'?'세계관 · 장소 · 조직 · 규칙은 위키 탭에서 행으로 정리해요.':'설정 · 비밀 · 메모는 위키 탭에서 행으로 정리해요.'));
}

/* ---------- 쓰는 중에 위키 엿보기: 인물 · 설정 표시(data-ent)에 마우스를 올리면 그 위키 행 목록 ---------- */
let WKPEEK=null,WKPEEKT=0,WKPEEKH=0;
function wkPeekHide(){clearTimeout(WKPEEKT);if(WKPEEK){WKPEEK.remove();WKPEEK=null}}
function wkPeekShow(t){
  const o=t.dataset.ent;if(!charById(o))return;
  wkPeekHide();
  const rows=rowKids(o,null),memos=wkMemos(o).length,box=h('div',{class:'wkpeek'});
  const prev=h('div',{class:'wkpv'});
  const item=(r,d)=>{const b=h('button',{class:'wkpr',style:`--d:${d}`,onclick:()=>{const on=b.classList.toggle('on');box.querySelectorAll('.wkpr').forEach(x=>{if(x!==b)x.classList.remove('on')});
      prev.innerHTML=on?wkClean(r.body)||'<p class="muted">본문이 비어 있어요</p>':'';wkLinksFix(prev);prev.classList.toggle('on',on)}},r.from?'✎ ':'',r.title||'제목 없음');return b};
  const lst=h('div',{class:'wkpl2'});
  const walk=(list,d)=>list.forEach(r=>{if(lst.children.length>=14)return;lst.append(item(r,d));if(d<2)walk(rowKids(null,r.id),d+1)});walk(rows,0);
  box.append(h('div',{class:'wkph'},wkOwnerIc(o),h('b',{},wkOwnerName(o)),h('span',{class:'sp'}),h('button',{class:'quiet',onclick:()=>{wkPeekHide();goWikiOwner(o)}},'위키에서 열기 ›')),
    rows.length?lst:h('div',{class:'muted wkpe'},'아직 위키 행이 없어요'),prev,
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
  const inl=n=>[...n.childNodes].map(x=>{if(x.nodeType===3)return x.data.replace(/ /g,' ');const t=x.tagName.toLowerCase(),c=inl(x);
    return t==='b'?`**${c}**`:t==='i'?`*${c}*`:t==='s'?`~~${c}~~`:t==='mark'?`==${c}==`:t==='br'?'  \n':t==='a'?`[[${x.textContent}]]`:c}).join('');
  const out=[];
  [...d.children].forEach(b=>{const t=b.tagName.toLowerCase();
    if(t==='h3')out.push(`**${inl(b)}**`,'');else if(t==='h4')out.push(`*${inl(b)}*`,'');
    else if(t==='ul'||t==='ol'){[...b.children].forEach((li,i)=>out.push(`${t==='ol'?(i+1)+'.':'-'} ${inl(li)}`));out.push('')}
    else if(t==='blockquote')out.push(...inl(b).split('\n').map(x=>'> '+x),'');
    else out.push(inl(b),'')});
  return out.join('\n').trim();
}
function exportWikiMd(opt={}){
  const L=[],rowMd=(r,d)=>{L.push(`${'#'.repeat(Math.min(6,d))} ${r.title||'제목 없음'}`,'');const b=wkMd(r.body);if(b)L.push(b,'');rowKids(null,r.id).forEach(x=>rowMd(x,d+1))};
  let name='wiki';
  if(opt.row){const r=rowById(opt.row);if(!r)return;name='wiki-'+(r.title||'row').slice(0,20);L.push(`> ${wkOwnerName(rowOwner(r))} · 내보낸 날짜: ${new Date().toLocaleString()}`,'');rowMd(r,1)}
  else{const owners=opt.owner?[opt.owner]:[...S.characters.map(c=>c.id),'work'];
    L.push(`# ${opt.owner?wkOwnerName(opt.owner)+' · 위키':'위키'}`,'',`> 내보낸 날짜: ${new Date().toLocaleString()}`,'');
    owners.forEach(o=>{const rs=rowKids(o,null);if(!rs.length)return;if(!opt.owner)L.push(`## ${wkOwnerName(o)}`,'');rs.forEach(r=>rowMd(r,opt.owner?2:3))});
    if(opt.owner)name='wiki-'+wkOwnerName(opt.owner)}
  if(L.length<5&&!opt.row)return toast('내보낼 위키 행이 없어요');
  dlBlob(`${fileBase()}-${name.replace(/[\\/:*?"<>|]/g,'_')}-${todayStr()}.md`,new Blob([L.join('\n')],{type:'text/markdown'}));toast('위키를 Markdown으로 내보냈어요');
}

registerMidView({id:'wiki',order:5,match:()=>UI.mode==='wiki',appClass:()=>'m-wiki',render:renderWiki});      // 위키
addEventListener('resize',()=>{const c=document.querySelector('#mid .wkcols');if(c&&UI.mode==='wiki')wkFit(c)});
