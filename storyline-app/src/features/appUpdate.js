/* ---------- 앱 자동 업데이트: 설정 → 데이터의 한 줄 · 새 버전을 받아 두면 위쪽 알림 (실제 받기는 main.js → updater.js) ---------- */
const AppUpd=Shell&&Shell.update||null;
const buildNo=v=>{const m=/^\d+\.\d+\.(\d+)$/.exec(String(v||''));return m?+m[1]:0};
/* main.js 가 부름: 새 버전을 받아 뒀거나, 설치 파일을 새로 받아야 할 때 */
function onAppUpdate(r){UI.appUpd=r;UI.appUpdHide=false;renderBanner()}
const appUpdRelaunch=async()=>{flushWork();await AppUpd.relaunch()};      // 쓰던 걸 먼저 파일에
function appUpdBanner(b){      // render.js 의 renderBanner 가 부름: 보여 줄 게 있으면 true
  const r=UI.appUpd;if(!AppUpd||!r||UI.appUpdHide||!(r.ready||r.needInstaller))return false;
  const hide=h('button',{class:'quiet',onclick:()=>{UI.appUpdHide=true;renderBanner()}},'나중에');
  if(r.ready)b.append(h('span',{},`새 버전(${r.ready})을 받아 뒀어요. 다시 켜면 적용돼요.`),h('button',{class:'quiet',onclick:appUpdRelaunch},'지금 다시 시작'),hide);
  else b.append(h('span',{},`새 버전(${r.latest})은 설치 파일을 새로 받아야 해요.`),h('button',{class:'quiet',onclick:()=>AppUpd.openReleases()},'받으러 가기'),hide);
  return true;
}
function appUpdText(r){
  const v=`지금 버전 ${buildNo(r.running)||'개발용'}`;
  if(r.dev)return v+' · 개발용으로 켜서 업데이트를 확인하지 않아요';
  if(r.checking)return v+' · 확인 중…';
  if(r.ready)return v+` · 새 버전 ${r.ready} 준비됨 (다시 켜면 적용)`;
  if(r.needInstaller)return v+` · 새 버전 ${r.latest}은 설치 파일로 받아야 해요`;
  if(r.error)return v+' · '+r.error;
  if(r.latest)return v+' · 최신이에요';
  return v;
}
/* 설정 → 데이터 탭에 들어가는 줄 */
function appUpdRows(row){
  if(!AppUpd)return [];
  const r=UI.appUpd=AppUpd.info(),st=h('span',{class:'muted'},appUpdText(r));
  const check=h('button',{onclick:async()=>{check.disabled=true;st.textContent=appUpdText({...r,checking:true});
    const x=await AppUpd.check();UI.appUpd=x;check.disabled=false;
    if(!x.error&&!x.ready&&!x.needInstaller&&x.latest)toast('최신 버전이에요');
    if($('modal').classList.contains('on'))showSettings();renderBanner()}},'업데이트 확인');
  return [row('앱 업데이트','새 버전이 나오면 알아서 받아 두고, 다시 켤 때 적용해요',st,
    r.dev?null:check,
    r.ready?h('button',{class:'on',onclick:appUpdRelaunch},'다시 시작해서 적용'):null,
    r.needInstaller?h('button',{onclick:()=>AppUpd.openReleases()},'설치 파일 받기'):null)];
}
