// 포스트잇 창 ↔ main.js 다리 (큰 창의 작품 데이터는 main.js 가 대신 읽고 씀)
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('noteApi',{
  init:()=>ipcRenderer.invoke('note:init'),                 // {kinds, defaultKind, list, workName, opacity, onTop, isMac}
  list:()=>ipcRenderer.invoke('note:list'),
  add:(text,kind)=>ipcRenderer.invoke('note:add',text,kind),
  update:(id,text,kind)=>ipcRenderer.invoke('note:update',id,text,kind),
  setOpacity:v=>ipcRenderer.invoke('note:opacity',v),
  setOnTop:v=>ipcRenderer.invoke('note:onTop',v),
  hide:()=>ipcRenderer.invoke('note:hide'),
  openMain:()=>ipcRenderer.invoke('note:openMain'),
  onShown:fn=>ipcRenderer.on('note:shown',()=>fn()),
  onFlush:fn=>ipcRenderer.on('note:flush',()=>fn()),
});
