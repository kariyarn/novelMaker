// 앱 전체 취향 (작품을 바꿔도 그대로): 주 폴더 우선, 없으면 미러
const fs=require('fs'),path=require('path');
const {valid,atomicWrite}=require('./files');
const {PREF}=require('./layout');

function createPrefs(dirs){
  function load(){
    for(const base of [dirs.main,dirs.mirror]){try{const t=fs.readFileSync(path.join(base,PREF),'utf8');if(valid(t))return t}catch(e){}}
    return null;
  }
  function save(text){
    if(!valid(text))return false;
    try{atomicWrite(path.join(dirs.mirror,PREF),text)}catch(e){}
    try{atomicWrite(path.join(dirs.main,PREF),text)}catch(e){return false}
    return true;
  }
  return {load,save};
}
module.exports={createPrefs};
