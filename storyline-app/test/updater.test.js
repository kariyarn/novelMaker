// 앱 자동 업데이트(updater.js) 테스트: 가짜 GitHub 로 받기 · 검사 · 풀기
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),os=require('os'),zlib=require('zlib'),crypto=require('crypto');
const {createUpdater,readBundle}=require('../updater');

const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'storyline-upd-'));
const b64=t=>Buffer.from(t).toString('base64');
const bundle=(version,o={})=>zlib.gzipSync(Buffer.from(JSON.stringify({version,minElectron:44,
  files:{'main.js':b64('// main'),'index.html':b64('<html>'),'preload.js':b64(''),'package.json':b64(JSON.stringify({version})),'src/a.js':b64('a')},...o})));
function gh(build,buf,{digest=true,asset=true}={}){      // 가짜 GitHub: 최신 릴리스 정보 + 코드 묶음
  const calls=[];
  const fetch=async url=>{calls.push(url);
    if(url.includes('/releases/latest'))return {ok:true,status:200,json:async()=>({tag_name:'build-'+build,assets:asset?[{name:'app-code.json.gz',browser_download_url:'https://dl/app-code.json.gz',digest:digest?'sha256:'+crypto.createHash('sha256').update(buf).digest('hex'):null}]:[]})};
    if(url==='https://dl/app-code.json.gz')return {ok:true,status:200,arrayBuffer:async()=>buf};
    return {ok:false,status:404}};
  return {fetch,calls};
}
const mk=(dir,fetch,o={})=>createUpdater({fetch,dir,bundled:'1.0.3',running:'1.0.3',electron:'44.5.1',...o});

test('새 버전: 받아서 풀고 current.json 에 기록 · 지난 버전 폴더는 정리', async()=>{
  const d=tmp();fs.mkdirSync(path.join(d,'v2'),{recursive:true});
  const {fetch}=gh(5,bundle('1.0.5'));
  const r=await mk(d,fetch).check();
  assert.equal(r.error,null);assert.equal(r.ready,5);assert.equal(r.latest,5);
  assert.equal(fs.readFileSync(path.join(d,'v5','src','a.js'),'utf8'),'a');
  const cur=JSON.parse(fs.readFileSync(path.join(d,'current.json'),'utf8'));
  assert.deepEqual([cur.version,cur.dir,cur.tries,cur.minElectron],['1.0.5','v5',0,44]);
  assert.ok(!fs.existsSync(path.join(d,'v2')));
});

test('이미 최신이면 받지 않음 · 받아 둔 버전이 있으면 다시 받지 않음', async()=>{
  const d=tmp();
  let g=gh(3,bundle('1.0.3'));let r=await mk(d,g.fetch).check();
  assert.equal(r.ready,null);assert.equal(g.calls.length,1);
  g=gh(6,bundle('1.0.6'));await mk(d,g.fetch).check();
  g=gh(6,bundle('1.0.6'));r=await mk(d,g.fetch).check();
  assert.equal(r.ready,6);assert.equal(g.calls.length,1);      // 릴리스 정보만 보고 끝
});

test('손상된 파일 · 다른 버전 묶음은 거부', async()=>{
  const d=tmp(),good=bundle('1.0.7');
  let {fetch}=gh(7,good);
  const bad=Buffer.from(good);bad[bad.length-5]^=1;
  const f2=async(u,o)=>u.startsWith('https://dl')?{ok:true,arrayBuffer:async()=>bad}:fetch(u,o);
  let r=await mk(d,f2).check();
  assert.match(r.error,/손상/);assert.ok(!fs.existsSync(path.join(d,'current.json')));
  r=await mk(d,gh(7,bundle('1.0.8')).fetch).check();
  assert.match(r.error,/읽을 수 없/);
});

test('더 새 Electron 이 필요하거나 코드 묶음이 없으면 설치 파일로 안내', async()=>{
  let r=await mk(tmp(),gh(9,bundle('1.0.9',{minElectron:45})).fetch).check();
  assert.equal(r.needInstaller,true);assert.equal(r.ready,null);
  r=await mk(tmp(),gh(9,bundle('1.0.9'),{asset:false}).fetch).check();
  assert.equal(r.needInstaller,true);
});

test('개발용 실행(버전 1.0.0)은 확인하지 않음 · 세 번 못 켠 버전은 다시 받지 않음', async()=>{
  const g=gh(9,bundle('1.0.9'));
  const r=await mk(tmp(),g.fetch,{bundled:'1.0.0',running:'1.0.0'}).check();
  assert.equal(g.calls.length,0);assert.ok(r.dev);
  const d=tmp();fs.writeFileSync(path.join(d,'current.json'),JSON.stringify({version:'1.0.9',dir:'v9',tries:3}));
  const r2=await mk(d,gh(9,bundle('1.0.9')).fetch).check();
  assert.equal(r2.ready,null);assert.match(r2.error,/설치본/);
});

test('묶음 읽기: 위험한 경로 · 빠진 파일은 거부', ()=>{
  assert.ok(readBundle(bundle('1.0.2')));
  assert.equal(readBundle(bundle('1.0.2',{files:{'../x.js':'','main.js':'','index.html':'','preload.js':'','package.json':''}})),null);
  assert.equal(readBundle(bundle('1.0.2',{files:{'main.js':''}})),null);
  assert.equal(readBundle(Buffer.from('nope')),null);
});
