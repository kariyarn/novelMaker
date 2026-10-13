// 작품(소설)별 파일 저장소
//   캐릭터 스토리라인/
//     library.json              작품 목록 (이름, 현재 작품, 보관 여부)
//     prefs.json                앱 전체 취향 (화면 색, 글꼴, 핀 색, 패널 너비 …)
//     works/<작품 id>/storyline.json, storyline_ui.json, backups/*.json.gz
//     이전 버전/                 예전 단일 파일 구조에서 옮겨 둔 원본 (지우지 않음)
// 원자적 쓰기 + 로컬 미러 + 자동 백업(압축) + 손상 시 복구
const fs=require('fs'),path=require('path'),os=require('os'),zlib=require('zlib');
const NAME='캐릭터 스토리라인';
const FILES={storyline_v1:'storyline.json',storyline_ui_v1:'storyline_ui.json'};
const BK=/^storyline-\d{8}-\d{6}\.json(\.gz)?$/;

function pickDir(userData){
  if(process.env.STORYLINE_DATA_DIR)return {main:path.join(process.env.STORYLINE_DATA_DIR,'main'),mirror:path.join(process.env.STORYLINE_DATA_DIR,'mirror'),icloud:false};      // 테스트용
  const icloud=path.join(os.homedir(),'Library','Mobile Documents','com~apple~CloudDocs');
  const base=fs.existsSync(icloud)?icloud:path.join(os.homedir(),'Documents');
  return {main:path.join(base,NAME),mirror:path.join(userData,'data'),icloud:base===icloud};
}
const valid=t=>{try{const o=JSON.parse(t);return o&&typeof o==='object'?o:null}catch(e){return null}};
const okState=o=>o&&Array.isArray(o.characters)&&Array.isArray(o.cards);

function atomicWrite(file,data){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const tmp=file+'.tmp-'+process.pid;
  const fd=fs.openSync(tmp,'w');
  try{fs.writeSync(fd,data);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
  fs.renameSync(tmp,file);
}
const stamp=d=>{const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`};

function create(userData){
  const dirs=pickDir(userData);
  const LIBF='library.json',PREF='prefs.json';
  const wdir=(base,id)=>path.join(base,'works',id);
  const bdirOf=id=>path.join(wdir(dirs.main,id),'backups');
  const lastBackup={};
  const readText=p=>{const b=fs.readFileSync(p);return (p.endsWith('.gz')?zlib.gunzipSync(b):b).toString('utf8')};
  const readJson=(p,pred)=>{try{const o=valid(readText(p));return o&&(!pred||pred(o))?o:null}catch(e){return null}};
  const scan=(dir,re)=>{const out=[];try{for(const n of fs.readdirSync(dir))if(re.test(n)){const p=path.join(dir,n);try{out.push({p,m:fs.statSync(p).mtimeMs})}catch(e){}}}catch(e){}return out};
  const newId=()=>'w'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const rm=p=>{try{fs.rmSync(p,{recursive:true,force:true})}catch(e){}};
  const now=()=>Date.now();

  /* ---------- 작품 목록 ---------- */
  let lib=null;
  function saveLib(){
    const t=JSON.stringify(lib,null,1);
    try{atomicWrite(path.join(dirs.mirror,LIBF),t)}catch(e){}
    try{atomicWrite(path.join(dirs.main,LIBF),t)}catch(e){}
  }
  // iCloud 충돌 사본("library 2.json")과 미러까지 읽어서 합침: 작품이 사라지지 않게
  function readLibs(){
    const cs=[...scan(dirs.main,/^library( \d+)?\.json$/),...scan(dirs.mirror,/^library\.json$/)].sort((a,b)=>b.m-a.m);
    return cs.map(c=>readJson(c.p,o=>Array.isArray(o.novels))).filter(Boolean);
  }
  function mergeLibs(list){
    const out={version:1,current:(list[0]&&list[0].current)||null,novels:[]},seen=new Map();
    list.forEach(l=>l.novels.forEach(n=>{
      if(!n||!n.id)return;const o=seen.get(n.id);
      if(!o){const c={...n};seen.set(n.id,c);out.novels.push(c)}
      else if((n.updated||0)>(o.updated||0))Object.assign(o,n);
    }));
    return out;
  }
  const dataMtime=id=>Math.max(0,...scan(wdir(dirs.main,id),/^storyline( \d+)?\.json$/).map(x=>x.m),...scan(wdir(dirs.mirror,id),/^storyline\.json$/).map(x=>x.m));
  function reconcile(){      // 목록에 없지만 디스크에 있는 작품 폴더는 되살림
    const ids=new Set();
    for(const base of [dirs.main,dirs.mirror]){try{fs.readdirSync(path.join(base,'works')).forEach(n=>ids.add(n))}catch(e){}}
    ids.forEach(id=>{const m=dataMtime(id);if(m&&!lib.novels.some(n=>n.id===id))lib.novels.push({id,name:'복구된 작품 '+id.slice(-4),created:m,updated:m})});
  }
  // 예전 단일 파일 구조: 루트의 storyline.json (iCloud 충돌 사본 "storyline 2.json" 포함) 중 가장 최근의 정상 파일
  function legacyPick(base,stem,pred){
    const c=scan(base,new RegExp('^'+stem+'( \\d+)?\\.json$')).sort((a,b)=>b.m-a.m);
    for(const x of c){const o=readJson(x.p,pred);if(o)return {p:x.p,text:readText(x.p),m:x.m}}
    return null;
  }
  function migrateLegacy(){      // 예전 단일 파일 → 첫 작품. 원본은 '이전 버전' 폴더로 옮겨 보관 (지우지 않음)
    const id=newId(),nd=wdir(dirs.main,id),md=wdir(dirs.mirror,id);
    const pickBest=stem=>{const a=legacyPick(dirs.main,stem,stem==='storyline'?okState:null),b=legacyPick(dirs.mirror,stem,stem==='storyline'?okState:null);return a&&b?(a.m>=b.m?a:b):(a||b)};
    const doc=pickBest('storyline'),ui=pickBest('storyline_ui');
    if(doc){try{atomicWrite(path.join(nd,'storyline.json'),doc.text)}catch(e){}try{atomicWrite(path.join(md,'storyline.json'),doc.text)}catch(e){}}
    if(ui){try{atomicWrite(path.join(nd,'storyline_ui.json'),ui.text)}catch(e){}try{atomicWrite(path.join(md,'storyline_ui.json'),ui.text)}catch(e){}}
    try{const ob=path.join(dirs.main,'backups');for(const n of fs.readdirSync(ob))if(BK.test(n)){fs.mkdirSync(path.join(nd,'backups'),{recursive:true});fs.copyFileSync(path.join(ob,n),path.join(nd,'backups',n))}}catch(e){}
    try{
      const old=path.join(dirs.main,'이전 버전');fs.mkdirSync(old,{recursive:true});
      for(const n of fs.readdirSync(dirs.main))if(/^storyline(_ui)?( \d+)?\.json$/.test(n)||n==='backups'){try{fs.renameSync(path.join(dirs.main,n),path.join(old,n))}catch(e){}}
    }catch(e){}
    lib.novels.push({id,name:'내 첫 작품',created:now(),updated:now(),needsName:true});lib.current=id;
  }
  (function init(){
    const libs=readLibs();
    if(libs.length)lib=mergeLibs(libs);
    else{
      lib={version:1,current:null,novels:[]};
      if(legacyPick(dirs.main,'storyline',okState)||legacyPick(dirs.mirror,'storyline',okState))migrateLegacy();
    }
    reconcile();      // 목록 파일이 없어도 디스크에 남은 작품은 되살림
    if(!lib.novels.length){const id=newId();lib.novels.push({id,name:'내 첫 작품',created:now(),updated:now(),fresh:true});lib.current=id}
    if(!lib.novels.some(n=>n.id===lib.current&&!n.archived)){
      const o=lib.novels.filter(n=>!n.archived).sort((a,b)=>(b.updated||0)-(a.updated||0))[0];
      if(o)lib.current=o.id;
      else{const id=newId();lib.novels.push({id,name:'내 첫 작품',created:now(),updated:now(),fresh:true});lib.current=id}
    }
    saveLib();
  })();
  const nov=id=>lib.novels.find(n=>n.id===id);

  /* ---------- 작품 데이터 읽기/쓰기 ---------- */
  // iCloud 충돌 사본("storyline 2.json")과 로컬 미러, 백업까지 후보에 넣고 가장 최근의 정상 파일을 씀
  function candidates(id,key){
    const f=FILES[key],stem=f.replace('.json','');
    const out=[...scan(wdir(dirs.main,id),new RegExp('^'+stem+'( \\d+)?\\.json$')),...scan(wdir(dirs.mirror,id),new RegExp('^'+stem+'\\.json$'))];
    if(key==='storyline_v1')out.push(...scan(bdirOf(id),/^storyline-.*\.json(\.gz)?$/));
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
  function load(key){const r=loadOf(lib.current,key);const n=nov(lib.current);return {...r,fresh:!!(n&&n.fresh)}}
  function backup(id,text){
    const t0=now();
    if(t0-(lastBackup[id]||0)<10*60*1000)return;
    lastBackup[id]=t0;
    const bd=bdirOf(id);
    try{
      atomicWrite(path.join(bd,'storyline-'+stamp(new Date())+'.json.gz'),zlib.gzipSync(Buffer.from(text,'utf8')));
      const files=fs.readdirSync(bd).filter(n=>BK.test(n)).sort().reverse();
      const keepDay=new Set();
      files.forEach((n,i)=>{
        const day=n.slice(10,18);
        const recent=i<40;                       // 최근 40개는 전부
        const firstOfDay=!keepDay.has(day);keepDay.add(day);
        const age=(t0-fs.statSync(path.join(bd,n)).mtimeMs)/864e5;
        if(!recent&&!(firstOfDay&&age<90))try{fs.unlinkSync(path.join(bd,n))}catch(e){}
      });
    }catch(e){}
  }
  function touch(id){
    const n=nov(id);if(!n)return;let dirty=false;
    if(n.fresh){delete n.fresh;dirty=true}
    if(now()-(n.updated||0)>60000){n.updated=now();dirty=true}
    if(dirty)saveLib();
  }
  function save(key,text){
    const f=FILES[key];if(!f)return {ok:false,err:'unknown key'};
    const o=valid(text);
    if(!o||(key==='storyline_v1'&&!okState(o)))return {ok:false,err:'invalid data'};
    const id=lib.current;let ok=false,err='';
    try{atomicWrite(path.join(wdir(dirs.mirror,id),f),text);ok=true}catch(e){err=String(e)}      // 로컬 미러
    try{atomicWrite(path.join(wdir(dirs.main,id),f),text);ok=true}catch(e){err=String(e)}        // iCloud 폴더
    if(key==='storyline_v1'){backup(id,text);touch(id)}
    return {ok,err};
  }

  /* ---------- 백업 (현재 작품) ---------- */
  function listBackups(){
    const bd=bdirOf(lib.current);let names=[];try{names=fs.readdirSync(bd).filter(n=>BK.test(n))}catch(e){}
    return names.sort().reverse().map(n=>{
      const pth=path.join(bd,n);let st;try{st=fs.statSync(pth)}catch(e){return null}
      let ch=0,cd=0,ep=0,ok=false;
      try{const o=JSON.parse(readText(pth));ch=(o.characters||[]).length;cd=(o.cards||[]).length;ep=(o.episodes||[]).length;ok=Array.isArray(o.characters)&&Array.isArray(o.cards)}catch(e){}
      return {name:n,mtime:st.mtimeMs,size:st.size,chars:ch,cards:cd,eps:ep,ok};
    }).filter(Boolean);
  }
  function readBackup(name){if(!BK.test(String(name)))return null;try{return readText(path.join(bdirOf(lib.current),name))}catch(e){return null}}
  function forceBackup(text){const o=valid(text);if(!okState(o))return false;lastBackup[lib.current]=0;backup(lib.current,text);return true}

  /* ---------- 작품 관리 ---------- */
  const clean=n=>String(n||'').replace(/\s+/g,' ').trim().slice(0,80)||'새 작품';
  function createNovel(name){const id=newId();lib.novels.push({id,name:clean(name),created:now(),updated:now()});saveLib();return id}
  function openNovel(id){const n=nov(id);if(!n||n.archived)return false;lib.current=id;n.updated=now();saveLib();return true}
  function renameNovel(id,name){const n=nov(id);if(!n)return false;n.name=clean(name);delete n.needsName;saveLib();return true}
  function duplicateNovel(id,name){
    const src=nov(id);if(!src)return null;const nid=newId();
    for(const key of Object.keys(FILES)){
      const r=loadOf(id,key);if(!r.text)continue;
      try{atomicWrite(path.join(wdir(dirs.mirror,nid),FILES[key]),r.text)}catch(e){}
      try{atomicWrite(path.join(wdir(dirs.main,nid),FILES[key]),r.text)}catch(e){}
    }
    lib.novels.push({id:nid,name:clean(name||src.name+' (복사)'),created:now(),updated:now()});saveLib();return nid;
  }
  function archiveNovel(id){      // 지우지 않고 보관함으로: 복구할 수 있음
    const n=nov(id);if(!n||n.archived)return false;
    if(!lib.novels.some(x=>!x.archived&&x.id!==id))return false;      // 마지막 작품은 보관 불가
    n.archived=true;n.archivedAt=now();n.updated=now();
    if(lib.current===id)lib.current=lib.novels.filter(x=>!x.archived).sort((a,b)=>(b.updated||0)-(a.updated||0))[0].id;
    saveLib();return true;
  }
  function restoreNovel(id){const n=nov(id);if(!n)return false;delete n.archived;delete n.archivedAt;n.updated=now();saveLib();return true}
  function deleteNovel(id){      // 보관함에 있는 작품만 영구 삭제
    const n=nov(id);if(!n||!n.archived)return false;
    rm(wdir(dirs.main,id));rm(wdir(dirs.mirror,id));lib.novels=lib.novels.filter(x=>x.id!==id);saveLib();return true;
  }
  const library=()=>JSON.parse(JSON.stringify(lib));

  /* ---------- 앱 전체 취향 ---------- */
  function loadPrefs(){
    for(const base of [dirs.main,dirs.mirror]){try{const t=fs.readFileSync(path.join(base,PREF),'utf8');if(valid(t))return t}catch(e){}}
    return null;
  }
  function savePrefs(text){
    if(!valid(text))return false;
    try{atomicWrite(path.join(dirs.mirror,PREF),text)}catch(e){}
    try{atomicWrite(path.join(dirs.main,PREF),text)}catch(e){return false}
    return true;
  }
  const backupsDir=()=>{const d=bdirOf(lib.current);try{fs.mkdirSync(d,{recursive:true})}catch(e){}return d};
  return {load,save,dirs,listBackups,readBackup,forceBackup,library,createNovel,openNovel,renameNovel,duplicateNovel,archiveNovel,restoreNovel,deleteNovel,loadPrefs,savePrefs,backupsDir,current:()=>lib.current};
}
module.exports={create};
