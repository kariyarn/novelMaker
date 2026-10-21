// GitHub 동기화 테스트: 가짜 GitHub(메모리) 하나에 기기 두 대를 붙여서 주고받기 · 충돌을 확인
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),os=require('os');
const {create}=require('../store');
const {createSync,gitSha}=require('../storage/sync');

/* 가짜 GitHub: 이 앱이 쓰는 API 만 (트리 목록 · blob 읽기 · 파일 올리기) */
function fakeGitHub({emptyRepo=false}={}){
  const files=new Map(),blobs=new Map();let empty=emptyRepo,calls=0,stale=null;      // stale: 올린 직후 GitHub 가 잠깐 예전 목록을 주는 상황 흉내
  const json=(status,o)=>({ok:status<300,status,text:async()=>JSON.stringify(o)});
  async function fetch(url,{method,headers,body}){
    calls++;
    if(headers.Authorization!=='Bearer good')return json(401,{message:'Bad credentials'});
    const u=new URL(url),p=decodeURIComponent(u.pathname.replace(/^\/repos\/me\/novel/,''));
    if(method==='GET'&&p==='')return json(200,{full_name:'me/novel'});
    if(method==='GET'&&p.startsWith('/git/trees/')){
      if(empty)return json(409,{message:'Git Repository is empty.'});
      if(stale)return json(200,{tree:stale});
      return json(200,{tree:[...files].map(([path,f])=>({path,type:'blob',sha:f.sha}))});
    }
    if(method==='GET'&&p.startsWith('/git/blobs/')){
      const t=blobs.get(p.slice(11));      // 진짜 GitHub 처럼 지나간 버전도 읽힘
      return t!=null?json(200,{content:Buffer.from(t).toString('base64')}):json(404,{});
    }
    if(method==='PUT'&&p.startsWith('/contents/')){
      const fp=p.slice(10),b=JSON.parse(body),cur=files.get(fp);
      if(cur&&b.sha!==cur.sha)return json(409,{message:'sha mismatch'});
      if(!cur&&b.sha)return json(422,{message:'sha given for new file'});
      const text=Buffer.from(b.content,'base64').toString('utf8'),sha=gitSha(text);
      files.set(fp,{text,sha});blobs.set(sha,text);empty=false;
      return json(200,{content:{sha}});
    }
    return json(404,{message:'not found'});
  }
  const snapshot=()=>[...files].map(([path,f])=>({path,type:'blob',sha:f.sha}));
  return {fetch,files,get calls(){return calls},freeze(){stale=snapshot()},thaw(){stale=null}};
}
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'storyline-sync-'));
function device(gh,token='good'){
  const d=tmp();process.env.STORYLINE_DATA_DIR=d;
  const store=create(path.join(d,'userData'));
  const sync=createSync({store,fetch:gh.fetch,getConfig:()=>({repo:'me/novel',branch:'main',token}),statePath:path.join(d,'sync-state.json')});
  return {store,sync,dir:d};
}
const doc=(...names)=>JSON.stringify({characters:names.map((n,i)=>({id:'c'+i,name:n})),cards:[],episodes:[]});
const names=s=>s.library().novels.map(n=>n.name).sort();

test('처음 올리기: 작품 목록 · 작품 글이 저장소의 storyline/ 아래로', async()=>{
  const gh=fakeGitHub(),A=device(gh);
  A.store.renameNovel(A.store.current(),'회사에서 쓰는 글');A.store.save('storyline_v1',doc('서하린'));
  const r=await A.sync.sync();
  assert.equal(r.ok,true,r.error);
  const id=A.store.current();
  assert.ok(gh.files.has('storyline/library.json'));
  assert.equal(gh.files.get(`storyline/works/${id}/storyline.json`).text,doc('서하린'));
  assert.ok(!JSON.parse(gh.files.get('storyline/library.json').text).current);      // 지금 연 작품은 기기마다 따로
  const again=await A.sync.sync();
  assert.deepEqual([again.pulled,again.pushed],[[],[]]);      // 바뀐 게 없으면 아무것도 안 함
});

test('다른 기기에서 받기: 새 기기의 빈 작품 대신 받은 작품이 열림', async()=>{
  const gh=fakeGitHub(),A=device(gh);
  A.store.renameNovel(A.store.current(),'장편');A.store.save('storyline_v1',doc('서하린','이도윤'));
  await A.sync.sync();
  const B=device(gh);
  const r=await B.sync.sync();
  assert.equal(r.ok,true,r.error);
  assert.deepEqual(names(B.store),['장편']);
  assert.equal(B.store.current(),A.store.current());
  assert.equal(B.store.load('storyline_v1').text,doc('서하린','이도윤'));
});

test('한쪽에서 고친 글은 다른 쪽으로 · 새 작품도 따라감', async()=>{
  const gh=fakeGitHub(),A=device(gh);A.store.save('storyline_v1',doc('가'));await A.sync.sync();
  const B=device(gh);await B.sync.sync();
  B.store.save('storyline_v1',doc('가','나'));
  const nid=B.store.createNovel('B에서 만든 작품');B.store.openNovel(nid);B.store.save('storyline_v1',doc('다'));
  await B.sync.sync();
  const r=await A.sync.sync();
  assert.equal(r.ok,true,r.error);
  assert.equal(A.store.load('storyline_v1').text,doc('가','나'));
  assert.ok(names(A.store).includes('B에서 만든 작품'));
  A.store.openNovel(nid);assert.equal(A.store.load('storyline_v1').text,doc('다'));
});

const work=(cards,extra={})=>JSON.stringify({characters:[{id:'c1',name:'조균',board:{}}],cards:cards.map(([id,text])=>({id,kind:'scene',text})),episodes:[{id:'e1',title:'1화',cardIds:cards.map(c=>c[0])}],...extra});
const cardsOf=s=>JSON.parse(s.load('storyline_v1').text).cards.map(c=>[c.id,c.text]);

test('양쪽에서 같은 작품을 고치면: 사본 작품 없이 카드 단위로 합침', async()=>{
  const gh=fakeGitHub(),A=device(gh);A.store.renameNovel(A.store.current(),'장편');A.store.save('storyline_v1',work([['k1','처음'],['k2','메모']]));await A.sync.sync();
  const B=device(gh);await B.sync.sync();
  A.store.save('storyline_v1',work([['k1','처음'],['k2','메모'],['k3','A가 쓴 장면']]));await A.sync.sync();
  B.store.save('storyline_v1',work([['k1','처음'],['k2','B가 고친 메모']]));
  const r=await B.sync.sync();
  assert.equal(r.ok,true,r.error);
  assert.deepEqual(r.conflicts,[]);      // 서로 다른 카드를 고쳤으니 물을 것 없음
  assert.deepEqual(names(B.store),['장편']);
  assert.deepEqual(cardsOf(B.store),[['k1','처음'],['k2','B가 고친 메모'],['k3','A가 쓴 장면']]);
  assert.deepEqual(JSON.parse(B.store.load('storyline_v1').text).episodes[0].cardIds,['k1','k2','k3']);
  await A.sync.sync();      // A 도 합친 것을 받음
  assert.deepEqual(cardsOf(A.store),cardsOf(B.store));
  assert.deepEqual(names(A.store),['장편']);
});

test('같은 카드 글을 양쪽에서 다르게 고치면: 이 기기 글을 두고, 다른 기기 글은 고를 수 있게 남김', async()=>{
  const gh=fakeGitHub(),A=device(gh);A.store.save('storyline_v1',work([['k1','처음']]));await A.sync.sync();
  const B=device(gh);await B.sync.sync();
  A.store.save('storyline_v1',work([['k1','A 글']]));await A.sync.sync();
  B.store.save('storyline_v1',work([['k1','B 글']]));
  const r=await B.sync.sync();
  assert.equal(r.ok,true,r.error);
  assert.equal(r.conflicts.length,1);assert.equal(r.conflicts[0].asks,1);
  const st=JSON.parse(B.store.load('storyline_v1').text);
  assert.equal(st.cards[0].text,'B 글');
  assert.deepEqual(st.syncConflicts.map(c=>[c.path,c.mine,c.theirs]),[[['cards','k1','text'],'B 글','A 글']]);
  assert.ok(B.store.listBackups().some(b=>B.store.readBackup(b.name)===work([['k1','B 글']])));      // 합치기 전 것을 백업
});

test('한쪽이 지운 카드: 다른 쪽이 안 고쳤으면 지우고, 고쳤으면 남김', async()=>{
  const gh=fakeGitHub(),A=device(gh);A.store.save('storyline_v1',work([['k1','하나'],['k2','둘'],['k3','셋']]));await A.sync.sync();
  const B=device(gh);await B.sync.sync();
  A.store.save('storyline_v1',work([['k1','하나'],['k3','셋 고침']]));await A.sync.sync();
  B.store.save('storyline_v1',work([['k1','하나 고침'],['k2','둘']]));      // B 는 k3 를 지움 (A 는 k3 를 고쳤음)
  const r=await B.sync.sync();assert.equal(r.ok,true,r.error);
  assert.deepEqual(cardsOf(B.store),[['k1','하나 고침'],['k3','셋 고침']]);
});

test('동기화 도중에 쓴 글: 화면이 받은 글을 다시 읽기 전에 저장해도 다른 기기에서 고친 게 사라지지 않음', async()=>{
  const gh=fakeGitHub(),A=device(gh);A.store.save('storyline_v1',work([['k1','처음']]));await A.sync.sync();
  const B=device(gh);await B.sync.sync();
  B.store.load('storyline_v1');      // 화면이 작품을 읽어 둠
  A.store.save('storyline_v1',work([['k1','처음'],['k2','A가 쓴 장면']]));await A.sync.sync();
  await B.sync.sync();      // B 가 받음 — 그런데 화면은 아직 예전 글을 들고 있음
  B.store.save('storyline_v1',work([['k1','처음 고침']]));      // 예전 글 + 방금 고친 것으로 저장
  assert.deepEqual(cardsOf(B.store),[['k1','처음 고침'],['k2','A가 쓴 장면']]);
  await B.sync.sync();await A.sync.sync();
  assert.deepEqual(cardsOf(A.store),[['k1','처음 고침'],['k2','A가 쓴 장면']]);
});

test('받는 도중에 이 기기에서 쓴 글(새 포스트잇)은 받은 글로 덮어쓰지 않고 합침', async()=>{
  const gh=fakeGitHub(),A=device(gh);A.store.save('storyline_v1',work([['k1','처음']]));await A.sync.sync();
  const B=device(gh);await B.sync.sync();
  B.store.load('storyline_v1');
  A.store.save('storyline_v1',work([['k1','처음'],['k2','A가 쓴 장면']]));await A.sync.sync();
  const fetch0=gh.fetch;let once=false;
  const slow=async(url,o)=>{      // B 가 저장소 글을 받아 오는 사이에 화면이 새 포스트잇을 저장
    if(!once&&o.method==='GET'&&url.includes('/git/blobs/')){once=true;B.store.save('storyline_v1',work([['k1','처음'],['k3','B가 방금 쓴 포스트잇']]))}
    return fetch0(url,o);
  };
  const B2=createSync({store:B.store,fetch:slow,getConfig:()=>({repo:'me/novel',branch:'main',token:'good'}),statePath:path.join(B.dir,'sync-state.json')});
  const r=await B2.sync();assert.equal(r.ok,true,r.error);
  assert.deepEqual(cardsOf(B.store).sort(),[['k1','처음'],['k2','A가 쓴 장면'],['k3','B가 방금 쓴 포스트잇']]);
  await A.sync.sync();
  assert.deepEqual(cardsOf(A.store).sort(),cardsOf(B.store).sort());
});

test('다른 기기가 예전과 똑같은 내용을 다시 올려도 막히지 않고 합침', async()=>{
  const gh=fakeGitHub(),A=device(gh);A.store.save('storyline_v1',work([['k1','처음']]));await A.sync.sync();
  const id=A.store.current(),fp=`storyline/works/${id}/storyline.json`,old=gh.files.get(fp);
  A.store.save('storyline_v1',work([['k1','처음 고침']]));await A.sync.sync();
  gh.files.set(fp,{...old});      // 다른 기기가 예전 내용 그대로를 새로 올림 (지문이 예전 것과 같음)
  A.store.save('storyline_v1',work([['k1','처음 고침'],['k2','새 장면']]));
  const r=await A.sync.sync();assert.equal(r.ok,true,r.error);
  assert.notEqual(gh.files.get(fp).sha,old.sha,'올라가야 함');
  assert.deepEqual(JSON.parse(gh.files.get(fp).text).cards.map(c=>c.id),['k1','k2']);
});

test('영구 삭제한 작품은 다른 기기에서 되살아나지 않음', async()=>{
  const gh=fakeGitHub(),A=device(gh);A.store.save('storyline_v1',doc('남김'));
  const gone=A.store.createNovel('지울 작품');await A.sync.sync();
  const B=device(gh);await B.sync.sync();assert.ok(names(B.store).includes('지울 작품'));
  A.store.archiveNovel(gone);A.store.deleteNovel(gone);await A.sync.sync();
  await B.sync.sync();
  assert.ok(!names(B.store).includes('지울 작품'));
});

test('빈 저장소에도 처음 올릴 수 있음', async()=>{
  const gh=fakeGitHub({emptyRepo:true}),A=device(gh);A.store.save('storyline_v1',doc('가'));
  const r=await A.sync.sync();
  assert.equal(r.ok,true,r.error);
  assert.ok(gh.files.has('storyline/library.json'));
});

test('토큰이 틀리면 알기 쉬운 오류 · 설정이 없으면 건너뜀', async()=>{
  const gh=fakeGitHub(),A=device(gh,'bad');
  const r=await A.sync.sync();
  assert.equal(r.ok,false);assert.match(r.error,/토큰/);
  const d=tmp();process.env.STORYLINE_DATA_DIR=d;const s=create(path.join(d,'u'));
  const none=createSync({store:s,fetch:gh.fetch,getConfig:()=>null,statePath:path.join(d,'st.json')});
  assert.equal((await none.sync()).skipped,true);
});

test('동기화로 덮어쓰기 전에 이 기기 글을 백업', async()=>{
  const gh=fakeGitHub(),A=device(gh);A.store.save('storyline_v1',doc('가'));await A.sync.sync();
  const B=device(gh);await B.sync.sync();
  A.store.save('storyline_v1',doc('가','나'));await A.sync.sync();
  await B.sync.sync();
  assert.ok(B.store.listBackups().some(b=>B.store.readBackup(b.name)===doc('가')));
});

test('올린 직후 GitHub 가 예전 목록을 줘도 가짜 충돌 · 사본 작품이 생기지 않음', async()=>{
  const gh=fakeGitHub(),A=device(gh);A.store.renameNovel(A.store.current(),'장편');A.store.save('storyline_v1',doc('처음'));await A.sync.sync();
  gh.freeze();      // 이 뒤로 한동안 목록이 예전 그대로
  A.store.save('storyline_v1',doc('메모 하나'));
  let r=await A.sync.sync();assert.equal(r.ok,true,r.error);
  A.store.save('storyline_v1',doc('메모 하나','메모 둘'));
  r=await A.sync.sync();assert.equal(r.ok,true,r.error);
  assert.deepEqual(r.conflicts,[]);
  assert.equal(A.store.load('storyline_v1').text,doc('메모 하나','메모 둘'));      // 예전 글로 되돌아가지도 않음
  assert.deepEqual(names(A.store),['장편']);
  gh.thaw();
  r=await A.sync.sync();assert.equal(r.ok,true,r.error);assert.deepEqual(r.conflicts,[]);
  const id=A.store.current();assert.equal(gh.files.get(`storyline/works/${id}/storyline.json`).text,doc('메모 하나','메모 둘'));
});
