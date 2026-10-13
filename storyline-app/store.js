// 작품(소설)별 파일 저장소: 원자적 쓰기 + 로컬 미러 + 자동 백업(압축) + 손상 시 복구
// 실제 일은 storage/ 의 모듈들이 나눠서 하고, 여기서는 묶어서 main.js 에 하나의 창구로 내놓음
//   storage/layout.js   폴더 구조 · 저장 위치 고르기
//   storage/files.js    원자적 쓰기 · 읽기 도구
//   storage/library.js  작품 목록 (+ legacy.js: 예전 단일 파일 구조 옮기기)
//   storage/works.js    작품 데이터 파일
//   storage/backups.js  자동 백업
//   storage/prefs.js    앱 전체 취향
const {valid,okState,rm}=require('./storage/files');
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

  return {
    load,save,dirs,
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
