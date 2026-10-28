// 오류 기록: 조용히 넘기던 실패(저장 · 백업 · 동기화 · 업데이트)를 logs/app.log 에 한 줄씩 남겨 둠
// 1MB 를 넘으면 app.log.1 로 넘기고 새로 씀 (둘만 남김). 기록 자체가 실패해도 앱은 그대로 돌아감
const fs=require('fs'),path=require('path');
const MAX=1024*1024;
let dir=null,last='';
const setLogDir=d=>{dir=d;last=''};      // 앱이 켜질 때 한 번 (테스트 등 정하지 않으면 아무것도 안 씀)
const logDir=()=>dir;
function logError(where,e){
  if(!dir)return;
  const msg=String(e&&e.stack||e&&e.message||e);
  const key=where+'\n'+msg;if(key===last)return;last=key;      // 같은 실패가 연달아 나면 한 번만 (오프라인에서 5분마다 확인할 때 등)
  try{
    fs.mkdirSync(dir,{recursive:true});
    const f=path.join(dir,'app.log');
    try{if(fs.statSync(f).size>MAX)fs.renameSync(f,f+'.1')}catch(x){}      // 아직 파일이 없으면 넘김
    fs.appendFileSync(f,`[${new Date().toISOString()}] ${where}: ${msg}\n`);
  }catch(x){}
}
module.exports={setLogDir,logDir,logError};
