/* ---------- 작품(소설) 관리: 작품마다 따로 저장돼요 ---------- */
const curNovel=()=>(LIB&&LIB.novels.find(n=>n.id===LIB.current))||{name:'캐릭터 스토리라인'};
const workName=()=>curNovel().name;
const fileBase=()=>(workName().replace(/[\\/:*?"<>|]/g,'_').trim()||'storyline');
const shortDate=t=>{const d=new Date(t||Date.now());return `${d.getMonth()+1}/${d.getDate()}`};
function afterWorkChange(){refreshLib();document.title=`${workName()} — 캐릭터 스토리라인`}
function flushWork(){cancelPendingSave();if(UI.noSave)return;saveNow();saveUIPNow()}      // 작품을 바꾸기 전: 동기로 바로 저장
function enterWork(opts){
  initWork(opts);resetUI();resetHistory();
  afterWorkChange();renderAll();
}
function brandEl(){
  if(!(NS&&NS.library)||!LIB)return h('b',{class:'brand'},'캐릭터 스토리라인');
  if(U2()){const b=h('button',{class:'brand workbtn','data-pop':'1',title:'작품 바꾸기 · 새 작품 · 복제 · 보관함',onclick:()=>popMenu(b,workItems)},curNovel().name,icon('chevD'));return b}
  const b=h('button',{class:'brand workbtn','data-pop':'1',title:'작품 바꾸기 · 새 작품 · 복제 · 보관함',onclick:()=>popMenu(b,workItems)},'📖 '+curNovel().name,h('span',{class:'caret'},'▾'));
  return b;
}
function workItems(){
  refreshLib();
  const act=LIB.novels.filter(n=>!n.archived).sort((a,b)=>(b.updated||0)-(a.updated||0)),arch=LIB.novels.filter(n=>n.archived).length;
  return [{title:'작품'},...act.map(n=>({label:n.name,hint:shortDate(n.updated),on:n.id===LIB.current,fn:()=>switchNovel(n.id)})),'sep',
    {label:'새 작품 만들기…',fn:newNovel},{label:'이 작품 이름 바꾸기…',fn:renameNovel},{label:'이 작품 복제',fn:dupNovel},'sep',
    {label:'보관함'+(arch?` (${arch})`:'')+'…',fn:showArchive},{label:'이 작품을 보관함으로…',fn:archiveCurrent}];
}
function switchNovel(id,opts){
  if(!NS||!LIB||id===LIB.current)return;
  flushWork();
  if(!NS.openNovel(id))return toast('작품을 열 수 없어요');
  closePop();closeSearch();closeModal();
  enterWork(opts);toast(`‘${workName()}’을(를) 열었어요`);
}
async function newNovel(){
  const name=((await askText('새 작품 이름','새 작품'))||'').trim();if(!name)return;
  flushWork();const id=NS.createNovel(name);if(!id)return toast('작품을 만들 수 없어요');
  NS.openNovel(id);closePop();closeModal();enterWork({blank:true});saveNow();saveUIPNow();toast(`‘${workName()}’ 작품을 만들었어요`);
}
async function renameNovel(){
  const n=curNovel(),v=((await askText('작품 이름',n.name))||'').trim();if(!v||v===n.name)return;
  NS.renameNovel(n.id,v);afterWorkChange();renderTop();
}
async function dupNovel(){
  const n=curNovel();flushWork();const id=NS.duplicateNovel(n.id,n.name+' (복사)');
  if(!id)return toast('복제하지 못했어요');
  NS.openNovel(id);closePop();enterWork();toast(`‘${n.name}’을(를) 복제했어요`);
}
async function archiveCurrent(){
  const n=curNovel();refreshLib();
  if(!LIB||LIB.novels.filter(x=>!x.archived).length<2)return toast('마지막 작품은 보관할 수 없어요. 먼저 새 작품을 만들어 주세요');
  if(!await askConfirm(`‘${n.name}’ 작품을 보관함으로 보낼까요?\n지우는 게 아니라서 보관함에서 언제든 복구할 수 있어요.`))return;
  flushWork();if(!NS.archiveNovel(n.id))return toast('보관하지 못했어요');
  closePop();enterWork();toast(`‘${n.name}’을(를) 보관함으로 보냈어요`);
}
function showArchive(){
  refreshLib();const arch=LIB.novels.filter(n=>n.archived).sort((a,b)=>(b.archivedAt||0)-(a.archivedAt||0));
  openModal(mtitle('작품 보관함'),
    h('p',{class:'muted'},'보관한 작품은 지워지지 않고 여기에 있어요. 복구하면 다시 작품 목록에 나타나요.'),
    !arch.length?h('p',{class:'muted'},'보관한 작품이 없어요.'):null,
    ...arch.map(n=>h('div',{class:'mrow'},
      h('span',{class:'l'},h('b',{},n.name),h('div',{class:'muted'},`보관한 날 ${fmtFull(n.archivedAt||n.updated)}`)),
      h('button',{onclick:()=>{NS.restoreNovel(n.id);refreshLib();renderTop();showArchive();toast(`‘${n.name}’을(를) 복구했어요`)}},'복구'),
      h('button',{class:'quiet',style:'color:var(--warn)',title:'디스크에서도 완전히 지워요',onclick:async()=>{
        if(!await askConfirm(`‘${n.name}’을(를) 영구 삭제할까요?\n파일까지 완전히 지워져서 되돌릴 수 없어요.`))return;
        if(!await askConfirm('정말 영구 삭제할까요? 이 작품의 노트와 백업이 모두 사라져요.',{ok:'영구 삭제',danger:true}))return;
        NS.deleteNovel(n.id);refreshLib();showArchive();toast('영구 삭제했어요')}},'영구 삭제'))),
    closeRow(h('button',{onclick:()=>NS.openDir('data')},'저장 폴더 열기')));
}
async function promptFirstName(){      // 예전 단일 파일에서 옮겨 온 첫 작품에 이름 붙이기
  const n=curNovel();if(!(NS&&NS.renameNovel)||!LIB||!n||!n.needsName)return;
  const name=((await askText('예전 데이터가 첫 작품으로 옮겨졌어요. 작품 이름을 정해 주세요','내 첫 작품'))||'').trim();
  NS.renameNovel(n.id,name||'내 첫 작품');afterWorkChange();renderTop();
}
function dlBlob(name,blob){const a=h('a',{href:URL.createObjectURL(blob),download:name});document.body.append(a);a.click();a.remove()}
const fmtFull=t=>{const d=new Date(t);return `${d.getFullYear()}.${p2(d.getMonth()+1)}.${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`};
const todayStr=()=>new Date().toISOString().slice(0,10);
