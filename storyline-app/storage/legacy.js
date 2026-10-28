// 예전 단일 파일 구조(루트의 storyline.json) → 작품별 구조로 옮기기. 원본은 '이전 버전' 폴더로 옮겨 보관 (지우지 않음)
const fs=require('fs'),path=require('path');
const {okState,atomicWrite,readText,readJson,scan}=require('./files');
const {BK,wdir}=require('./layout');
const {logError}=require('./log');

// iCloud 충돌 사본 "storyline 2.json" 포함, 가장 최근의 정상 파일
function legacyPick(base,stem,pred){
  const c=scan(base,new RegExp('^'+stem+'( \\d+)?\\.json$')).sort((a,b)=>b.m-a.m);
  for(const x of c){const o=readJson(x.p,pred);if(o)return {p:x.p,text:readText(x.p),m:x.m}}
  return null;
}
const hasLegacy=dirs=>!!(legacyPick(dirs.main,'storyline',okState)||legacyPick(dirs.mirror,'storyline',okState));

function migrateLegacy(dirs,id){      // 옮긴 작품 폴더 id 를 받아 파일만 옮김 (목록에 넣는 건 부르는 쪽)
  const nd=wdir(dirs.main,id),md=wdir(dirs.mirror,id);
  const pickBest=stem=>{const a=legacyPick(dirs.main,stem,stem==='storyline'?okState:null),b=legacyPick(dirs.mirror,stem,stem==='storyline'?okState:null);return a&&b?(a.m>=b.m?a:b):(a||b)};
  const doc=pickBest('storyline'),ui=pickBest('storyline_ui');
  if(doc){try{atomicWrite(path.join(nd,'storyline.json'),doc.text)}catch(e){logError('예전 작품 옮기기',e)}try{atomicWrite(path.join(md,'storyline.json'),doc.text)}catch(e){logError('예전 작품 옮기기 (로컬 사본)',e)}}
  if(ui){try{atomicWrite(path.join(nd,'storyline_ui.json'),ui.text)}catch(e){logError('예전 보기 상태 옮기기',e)}try{atomicWrite(path.join(md,'storyline_ui.json'),ui.text)}catch(e){logError('예전 보기 상태 옮기기 (로컬 사본)',e)}}
  try{const ob=path.join(dirs.main,'backups');for(const n of fs.readdirSync(ob))if(BK.test(n)){fs.mkdirSync(path.join(nd,'backups'),{recursive:true});fs.copyFileSync(path.join(ob,n),path.join(nd,'backups',n))}}catch(e){if(e.code!=='ENOENT')logError('예전 백업 옮기기',e)}
  try{
    const old=path.join(dirs.main,'이전 버전');fs.mkdirSync(old,{recursive:true});
    for(const n of fs.readdirSync(dirs.main))if(/^storyline(_ui)?( \d+)?\.json$/.test(n)||n==='backups'){try{fs.renameSync(path.join(dirs.main,n),path.join(old,n))}catch(e){logError('예전 파일 치우기',e)}}
  }catch(e){logError('예전 파일 치우기',e)}
}
module.exports={hasLegacy,migrateLegacy};
