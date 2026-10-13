// 작품 데이터 파일 읽기/쓰기: 주 폴더(iCloud)와 로컬 미러 둘 다 쓰고, 읽을 땐 가장 최근의 정상 파일
const path=require('path');
const {valid,okState,atomicWrite,readText,scan}=require('./files');
const {FILES,wdir,bdirOf}=require('./layout');

function createWorks(dirs){
  // iCloud 충돌 사본("storyline 2.json")과 로컬 미러, 백업까지 후보에 넣음
  function candidates(id,key){
    const f=FILES[key],stem=f.replace('.json','');
    const out=[...scan(wdir(dirs.main,id),new RegExp('^'+stem+'( \\d+)?\\.json$')),...scan(wdir(dirs.mirror,id),new RegExp('^'+stem+'\\.json$'))];
    if(key==='storyline_v1')out.push(...scan(bdirOf(dirs,id),/^storyline-.*\.json(\.gz)?$/));
    return out.sort((a,b)=>b.m-a.m);
  }
  function loadOf(id,key){
    const isMain=key==='storyline_v1';
    for(const c of candidates(id,key)){
      let t;try{t=readText(c.p)}catch(e){continue}
      const o=valid(t);
      if(o&&(!isMain||okState(o)))return {text:t,from:c.p};
    }
    return {text:null,from:null};
  }
  // 미러 → 주 폴더 순서로 씀. 하나라도 되면 ok
  function writeOf(id,key,text){
    const f=FILES[key];let ok=false,err='';
    try{atomicWrite(path.join(wdir(dirs.mirror,id),f),text);ok=true}catch(e){err=String(e)}      // 로컬 미러
    try{atomicWrite(path.join(wdir(dirs.main,id),f),text);ok=true}catch(e){err=String(e)}        // iCloud 폴더
    return {ok,err};
  }
  function copy(from,to){      // 작품 복제: 있는 파일만
    for(const key of Object.keys(FILES)){const r=loadOf(from,key);if(r.text)writeOf(to,key,r.text)}
  }
  return {loadOf,writeOf,copy};
}
module.exports={createWorks};
