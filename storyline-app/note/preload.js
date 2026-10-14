// 포스트잇 창 ↔ main.js 다리 (큰 창의 작품 데이터는 main.js 가 대신 읽고 씀)
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('noteApi',{
  init:()=>ipcRenderer.invoke('note:init'),                 // {kinds, defaultKind, list, paper, ink, onTop, fontSize, isMac, grip}
  list:()=>ipcRenderer.invoke('note:list'),
  add:(text,kind)=>ipcRenderer.invoke('note:add',text,kind),
  update:(id,text,kind)=>ipcRenderer.invoke('note:update',id,text,kind),
  setLook:v=>ipcRenderer.invoke('note:look',v),                // {paper, ink}: 종이 · 글자 진하기 (0~1)
  resize:(w,h)=>ipcRenderer.invoke('note:resize',w,h),          // 손잡이로 크기 바꾸기 (null 이면 끝)
  setOnTop:v=>ipcRenderer.invoke('note:onTop',v),
  setFontSize:v=>ipcRenderer.invoke('note:fontSize',v),
  hide:()=>ipcRenderer.invoke('note:hide'),
  openMain:()=>ipcRenderer.invoke('note:openMain'),
  onShown:fn=>ipcRenderer.on('note:shown',()=>fn()),
  onFlush:fn=>ipcRenderer.on('note:flush',()=>fn()),
});
