// 저장소(store.js) 동작 테스트: node --test
// 실제 데이터를 건드리지 않도록 STORYLINE_DATA_DIR 로 임시 폴더를 씀
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),os=require('os'),zlib=require('zlib');
const {create}=require('../store');

const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'storyline-test-'));
const doc=(n=1)=>JSON.stringify({characters:Array.from({length:n},(_,i)=>({id:'c'+i})),cards:[{id:'k1'}],episodes:[]});
function open(dir){process.env.STORYLINE_DATA_DIR=dir;return create(path.join(dir,'userData'))}
const main=dir=>path.join(dir,'main'),mirror=dir=>path.join(dir,'mirror');
const write=(p,t)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,t)};

test('처음 실행: 빈 작품 하나를 만들고 목록을 저장', ()=>{
  const d=tmp(),s=open(d);
  const lib=s.library();
  assert.equal(lib.novels.length,1);
  assert.equal(lib.current,lib.novels[0].id);
  assert.equal(lib.novels[0].fresh,true);
  assert.ok(fs.existsSync(path.join(main(d),'library.json')));
  assert.ok(fs.existsSync(path.join(mirror(d),'library.json')));
  const r=s.load('storyline_v1');
  assert.equal(r.text,null);assert.equal(r.fresh,true);
  assert.deepEqual(s.dirs,{main:main(d),mirror:mirror(d),icloud:false});
});

test('저장 · 읽기: 주 폴더와 미러 둘 다 쓰고, 잘못된 데이터는 거부', ()=>{
  const d=tmp(),s=open(d),id=s.current();
  assert.deepEqual(s.save('storyline_v1',doc()),{ok:true,err:''});
  assert.equal(fs.readFileSync(path.join(main(d),'works',id,'storyline.json'),'utf8'),doc());
  assert.equal(fs.readFileSync(path.join(mirror(d),'works',id,'storyline.json'),'utf8'),doc());
  assert.equal(s.load('storyline_v1').text,doc());
  assert.equal(s.load('storyline_v1').fresh,false);      // 처음 저장하면 fresh 가 풀림
  assert.deepEqual(s.save('nope','{}'),{ok:false,err:'unknown key'});
  assert.deepEqual(s.save('storyline_v1','{"a":1}'),{ok:false,err:'invalid data'});
  assert.deepEqual(s.save('storyline_v1','not json'),{ok:false,err:'invalid data'});
  assert.deepEqual(s.save('storyline_ui_v1','{"a":1}'),{ok:true,err:''});      // 보기 상태는 모양 검사 없음
  assert.equal(s.load('storyline_ui_v1').text,'{"a":1}');
});

test('읽기: 주 파일이 깨지면 더 최근의 정상 후보(미러)를 씀', ()=>{
  const d=tmp(),s=open(d),id=s.current();
  s.save('storyline_v1',doc(2));
  const mp=path.join(main(d),'works',id,'storyline.json');
  fs.writeFileSync(mp,'{깨짐');
  const future=new Date(Date.now()+5000);fs.utimesSync(mp,future,future);
  assert.equal(s.load('storyline_v1').text,doc(2));
});

test('백업: 저장할 때 압축 백업을 만들고(10분에 한 번), forceBackup 은 바로 만듦', ()=>{
  const d=tmp(),s=open(d);
  s.save('storyline_v1',doc(1));s.save('storyline_v1',doc(2));
  let b=s.listBackups();
  assert.equal(b.length,1);
  assert.match(b[0].name,/^storyline-\d{8}-\d{6}\.json\.gz$/);
  assert.equal(b[0].chars,1);assert.equal(b[0].cards,1);assert.equal(b[0].ok,true);
  assert.equal(s.readBackup(b[0].name),doc(1));
  assert.equal(s.readBackup('../library.json'),null);      // 백업 이름 형식이 아니면 읽지 않음
  assert.equal(s.forceBackup('{"x":1}'),false);
  assert.ok(s.backupsDir().endsWith(path.join('works',s.current(),'backups')));
});

test('읽기: 작품 파일이 모두 깨지면 백업에서 되살림', ()=>{
  const d=tmp(),s=open(d),id=s.current();
  s.save('storyline_v1',doc(3));
  fs.writeFileSync(path.join(main(d),'works',id,'storyline.json'),'x');
  fs.writeFileSync(path.join(mirror(d),'works',id,'storyline.json'),'x');
  const r=s.load('storyline_v1');
  assert.equal(r.text,doc(3));
  assert.match(r.from,/backups/);
});

test('작품 관리: 만들기 · 열기 · 이름 바꾸기 · 복제 · 보관 · 복구 · 삭제', ()=>{
  const d=tmp(),s=open(d),first=s.current();
  s.save('storyline_v1',doc(4));
  const id=s.createNovel('  두 번째   작품 ');
  assert.equal(s.library().novels.find(n=>n.id===id).name,'두 번째 작품');
  assert.equal(s.createNovel('')!==id,true);
  assert.equal(s.library().novels.at(-1).name,'새 작품');
  assert.equal(s.openNovel(id),true);assert.equal(s.current(),id);
  assert.equal(s.load('storyline_v1').text,null);
  assert.equal(s.openNovel('없음'),false);
  assert.equal(s.renameNovel(id,'바꾼 이름'),true);
  assert.equal(s.library().novels.find(n=>n.id===id).name,'바꾼 이름');
  const dup=s.duplicateNovel(first);
  assert.equal(s.library().novels.find(n=>n.id===dup).name.endsWith(' (복사)'),true);
  s.openNovel(dup);assert.equal(s.load('storyline_v1').text,doc(4));
  assert.equal(s.deleteNovel(dup),false);      // 보관하지 않은 작품은 지울 수 없음
  assert.equal(s.archiveNovel(dup),true);
  assert.notEqual(s.current(),dup);      // 보관하면 다른 작품으로 옮겨 감
  assert.equal(s.openNovel(dup),false);
  assert.equal(s.restoreNovel(dup),true);
  assert.equal(s.library().novels.find(n=>n.id===dup).archived,undefined);
  s.archiveNovel(dup);
  assert.equal(s.deleteNovel(dup),true);
  assert.equal(s.library().novels.some(n=>n.id===dup),false);
  assert.equal(fs.existsSync(path.join(main(d),'works',dup)),false);
});

test('작품 관리: 마지막 남은 작품은 보관할 수 없음', ()=>{
  const s=open(tmp());
  assert.equal(s.archiveNovel(s.current()),false);
});

test('작품 목록: 다시 열면 그대로 읽고, iCloud 충돌 사본도 합침', ()=>{
  const d=tmp(),s=open(d);
  const a=s.createNovel('가');
  const lib=JSON.parse(fs.readFileSync(path.join(main(d),'library.json'),'utf8'));
  lib.novels.push({id:'wconflict',name:'충돌 사본에만',created:1,updated:1});
  write(path.join(main(d),'library 2.json'),JSON.stringify(lib));
  const s2=open(d);
  const names=s2.library().novels.map(n=>n.name);
  assert.ok(names.includes('가'));
  assert.ok(names.includes('충돌 사본에만'));
  assert.ok(s2.library().novels.some(n=>n.id===a));
});

test('작품 목록에 없지만 디스크에 남은 작품 폴더는 되살림', ()=>{
  const d=tmp();open(d);
  write(path.join(main(d),'works','wlost1234','storyline.json'),doc());
  const s=open(d);
  const n=s.library().novels.find(x=>x.id==='wlost1234');
  assert.ok(n);assert.equal(n.name,'복구된 작품 1234');
});

test('예전 단일 파일 구조를 첫 작품으로 옮기고, 원본은 이전 버전 폴더에 보관', ()=>{
  const d=tmp();
  write(path.join(main(d),'storyline.json'),doc(5));
  write(path.join(main(d),'storyline_ui.json'),'{"ui":1}');
  write(path.join(main(d),'backups','storyline-20240101-000000.json.gz'),zlib.gzipSync(doc(5)));
  const s=open(d),id=s.current();
  const n=s.library().novels[0];
  assert.equal(n.name,'내 첫 작품');assert.equal(n.needsName,true);
  assert.equal(s.load('storyline_v1').text,doc(5));
  assert.equal(s.load('storyline_ui_v1').text,'{"ui":1}');
  assert.equal(s.listBackups().length,1);
  assert.ok(fs.existsSync(path.join(main(d),'이전 버전','storyline.json')));
  assert.equal(fs.existsSync(path.join(main(d),'storyline.json')),false);
  assert.ok(fs.existsSync(path.join(main(d),'works',id,'storyline.json')));
});

test('앱 전체 취향: 저장 · 읽기, 잘못된 JSON 은 거부', ()=>{
  const d=tmp(),s=open(d);
  assert.equal(s.loadPrefs(),null);
  assert.equal(s.savePrefs('{"theme":"dark"}'),true);
  assert.equal(s.loadPrefs(),'{"theme":"dark"}');
  assert.equal(s.savePrefs('nope'),false);
  fs.rmSync(path.join(main(d),'prefs.json'));
  assert.equal(s.loadPrefs(),'{"theme":"dark"}');      // 주 폴더에 없으면 미러에서
});
