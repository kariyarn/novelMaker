const {app,BrowserWindow,shell,Menu,ipcMain,dialog}=require('electron');
const path=require('path');
const {create}=require('./store');
let store;
const run=js=>{const w=BrowserWindow.getFocusedWindow();if(w)w.webContents.executeJavaScript(js).catch(()=>{})};
function createWindow(){
  const w=new BrowserWindow({width:1400,height:900,minWidth:900,minHeight:600,title:'캐릭터 스토리라인',webPreferences:{contextIsolation:true,spellcheck:false,preload:path.join(__dirname,'preload.js')}});
  w.loadFile(path.join(__dirname,'index.html'));
  w.webContents.setWindowOpenHandler(({url})=>{shell.openExternal(url);return {action:'deny'}});
}
app.setName('캐릭터 스토리라인');
app.whenReady().then(()=>{
  store=create(app.getPath('userData'));
  ipcMain.on('store:load',(e,k)=>{e.returnValue=store.load(k)});
  ipcMain.on('store:save',(e,k,t)=>{e.returnValue=store.save(k,t)});
  ipcMain.handle('store:saveAsync',(e,k,t)=>store.save(k,t));
  ipcMain.on('store:info',e=>{e.returnValue=store.dirs});
  ipcMain.on('store:backups',e=>{e.returnValue=store.listBackups()});
  ipcMain.on('store:readBackup',(e,n)=>{e.returnValue=store.readBackup(n)});
  ipcMain.on('store:forceBackup',(e,t)=>{e.returnValue=store.forceBackup(t)});
  ipcMain.on('store:openDir',(e,w)=>{shell.openPath(w==='backups'?store.backupsDir():store.dirs.main);e.returnValue=true});
  ipcMain.on('store:library',e=>{e.returnValue=store.library()});
  ipcMain.on('store:createNovel',(e,n)=>{e.returnValue=store.createNovel(n)});
  ipcMain.on('store:openNovel',(e,id)=>{e.returnValue=store.openNovel(id)});
  ipcMain.on('store:renameNovel',(e,id,n)=>{e.returnValue=store.renameNovel(id,n)});
  ipcMain.on('store:duplicateNovel',(e,id,n)=>{e.returnValue=store.duplicateNovel(id,n)});
  ipcMain.on('store:archiveNovel',(e,id)=>{e.returnValue=store.archiveNovel(id)});
  ipcMain.on('store:restoreNovel',(e,id)=>{e.returnValue=store.restoreNovel(id)});
  ipcMain.on('store:deleteNovel',(e,id)=>{e.returnValue=store.deleteNovel(id)});
  ipcMain.on('store:loadPrefs',e=>{e.returnValue=store.loadPrefs()});
  ipcMain.on('store:savePrefs',(e,t)=>{e.returnValue=store.savePrefs(t)});
  ipcMain.handle('store:savePrefsAsync',(e,t)=>store.savePrefs(t));
  const openData={label:'저장 폴더 열기',click:()=>shell.openPath(store.dirs.main)};
  const openBak={label:'백업 폴더 열기 (현재 작품)',click:()=>shell.openPath(store.backupsDir())};
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {role:'appMenu'},
    {label:'파일',submenu:[openData,openBak,{type:'separator'},{role:'close'}]},
    {label:'편집',submenu:[
      {label:'되돌리기',accelerator:'CmdOrCtrl+Z',registerAccelerator:false,click:()=>run('undo()')},     // 메뉴 기본 동작이 앱의 되돌리기를 가로채지 않게 직접 연결
      {label:'다시 하기',accelerator:'Shift+CmdOrCtrl+Z',registerAccelerator:false,click:()=>run('redo()')},
      {type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
    {label:'보기',submenu:[{role:'reload'},{role:'toggleDevTools'},{type:'separator'},{role:'togglefullscreen'}]},
    {role:'windowMenu'},
    {label:'도움말',submenu:[{label:'단축키 도움말',accelerator:'CmdOrCtrl+/',registerAccelerator:false,click:()=>run('showShortcuts()')},{label:'전체 검색',accelerator:'CmdOrCtrl+F',registerAccelerator:false,click:()=>run('openSearch()')}]}]));
  createWindow();
  app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow()});
});
app.on('window-all-closed',()=>app.quit());
