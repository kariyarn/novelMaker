// 작품(소설)별 파일 저장소: 원자적 쓰기 + 로컬 미러 + 자동 백업(압축) + 손상 시 복구
// 실제 일은 storage/ 의 모듈들이 나눠서 하고, 여기서는 묶어서 main.js 에 하나의 창구로 내놓음
//   storage/layout.js   폴더 구조 · 저장 위치 고르기
//   storage/files.js    원자적 쓰기 · 읽기 도구
//   storage/library.js  작품 목록 (+ legacy.js: 예전 단일 파일 구조 옮기기)
//   storage/works.js    작품 데이터 파일
//   storage/backups.js  자동 백업
//   storage/prefs.js    앱 전체 취향
const {valid,okState,rm,stamp}=require('./storage/files');
const {FILES,pickDir,wdir}=require('./storage/layout');
const {createLibrary,newId}=require('./storage/library');
const {createWorks}=require('./storage/works');
const {createBackups}=require('./storage/backups');
const {createPrefs}=require('./storage/prefs');

function create(userData){
  const dirs=pickDir(userData);
  const library=createLibrary(dirs);
  const works=createWorks(dirs);
  const backups=createBackups(dirs);
  const prefs=createPrefs(dirs);
  const cur=library.current;

  /* ---------- 현재 작품 데이터 ---------- */
  function load(key){const r=works.loadOf(cur(),key);const n=library.nov(cur());return {...r,fresh:!!(n&&n.fresh)}}
  function save(key,text){
    if(!FILES[key])return {ok:false,err:'unknown key'};
    const o=valid(text);
    if(!o||(key==='storyline_v1'&&!okState(o)))return {ok:false,err:'invalid data'};
    const id=cur(),r=works.writeOf(id,key,text);
    if(key==='storyline_v1'){backups.backup(id,text);library.touch(id)}
    return r;
  }

  /* ---------- 작품 관리 ---------- */
  function duplicateNovel(id,name){
    const src=library.nov(id);if(!src)return null;const nid=newId();
    works.copy(id,nid);
    return library.add(nid,name||src.name+' (복사)');
  }
  function deleteNovel(id){      // 보관함에 있는 작품만 영구 삭제
    const n=library.nov(id);if(!n||!n.archived)return false;
    rm(wdir(dirs.main,id));rm(wdir(dirs.mirror,id));return library.remove(id);
  }

  /* ---------- 동기화 (storage/sync.js 가 씀): 'library.json' · 'prefs.json' · 'works/<id>/storyline.json' 같은 상대 경로로 ---------- */
  const SYNC_FILES={'storyline.json':'storyline_v1','storyline_ui.json':'storyline_ui_v1'};
  const workPath=rel=>{const m=/^works\/([\w-]+)\/(storyline(?:_ui)?\.json)$/.exec(rel);return m?{id:m[1],key:SYNC_FILES[m[2]]}:null};
  function syncPaths(){
    const out=['library.json','prefs.json'];
    for(const n of library.snapshot().novels)for(const f of Object.keys(SYNC_FILES))out.push(`works/${n.id}/${f}`);
    return out;
  }
  function syncRead(rel){
    if(rel==='library.json')return library.exportSync();
    if(rel==='prefs.json')return prefs.load();
    const w=workPath(rel);return w?works.loadOf(w.id,w.key).text:null;
  }
  function syncWrite(rel,text){
    const o=valid(text);if(!o)return false;
    if(rel==='library.json'){if(!Array.isArray(o.novels))return false;library.adopt(o,{merge:true});return true}
    if(rel==='prefs.json')return prefs.save(text);
    const w=workPath(rel);if(!w||(w.key==='storyline_v1'&&!okState(o)))return false;
    if(w.key==='storyline_v1'){const cur=works.loadOf(w.id,w.key).text;if(cur)backups.force(w.id,cur)}      // 덮어쓰기 전 이 기기 것을 백업
    return works.writeOf(w.id,w.key,text).ok;
  }
  function syncConflict(rel,text){      // 양쪽에서 고친 작품: 다른 기기 것을 사본 작품으로 (이 기기 것은 그대로)
    const w=workPath(rel),o=valid(text);if(!w||!okState(o))return null;
    const src=library.nov(w.id),nid=newId(),name=`${src?src.name:'작품'} (다른 기기 ${stamp(new Date()).slice(4,8)})`;
    works.writeOf(nid,'storyline_v1',text);library.add(nid,name);return name;
  }

  return {
    load,save,dirs,
    syncPaths,syncRead,syncWrite,syncConflict,
    listBackups:()=>backups.list(cur()),
    readBackup:name=>backups.read(cur(),name),
    forceBackup:text=>backups.force(cur(),text),
    backupsDir:()=>backups.dir(cur()),
    library:library.snapshot,
    createNovel:library.create,openNovel:library.open,renameNovel:library.rename,duplicateNovel,
    archiveNovel:library.archive,restoreNovel:library.restore,deleteNovel,
    loadPrefs:prefs.load,savePrefs:prefs.save,
    current:cur
  };
}
module.exports={create};
