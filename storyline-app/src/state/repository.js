/* 저장 창구: 앱(Electron)이면 nativeStore, 브라우저로 열었으면 localStorage.
   나머지 코드는 어느 쪽인지 몰라도 되도록 이 창구만 씀. 앱에만 있는 기능(작품 목록 · 자동 백업 · 앱 전체 취향 · 폴더 열기)은 없으면 null */
const NS=window.nativeStore;
const Repo=NS?{
  native:true,
  read:k=>{const r=NS.load(k)||{};return {text:r.text||null,fresh:!!r.fresh}},      // 작품마다 따로: 작품 데이터 · 보기 상태
  write:(k,t)=>{try{return NS.save(k,t).ok}catch(e){return false}},
  writeAsync:NS.saveAsync?(k,t)=>NS.saveAsync(k,t).then(r=>!!(r&&r.ok)):null,      // 화면을 멈추지 않는 저장 (순서는 그대로 지켜짐)
  prefs:NS.savePrefs?{load:()=>NS.loadPrefs(),save:t=>NS.savePrefs(t),saveAsync:NS.savePrefsAsync?t=>NS.savePrefsAsync(t):null}:null,
  novels:NS.library?{list:()=>NS.library(),create:n=>NS.createNovel(n),open:id=>NS.openNovel(id),rename:(id,n)=>NS.renameNovel(id,n),
    duplicate:(id,n)=>NS.duplicateNovel(id,n),archive:id=>NS.archiveNovel(id),restore:id=>NS.restoreNovel(id),remove:id=>NS.deleteNovel(id)}:null,
  backups:NS.backups?{list:()=>NS.backups(),read:n=>NS.readBackup(n),force:t=>NS.forceBackup(t)}:null,
  openFolder:NS.openDir?w=>NS.openDir(w):null,      // 'data' · 'backups'
}:{
  native:false,
  read:k=>({text:localStorage.getItem(k),fresh:false}),
  write:(k,t)=>{try{localStorage.setItem(k,t);return true}catch(e){return false}},      // 앱이 아닐 때만 브라우저 저장소를 씀 (작품이 섞이지 않게)
  writeAsync:null,prefs:null,novels:null,backups:null,openFolder:null,
};
