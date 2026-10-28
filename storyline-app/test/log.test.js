// 오류 기록(storage/log.js) 테스트: node --test
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),os=require('os');
const {setLogDir,logError}=require('../storage/log');

const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'storyline-log-'));
const read=d=>fs.readFileSync(path.join(d,'app.log'),'utf8');

test('폴더를 정하지 않으면 아무것도 안 씀', ()=>{
  setLogDir(null);
  assert.doesNotThrow(()=>logError('어디서',new Error('실패')));
});

test('어디서 · 무슨 오류인지 한 줄씩 남김 (폴더가 없으면 만듦)', ()=>{
  const d=path.join(tmp(),'logs');setLogDir(d);
  logError('작품 저장',new Error('디스크가 가득 찼어요'));
  logError('동기화: 올리기','토큰이 맞지 않아요');
  const t=read(d);
  assert.match(t,/작품 저장: Error: 디스크가 가득 찼어요/);
  assert.match(t,/동기화: 올리기: 토큰이 맞지 않아요/);
  assert.match(t,/^\[\d{4}-\d\d-\d\dT/);
});

test('같은 실패가 연달아 나면 한 번만 남김', ()=>{
  const d=tmp();setLogDir(d);
  for(let i=0;i<5;i++)logError('동기화: 확인','인터넷 연결 없음');
  logError('동기화: 확인','다른 오류');
  logError('동기화: 확인','인터넷 연결 없음');
  assert.equal(read(d).trim().split('\n').length,3);
});

test('1MB 를 넘으면 app.log.1 로 넘기고 새로 씀', ()=>{
  const d=tmp();setLogDir(d);
  fs.writeFileSync(path.join(d,'app.log'),'x'.repeat(1024*1024+1));
  logError('자동 백업','실패');
  assert.ok(fs.existsSync(path.join(d,'app.log.1')));
  assert.match(read(d),/자동 백업: 실패/);
  assert.ok(read(d).length<1000);
});

test('기록할 수 없는 곳이어도 앱을 멈추지 않음', ()=>{
  const d=tmp(),f=path.join(d,'file');fs.writeFileSync(f,'');
  setLogDir(path.join(f,'logs'));      // 파일 밑에 폴더를 만들 수 없음
  assert.doesNotThrow(()=>logError('어디서','실패'));
  setLogDir(null);
});
