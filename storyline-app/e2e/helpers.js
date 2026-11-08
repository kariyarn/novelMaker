// E2E 도우미: 진짜 앱(Electron)을 따로 된 임시 폴더로 켜서 사람처럼 눌러 봄
// 진짜 작품 · 설정은 건드리지 않음 (STORYLINE_DATA_DIR · STORYLINE_USER_DATA)
const fs=require('fs'),os=require('os'),path=require('path');
const {_electron}=require('playwright-core');
const electronPath=require('electron');      // node 에서 require 하면 Electron 실행 파일 경로

const APP=path.join(__dirname,'..');
const newHome=()=>fs.mkdtempSync(path.join(os.tmpdir(),'storyline-e2e-'));

// home 이 같으면 같은 작품 · 설정으로 다시 켬 (끄고 다시 켜도 남아 있는지 볼 때)
async function launch(home){
  const env={...process.env,STORYLINE_DATA_DIR:path.join(home,'data'),STORYLINE_USER_DATA:path.join(home,'user')};
  delete env.ELECTRON_RUN_AS_NODE;
  const args=[APP];
  if(process.platform==='linux')args.push('--no-sandbox');      // CI(리눅스)의 Chromium 프로세스 샌드박스 제한 피하기 (화면 sandbox 옵션과는 별개)
  const app=await _electron.launch({executablePath:electronPath,args,env,timeout:60000});
  const win=await app.firstWindow();
  const problems=[];      // 화면 오류 · CSP 위반 모음
  win.on('console',m=>{if(m.type()==='error')problems.push(m.text())});
  win.on('pageerror',e=>problems.push(e.message));
  await win.waitForFunction(()=>typeof S==='object'&&S&&Array.isArray(S.cards)&&document.querySelector('#top .tabs, #top button'),null,{timeout:30000});
  // 처음 켜면 0.4초 뒤 둘러보기가 뜸 → 건너뛰기 (한 번 건너뛰면 다음부터 안 뜸)
  const skip=win.locator('#modal.on').getByRole('button',{name:'건너뛰기'});
  try{await skip.waitFor({timeout:2000});await skip.click()}catch(e){}
  await win.waitForFunction(()=>!document.querySelector('#modal.on'),null,{timeout:5000});
  return {app,win,problems};
}
// 저장이 끝날 때까지 (위쪽 '자동 저장됨')
const waitSaved=win=>win.waitForFunction(()=>{const e=document.getElementById('savedInd');return !e||e.dataset.st==='saved'},null,{timeout:10000});
async function close(app){try{await app.close()}catch(e){}}

module.exports={launch,newHome,waitSaved,close};
