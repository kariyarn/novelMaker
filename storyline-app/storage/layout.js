// 저장 폴더 구조
//   캐릭터 스토리라인/
//     library.json              작품 목록 (이름, 현재 작품, 보관 여부)
//     prefs.json                앱 전체 취향 (화면 색, 글꼴, 핀 색, 패널 너비 …)
//     works/<작품 id>/storyline.json, storyline_ui.json, backups/*.json.gz
//     이전 버전/                 예전 단일 파일 구조에서 옮겨 둔 원본 (지우지 않음)
const fs=require('fs'),path=require('path'),os=require('os');
const NAME='캐릭터 스토리라인';
const FILES={storyline_v1:'storyline.json',storyline_ui_v1:'storyline_ui.json'};
const BK=/^storyline-\d{8}-\d{6}\.json(\.gz)?$/;
const LIBF='library.json',PREF='prefs.json';

function pickDir(userData){
  if(process.env.STORYLINE_DATA_DIR)return {main:path.join(process.env.STORYLINE_DATA_DIR,'main'),mirror:path.join(process.env.STORYLINE_DATA_DIR,'mirror'),icloud:false};      // 테스트용
  const icloud=path.join(os.homedir(),'Library','Mobile Documents','com~apple~CloudDocs');
  const base=fs.existsSync(icloud)?icloud:path.join(os.homedir(),'Documents');
  return {main:path.join(base,NAME),mirror:path.join(userData,'data'),icloud:base===icloud};
}
const wdir=(base,id)=>path.join(base,'works',id);
const bdirOf=(dirs,id)=>path.join(wdir(dirs.main,id),'backups');

module.exports={FILES,BK,LIBF,PREF,pickDir,wdir,bdirOf};
