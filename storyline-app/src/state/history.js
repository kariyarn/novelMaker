/* 저장 / 되돌리기: 글자 입력 때마다 전체를 쓰지 않도록 잠깐 모아서 저장 */
let saveT=null,undoS=[],redoS=[],lastEdit=0;
/* 새 디자인의 위쪽 “자동 저장됨” 표시 (기존 디자인에서는 자리가 없어서 아무 일도 안 함) */
function savedMark(st){const e=$('savedInd');if(!e)return;e.dataset.st=st;e.lastChild.textContent=st==='saving'?'저장 중…':st==='fail'?'저장 실패':'자동 저장됨'}
function saveNow(){clearTimeout(saveT);saveT=null;if(UI.noSave)return;const ok=wr(KEY,JSON.stringify(S));if(!ok)toast('저장 실패! 백업을 내려받아 주세요');savedMark(ok?'saved':'fail');savePrefs(true)}
function saveAsyncNow(){clearTimeout(saveT);saveT=null;if(UI.noSave)return;
  if(!(NS&&NS.saveAsync))return saveNow();
  NS.saveAsync(KEY,JSON.stringify(S)).then(r=>{if(!r||!r.ok){toast('저장 실패! 백업을 내려받아 주세요');savedMark('fail')}else savedMark('saved')}).catch(()=>{toast('저장 실패! 백업을 내려받아 주세요');savedMark('fail')});savePrefs()}
function save(){clearTimeout(saveT);saveT=setTimeout(saveAsyncNow,400);savedMark('saving')}
addEventListener('beforeunload',()=>{if(saveT)saveNow();if(uipT)saveUIPNow()});
const ser=()=>JSON.stringify(S,(k,v)=>k==='settings'?undefined:v);
function loadSer(str){const keep=S.settings;S=JSON.parse(str);S.settings=keep}
function snap(){undoS.push(ser());if(undoS.length>60)undoS.shift();redoS=[]}
function act(fn){snap();fn();idxClear();save();renderAll()}
function edit(fn){if(Date.now()-lastEdit>1000)snap();lastEdit=Date.now();fn();idxClear();save()}
function undo(){if(!undoS.length)return toast('되돌릴 게 없어요');redoS.push(ser());loadSer(undoS.pop());fixSel();save();renderAll()}
function redo(){if(!redoS.length)return;undoS.push(ser());loadSer(redoS.pop());fixSel();save();renderAll()}
function fixSel(){if(UI.sel==='all'&&UI.mode==='all')return;if(UI.sel==='work'&&UI.mode==='story')return;if(UI.sel!=='none'&&!charById(UI.sel))UI.sel=firstEntity()}
