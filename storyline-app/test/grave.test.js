// 카드 무덤 규칙(src/features/grave.js) 테스트: node --test
// 화면 코드라 브라우저 없이 필요한 것만 흉내 내서 불러옴
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');

const DAY=864e5,CODE=fs.readFileSync(path.join(__dirname,'../src/features/grave.js'),'utf8');
function load({cards,days,placed=[]}){
  const ctx={S:{cards,settings:days===undefined?{}:{graveDays:days}},UI:{},toasts:[],
    episodeOf:id=>placed.includes(id)?{i:0}:null,shelfOf:()=>null,idxClear(){},
    setTimeout:fn=>fn(),setInterval(){},Date};
  ctx.toast=m=>ctx.toasts.push(m);
  vm.createContext(ctx);vm.runInContext(CODE+';this.graveTick=graveTick;this.graveLeft=graveLeft;',ctx);
  return ctx;
}
const ago=d=>Date.now()-d*DAY;

test('만들고 7일(기본)이 지나면 무덤으로 · 안 지났으면 그대로', ()=>{
  const old={id:'a',clock:ago(7.1)},young={id:'b',clock:ago(6.9)};
  const g=load({cards:[old,young]});
  assert.equal(g.graveTick(),true);
  assert.equal(old.discarded,true);assert.ok(old.graveAt);
  assert.equal(young.discarded,undefined);
  assert.equal(g.toasts.length,1);
});

test('별 붙인 카드 · 화나 보관 칸에 든 카드는 안 감', ()=>{
  const star={id:'s',clock:ago(30),star:true},used={id:'u',clock:ago(30)};
  const g=load({cards:[star,used],placed:['u']});
  g.graveTick();
  assert.equal(star.discarded,undefined);
  assert.equal(used.discarded,undefined);
  assert.equal(used.clock,undefined);      // 든 동안은 타이머 없음
});

test('타이머가 없는 카드(예전 카드 · 막 돌아온 카드)는 지금부터 셈', ()=>{
  const c={id:'a'};const g=load({cards:[c]});
  assert.equal(g.graveTick(),true);
  assert.ok(Date.now()-c.clock<1000);assert.equal(c.discarded,undefined);
  assert.equal(g.graveTick(),false);      // 두 번째는 바뀌는 게 없음
});

test('무덤 카드를 화나 보관 칸에 넣으면 되살아남', ()=>{
  const c={id:'a',discarded:true,graveAt:ago(1)};
  load({cards:[c],placed:['a']}).graveTick();
  assert.equal(c.discarded,undefined);assert.equal(c.graveAt,undefined);
});

test('무덤 카드는 직접 되살리기 전에는 그대로 (별을 붙여도)', ()=>{
  const c={id:'a',discarded:true,star:true,clock:ago(1)};
  load({cards:[c]}).graveTick();
  assert.equal(c.discarded,true);
});

test('D-3 카운트다운: 남은 날이 1~3일 때만', ()=>{
  const g=load({cards:[]});
  assert.equal(g.graveLeft({id:'a',clock:ago(3.5)}),0);      // 3.5일 남음
  assert.equal(g.graveLeft({id:'a',clock:ago(4.5)}),3);
  assert.equal(g.graveLeft({id:'a',clock:ago(6.5)}),1);
  assert.equal(g.graveLeft({id:'a',clock:ago(6.5),star:true}),0);
  assert.equal(g.graveLeft({id:'a',clock:ago(6.5),discarded:true}),0);
});

test('기간은 설정을 따르고 0 이면 끔', ()=>{
  const a={id:'a',clock:ago(4)},b={id:'b',clock:ago(40)};
  load({cards:[a],days:3}).graveTick();assert.equal(a.discarded,true);
  load({cards:[b],days:0}).graveTick();assert.equal(b.discarded,undefined);
  assert.equal(load({cards:[],days:0}).graveLeft({id:'c',clock:ago(6.5)}),0);
});
