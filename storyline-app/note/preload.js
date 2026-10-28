// 포스트잇 창 ↔ main.js 다리 (큰 창의 작품 데이터는 main.js 가 대신 읽고 씀)
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('noteApi',{
  init:()=>ipcRenderer.invoke('note:init'),                 // {kinds, defaultKind, list, works:{current,list}, opacity, onTop, fontSize, isMac, glass}
  list:()=>ipcRenderer.invoke('note:list'),
  add:(text,kind)=>ipcRenderer.invoke('note:add',text,kind),
  update:(id,text,kind)=>ipcRenderer.invoke('note:update',id,text,kind),
  setOpacity:v=>ipcRenderer.invoke('note:opacity',v),
  setOnTop:v=>ipcRenderer.invoke('note:onTop',v),
  setFontSize:v=>ipcRenderer.invoke('note:fontSize',v),
  openWork:id=>ipcRenderer.invoke('note:openWork',id),         // 다른 작품으로 바꾸기 (큰 창도 같이 바뀜)
  hide:()=>ipcRenderer.invoke('note:hide'),
  openMain:()=>ipcRenderer.invoke('note:openMain'),
  quit:()=>ipcRenderer.invoke('note:quit'),                    // 앱 끄기 (쓰던 글은 먼저 저장)
  moveTo:(x,y)=>ipcRenderer.send('note:moveTo',x,y),           // Alt+끌기로 창 옮기기
  onShown:fn=>ipcRenderer.on('note:shown',()=>fn()),
  onFlush:fn=>ipcRenderer.on('note:flush',()=>fn()),
});
