const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('nativeStore',{
  load:k=>ipcRenderer.sendSync('store:load',k),
  save:(k,t)=>ipcRenderer.sendSync('store:save',k,t),
  saveAsync:(k,t)=>ipcRenderer.invoke('store:saveAsync',k,t),      // 평소 저장: 화면을 멈추지 않음 (순서는 그대로 지켜짐)
  info:()=>ipcRenderer.sendSync('store:info'),
  backups:()=>ipcRenderer.sendSync('store:backups'),
  readBackup:n=>ipcRenderer.sendSync('store:readBackup',n),
  forceBackup:t=>ipcRenderer.sendSync('store:forceBackup',t),
  openDir:w=>ipcRenderer.sendSync('store:openDir',w),
  library:()=>ipcRenderer.sendSync('store:library'),
  createNovel:n=>ipcRenderer.sendSync('store:createNovel',n),
  openNovel:id=>ipcRenderer.sendSync('store:openNovel',id),
  renameNovel:(id,n)=>ipcRenderer.sendSync('store:renameNovel',id,n),
  duplicateNovel:(id,n)=>ipcRenderer.sendSync('store:duplicateNovel',id,n),
  archiveNovel:id=>ipcRenderer.sendSync('store:archiveNovel',id),
  restoreNovel:id=>ipcRenderer.sendSync('store:restoreNovel',id),
  deleteNovel:id=>ipcRenderer.sendSync('store:deleteNovel',id),
  loadPrefs:()=>ipcRenderer.sendSync('store:loadPrefs'),
  savePrefs:t=>ipcRenderer.sendSync('store:savePrefs',t),
  savePrefsAsync:t=>ipcRenderer.invoke('store:savePrefsAsync',t)
});
// 저장 말고 앱 쪽 기능: GitHub 동기화 · 포스트잇 창
contextBridge.exposeInMainWorld('appShell',{
  sync:{
    getConfig:()=>ipcRenderer.sendSync('sync:getConfig'),      // {repo, branch, hasToken, last, secure} 또는 null
    setConfig:c=>ipcRenderer.sendSync('sync:setConfig',c),     // null 이면 연결 끊기
    now:()=>ipcRenderer.invoke('sync:now'),      // 받기 (+ 올리기)
    check:()=>ipcRenderer.invoke('sync:check'),      // 다른 기기에서 고친 게 있는지 확인만
    dismiss:sig=>ipcRenderer.sendSync('sync:dismiss',sig),      // '나중에'
  },
  note:{show:()=>ipcRenderer.sendSync('shell:showNote')},
  update:{
    info:()=>ipcRenderer.sendSync('update:info'),      // {bundled, running, latest, ready, needInstaller, error, ...}
    check:()=>ipcRenderer.invoke('update:check'),
    relaunch:()=>ipcRenderer.invoke('update:relaunch'),
    openReleases:()=>ipcRenderer.invoke('update:openReleases'),
  },
});
