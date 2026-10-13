// 작품 목록 (library.json): 읽기 · 합치기 · 되살리기 · 작품 관리
const fs=require('fs'),path=require('path');
const {atomicWrite,readJson,scan}=require('./files');
const {LIBF,wdir}=require('./layout');
const {hasLegacy,migrateLegacy}=require('./legacy');

const newId=()=>'w'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const clean=n=>String(n||'').replace(/\s+/g,' ').trim().slice(0,80)||'새 작품';

// 여러 목록을 하나로: 같은 작품은 더 최근에 고친 쪽, 영구 삭제한 작품(deleted)은 어느 쪽에서든 빠짐
function mergeLibs(list){
  const out={version:1,current:(list[0]&&list[0].current)||null,novels:[]},seen=new Map(),gone=new Set();
  list.forEach(l=>(l.deleted||[]).forEach(id=>gone.add(id)));
  list.forEach(l=>l.novels.forEach(n=>{
    if(!n||!n.id||gone.has(n.id))return;const o=seen.get(n.id);
    if(!o){const c={...n};seen.set(n.id,c);out.novels.push(c)}
    else if((n.updated||0)>(o.updated||0))Object.assign(o,n);
  }));
  if(gone.size)out.deleted=[...gone];
  return out;
}
// 동기화로 주고받는 목록: 기기마다 다른 '지금 연 작품(current)'은 빼고, 순서를 고정해서 같은 내용이면 같은 글이 되게
const syncText=lib=>JSON.stringify({version:1,novels:[...lib.novels].sort((a,b)=>a.id<b.id?-1:1),...(lib.deleted&&lib.deleted.length?{deleted:[...lib.deleted].sort()}:{})},null,1);

function createLibrary(dirs,now=Date.now){
  let lib=null;
  function save(){
    const t=JSON.stringify(lib,null,1);
    try{atomicWrite(path.join(dirs.mirror,LIBF),t)}catch(e){}
    try{atomicWrite(path.join(dirs.main,LIBF),t)}catch(e){}
  }
  // iCloud 충돌 사본("library 2.json")과 미러까지 읽어서 합침: 작품이 사라지지 않게
  function readLibs(){
    const cs=[...scan(dirs.main,/^library( \d+)?\.json$/),...scan(dirs.mirror,/^library\.json$/)].sort((a,b)=>b.m-a.m);
    return cs.map(c=>readJson(c.p,o=>Array.isArray(o.novels))).filter(Boolean);
  }
  const dataMtime=id=>Math.max(0,...scan(wdir(dirs.main,id),/^storyline( \d+)?\.json$/).map(x=>x.m),...scan(wdir(dirs.mirror,id),/^storyline\.json$/).map(x=>x.m));
  function reconcile(){      // 목록에 없지만 디스크에 있는 작품 폴더는 되살림
    const ids=new Set();
    for(const base of [dirs.main,dirs.mirror]){try{fs.readdirSync(path.join(base,'works')).forEach(n=>ids.add(n))}catch(e){}}
    ids.forEach(id=>{const m=dataMtime(id);if(m&&!lib.novels.some(n=>n.id===id))lib.novels.push({id,name:'복구된 작품 '+id.slice(-4),created:m,updated:m})});
  }
  const latestOpen=()=>lib.novels.filter(n=>!n.archived).sort((a,b)=>(b.updated||0)-(a.updated||0))[0];
  function addFresh(){const id=newId();lib.novels.push({id,name:'내 첫 작품',created:now(),updated:now(),fresh:true});lib.current=id}
  (function init(){
    const libs=readLibs();
    if(libs.length)lib=mergeLibs(libs);
    else{
      lib={version:1,current:null,novels:[]};
      if(hasLegacy(dirs)){const id=newId();migrateLegacy(dirs,id);lib.novels.push({id,name:'내 첫 작품',created:now(),updated:now(),needsName:true});lib.current=id}
    }
    reconcile();      // 목록 파일이 없어도 디스크에 남은 작품은 되살림
    if(!lib.novels.length)addFresh();
    if(!lib.novels.some(n=>n.id===lib.current&&!n.archived)){
      const o=latestOpen();
      if(o)lib.current=o.id;
      else addFresh();
    }
    save();
  })();
  const nov=id=>lib.novels.find(n=>n.id===id);
  const current=()=>lib.current;
  function touch(id){      // 작품 내용을 저장했을 때: 처음 표시를 풀고, 1분에 한 번만 수정 시각 갱신
    const n=nov(id);if(!n)return;let dirty=false;
    if(n.fresh){delete n.fresh;dirty=true}
    if(now()-(n.updated||0)>60000){n.updated=now();dirty=true}
    if(dirty)save();
  }
  function add(id,name){lib.novels.push({id,name:clean(name),created:now(),updated:now()});save();return id}
  const create=name=>add(newId(),name);
  function open(id){const n=nov(id);if(!n||n.archived)return false;lib.current=id;n.updated=now();save();return true}
  function rename(id,name){const n=nov(id);if(!n)return false;n.name=clean(name);delete n.needsName;save();return true}
  function archive(id){      // 지우지 않고 보관함으로: 복구할 수 있음
    const n=nov(id);if(!n||n.archived)return false;
    if(!lib.novels.some(x=>!x.archived&&x.id!==id))return false;      // 마지막 작품은 보관 불가
    n.archived=true;n.archivedAt=now();n.updated=now();
    if(lib.current===id)lib.current=latestOpen().id;
    save();return true;
  }
  function restore(id){const n=nov(id);if(!n)return false;delete n.archived;delete n.archivedAt;n.updated=now();save();return true}
  function remove(id){      // 보관함에 있는 작품만 목록에서 뺌 (파일 지우기는 부르는 쪽)
    const n=nov(id);if(!n||!n.archived)return false;
    lib.novels=lib.novels.filter(x=>x.id!==id);lib.deleted=[...new Set([...(lib.deleted||[]),id])];save();return true;      // 다른 기기에서 되살아나지 않게 기록
  }
  const snapshot=()=>JSON.parse(JSON.stringify(lib));
  /* 동기화 */
  const exportSync=()=>syncText(lib);
  function adopt(remote,{merge}={}){      // 받은 목록으로 바꾸거나(merge 없음) 합침. 지금 연 작품은 이 기기 것 그대로
    const cur=lib.current,next=merge?mergeLibs([lib,remote]):mergeLibs([remote]);
    if(next.novels.some(n=>!n.fresh))next.novels=next.novels.filter(n=>!n.fresh);      // 새 기기에서 저절로 생긴 빈 작품은 받은 작품이 있으면 뺌
    next.current=cur;lib=next;
    if(!lib.novels.some(n=>n.id===lib.current&&!n.archived)){const o=latestOpen();if(o)lib.current=o.id;else addFresh()}
    save();
  }
  return {nov,current,touch,add,create,open,rename,archive,restore,remove,snapshot,exportSync,adopt};
}
module.exports={createLibrary,newId,mergeLibs,syncText};
