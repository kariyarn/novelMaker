// GitHub 동기화 테스트: 가짜 GitHub(메모리) 하나에 기기 두 대를 붙여서 주고받기 · 충돌을 확인
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),os=require('os');
const {create}=require('../store');
const {createSync,gitSha}=require('../storage/sync');

/* 가짜 GitHub: 이 앱이 쓰는 API 만 (브랜치 커밋 번호 · 트리 · blob · 트리/커밋 만들기 · 브랜치 옮기기 · 빈 저장소 첫 파일) */
function fakeGitHub({emptyRepo=false}={}){
  const blobs=new Map(),trees=new Map(),commits=new Map(),log=[],count={};let head=null,empty=emptyRepo,stale=null,n=0;      // stale: 올린 직후 브랜치가 잠깐 예전 커밋을 가리키는 상황 흉내
  const id=p=>p+(++n).toString(16).padStart(39,'0');
  const json=(status,o)=>({ok:status<300,status,text:async()=>JSON.stringify(o)});
  const treeOf=c=>c?trees.get(commits.get(c).tree):new Map();
  function makeCommit(files,message,parent){      // files: Map(path→sha)
    const t=id('t');trees.set(t,files);const c=id('c');commits.set(c,{tree:t,parents:parent?[parent]:[],message});
    const before=treeOf(parent),date=new Date().toISOString();
    for(const [p,sha] of files)if(before.get(p)!==sha)log.push({path:p,message,date});
    return c;
  }
  const addBlob=text=>{const sha=gitSha(text);blobs.set(sha,text);return sha};
  async function fetch(url,{method,headers,body}){
    const u=new URL(url),p=decodeURIComponent(u.pathname.replace(/^\/repos\/me\/novel/,'')),key=method+' '+p.replace(/\/[0-9a-f]{40}$/,'/{sha}').replace(/^\/contents\/.*/,'/contents');
    count[key]=(count[key]||0)+1;
    if(headers.Authorization!=='Bearer good')return json(401,{message:'Bad credentials'});
    if(method==='GET'&&p==='')return json(200,{full_name:'me/novel'});
    if(method==='GET'&&p==='/git/ref/heads/main'){
      if(empty)return json(409,{message:'Git Repository is empty.'});
      const h=stale||head;return h?json(200,{object:{sha:h}}):json(404,{});
    }
    if(method==='GET'&&p.startsWith('/git/trees/')){
      const c=commits.get(p.slice(11));if(!c)return json(404,{});
      return json(200,{sha:c.tree,tree:[...trees.get(c.tree)].map(([path,sha])=>({path,type:'blob',sha}))});
    }
    if(method==='GET'&&p.startsWith('/git/blobs/')){
      const t=blobs.get(p.slice(11));      // 진짜 GitHub 처럼 지나간 버전도 읽힘
      return t!=null?json(200,{content:Buffer.from(t).toString('base64')}):json(404,{});
    }
    if(method==='POST'&&p==='/git/trees'){
      const b=JSON.parse(body),files=new Map(b.base_tree?trees.get(b.base_tree):[]);
      for(const e of b.tree)files.set(e.path,addBlob(e.content));
      const t=id('t');trees.set(t,files);return json(201,{sha:t});
    }
    if(method==='POST'&&p==='/git/commits'){
      const b=JSON.parse(body),c=makeCommit(trees.get(b.tree),b.message,b.parents[0]);return json(201,{sha:c});
    }
    if(method==='PATCH'&&p==='/git/refs/heads/main'){
      const b=JSON.parse(body);if(commits.get(b.sha).parents[0]!==head)return json(422,{message:'Update is not a fast forward'});
      head=b.sha;return json(200,{object:{sha:head}});
    }
    if(method==='POST'&&p==='/git/refs'){if(head)return json(422,{message:'Reference already exists'});head=JSON.parse(body).sha;return json(201,{})}
    if(method==='GET'&&p==='/commits'){      // 그 파일을 마지막으로 올린 기록 (메시지 · 시각)
      const l=log.filter(x=>x.path===u.searchParams.get('path')).slice(-1);
      return json(200,l.map(x=>({commit:{message:x.message,author:{date:x.date}}})));
    }
    if(method==='PUT'&&p.startsWith('/contents/')){      // 빈 저장소의 첫 파일
      const fp=p.slice(10),b=JSON.parse(body),files=new Map(treeOf(head));
      files.set(fp,addBlob(Buffer.from(b.content,'base64').toString('utf8')));head=makeCommit(files,b.message,head);empty=false;
      return json(201,{content:{sha:files.get(fp)}});
    }
    return json(404,{message:'not found'});
  }
  const files={has:fp=>treeOf(head).has(fp),get:fp=>{const sha=treeOf(head).get(fp);return sha?{sha,text:blobs.get(sha)}:undefined}};
  return {fetch,files,count,
    setFile(fp,text){const f=new Map(treeOf(head));f.set(fp,addBlob(text));head=makeCommit(f,'동기화 (다른 기기): '+fp,head)},      // 다른 기기가 올림
    get commits(){return commits.size},resetCount(){for(const k in count)delete count[k]},
    freeze(){stale=head},thaw(){stale=null}};
}
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'storyline-sync-'));
function device(gh,token='good',name){
  const d=tmp();process.env.STORYLINE_DATA_DIR=d;
  const store=create(path.join(d,'userData'));
  const sync=createSync({store,fetch:gh.fetch,getConfig:()=>({repo:'me/novel',branch:'main',token,device:name}),statePath:path.join(d,'sync-state.json')});
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

test('같은 카드에 양쪽에서 갈래를 따로 만들면: 갈래 둘 다 남음', async()=>{
  const gh=fakeGitHub(),A=device(gh);A.store.save('storyline_v1',work([['k1','처음']]));await A.sync.sync();
  const B=device(gh);await B.sync.sync();
  const withBr=brs=>{const w=JSON.parse(work([['k1','처음']]));w.cards[0].branches=brs.map(([id,text])=>({id,text,stars:0,chars:[],offChars:[]}));return JSON.stringify(w)};
  A.store.save('storyline_v1',withBr([['b1','A의 갈래']]));await A.sync.sync();
  B.store.save('storyline_v1',withBr([['b2','B의 갈래']]));
  const r=await B.sync.sync();
  assert.equal(r.ok,true,r.error);
  assert.deepEqual(r.conflicts,[]);
  assert.deepEqual(JSON.parse(B.store.load('storyline_v1').text).cards[0].branches.map(b=>b.text),['B의 갈래','A의 갈래']);
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

test('다른 기기가 예전과 똑같은 내용을 다시 올려도 막히지 않고 합침', async()=>{
  const gh=fakeGitHub(),A=device(gh);A.store.save('storyline_v1',work([['k1','처음']]));await A.sync.sync();
  const id=A.store.current(),fp=`storyline/works/${id}/storyline.json`,old=gh.files.get(fp);
  A.store.save('storyline_v1',work([['k1','처음 고침']]));await A.sync.sync();
  gh.setFile(fp,old.text);      // 다른 기기가 예전 내용 그대로를 새로 올림 (지문이 예전 것과 같음)
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

test('올리기만: 다른 기기 글은 받지 않고, 다른 기기가 고친 작품은 덮어쓰지 않음', async()=>{
  const gh=fakeGitHub(),A=device(gh,'good','집 맥');A.store.save('storyline_v1',doc('가'));await A.sync.sync();
  const B=device(gh,'good','회사 PC');await B.sync.sync();
  B.store.save('storyline_v1',doc('가','B'));
  const pb=await B.sync.push();
  assert.equal(pb.ok,true,pb.error);assert.ok(pb.pushed.some(r=>r.endsWith('/storyline.json')));
  A.store.save('storyline_v1',doc('가','A'));
  const pa=await A.sync.push();
  assert.equal(pa.ok,true,pa.error);
  assert.deepEqual(pa.pulled,[]);
  assert.ok(pa.blocked.some(r=>r.endsWith('/storyline.json')));      // 받기 전까지 안 올림
  assert.equal(A.store.load('storyline_v1').text,doc('가','A'));      // 이 기기 글 그대로
  const id=A.store.current();
  assert.equal(gh.files.get(`storyline/works/${id}/storyline.json`).text,doc('가','B'));      // 저장소는 B 글 그대로
});

test('확인만: 어느 기기에서 · 언제 고쳤는지 알려 주고, 나중에를 누르면 같은 내용은 다시 안 물음', async()=>{
  const gh=fakeGitHub(),A=device(gh,'good','집 맥');A.store.save('storyline_v1',doc('가'));await A.sync.sync();
  const B=device(gh,'good','회사 PC');await B.sync.sync();
  assert.deepEqual((await A.sync.check()).pending,[]);
  B.store.save('storyline_v1',doc('가','나'));await B.sync.push();
  const c=await A.sync.check();
  assert.equal(c.ok,true,c.error);
  assert.equal(c.pending.length,1);assert.equal(c.from,'회사 PC');assert.ok(c.at>0);assert.equal(c.dismissed,false);
  assert.equal(A.store.load('storyline_v1').text,doc('가'));      // 확인만 했으니 그대로
  A.sync.dismiss(c.sig);
  assert.equal((await A.sync.check()).dismissed,true);
  const r=await A.sync.sync();      // 받기
  assert.equal(r.ok,true,r.error);
  assert.equal(A.store.load('storyline_v1').text,doc('가','나'));
  assert.deepEqual((await A.sync.check()).pending,[]);
});

test('확인만: 보기 상태 · 취향만 바뀐 건 알리지 않음', async()=>{
  const gh=fakeGitHub(),A=device(gh);A.store.save('storyline_v1',doc('가'));await A.sync.sync();
  const B=device(gh);await B.sync.sync();
  B.store.save('storyline_ui_v1',JSON.stringify({zoom:2}));B.store.savePrefs(JSON.stringify({theme:'dark'}));await B.sync.push();
  assert.deepEqual((await A.sync.check()).pending,[]);
});

test('올리기만: 양쪽에서 작품 목록이 바뀌어도 새 작품은 목록에 실려 올라가고, 다른 기기에서 받으면 보임', async()=>{
  const gh=fakeGitHub(),A=device(gh,'good','집 맥');A.store.renameNovel(A.store.current(),'장편');A.store.save('storyline_v1',doc('가'));await A.sync.sync();
  const B=device(gh,'good','회사 PC');await B.sync.sync();
  A.store.openNovel(A.store.current());await A.sync.push();      // 맥에서 목록이 바뀜 (작품을 열면 연 시각이 바뀜)
  const nid=B.store.createNovel('새 작품');B.store.openNovel(nid);B.store.save('storyline_v1',doc('나'));      // PC 에서 새 작품
  const pb=await B.sync.push();
  assert.equal(pb.ok,true,pb.error);
  assert.deepEqual(pb.blocked,[]);      // 목록이 막히면 새 작품이 다른 기기에 영영 안 보임
  assert.ok(JSON.parse(gh.files.get('storyline/library.json').text).novels.some(n=>n.id===nid));
  assert.deepEqual(names(B.store),['새 작품','장편']);      // 목록은 합쳐짐 (글은 안 받음)
  const c=await A.sync.check();assert.ok(c.ids.includes(nid));
  const r=await A.sync.sync();
  assert.equal(r.ok,true,r.error);
  assert.deepEqual(names(A.store),['새 작품','장편']);
  A.store.openNovel(nid);
  assert.equal(A.store.load('storyline_v1').text,doc('나'));
});

test('양쪽에서 고친 걸 합쳐 올린 직후 GitHub 가 예전 커밋을 가리켜도: 합친 글이 다른 기기 예전 글로 덮이지 않음', async()=>{
  const gh=fakeGitHub(),A=device(gh);A.store.save('storyline_v1',work([['k1','처음']]));await A.sync.sync();
  const B=device(gh);await B.sync.sync();
  A.store.save('storyline_v1',work([['k1','처음'],['k2','A가 쓴 장면']]));await A.sync.sync();
  gh.freeze();      // 이 뒤로 한동안 브랜치가 A 가 올린 커밋을 가리킴
  B.store.save('storyline_v1',work([['k1','처음'],['k3','B가 쓴 장면']]));
  let r=await B.sync.sync();assert.equal(r.ok,true,r.error);
  const merged=[['k1','처음'],['k3','B가 쓴 장면'],['k2','A가 쓴 장면']];
  assert.deepEqual(cardsOf(B.store),merged);
  r=await B.sync.sync();assert.equal(r.ok,true,r.error);assert.deepEqual(r.pulled,[]);      // 한 번 더 눌러도 그대로
  assert.deepEqual(cardsOf(B.store),merged);
  assert.deepEqual((await B.sync.check()).pending,[]);
  gh.thaw();
  await A.sync.sync();assert.deepEqual(cardsOf(A.store),merged);
});

test('요청 수: 여러 파일도 커밋 하나로 · 바뀐 게 없으면 확인은 요청 하나', async()=>{
  const gh=fakeGitHub(),A=device(gh);A.store.save('storyline_v1',doc('가'));
  for(const n of ['둘','셋','넷']){const id=A.store.createNovel(n);A.store.openNovel(id);A.store.save('storyline_v1',doc(n))}
  const before=gh.commits;await A.sync.sync();
  assert.equal(gh.commits-before,1);      // 작품 4개 · 목록 · 취향 등을 커밋 하나로
  gh.resetCount();
  assert.deepEqual((await A.sync.check()).pending,[]);
  assert.deepEqual(gh.count,{'GET /git/ref/heads/main':1});
  gh.resetCount();
  const r=await A.sync.sync();assert.deepEqual([r.pulled,r.pushed],[[],[]]);
  assert.deepEqual(gh.count,{'GET /git/ref/heads/main':1});
  const B=device(gh);gh.resetCount();await B.sync.sync();      // 새 기기가 받기: 파일마다 한 번씩 · 바퀴는 한 번
  assert.equal(gh.count['GET /git/trees/{sha}'],1);
});

/* 데이터 버전: 다른 기기의 더 새 앱이 고친 작품은 받지도 합치지도 않음 (storage/dataVersion.js) */
test('더 새 앱이 고친 작품은 받지 않고 알림 · 이 기기 글도 그대로', async()=>{
  const {DATA_VERSION}=require('../storage/dataVersion');
  const gh=fakeGitHub(),A=device(gh);A.store.save('storyline_v1',work([['k1','처음']],{version:DATA_VERSION}));await A.sync.sync();
  const B=device(gh);await B.sync.sync();
  const id=A.store.current(),fp=`storyline/works/${id}/storyline.json`,newer=work([['k1','새 앱이 고침']],{version:DATA_VERSION+1});
  gh.setFile(fp,newer);      // 새 앱을 쓰는 다른 기기가 올림
  let r=await B.sync.sync();
  assert.equal(r.ok,true,r.error);
  assert.deepEqual(r.needUpdate,[`works/${id}/storyline.json`]);
  assert.deepEqual(cardsOf(B.store),[['k1','처음']]);      // 받지 않음
  B.store.save('storyline_v1',work([['k1','B가 고침']],{version:DATA_VERSION}));      // 그사이 이 기기에서 고쳐도
  r=await B.sync.sync();
  assert.deepEqual(r.needUpdate,[`works/${id}/storyline.json`]);
  assert.deepEqual(cardsOf(B.store),[['k1','B가 고침']]);      // 합치지 않고
  assert.equal(gh.files.get(fp).text,newer);      // 저장소의 새 글을 덮어쓰지도 않음
  r=await B.sync.push();
  assert.equal(gh.files.get(fp).text,newer);      // 자동 올리기도 막힘
});

test('양쪽에서 고쳐 합치면 데이터 버전은 높은 쪽', async()=>{
  const gh=fakeGitHub(),A=device(gh);A.store.save('storyline_v1',work([['k1','처음']]));await A.sync.sync();      // 버전 표시 없음(= 1)
  const B=device(gh);await B.sync.sync();
  A.store.save('storyline_v1',work([['k1','처음'],['k2','A']],{version:2}));await A.sync.sync();
  B.store.save('storyline_v1',work([['k1','B']]));
  const r=await B.sync.sync();
  assert.equal(r.ok,true,r.error);
  assert.equal(JSON.parse(B.store.load('storyline_v1').text).version,2);
});
