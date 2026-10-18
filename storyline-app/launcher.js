// 앱 시작점: 내려받아 둔 새 앱 코드(updater.js 가 받음)가 있으면 그걸로, 없거나 문제가 있으면 설치본 코드로 켬
// 이 파일만은 설치 파일로만 바뀜 — 새 코드가 망가져도 늘 설치본으로 돌아올 수 있게 여기에는 최소한만 둠
const {app}=require('electron');
const fs=require('fs'),path=require('path');
app.setName('캐릭터 스토리라인');      // main.js 와 같은 이름 (저장 폴더 위치가 바뀌지 않게 먼저)
const bundled=require('./package.json').version;
const buildOf=v=>{const m=/^\d+\.\d+\.(\d+)$/.exec(String(v||''));return m?+m[1]:0};      // 1.0.<빌드 번호>
const DIR=path.join(app.getPath('userData'),'app-update'),CUR=path.join(DIR,'current.json');
const readCur=()=>{try{return JSON.parse(fs.readFileSync(CUR,'utf8'))}catch(e){return null}};
const writeCur=c=>{try{const t=CUR+'.tmp';fs.writeFileSync(t,JSON.stringify(c));fs.renameSync(t,CUR)}catch(e){}};
const MAX_TRIES=3;      // 새 코드로 세 번 켰는데도 화면이 한 번도 안 떴으면 포기하고 설치본으로

function pick(){
  const c=readCur();if(!c||!c.dir||!c.version)return null;
  if(buildOf(c.version)<=buildOf(bundled))return null;      // 설치 파일을 더 새로 깔았으면 설치본
  if((c.tries||0)>=MAX_TRIES)return null;
  if(c.minElectron&&+process.versions.electron.split('.')[0]<c.minElectron)return null;      // 새 코드가 더 새 Electron 을 바라면 설치 파일로만
  const dir=path.join(DIR,path.basename(c.dir));
  if(!fs.existsSync(path.join(dir,'main.js')))return null;
  c.tries=(c.tries||0)+1;writeCur(c);
  return {dir,version:c.version};
}

const u=pick();
global.appUpdate={
  bundled,running:u?u.version:bundled,dir:u?u.dir:null,maxTries:MAX_TRIES,
  ok(){if(!u||!global.appUpdate.dir)return;      // 설치본으로 돌아와 켜졌으면 새 코드 기록은 그대로 둠
    const c=readCur();if(c&&c.version===u.version&&c.tries){c.tries=0;writeCur(c)}},      // 화면이 잘 떴음 (main.js 가 부름)
};
if(u){
  try{require(path.join(u.dir,'main.js'))}
  catch(e){      // 새 코드를 읽다가 바로 죽으면: 다시는 안 쓰게 표시하고 설치본으로
    console.error('새 앱 코드를 켜지 못해서 설치본으로 켜요:',e);
    const c=readCur();if(c&&c.version===u.version){c.tries=MAX_TRIES;c.error=String(e&&e.message||e);writeCur(c)}
    Object.assign(global.appUpdate,{running:bundled,dir:null});
    require('./main.js');
  }
}
else require('./main.js');
