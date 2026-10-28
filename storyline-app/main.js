const {app,BrowserWindow,shell,Menu,Tray,nativeImage,ipcMain,globalShortcut,safeStorage,screen,net,nativeTheme}=require('electron');
const path=require('path'),fs=require('fs'),os=require('os');
const {create}=require('./store');
const {createSync}=require('./storage/sync');
const {atomicWrite}=require('./storage/files');
const {createUpdater}=require('./updater');
const {setLogDir,logDir,logError}=require('./storage/log');
const isMac=process.platform==='darwin',isWin=process.platform==='win32';
const glassNote=process.platform!=='win32';      // Windows: 투명 창에 창 투명도(setOpacity)를 겹치면 창이 통째로 안 보여서, 불투명 창으로
const NOTE_KEY='CommandOrControl+Alt+N';      // 포스트잇 꺼내기 · 숨기기 (앱이 뒤에 있어도)
const NOTE_ARG='--note';      // 작업 표시줄 우클릭 → 포스트잇 모드로 바로 열기
let store,sync,updater,win=null,noteWin=null,tray=null,quitting=false;
const userFile=n=>path.join(app.getPath('userData'),n);
const readJson=(p,d)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch(e){return d}};
const logErr=where=>e=>logError(where,e);      // .catch(logErr('어디서')) 로 실패를 오류 기록에 남김
const writeJson=(p,o)=>{try{atomicWrite(p,JSON.stringify(o,null,1))}catch(e){logError('설정 저장 '+path.basename(p),e)}};
const run=js=>{const w=BrowserWindow.getFocusedWindow();if(w&&w===win)w.webContents.executeJavaScript(js).catch(logErr('메뉴 명령 '+js))};
const callMain=js=>win&&!win.isDestroyed()?win.webContents.executeJavaScript(js):Promise.resolve(null);      // 큰 창의 화면 코드에 일을 맡김

function createWindow({hidden=false}={}){
  win=new BrowserWindow({width:1400,height:900,minWidth:900,minHeight:600,title:'캐릭터 스토리라인',show:!hidden,
    autoHideMenuBar:!isMac,webPreferences:{contextIsolation:true,spellcheck:false,backgroundThrottling:false,preload:path.join(__dirname,'preload.js')}});
  win.loadFile(path.join(__dirname,'index.html'));
  win.webContents.setWindowOpenHandler(({url})=>{shell.openExternal(url);return {action:'deny'}});
  win.webContents.once('did-finish-load',()=>{setTimeout(()=>runPush().then(()=>runCheck()),1500);global.appUpdate&&global.appUpdate.ok()});      // 화면이 떴으니 새 앱 코드는 정상 (launcher.js) · 지난번에 못 올린 것 올리고 새 내용 확인
  win.on('focus',()=>{if(Date.now()-lastCheck>60*1000)runCheck()});      // 다른 컴퓨터에서 쓰다 왔을 때: 확인만 (받기는 사용자가)
  win.webContents.on('render-process-gone',(e,d)=>logError('큰 창 화면이 멈춤',d&&d.reason));
  win.on('closed',()=>{win=null;app.quit()});      // 큰 창을 닫으면 끔 (숨은 포스트잇 창이 남아 있어도)
}

/* ---------- GitHub 동기화 ---------- */
// 설정은 이 컴퓨터에만: 토큰은 OS 열쇠고리(맥 키체인 · Windows 자격 증명)로 암호화해서 보관
const CFG=()=>userFile('sync-config.json');
function syncConfig(){
  const c=readJson(CFG(),null);if(!c||!c.repo)return null;
  let token=null;try{token=c.enc?safeStorage.decryptString(Buffer.from(c.token,'base64')):c.token}catch(e){logError('동기화 토큰 풀기',e)}
  return {repo:c.repo,branch:c.branch||'main',token,device:(c.device||'').trim()||os.hostname()};      // device: 커밋 메시지에 남겨 '어느 기기에서' 알려 줌
}
function setSyncConfig(c){
  if(!c){try{fs.rmSync(CFG(),{force:true})}catch(e){logError('동기화 연결 끊기',e)}return {ok:true}}
  const old=readJson(CFG(),{});let token=old.token,enc=old.enc;
  if(c.token){enc=safeStorage.isEncryptionAvailable();token=enc?safeStorage.encryptString(c.token).toString('base64'):c.token}
  if(!token)return {ok:false,error:'토큰을 넣어 주세요'};
  writeJson(CFG(),{repo:c.repo,branch:c.branch||'main',token,enc,device:(c.device||'').trim()});return {ok:true};
}
let syncTimer=0;
async function runSync({notify=true}={}){
  clearTimeout(syncTimer);syncTimer=0;
  if(!syncConfig())return {ok:false,skipped:true,error:'동기화 설정이 없어요'};
  await callMain('typeof flushForSync==="function"&&flushForSync()').catch(logErr('동기화 전 저장'));      // 쓰던 걸 먼저 파일로
  const r=await sync.sync();
  if(!r.ok&&!r.skipped)logError('동기화: 받기',r.error);
  if(notify)callMain(`typeof onSyncResult==="function"&&onSyncResult(${JSON.stringify(r)})`).catch(logErr('동기화 결과 알리기'));
  if(noteWin&&noteWin.isVisible())noteWin.webContents.send('note:shown');
  return r;
}
// 평소: 고친 걸 올리기만 자동 · 다른 기기에서 고친 건 확인만 하고 화면에 알림 (받기는 사용자가 눌러서 runSync)
async function runPush(){
  clearTimeout(syncTimer);syncTimer=0;syncFirst=0;
  if(!syncConfig())return {ok:false,skipped:true};
  await callMain('typeof flushForSync==="function"&&flushForSync()').catch(logErr('동기화 전 저장'));
  const r=await sync.push();
  if(!r.ok&&!r.skipped)logError('동기화: 올리기',r.error);
  callMain(`typeof onSyncPush==="function"&&onSyncPush(${JSON.stringify(r)})`).catch(logErr('동기화 결과 알리기'));
  if(r.ok&&r.blocked&&r.blocked.length)runCheck();      // 다른 기기가 먼저 고친 작품이 있어서 못 올림: 받기를 권함
  return r;
}
let lastCheck=0;
async function runCheck(){
  if(!syncConfig())return {ok:false,skipped:true};
  lastCheck=Date.now();
  const r=await sync.check();
  if(!r.ok&&!r.skipped)logError('동기화: 확인',r.error);
  callMain(`typeof onSyncCheck==="function"&&onSyncCheck(${JSON.stringify(r)})`).catch(logErr('동기화 결과 알리기'));
  return r;
}
let syncFirst=0;
const syncSoon=()=>{if(!syncConfig())return;clearTimeout(syncTimer);if(!syncFirst)syncFirst=Date.now();      // 마지막으로 고친 뒤 5초쯤 지나면 올림 (쉬지 않고 써도 1분에 한 번은)
  syncTimer=setTimeout(()=>{syncFirst=0;runPush()},Date.now()-syncFirst>60*1000?0:5*1000)};

/* ---------- 앱 자동 업데이트: 새 앱 코드를 받아 두고, 다시 켜면 적용 (updater.js · launcher.js) ---------- */
let updNotified=0;
async function checkUpdate({notify=true}={}){
  const r=await updater.check();
  if(r.error&&!r.dev)logError('앱 업데이트',r.error);
  if(notify&&(r.ready||r.needInstaller)){const k=r.ready||-r.latest;if(k!==updNotified){updNotified=k;callMain(`typeof onAppUpdate==="function"&&onAppUpdate(${JSON.stringify(r)})`).catch(logErr('업데이트 알리기'))}}
  return r;
}

/* ---------- 포스트잇 창 (몰래 쓰기): 테두리 · 작업 표시줄 아이콘 없이 작은 창 하나 ---------- */
const NOTE=()=>userFile('note.json');
let note=null;
const loadNote=()=>note||(note=readJson(NOTE(),{opacity:1,onTop:true,bounds:null}));
function setMode(m){loadNote();if(note.mode!==m){note.mode=m;writeJson(NOTE(),note)}}      // 마지막에 쓴 모드 (다음에 켤 때 그 모드로)
function createNote(){
  loadNote();
  const wa=screen.getPrimaryDisplay().workArea,w=400,h=300;
  const onScreen=r=>r&&screen.getAllDisplays().some(({workArea:a})=>r.x<a.x+a.width-60&&r.x+r.width>a.x+60&&r.y<a.y+a.height-30&&r.y+r.height>a.y+30);      // 모니터를 빼거나 바꿨으면 기본 자리로
  const b=onScreen(note.bounds)?note.bounds:{x:wa.x+wa.width-w-24,y:wa.y+wa.height-h-24,width:w,height:h};
  noteWin=new BrowserWindow({...b,minWidth:220,minHeight:150,frame:false,transparent:glassNote,hasShadow:false,resizable:true,
    backgroundColor:glassNote?'#00000000':nativeTheme.shouldUseDarkColors?'#161618':'#ffffff',
    skipTaskbar:!isWin,alwaysOnTop:note.onTop!==false,show:false,title:'메모',fullscreenable:false,maximizable:false,minimizable:isWin,      // Windows: Alt+Tab 에 보이게 (숨기기는 최소화)
    webPreferences:{contextIsolation:true,spellcheck:false,preload:path.join(__dirname,'note','preload.js')}});
  noteWin.setOpacity(note.opacity||1);
  if(isMac)noteWin.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
  noteWin.loadFile(path.join(__dirname,'note','note.html'));
  let bt=0;const keep=()=>{clearTimeout(bt);bt=setTimeout(()=>{if(noteWin){note.bounds=noteWin.getBounds();writeJson(NOTE(),note)}},400)};
  noteWin.on('moved',keep);noteWin.on('resized',keep);
  if(isWin)noteWin.on('restore',()=>{if(noteWin)noteWin.setOpacity(note.opacity||1)});      // Alt+Tab · 작업 표시줄 · 단축키로 다시 꺼내면 원래 투명도로
  noteWin.on('close',e=>{if(!quitting){e.preventDefault();hideNote()}});
  noteWin.on('closed',()=>{noteWin=null});
  noteWin.webContents.on('render-process-gone',()=>{const w=noteWin;noteWin=null;w&&w.destroy();openMain()});      // 포스트잇 창이 죽으면 큰 창으로 돌아옴
}
function showNote(){
  if(win&&win.webContents.isLoading()){win.webContents.once('did-finish-load',showNote);return}      // 포스트잇은 큰 창의 작품 데이터를 빌려 씀
  if(!noteWin)createNote();
  setMode('note');
  const show=()=>{
    if(noteWin.isMinimized())noteWin.restore();
    if(isWin)noteWin.setOpacity(note.opacity||1);
    noteWin.show();noteWin.focus();noteWin.webContents.send('note:shown');
    if(win&&win.isVisible())win.hide();      // 포스트잇이 뜬 뒤에 큰 창을 치움 (안 뜨면 큰 창이 그대로 남게)
  };
  if(noteWin.webContents.isLoading())noteWin.webContents.once('did-finish-load',show);else show();
}
function hideNote(){
  if(!noteWin)return;noteWin.webContents.send('note:flush');
  if(isWin){noteWin.setOpacity(0);noteWin.minimize();return}      // Windows: 숨겨도 Alt+Tab · 작업 표시줄에서 다시 꺼낼 수 있게 최소화 (먼저 투명하게 해서 줄어드는 애니메이션 없이 바로 사라짐)
  noteWin.hide();
  if(isMac&&!(win&&win.isVisible()))app.hide();      // 맥: 앞에 있던 다른 앱으로 바로 돌아감
}
function toggleNote(){
  if(noteWin&&noteWin.isVisible()&&!noteWin.isMinimized()){if(noteWin.isFocused())hideNote();else noteWin.focus()}
  else showNote();
}
function openMain(){
  if(noteWin&&noteWin.isVisible()){noteWin.webContents.send('note:flush');noteWin.hide()}
  setMode('main');
  if(!win)createWindow();win.show();win.focus();
}

if(!app.requestSingleInstanceLock())app.quit();      // 두 번 실행하면 이미 켜진 창을 보여 줌
const noteMode=()=>loadNote().mode==='note';
app.on('second-instance',(e,argv)=>argv.includes(NOTE_ARG)||(noteMode()&&!(win&&win.isVisible()))?showNote():openMain());
app.setName('캐릭터 스토리라인');
if(!isMac)app.setAppUserModelId('local.character.storyline');
app.whenReady().then(()=>{
  setLogDir(userFile('logs'));
  store=create(app.getPath('userData'));
  sync=createSync({store,fetch:(u,o)=>net.fetch(u,o),getConfig:syncConfig,statePath:userFile('sync-state.json')});      // net.fetch: 회사 프록시 설정을 따름
  // 글이 정말 바뀐 저장만 올리기를 예약. 올리기 직전에 쓰던 걸 파일로 내리는 저장(flushForSync)은 같은 글이라 건너뜀
  //   (안 그러면 저장 → 5초 뒤 올리기 → 또 저장 → … 이 끝없이 돌아서 가만히 있어도 5초마다 작품 전체를 다시 저장함)
  const lastSaved=new Map();
  const saved=(k,t,r)=>{if(r&&r.ok&&(r.merged||lastSaved.get(k)!==t)){lastSaved.set(k,t);syncSoon()}return r};
  ipcMain.on('store:load',(e,k)=>{e.returnValue=store.load(k)});
  ipcMain.on('store:save',(e,k,t)=>{e.returnValue=saved(k,t,store.save(k,t))});
  ipcMain.handle('store:saveAsync',(e,k,t)=>saved(k,t,store.save(k,t)));
  ipcMain.on('store:info',e=>{e.returnValue=store.dirs});
  ipcMain.on('store:backups',e=>{e.returnValue=store.listBackups()});
  ipcMain.on('store:readBackup',(e,n)=>{e.returnValue=store.readBackup(n)});
  ipcMain.on('store:forceBackup',(e,t)=>{e.returnValue=store.forceBackup(t)});
  ipcMain.on('store:openDir',(e,w)=>{if(w==='logs')fs.mkdirSync(logDir(),{recursive:true});shell.openPath(w==='logs'?logDir():w==='backups'?store.backupsDir():store.dirs.main);e.returnValue=true});
  ipcMain.on('app:log',(e,where,msg)=>logError('화면: '+String(where),String(msg)));      // 화면 코드의 오류도 같은 기록에
  ipcMain.on('store:library',e=>{e.returnValue=store.library()});
  ipcMain.on('store:createNovel',(e,n)=>{e.returnValue=store.createNovel(n);syncSoon()});
  ipcMain.on('store:openNovel',(e,id)=>{e.returnValue=store.openNovel(id)});
  ipcMain.on('store:renameNovel',(e,id,n)=>{e.returnValue=store.renameNovel(id,n);syncSoon()});
  ipcMain.on('store:duplicateNovel',(e,id,n)=>{e.returnValue=store.duplicateNovel(id,n);syncSoon()});
  ipcMain.on('store:archiveNovel',(e,id)=>{e.returnValue=store.archiveNovel(id);syncSoon()});
  ipcMain.on('store:restoreNovel',(e,id)=>{e.returnValue=store.restoreNovel(id);syncSoon()});
  ipcMain.on('store:deleteNovel',(e,id)=>{e.returnValue=store.deleteNovel(id);syncSoon()});
  ipcMain.on('store:loadPrefs',e=>{e.returnValue=store.loadPrefs()});
  ipcMain.on('store:savePrefs',(e,t)=>{e.returnValue=store.savePrefs(t)});
  ipcMain.handle('store:savePrefsAsync',(e,t)=>store.savePrefs(t));
  /* 동기화 */
  ipcMain.on('sync:getConfig',e=>{const c=syncConfig(),raw=readJson(CFG(),{});e.returnValue=c?{repo:c.repo,branch:c.branch,hasToken:!!c.token,last:sync.lastSync(),secure:safeStorage.isEncryptionAvailable(),device:raw.device||'',host:os.hostname()}:null});
  ipcMain.on('sync:setConfig',(e,c)=>{e.returnValue=setSyncConfig(c)});
  ipcMain.handle('sync:now',()=>runSync({notify:false}));      // 받기 (+ 올리기)
  ipcMain.handle('sync:check',()=>runCheck());
  ipcMain.on('sync:dismiss',(e,sig)=>{sync.dismiss(sig);e.returnValue=true});
  setInterval(()=>runCheck(),5*60*1000);
  /* 앱 업데이트 */
  const AU=global.appUpdate||{bundled:require('./package.json').version,running:require('./package.json').version,dir:null};      // launcher.js 없이 켰을 때(개발용)
  updater=createUpdater({fetch:(u,o)=>net.fetch(u,o),dir:userFile('app-update'),bundled:AU.bundled,running:AU.running,electron:process.versions.electron,keep:AU.dir});
  ipcMain.on('update:info',e=>{e.returnValue=updater.info()});
  ipcMain.handle('update:check',()=>checkUpdate({notify:false}));
  ipcMain.handle('update:relaunch',()=>{app.relaunch();app.quit()});
  ipcMain.handle('update:openReleases',()=>shell.openExternal(updater.info().releases));
  setTimeout(()=>checkUpdate(),20*1000);setInterval(()=>checkUpdate(),6*60*60*1000);      // 켜고 잠시 뒤 · 6시간마다
  /* 포스트잇 창 */
  ipcMain.handle('note:init',async()=>({...(await callMain('({kinds:noteBridge.kinds(),defaultKind:noteBridge.defaultKind(),list:noteBridge.list(100),works:noteBridge.works()})')),opacity:note.opacity||1,onTop:note.onTop!==false,fontSize:note.fontSize||15,isMac,glass:glassNote}));
  ipcMain.handle('note:list',()=>callMain('noteBridge.list(100)'));
  ipcMain.handle('note:add',(e,t,k)=>callMain(`noteBridge.add(${JSON.stringify(String(t))},${JSON.stringify(k||null)})`));
  ipcMain.handle('note:update',(e,id,t,k)=>callMain(`noteBridge.update(${JSON.stringify(String(id))},${JSON.stringify(String(t))},${JSON.stringify(k||null)})`));
  ipcMain.handle('note:openWork',(e,id)=>callMain(`noteBridge.openWork(${JSON.stringify(String(id))})`));
  ipcMain.handle('note:opacity',(e,v)=>{v=Math.max(.15,Math.min(1,+v||1));note.opacity=v;noteWin&&noteWin.setOpacity(v);writeJson(NOTE(),note)});
  ipcMain.handle('note:onTop',(e,v)=>{note.onTop=!!v;noteWin&&noteWin.setAlwaysOnTop(!!v);writeJson(NOTE(),note)});
  ipcMain.handle('note:fontSize',(e,v)=>{note.fontSize=Math.max(11,Math.min(32,Math.round(+v)||15));writeJson(NOTE(),note)});
  ipcMain.handle('note:hide',()=>hideNote());
  ipcMain.handle('note:openMain',()=>openMain());
  ipcMain.on('shell:showNote',e=>{showNote();e.returnValue=true});
  if(!globalShortcut.register(NOTE_KEY,toggleNote))console.warn('포스트잇 단축키를 등록하지 못했어요:',NOTE_KEY);

  const openData={label:'저장 폴더 열기',click:()=>shell.openPath(store.dirs.main)};
  const openBak={label:'백업 폴더 열기 (현재 작품)',click:()=>shell.openPath(store.backupsDir())};
  const openLogs={label:'오류 기록 폴더 열기',click:()=>{fs.mkdirSync(logDir(),{recursive:true});shell.openPath(logDir())}};
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(isMac?[{role:'appMenu'}]:[]),
    {label:'파일',submenu:[openData,openBak,openLogs,{type:'separator'},{label:'다른 기기 내용 받기',click:()=>runSync()},{type:'separator'},isMac?{role:'close'}:{role:'quit',label:'끝내기'}]},
    {label:'편집',submenu:[
      {label:'되돌리기',accelerator:'CmdOrCtrl+Z',registerAccelerator:false,click:()=>run('undo()')},     // 메뉴 기본 동작이 앱의 되돌리기를 가로채지 않게 직접 연결
      {label:'다시 하기',accelerator:'Shift+CmdOrCtrl+Z',registerAccelerator:false,click:()=>run('redo()')},
      {type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
    {label:'보기',submenu:[{label:'포스트잇 모드',accelerator:NOTE_KEY,registerAccelerator:false,click:showNote},{type:'separator'},{role:'reload'},{role:'toggleDevTools'},{type:'separator'},{role:'togglefullscreen'}]},
    {role:'windowMenu'},
    {label:'도움말',submenu:[{label:'단축키 도움말',accelerator:'CmdOrCtrl+/',registerAccelerator:false,click:()=>run('showShortcuts()')},{label:'전체 검색',accelerator:'CmdOrCtrl+F',registerAccelerator:false,click:()=>run('openSearch()')}]}]));
  const startNote=process.argv.includes(NOTE_ARG)||noteMode();      // 포스트잇 모드에서 끝냈으면 포스트잇으로, 큰 창에서 끝냈으면 큰 창으로
  createWindow({hidden:startNote});if(startNote)showNote();
  if(!isMac){
    if(process.platform==='win32')app.setUserTasks([{program:process.execPath,arguments:NOTE_ARG,iconPath:process.execPath,iconIndex:0,title:'포스트잇 모드로 열기',description:'큰 창 없이 포스트잇만 띄워요'}]);
    // 알림 영역 아이콘: 포스트잇을 숨기면 작업 표시줄에 아무것도 안 남아서, 여기서 다시 꺼냄
    tray=new Tray(nativeImage.createFromPath(path.join(__dirname,'build','icon.png')).resize({width:16,height:16}));
    tray.setToolTip('캐릭터 스토리라인');
    tray.setContextMenu(Menu.buildFromTemplate([{label:'포스트잇 열기',click:showNote},{label:'큰 창 열기',click:openMain},{type:'separator'},{label:'끝내기',click:()=>app.quit()}]));
    tray.on('click',toggleNote);
  }else app.dock.setMenu(Menu.buildFromTemplate([{label:'포스트잇 모드',click:showNote}]));
  app.on('activate',()=>{if(!win)createWindow();else if(!(noteWin&&noteWin.isVisible())){noteMode()?showNote():win.show()}});
});
// 끌 때: 마지막으로 한 번 올리고 끔 (최대 6초)
let finalSynced=false;
app.on('before-quit',e=>{
  quitting=true;
  if(finalSynced||!syncConfig()||!sync)return;
  e.preventDefault();finalSynced=true;
  Promise.race([runPush(),new Promise(r=>setTimeout(r,6000))]).finally(()=>app.quit());      // 올리기만 (끄는 중에 받아서 바꾸지 않음)
});
app.on('will-quit',()=>globalShortcut.unregisterAll());
app.on('window-all-closed',()=>app.quit());
