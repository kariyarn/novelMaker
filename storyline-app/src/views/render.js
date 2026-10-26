/* ============ 렌더 ============ */
const FS_OK=window.CSS&&CSS.supports('field-sizing','content');      // 지원하면 높이를 CSS가 알아서 맞춤
const fitOne=t=>{if(FS_OK)return;t.style.height='auto';t.style.height=(t.scrollHeight+t.offsetHeight-t.clientHeight)+'px'};      // 테두리 두께까지 더해야 마지막 줄이 안 잘림
function fitAll(root){      // 읽기/쓰기를 모아서 처리 (칸마다 번갈아 하면 매우 느려짐)
  if(FS_OK)return;
  const list=[...(root||document).querySelectorAll('textarea.autofit')].filter(t=>t.offsetParent);
  list.forEach(t=>{t.style.height='auto'});
  const hs=list.map(t=>t.scrollHeight+t.offsetHeight-t.clientHeight);
  list.forEach((t,i)=>{t.style.height=hs[i]+'px'});
}
/* 카드가 들어가고 움직일 때 부드럽게 (FLIP): 다시 그리기 전 위치를 기억했다가, 새 위치로 미끄러지게 */
let FLIPON=false;
function flipRecord(){
  if(document.hidden)return null;const rec={};let n=0;
  document.querySelectorAll('#pool .kcard[data-id],#mid .kcard.tl[data-id]').forEach(el=>{if(n++>160)return;const r=el.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;rec[(el.closest('#pool')?'p':'m')+el.dataset.id]=[r.left,r.top]});
  return n?rec:null;
}
function flipPlay(rec){
  if(!rec||!Element.prototype.animate||matchMedia('(prefers-reduced-motion: reduce)').matches)return;let n=0;
  document.querySelectorAll('#pool .kcard[data-id],#mid .kcard.tl[data-id]').forEach(el=>{
    if(n>60)return;const k=(el.closest('#pool')?'p':'m')+el.dataset.id,r=el.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;
    const o=rec[k]||(k[0]==='m'?rec['p'+el.dataset.id]:null);
    if(o){const dx=o[0]-r.left,dy=o[1]-r.top;if(Math.abs(dx)<2&&Math.abs(dy)<2)return;n++;
      el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{duration:300,easing:'cubic-bezier(.2,.8,.2,1)'})}
    else if(Object.keys(rec).length){n++;el.animate([{opacity:0,transform:'translateY(-10px) scale(.97)'},{opacity:1,transform:'none'}],{duration:260,easing:'cubic-bezier(.2,.8,.2,1)'})}
  });
}
function renderAll(){
  const _fl=flipRecord();FLIPON=true;try{renderAll0()}finally{FLIPON=false}flipPlay(_fl);
}
/* 상태가 바뀌면 다시 그림 · 저장 상태를 위쪽 표시에 반영 (history.js 가 알려 줌) */
onStateChange(()=>renderAll());
/* 새 디자인의 위쪽 “자동 저장됨” 표시 (기존 디자인에서는 자리가 없어서 아무 일도 안 함) */
function savedMark(st){const e=$('savedInd');if(!e)return;e.dataset.st=st;e.lastChild.textContent=st==='saving'?'저장 중…':st==='fail'?'저장 실패':'자동 저장됨'}
onSaveStatus(st=>{if(st==='fail')toast('저장 실패! 백업을 내려받아 주세요');savedMark(st)});
/* 가운데 화면 등록: 화면마다 언제 보일지(match) · 앱 테두리 class · 그리는 함수를 각자 파일에서 등록. 새 화면을 더해도 이 파일은 고치지 않아도 됨
   order 가 작은 것부터 match 를 물어 처음 맞는 화면을 씀 */
const MID_VIEWS=[];
const midOffs=[];
const onMidClear=fn=>{midOffs.push(fn)};      // 가운데 화면이 document · 타이머에 건 것을 다음에 다시 그리기 전에 정리
function midClear(){midOffs.splice(0).forEach(f=>{try{f()}catch(e){}})}
function registerMidView(v){MID_VIEWS.push(v);MID_VIEWS.sort((a,b)=>a.order-b.order)}
const midView=()=>MID_VIEWS.find(v=>v.match());
function renderMid(){
  const m=$('mid');
  const SC='.tlcols,.tlline,.tlmx,.ftabwrap,.shelfwrap',keep={},kb={};      // 다시 그려도 보던 스크롤 위치 그대로 (화 · 보관 칸 안의 스크롤 포함)
  m.querySelectorAll(SC).forEach(el=>{keep[el.className.split(' ')[0]]=[el.scrollLeft,el.scrollTop]});
  const bkey=el=>{const p=el.closest('[data-ep],[data-sh]');return p?(p.dataset.ep!==undefined?'e'+p.dataset.ep:'s'+p.dataset.sh):null};
  m.querySelectorAll('.tlbody').forEach(el=>{const k=bkey(el);if(k&&el.scrollTop)kb[k]=el.scrollTop});
  midClear();m.innerHTML='';
  midView().render(m);
  fitAll(m);syncBoard();hlLayoutAll(m);      // 다시 그린 뒤 글 높이를 다시 맞춤
  m.querySelectorAll(SC).forEach(el=>{const k=keep[el.className.split(' ')[0]];if(k){el.scrollLeft=k[0];el.scrollTop=k[1]}});
  m.querySelectorAll('.tlbody').forEach(el=>{const k=bkey(el);if(k&&kb[k])el.scrollTop=kb[k]});
  if(UI.scrollEp!=null){const i=UI.scrollEp;UI.scrollEp=null;      // 새로 만든 화로 부드럽게 이동
    const el=m.querySelector(`.tlcol[data-ep="${i}"],.tlseg[data-ep="${i}"]`);if(el){el.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});flashEl(el);const t=el.querySelector('.tlhead input');if(t)setTimeout(()=>t.focus({preventScroll:true}),350)}}
}
function renderAll0(){
  idxClear();msPrune();
  applySettings();renderTop();renderBanner();
  $('app').className=midView().appClass();
  applyLayout();
  renderLeft();renderSheet();renderMid();renderPool();
  fitAll();syncBoard();fitDock();hlLayoutAll();msRender();
  if(UI.focusCard){
    const el=document.querySelector(`.kcard[data-id="${UI.focusCard}"]`);
    if(el){if(el.classList.contains('board'))enterEdit(el);else enterEditList(el)}
    UI.focusCard=null;
  }
}
function goMode(k){
  UI.folderView=null;if(k==='graph'&&UI.mode!=='graph'){UI.prevMode=UI.mode;GC.reset()}      // 처음 열 때는 새로 자리 잡기
  if(k==='all'){if(UI.sel!=='all')UI.prevSel=UI.sel;UI.sel='all';UIP.pc=UIP.pc||{};UIP.pc.all=true}      // 전체 보기는 오른쪽 목록을 접고 시작
  else if(UI.sel==='all')UI.sel=(UI.prevSel&&(UI.prevSel==='none'||charById(UI.prevSel)))?UI.prevSel:firstEntity();
  UI.mode=k;renderAll();
}
function topMenuItems(){
  const items=[{label:'되돌리기',hint:'⌘Z',fn:undo},{label:'다시 하기',hint:'⌘⇧Z',fn:redo},
      'sep',{label:`휴지통${S.trash.length?' ('+S.trash.length+')':''}`,fn:showTrash},
      'sep',{label:'백업 파일 만들기',fn:exportJson},...(Repo.backups?[{label:'자동 백업에서 복구…',fn:showRestore}]:[]),{label:'불러오기 (.json)…',fn:()=>$('imp').click()},
      {label:'내보내기…',fn:()=>{UI.setTab='data';showSettings()}},
      'sep',...(Shell&&Shell.note?[{label:'포스트잇 모드',hint:'⌘⌥N',fn:()=>Shell.note.show()}]:[]),{label:'설정',hint:'⌘,',fn:showSettings},{label:'도움말',hint:'?',fn:showShortcuts}];
  if(!U2())return items;
  // 새 디자인: 하는 일 기준 3묶음 (편집 · 데이터 · 앱)
  const [u,r,,tr,,bk,...rest]=items,i=rest.indexOf('sep');
  return [{title:'편집'},u,r,tr,'sep',{title:'데이터'},bk,...rest.slice(0,i),'sep',{title:'앱'},...rest.slice(i+1)];
}
function renderTop2(t){      // 새 디자인 위쪽 바: 작품 이름 · 밑줄 탭 · 자동 저장됨 · 검색 · 메뉴
  t.append(...[brandEl(),S.demo?h('button',{class:'demotag',title:'예시 데이터예요 — 눌러서 지우고 시작',onclick:async()=>{if(await askConfirm('예시 데이터를 모두 지우고 빈 작품으로 시작할까요?'))clearDemo()}},'예시'):null,h('span',{class:'sp'}),
    tabs([['all','전체'],['story','구상'],['tl','타임라인'],['graph','관계망']],UI.mode,goMode),
    h('span',{class:'sp'}),
    h('span',{id:'savedInd',class:'saved','data-st':'saved',title:'작품마다 자동으로 저장돼요'},icon('check'),h('span',{},'자동 저장됨')),
    Shell&&Shell.note?h('button',{class:'cbtn topic',title:'포스트잇 모드 (⌘⌥N) — 작은 포스트잇 창만 띄우기',onclick:()=>Shell.note.show()},icon('sticky')):null,
    h('button',{class:'cbtn topic',title:'전체 검색 (⌘F)',onclick:openSearch},icon('search')),
    (()=>{const b=h('button',{class:'cbtn topic','data-pop':'1',title:'메뉴',onclick:()=>popMenu(b,topMenuItems())},icon('more'));return b})(),
    h('input',{id:'imp',type:'file',accept:'.json',style:'display:none',onchange:importJson})].filter(Boolean));
}
function renderTop(){
  const t=$('top');t.innerHTML='';
  if(U2())return renderTop2(t);
  t.append(...[brandEl(),S.demo?h('button',{class:'demotag',title:'예시 데이터예요 — 눌러서 지우고 시작',onclick:async()=>{if(await askConfirm('예시 데이터를 모두 지우고 빈 작품으로 시작할까요?'))clearDemo()}},'예시'):null,h('span',{class:'sp'}),
    seg([['all','전체 보기']],UI.mode,goMode),h('span',{class:'modegap'}),
    seg([['story','구상'],['tl','타임라인'],['graph','관계망']],UI.mode,goMode),
    h('span',{class:'sp'}),
    Shell&&Shell.note?h('button',{class:'cbtn topic',title:'포스트잇 모드 (⌘⌥N) — 작은 포스트잇 창만 띄우기',onclick:()=>Shell.note.show()},icon('sticky')):null,
    h('button',{class:'cbtn topic',title:'전체 검색 (⌘F)',onclick:openSearch},icon('search')),
    (()=>{const b=h('button',{class:'cbtn topic','data-pop':'1',title:'메뉴',onclick:()=>popMenu(b,topMenuItems())},icon('more'));return b})(),
    h('input',{id:'imp',type:'file',accept:'.json',style:'display:none',onchange:importJson})].filter(Boolean));      // 빈 자리(null)는 빼고 붙임
}
function renderBanner(){
  const b=$('banner');b.innerHTML='';b.classList.toggle('on',!!UI.noSave);
  if(!UI.noSave&&typeof appUpdBanner==='function'&&appUpdBanner(b)){b.classList.add('on');return}      // 새 앱 버전 알림
  if(UI.noSave)b.append(h('span',{},EM('⚠ ','alert'),'이 작품의 파일을 읽지 못해서 저장을 잠시 멈췄어요 (원본을 덮어쓰지 않기 위해서예요).'),
    h('button',{class:'quiet',onclick:showRestore},'백업에서 복구'),
    h('button',{class:'quiet',onclick:async()=>{if(await askConfirm('이 작품을 빈 상태로 시작할까요?\n(읽지 못한 기존 파일이 있다면 그 파일은 새 내용으로 바뀌어요)')){UI.noSave=false;saveNow();saveUIP();renderAll()}}},'빈 작품으로 시작'));
  else if(false)b.append(h('span',{},'예시 데이터로 보고 있어요. 마음껏 만져 보세요.'),h('button',{class:'quiet',onclick:async()=>{if(await askConfirm('예시 데이터를 모두 지우고 빈 프로젝트로 시작할까요?'))clearDemo()}},'예시 지우고 시작'));
}
function clearDemo(){snap();const keep=S.settings,kinds=S.kinds;S=migrate({characters:[],cards:[],episodes:[],kinds,settings:keep,demo:false});UI.sel='none';commit()}

/* 패널 너비 / 접기 */
const lineMode=()=>UI.mode==='tl'&&(UIP.tlMode||'kanban')==='line';
function lineAvail(){const lw=document.body.classList.contains('focus')?0:(UIP.cl.left?0:240)+1;return innerWidth-lw-1}      // 한 줄 모드: 타임라인 33~50% · 목록 50~67%
const lineR=()=>Math.min(typeof brWide==='function'&&brWide()?.5:.67,Math.max(.5,UIP.rwr||.67));      // 갈래를 펼쳐 둔 동안은 타임라인을 절반까지 넓힘 (본선 · 갈래를 나란히)
const LEFTW=300;      // 왼쪽 인물 · 설정 목록 기본 폭 (인물 시트 폭과는 따로)
const MIDMIN=460;      // 구상 보드가 이보다 좁아지지 않게 인물 시트 폭을 줄여서 보여 줌 (저장된 폭은 그대로라 창을 넓히면 돌아옴)
/* 오른쪽 목록 폭은 화면마다 따로 기억: 구상 · 타임라인 · 등장표 · 전체 (예전 하나짜리 값은 처음 값으로) */
function poolW(){UIP.rwm=UIP.rwm||{};return UIP.rwm[poolKey()]||UIP.rw||330}
function setPoolW(v){UIP.rwm=UIP.rwm||{};UIP.rwm[poolKey()]=v}
function sheetW(){
  const want=UIP.sw||340;if(UI.mode!=='story')return want;
  const left=UIP.cl.left?0:LEFTW,pool=poolClosed()?0:Math.min(poolW(),330);
  return Math.max(280,Math.min(want,innerWidth-left-pool-MIDMIN-3));
}
function maxPoolW(){const lw=UI.mode==='story'?(UIP.cl.left?0:LEFTW)+(UIP.cl.sheet?0:sheetW())+2:(UI.mode==='tl'?(UIP.cl.left?0:240)+2:0);return Math.max(330,innerWidth-lw-(lineMode()?500:440))}
function applyLayout(){
  const r=document.documentElement.style;
  r.setProperty('--lw',(UIP.cl.left&&UI.peek!=='left')?'0px':(UI.mode==='tl'?'240px':LEFTW+'px'));
  r.setProperty('--sw',(UIP.cl.sheet&&UI.peek!=='sheet')?'0px':sheetW()+'px');
  r.setProperty('--rw',(poolClosed()&&UI.peek!=='pool')?'0px':(lineMode()?Math.round(lineAvail()*lineR()):Math.min(poolW(),maxPoolW()))+'px');      // 가운데 보드가 너무 좁아지지 않게 제한
  r.setProperty('--tlw',(UIP.tlw||250)+'px');r.setProperty('--tll',(UIP.tll||420)+'px');
  hlLater();
}
/* 접힌 패널 살짝 보기: 아이콘에 마우스를 올리거나 포커스를 주면 잠깐 열리고, 벗어나면 다시 접힘 */
let PEEKT=0,PEEKC=0;
const peekW0=k=>k==='left'?(UI.mode==='tl'?240:LEFTW):k==='sheet'?sheetW():(lineMode()?Math.round(lineAvail()*lineR()):poolW());
function peekSoon(k){clearTimeout(PEEKT);PEEKT=setTimeout(()=>startPeek(k),420);const el=$(k);el.addEventListener('mouseleave',()=>clearTimeout(PEEKT),{once:true})}
function startPeek(k,fromKey){clearTimeout(PEEKT);clearTimeout(PEEKC);if(UI.peek===k)return;const old=UI.peek;UI.peek=k;applyLayout();if(old)rerenderPanel(old);rerenderPanel(k);
  if(fromKey)setTimeout(()=>{const t=$(k).querySelector('.ptog');if(t)t.focus({preventScroll:true})},0);      // 키보드로 열었다면 포커스를 패널 안으로 (벗어날 때 닫히도록)
  PEEKC=setTimeout(endPeekCheck,1600)}      // 아무도 안 보고 있으면 알아서 닫힘
function rerenderPanel(k){if(k==='left')renderLeft();else if(k==='sheet'){renderSheet();fitAll($('sheet'))}else renderPool()}
function peekWrap(k){
  const el=$(k),closed=k==='pool'?poolClosed():!!UIP.cl[k];
  el.classList.remove('peek');el.classList.toggle('peeking',UI.peek===k&&closed);
  if(UI.peek===k&&!closed)UI.peek=null;
}
function peekWrapOld(k){
  const el=$(k);el.classList.remove('peek');
  const closed=k==='pool'?poolClosed():!!UIP.cl[k];
  if(UI.peek!==k)return;if(!closed){UI.peek=null;return}
  const box=h('div',{class:'peekbox '+(k==='pool'?'pr':'pl'),style:`width:${peekW(k)}px`});
  while(el.firstChild)box.append(el.firstChild);el.append(box);el.classList.add('peek');
  const ic=k==='left'?(UI.mode==='tl'?'list':'people'):k==='sheet'?'sheet':'cards';
  box.prepend(h('button',{class:'ctab peekic '+(k==='pool'?'pr':'pl')+(k==='sheet'&&UIP.cl.left?' low':''),title:'눌러서 계속 펴 두기',onclick:()=>slidePanel(k,false)},icon(ic)));      // 아이콘을 누르면 곧 고정
  requestAnimationFrame(()=>{fitAll(box);hlLayoutAll(box)});
}
function endPeekCheck(){
  clearTimeout(PEEKC);if(!UI.peek)return;const el=$(UI.peek);
  const busy=el.matches(':hover')||el.contains(document.activeElement)||DRAG||DRAGE||DRAGF||POP||document.querySelector('.dlg')||$('modal').classList.contains('on');
  if(busy){PEEKC=setTimeout(endPeekCheck,400);return}
  const k=UI.peek;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){el.classList.add('fadeout');setTimeout(()=>{el.classList.remove('fadeout');if(UI.peek===k){UI.peek=null;applyLayout();rerenderPanel(k)}},140)}      // 닫힐 때도 스르르
  else{UI.peek=null;applyLayout();rerenderPanel(k)}
}
['left','sheet','pool'].forEach(id=>{const el=$(id);
  el.addEventListener('mouseenter',()=>clearTimeout(PEEKC));
  el.addEventListener('mouseleave',()=>{if(UI.peek===id)PEEKC=setTimeout(endPeekCheck,350)});
  el.addEventListener('focusout',()=>{if(UI.peek===id)PEEKC=setTimeout(endPeekCheck,350)});
});
document.addEventListener('dragend',()=>{if(UI.peek)PEEKC=setTimeout(endPeekCheck,350)});
/* 패널 열고 닫기: 닫을 땐 내용이 먼저 옅어지고, 열 땐 폭이 늘어난 뒤 내용이 스르르 나타남 */
/* 창이 좁아서 가운데 보드가 500px 아래가 되면 인물 시트를 자동으로 접고, 다시 넓어지면 펴줌 (직접 열어 둔 경우는 그대로 둠) */
function autoFitSheet(){
  if(UI.mode!=='story'||UI.folderView)return false;
  const left=UIP.cl.left?0:LEFTW,sw=Math.min(UIP.sw||340,340),pool=poolClosed()?0:Math.min(poolW(),maxPoolW());
  const fits=innerWidth-left-sw-pool-2>=500;
  if(!UIP.cl.sheet){if(fits){UIP.noAuto=false;return false}if(UIP.noAuto)return false;UIP.cl.sheet=true;UIP.autoSh=true;return true}
  if(UIP.autoSh&&fits){UIP.cl.sheet=false;UIP.autoSh=false;return true}
  return false;
}
function slidePanel(k,close){
  if(k==='sheet'){UIP.autoSh=false;if(!close)UIP.noAuto=true;const c=charById(UI.sel);if(c&&c.kind!=='setting')UIP.chCl=!!close}      // 인물 시트를 직접 접고 편 상태를 기억
  UI.peek=null;const el=$(k),closed=k==='pool'?poolClosed():!!UIP.cl[k];
  const apply=()=>{if(k==='pool')setPoolClosed(close);else UIP.cl[k]=close;saveUIP();document.body.classList.add('slide');renderAll();
    const kids=[...el.children];kids.forEach(c=>c.classList.add('fadein'));setTimeout(()=>{kids.forEach(c=>c.classList.remove('fadein'));document.body.classList.remove('slide')},320)};
  if(close&&!closed&&!matchMedia('(prefers-reduced-motion: reduce)').matches){el.classList.add('fadeout');setTimeout(()=>{el.classList.remove('fadeout');apply()},140)}
  else apply();
}
const toggleCl=k=>{if(k==='pool')return togglePool();slidePanel(k,!UIP.cl[k])};
/* 열고 접는 버튼: 열려 있을 때도 접혀 있을 때와 같은 자리의 같은 아이콘 (누르면 접고, 접힌 아이콘을 누르면 펴짐) */
const ptog=id=>h('button',{class:'ptog',title:'접기 · 펴기'},icon(id==='left'?(UI.mode==='tl'?'list':'sheet'):id==='sheet'?'people':'cards'));
/* 접힌 패널 아이콘: 누르는 순간 바로 고정 (살짝 열리는 중에 아이콘이 바뀌어도 클릭이 사라지지 않게 pointerdown 에서 처리) */
let ICLICK=0;
document.addEventListener('pointerdown',e=>{
  const b=e.target.closest&&e.target.closest('.panel .ctab,.panel .peekic,.panel .ptog');if(!b||e.button!==0)return;
  const id=b.closest('.panel').id;if(!['left','sheet','pool'].includes(id))return;
  e.preventDefault();e.stopPropagation();ICLICK=Date.now();clearTimeout(PEEKT);slidePanel(id,b.classList.contains('ptog')&&!b.closest('.panel').classList.contains('peeking'));
},true);
document.addEventListener('click',e=>{if(Date.now()-ICLICK<700&&e.target.closest&&e.target.closest('.panel .ctab,.panel .peekic,.panel .ptog')){e.stopPropagation();e.preventDefault()}},true);
/* 오른쪽 사이드바 열림/닫힘은 화면마다 따로 기억: 구상 · 타임라인(칸반/한 줄) · 등장표 · 전체. 등장표와 전체는 기본으로 닫아둠 */
const poolKey=()=>UI.mode==='tl'?((UIP.tlMode||'kanban')==='matrix'?'mx':'tl'):(UI.mode==='all'?'all':'story');
const poolClosed=()=>{UIP.pc=UIP.pc||{};const k=poolKey(),v=UIP.pc[k];return v===undefined?(k==='mx'||k==='all'):!!v};
const setPoolClosed=v=>{UIP.pc=UIP.pc||{};UIP.pc[poolKey()]=!!v};
const togglePool=()=>slidePanel('pool',!poolClosed());
(function(){
  const drag=(el,fn)=>{
    el.addEventListener('pointerdown',e=>{el.setPointerCapture(e.pointerId);el.classList.add('drag');document.body.classList.add('resizing');e.preventDefault()});
    el.addEventListener('pointermove',e=>{if(el.classList.contains('drag'))fn(e)});
    const end=()=>{if(el.classList.contains('drag')){el.classList.remove('drag');document.body.classList.remove('resizing');saveUIP()}};
    el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
  };
  drag($('sp1'),e=>{const l=$('sheet').getBoundingClientRect().left;UIP.sw=Math.round(Math.max(280,Math.min(640,innerWidth-(UIP.cl.left?0:LEFTW)-(poolClosed()?0:Math.min(poolW(),330))-MIDMIN-3,e.clientX-l)));applyLayout()});
  drag($('sp2'),e=>{if(lineMode())UIP.rwr=Math.min(.67,Math.max(.5,(innerWidth-e.clientX)/lineAvail()));else setPoolW(Math.round(Math.max(260,Math.min(maxPoolW(),innerWidth-e.clientX-3))));applyLayout()});
  $('sp2').addEventListener('dblclick',()=>{if(lineMode())UIP.rwr=.67;else setPoolW(330);saveUIP();applyLayout()});
  $('sp1').addEventListener('dblclick',()=>{UIP.sw=340;saveUIP();applyLayout()});
})();
