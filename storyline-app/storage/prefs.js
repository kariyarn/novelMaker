// 앱 전체 취향 (작품을 바꿔도 그대로): 주 폴더 우선, 없으면 미러
const fs=require('fs'),path=require('path');
const {valid,atomicWrite}=require('./files');
const {PREF}=require('./layout');
const {logError}=require('./log');

function createPrefs(dirs){
  function load(){
    for(const base of [dirs.main,dirs.mirror]){try{const t=fs.readFileSync(path.join(base,PREF),'utf8');if(valid(t))return t}catch(e){}}
    return null;
  }
  function save(text){
    if(!valid(text))return false;
    try{atomicWrite(path.join(dirs.mirror,PREF),text)}catch(e){logError('취향 저장 (로컬 사본)',e)}
    try{atomicWrite(path.join(dirs.main,PREF),text)}catch(e){logError('취향 저장 (저장 폴더)',e);return false}
    return true;
  }
  return {load,save};
}
module.exports={createPrefs};
