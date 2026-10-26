/* 끌어다 놓을 자리 미리보기: 들어갈 자리에 점선 빈칸이 열리고 아래 카드들이 부드럽게 비켜 줌 */
let GHOST=null;
/* 끌고 있는 동안: 화면(스크롤 영역) 위 · 아래 가장자리에 가면 저절로 스크롤, 휠도 먹음 */
const AS={x:0,y:0,raf:0};
function scrollerAt(x,y,axis){let el=document.elementFromPoint(x,y);while(el&&el!==document.body&&el!==document.documentElement){const cs=getComputedStyle(el);
  if(axis==='y'?(/(auto|scroll)/.test(cs.overflowY)&&el.scrollHeight>el.clientHeight+2):(/(auto|scroll)/.test(cs.overflowX)&&el.scrollWidth>el.clientWidth+2))return el;el=el.parentElement}return null}
function asStep(){AS.raf=0;if(!DRAG&&!BRDRAG)return;let moved=false;
  const edge=(r0,r1,v)=>{const e=Math.min(90,(r1-r0)*.28);return v<r0+e?-Math.pow(1-(v-r0)/e,1.4):(v>r1-e?Math.pow(1-(r1-v)/e,1.4):0)};
  const sy=scrollerAt(AS.x,AS.y,'y');if(sy){const r=sy.getBoundingClientRect(),d=edge(r.top,r.bottom,AS.y);if(d){sy.scrollTop+=Math.round(d*26);moved=true}}
  const sx=scrollerAt(AS.x,AS.y,'x');if(sx){const r=sx.getBoundingClientRect(),d=edge(r.left,r.right,AS.x);if(d){sx.scrollLeft+=Math.round(d*26);moved=true}}
  if(moved&&(DRAG||BRDRAG))AS.raf=requestAnimationFrame(asStep)}
document.addEventListener('dragover',e=>{if(!DRAG&&!BRDRAG)return;AS.x=e.clientX;AS.y=e.clientY;if(!AS.raf)AS.raf=requestAnimationFrame(asStep)},true);
document.addEventListener('wheel',e=>{if(!DRAG&&!BRDRAG)return;const sc=scrollerAt(e.clientX,e.clientY,'y');if(sc){sc.scrollTop+=e.deltaMode===1?e.deltaY*40:e.deltaY;e.preventDefault()}},{capture:true,passive:false});
/* 카드와 카드 사이 · 위쪽 여백에 놓을 때: 마우스 높이로 들어갈 자리를 정함 (빈칸이 밀어낸 만큼은 빼고 계산해서 안정적) */
function ghostByY(body,y){
  const gh=GHOST&&GHOST.parentNode===body&&GHOST.classList.contains('on')?GHOST:null;
  const gs=gh?gh.offsetHeight+(parseFloat(getComputedStyle(gh).marginBottom)||0):0;
  let before=null;
  for(const c of body.children){if(c===GHOST||!(c.classList.contains('kcard')||c.classList.contains('brfork'))||c.classList.contains('dragging')||(DRAG&&c.dataset.id===DRAG.id))continue;
    const r=c.getBoundingClientRect(),shift=(gh&&(gh.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING))?gs:0;
    if(y<r.top-shift+r.height/2){before=c;break}}
  ghostPlace(body,before);
}
const ghostNext=g=>{let nx=g&&g.nextElementSibling;while(nx&&(nx.classList.contains('dragging')||nx.classList.contains('dghost')||(DRAG&&nx.dataset&&nx.dataset.id===DRAG.id)))nx=nx.nextElementSibling;return nx};      // 끌고 있는 카드 자신은 건너뜀
const ghostBeforeId=body=>{const g=GHOST&&GHOST.parentNode===body?GHOST:null;const nx=ghostNext(g);return nx&&nx.dataset&&nx.dataset.id?nx.dataset.id:null};
/* 화 · 보관 칸의 머리 · 여백 · 카드 위쪽에도 놓을 수 있게 (카드 목록 바깥도 같은 규칙) */
function bindColDrop(box,body,place){
  box.addEventListener('dragover',e=>{if(DRAG&&!body.contains(e.target)){e.preventDefault();ghostByY(body,e.clientY)}});
  box.addEventListener('drop',e=>{if(!DRAG||body.contains(e.target))return;e.preventDefault();const id=DRAG.id,nb=ghostBeforeId(body);DRAG=null;place(id,nb)});
}
let GHOST_T=0;
function ghostClearSoon(){clearTimeout(GHOST_T);GHOST_T=setTimeout(ghostClear,160)}      // 잠깐 벗어났다가 돌아오는 경우엔 닫지 않음
function ghostClear(){clearTimeout(GHOST_T);if(!GHOST)return;const g=GHOST;GHOST=null;g.classList.remove('on');g.classList.add('off');setTimeout(()=>g.remove(),240)}
function ghostPlace(body,before){
  clearTimeout(GHOST_T);
  if(GHOST&&GHOST.parentNode===body&&GHOST.nextElementSibling===(before||null)&&!GHOST.classList.contains('off'))return;
  if(GHOST&&GHOST.isConnected&&!GHOST.classList.contains('off')&&before!==GHOST){body.insertBefore(GHOST,before||null);return}      // 열린 빈칸은 닫지 않고 새 자리로 그대로 옮김 (열렸다 닫혔다 떨림 방지)
  ghostClear();
  const c=DRAG&&cardById(DRAG.id),t=c?(c.text||'').replace(/\s+/g,' ').trim().slice(0,40):'';
  const g=h('div',{class:'dghost'},h('span',{},'여기에 들어가요'),t?h('em',{},' · '+t):null);
  g.addEventListener('dragover',e=>{if(DRAG){e.preventDefault();e.stopPropagation();clearTimeout(GHOST_T)}});      // 빈칸 위에 마우스가 있어도 자리를 그대로 (끝으로 튀지 않게)
  g.addEventListener('drop',e=>{if(!DRAG)return;e.preventDefault();e.stopPropagation();
    const nx=ghostNext(g),nextId=nx&&nx.dataset?nx.dataset.id||null:null,body=g.parentNode,id=DRAG.id;DRAG=null;
    const shelfId=body.closest('.shelf')&&body.closest('.shelf').dataset.sh,epEl=body.closest('[data-ep]');
    if(shelfId)shelfPlace(id,shelfId,nextId);else if(epEl&&S.episodes[+epEl.dataset.ep])placeCard(id,S.episodes[+epEl.dataset.ep].id,nextId)});
  body.insertBefore(g,before||null);GHOST=g;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(g.parentNode)g.classList.add('on')}));
}
document.addEventListener('dragend',()=>{ghostClear();document.querySelectorAll('.bghost').forEach(x=>x.remove())},true);
document.addEventListener('drop',()=>{setTimeout(()=>{ghostClear();document.querySelectorAll('.bghost').forEach(x=>x.remove())},0)},true);      // 놓는 처리가 빈칸 위치를 읽은 다음에 정리 (먼저 지우면 항상 맨 끝으로 들어갔음)
