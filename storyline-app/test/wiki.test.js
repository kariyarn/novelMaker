// 위키 규칙 테스트: node --test
//  - 작품을 열 때 위키 데이터를 바로잡는 규칙 (src/state/state.js 의 migrateWiki)
//  - 위키에 넣은 메모는 무덤에 안 감 (src/features/grave.js)
//  - 두 기기에서 위키를 고쳤을 때 합치기 (storage/merge.js)
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const {mergeWork}=require('../storage/merge.js');

const src=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function loadMigrate(){
  const ctx={Math,Date,String,Array,Set,Map,JSON,Object,uid:()=>Math.random().toString(36).slice(2,10)};vm.createContext(ctx);
  vm.runInContext(src('src/model/data.js'),ctx);      // newWikiRow · textToHtml · escHtml · kindDest
  const m=/function migrateWiki\(st\)\{[\s\S]*?\n\}\n/.exec(src('src/state/state.js'));
  assert.ok(m,'migrateWiki 를 찾지 못함');
  vm.runInContext(m[0]+';this.migrateWiki=migrateWiki;this.kindDest=kindDest;',ctx);
  return ctx;
}

test('분류의 가는 곳: 정하지 않았으면 메모만 위키, 정했으면 그대로', ()=>{
  const {kindDest}=loadMigrate();
  assert.equal(kindDest({id:'memo'}),'wiki');
  assert.equal(kindDest({id:'scene'}),'draft');
  assert.equal(kindDest({id:'memo',dest:'draft'}),'draft');
  assert.equal(kindDest({id:'x1',dest:'wiki'}),'wiki');
});

test('예전 설정 메모 칸 → 그 설정 아래 ‘설정 메모’ 행 (id 를 정해 둬서 두 기기에서 같은 행)', ()=>{
  const {migrateWiki}=loadMigrate();
  const st={characters:[{id:'s1',kind:'setting',name:'서진그룹',memo:'회장실은 37층\n<b>비서실</b>장만 출입'},{id:'c1',kind:'char',name:'하린'}],cards:[]};
  migrateWiki(st);
  assert.equal(st.wiki.length,1);
  const r=st.wiki[0];
  assert.equal(r.id,'wm_s1');assert.equal(r.owner,'s1');assert.equal(r.title,'설정 메모');assert.equal(r.parent,null);
  assert.equal(r.body,'<p>회장실은 37층</p><p>&lt;b&gt;비서실&lt;/b&gt;장만 출입</p>');      // 글자 그대로 (태그로 읽지 않음)
  assert.equal(st.characters[0].memo,'');
  migrateWiki(st);assert.equal(st.wiki.length,1);      // 다시 열어도 그대로
});

test('행 바로잡기: 빠진 값 채우기 · 겹친 id · 없는 상위 행 · 순환 · 하위 행은 맨 위 행과 같은 인물 아래', ()=>{
  const {migrateWiki}=loadMigrate();
  const st={characters:[],cards:[],wiki:[
    {id:'a',owner:'p1',title:'A'},
    {id:'a',owner:'p1',title:'A 사본'},
    {id:'b',owner:'p2',parent:'a',title:'B'},
    {id:'c',owner:'p1',parent:'zz',title:'C'},
    {id:'d',owner:'p1',parent:'e'},{id:'e',owner:'p1',parent:'d'},
    null,{title:'id 없음'}]};
  migrateWiki(st);
  assert.deepEqual(st.wiki.map(r=>r.id),['a','b','c','d','e']);
  const by=Object.fromEntries(st.wiki.map(r=>[r.id,r]));
  assert.equal(by.b.owner,'p1');      // 상위 행 a 를 따라감
  assert.equal(by.c.parent,null);
  assert.ok(by.d.parent===null||by.e.parent===null);      // 순환이 끊김
  assert.equal(by.d.body,'');
});

test('없는 행을 가리키는 ‘정리됨’ 표시는 지움 (메모가 오른쪽 목록으로 돌아옴)', ()=>{
  const {migrateWiki}=loadMigrate();
  const st={characters:[],wiki:[{id:'r1',owner:'work',title:'x'}],cards:[{id:'k1',filed:'r1'},{id:'k2',filed:'gone'}]};
  migrateWiki(st);
  assert.equal(st.cards[0].filed,'r1');
  assert.equal(st.cards[1].filed,undefined);
});

test('위키에 넣은 메모는 기한이 지나도 무덤에 안 감', ()=>{
  const DAY=864e5,c={id:'m',clock:Date.now()-30*DAY,filed:'r1'},free={id:'f',clock:Date.now()-30*DAY};
  const ctx={S:{cards:[c,free],settings:{}},UI:{},episodeOf:()=>null,shelfOf:()=>null,idxClear(){},toast(){},setTimeout:fn=>fn(),setInterval(){},Date};
  vm.createContext(ctx);vm.runInContext(src('src/features/grave.js')+';this.graveTick=graveTick;',ctx);
  ctx.graveTick();
  assert.equal(c.discarded,undefined);assert.equal(c.clock,undefined);      // 정리된 동안은 타이머 없음
  assert.equal(free.discarded,true);
});

test('두 기기에서 위키를 고치면: 새 행은 둘 다 · 같은 본문을 둘 다 고친 것만 고르기', ()=>{
  let n=0;const id=()=>'c'+(++n);
  const row=(i,body)=>({id:i,owner:'p',parent:null,title:'후계 구도',body,created:1,updated:1});
  const base={cards:[],wiki:[row('r1','<p>처음</p>')]};
  const mine={cards:[],wiki:[row('r1','<p>이 기기</p>'),row('r2','<p>새 행 A</p>')]};
  const theirs={cards:[],wiki:[row('r1','<p>다른 기기</p>'),row('r3','<p>새 행 B</p>')]};
  const {merged,conflicts}=mergeWork(base,mine,theirs,id);
  assert.deepEqual(merged.wiki.map(r=>r.id),['r1','r2','r3']);
  assert.equal(merged.wiki[0].body,'<p>이 기기</p>');
  assert.equal(conflicts.length,1);
  assert.equal(conflicts[0].label,'위키 · 후계 구도 · 본문');
});
