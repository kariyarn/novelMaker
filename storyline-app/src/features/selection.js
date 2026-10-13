/* 포스트잇 선택: 한 번 누르면 선택 (⌘⌫로 삭제) · 빈 곳 클릭 / Esc로 해제 */
let SELCARD=null;
/* 편집 중인 포스트잇 위에서 휠: 그 노트 안에서만 스크롤. 끝에 닿아도 바깥(보드 · 칸반 · 목록)으로 넘어가지 않음 — 편집을 마치거나 바깥을 누르면 풀림 */
document.addEventListener('wheel',e=>{
  if(e.ctrlKey||e.metaKey)return;
  const ed=e.target.closest&&e.target.closest('.kcard.editing');if(!ed)return;
  const ta=ed.querySelector('textarea.ktext,textarea.fval');
  e.stopPropagation();e.preventDefault();
  if(!ta)return;const max=ta.scrollHeight-ta.clientHeight;
  if(max>1&&e.deltaY)ta.scrollTop=Math.max(0,Math.min(max,ta.scrollTop+(e.deltaMode===1?e.deltaY*40:e.deltaY)));
},{capture:true,passive:false});
document.addEventListener('pointerdown',e=>{      // 노트 · 메뉴 · 팝업 바깥을 누르면 선택 강조를 풀어줌
  if(!SELCARD&&!document.querySelector('.kcard.selc'))return;
  if(e.target.closest&&e.target.closest('.kcard,.pop,.dlg,#modal,.toast'))return;selectCard(null)},true);
function selectCard(id){SELCARD=id;document.querySelectorAll('.kcard.selc').forEach(x=>{if(x.dataset.id!==id)x.classList.remove('selc')});if(id)document.querySelectorAll(`.kcard[data-id="${id}"]`).forEach(x=>x.classList.add('selc'))}
/* 여러 장 선택 (⌘ 또는 ⇧ + 클릭): 보드 · 오른쪽 목록 · 타임라인 어디서든 → 아래 막대에서 한꺼번에 화로 옮기기 */
const MSEL=new Set();
const msPrune=()=>{[...MSEL].forEach(id=>{if(!cardById(id))MSEL.delete(id)});(S.shelves||[]).forEach(x=>{if(x.cardIds.some(id=>!cardById(id)))x.cardIds=x.cardIds.filter(id=>cardById(id))})};
function msToggle(id){if(MSEL.has(id))MSEL.delete(id);else MSEL.add(id);document.querySelectorAll(`.kcard[data-id="${id}"]`).forEach(e=>e.classList.toggle('msel',MSEL.has(id)));msRender()}
function msClear(){MSEL.clear();document.querySelectorAll('.kcard.msel').forEach(e=>e.classList.remove('msel'));msRender()}
document.addEventListener('pointerdown',e=>{
  if(!(modKey(e)||e.shiftKey)||e.button!==0)return;
  const c=e.target.closest&&e.target.closest('.kcard[data-id]');if(!c||c.classList.contains('editing'))return;
  if(e.target.closest('select,button,input,.stars,.rz,a'))return;
  e.preventDefault();e.stopPropagation();msToggle(c.dataset.id);
  addEventListener('pointerup',()=>{const sup=ev=>{ev.stopPropagation();ev.preventDefault()};addEventListener('click',sup,{capture:true,once:true});setTimeout(()=>removeEventListener('click',sup,true),80)},{once:true,capture:true})},true);      // 같은 클릭의 뒤따르는 click만 막음
function msMove(ids,target,after){      // target: {ep:index} | {newAfter:index} | {newEnd:true} · after: 같은 되돌리기 안에서 할 뒷처리
  const list=ids.filter(cardById);if(!list.length)return;
  list.forEach(id=>{const c=cardById(id);if(c)ensureKindVisible(c.kind)});
  act(()=>{
    detach(list);
    let ep;
    if(target.newEnd){ep=newEp();S.episodes.push(ep)}
    else if(target.newAfter!=null){ep=newEp();S.episodes.splice(target.newAfter+1,0,ep)}
    else ep=S.episodes[target.ep];
    list.forEach(id=>ep.cardIds.push(id));
    if(after)after();
    UI.scrollEp=S.episodes.indexOf(ep)});
  const n=list.length,at=S.episodes.findIndex(e=>e.cardIds.includes(list[0]));
  MSEL.clear();toast(`${n}장을 ${at+1}화로 옮겼어요`,{undo:true});msRender();
}
async function msShelve(ids,shelfId,after){
  const list=ids.filter(cardById);if(!list.length)return;
  let sh=S.shelves.find(x=>x.id===shelfId);
  if(shelfId==='__ask'||shelfId==='__new'||!sh){
    let name='보관';if(shelfId==='__ask'){name=((await askText('보관 칸 이름 (예: 25화쯤, 30화 이후)','보관'))||'').trim();if(!name)return}
    snap();sh={id:uid(),name,cardIds:[]};S.shelves.push(sh)}
  act(()=>{detach(list);sh.cardIds.push(...list);if(after)after()});
  MSEL.clear();toast(`${list.length}장을 ‘${sh.name}’ 칸에 보관했어요`,{undo:true});msRender();
}
async function msMenu(btn,only){
  const ids=only||[...MSEL],E=S.episodes,here=[...new Set(ids.map(id=>{const e=episodeOf(id);return e?e.i:-1}).filter(i=>i>=0))].sort((a,b)=>a-b);
  const items=only?[{title:only.length>1?`${only.length}장을 보낼 화`:'이 카드를 보낼 화'}]:[];
  if(here.length)items.push({label:`${here[here.length-1]+1}화 다음에 새 화로`,fn:()=>msMove(ids,{newAfter:here[here.length-1]})});
  items.push({label:'맨 뒤에 새 화로',fn:()=>msMove(ids,{newEnd:true})},{label:'화 번호 입력…',fn:async()=>{
      const v=parseInt(await askText(`몇 화로 보낼까요? (1~${E.length||1})`,String(here[0]!=null?here[0]+1:E.length)),10);
      if(!(v>=1))return;if(v>E.length)return msMove(ids,{newEnd:true});msMove(ids,{ep:v-1})}});
  items.push('sep',{title:'보관 (화 번호 없이 모아두기)'});
  (S.shelves.length?S.shelves:[{id:'__new',name:'보관'}]).forEach(x=>items.push({label:`보관 · ${x.name}`,fn:()=>msShelve(ids,x.id)}));
  items.push({label:'새 보관 칸…',fn:()=>msShelve(ids,'__ask')});
  const show=[...new Set([...here,...E.map((_,i)=>i).slice(-8)])].filter(i=>E[i]).sort((a,b)=>b-a).slice(0,12);
  if(show.length){items.push('sep',{title:'바로 보내기'});show.forEach(i=>items.push({label:`${i+1}화${E[i].title?' · '+E[i].title:''}`,fn:()=>msMove(ids,{ep:i})}))}
  popMenu(btn,items);
}
function msRender(){
  syncShelfSel();
  let bar=document.getElementById('msel');
  if(!MSEL.size){if(bar)bar.remove();return}
  if(!bar){bar=h('div',{id:'msel'});document.body.append(bar)}
  bar.replaceChildren(h('b',{},`${MSEL.size}장 선택`),
    (()=>{const b=h('button',{class:'on','data-pop':'1',onclick:()=>msMenu(b)},'화로 보내기 ▾');return b})(),
    h('button',{class:'quiet',onclick:msClear},'해제'));
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&MSEL.size&&!document.querySelector('.dlg')&&!POP){msClear()}},true);
