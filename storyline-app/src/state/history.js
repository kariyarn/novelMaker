/* 저장 / 되돌리기: 글자 입력 때마다 전체를 쓰지 않도록 잠깐 모아서 저장 */
/* 상태 쪽은 화면을 모름: 바뀌었다는 것만 알리고, 다시 그리기 · 저장 표시는 화면 쪽(render.js)이 구독해서 처리 */
const stateListeners=[],saveListeners=[];
const onStateChange=fn=>{stateListeners.push(fn)};      // 데이터가 바뀜 (act · undo · redo · commit)
const onSaveStatus=fn=>{saveListeners.push(fn)};       // 'saving' · 'saved' · 'fail'
const notifyChange=()=>stateListeners.forEach(f=>f());
const notifySave=st=>saveListeners.forEach(f=>f(st));
let saveT=null,undoS=[],redoS=[],lastEdit=0;
function saveNow(){clearTimeout(saveT);saveT=null;if(UI.noSave)return;const ok=wr(KEY,JSON.stringify(S));notifySave(ok?'saved':'fail');savePrefs(true)}
function saveAsyncNow(){clearTimeout(saveT);saveT=null;if(UI.noSave)return;
  if(!Repo.writeAsync)return saveNow();
  Repo.writeAsync(KEY,JSON.stringify(S)).then(ok=>notifySave(ok?'saved':'fail')).catch(()=>notifySave('fail'));savePrefs()}
function save(){clearTimeout(saveT);saveT=setTimeout(saveAsyncNow,400);notifySave('saving')}
const cancelPendingSave=()=>{clearTimeout(saveT);saveT=null};
function commit(){save();notifyChange()}      // 되돌리기 기록 없이 바꾼 뒤: 저장하고 다시 그림
addEventListener('beforeunload',()=>{if(saveT)saveNow();if(uipT)saveUIPNow()});
const ser=()=>JSON.stringify(S,(k,v)=>k==='settings'?undefined:v);
function loadSer(str){const keep=S.settings;S=JSON.parse(str);S.settings=keep}
function snap(){undoS.push(ser());if(undoS.length>60)undoS.shift();redoS=[]}
function resetHistory(){undoS=[];redoS=[];lastEdit=0}
function act(fn){snap();fn();idxClear();commit()}
function edit(fn){if(Date.now()-lastEdit>1000)snap();lastEdit=Date.now();fn();idxClear();save()}
function undo(){if(!undoS.length)return toast('되돌릴 게 없어요');redoS.push(ser());loadSer(undoS.pop());fixSel();commit()}
function redo(){if(!redoS.length)return;undoS.push(ser());loadSer(redoS.pop());fixSel();commit()}
function fixSel(){if(UI.sel==='all'&&UI.mode==='all')return;if(UI.sel==='work'&&UI.mode==='story')return;if(UI.sel!=='none'&&!charById(UI.sel))UI.sel=firstEntity()}
