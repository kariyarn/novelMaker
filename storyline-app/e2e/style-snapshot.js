// CSS 를 고치기 전후로 화면이 그대로인지 확인하는 도구 (CSS 정리 · 파일 나누기처럼 "모양은 그대로"여야 하는 작업용)
// 진짜 앱을 같은 작품 · 같은 난수로 켜서 화면 19가지 상태의 모든 요소(+::before/::after/::placeholder)의 계산된 스타일을 지문으로 모음
//   1) 고치기 전:  xvfb-run -a node e2e/style-snapshot.js before.json      (맥 · Windows 는 xvfb-run 없이)
//   2) CSS 고치기
//   3) 고친 뒤:   xvfb-run -a node e2e/style-snapshot.js after.json --compare before.json   → '다른 요소 0' 이면 그대로
// 같은 CSS 로 두 번 찍어도 0 이 나오게 맞춰 둠 (작품 데이터 고정 · Math.random 고정 · 애니메이션 끝냄 · 속성 순서 정렬)
// 마우스를 올린 모양(:hover)처럼 찍지 않는 상태는 확인하지 못하니, 그런 규칙을 고칠 땐 직접 봐요
const fs=require('fs'),os=require('os'),path=require('path');
const {launch,close,waitSaved,newHome}=require('./helpers');
const args=process.argv.slice(2),out=args[0],ci=args.indexOf('--compare'),against=ci>0?args[ci+1]:null;
if(!out){console.error('사용: node e2e/style-snapshot.js <out.json> [--compare before.json]');process.exit(2)}
const FIXED=path.join(os.tmpdir(),'storyline-style-home');      // 고정 작품: 처음 한 번 만들고 다음부터 복사해서 씀
const collect=(want)=>{      // 화면 안에서 실행
  const pathOf=e=>{const a=[];while(e&&e!==document.documentElement){const p=e.parentElement;a.unshift(e.tagName+':'+(p?[...p.children].indexOf(e):0));e=p}return a.join('/')};
  const ser=cs=>{const ks=[];for(let i=0;i<cs.length;i++)ks.push(cs[i]);ks.sort();return ks.map(k=>k+':'+cs.getPropertyValue(k)).join(';')+';'};
  const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
  const res={};
  for(const e of document.querySelectorAll('*')){
    const p=pathOf(e);if(want&&!want.includes(p))continue;
    const parts=[ser(getComputedStyle(e)),ser(getComputedStyle(e,'::before')),ser(getComputedStyle(e,'::after')),ser(getComputedStyle(e,'::placeholder'))];
    res[p]=want?parts:hash(parts.join('|'));
  }
  return res;
};
async function fixedHome(){
  if(!fs.existsSync(path.join(FIXED,'data'))){
    const h=newHome();const {app,win}=await launch(h);
    await win.evaluate(()=>{act(()=>{S.cards[0].text+=' '})});await waitSaved(win);await win.evaluate(()=>{saveNow();saveUIPNow()});await win.waitForTimeout(800);
    await close(app);fs.rmSync(FIXED,{recursive:true,force:true});fs.cpSync(h,FIXED,{recursive:true});
  }
  const h=newHome();fs.cpSync(FIXED,h,{recursive:true});return h;
}
(async()=>{
  const {app,win}=await launch(await fixedHome());
  // 같은 결과가 나오게: 난수 고정 · 애니메이션 끄기
  await app.context().addInitScript(()=>{let s=1;Math.random=()=>{s=(s*16807)%2147483647;return (s-1)/2147483646}});
  await win.reload();await win.waitForFunction(()=>typeof S==='object'&&S&&document.querySelector('#top button'));
  const settle=async()=>{await win.waitForTimeout(700);await win.evaluate(()=>document.getAnimations().forEach(a=>{try{a.finish()}catch(e){}}));await win.waitForTimeout(100)};
  const tab=async t=>{await win.locator('#top .tabs button',{hasText:t}).first().click();await settle()};
  const esc=async()=>{await win.keyboard.press('Escape');await win.keyboard.press('Escape');await settle()};
  const states=[
    ['전체',()=>tab('전체')],
    ['구상',()=>tab('구상')],
    ['구상-시트',async()=>{const b=win.getByRole('button',{name:/시트 펼치기/});if(await b.count())await b.first().click();await settle()}],
    ['타임라인',()=>tab('타임라인')],
    ['타임라인-한줄',async()=>{await win.evaluate(()=>{UIP.tlView='line';typeof renderAll==='function'&&renderAll()});await settle()}],
    ['관계망',async()=>{await tab('관계망');await win.waitForTimeout(2500)}],
    ['위키',()=>tab('위키')],
    ['위키-행',async()=>{const r=win.locator('#mid .wkrow').first();if(await r.count()){await r.click();await settle();const r2=win.locator('#mid .wkrow').nth(1);if(await r2.count()){await r2.click();await settle()}}}],
    ['메뉴',async()=>{await tab('구상');await win.locator('#top button[title="메뉴"]').click();await settle()}],
    ['설정',async()=>{await esc();await win.keyboard.press('Control+,');await settle()}],
    ['설정-탭들',async()=>{const tabs=win.locator('#modal .seg button, #modal .tabs button');const n=await tabs.count();if(n>1){await tabs.nth(1).click();await settle()}}],
    ['검색',async()=>{await esc();await win.keyboard.press('Control+F');await settle()}],
    ['집중',async()=>{await esc();await tab('구상');await win.keyboard.press('Alt+Z');await settle()}],
    ['무덤',async()=>{await esc();await win.keyboard.press('Alt+4');await settle()}],
    ['도움말',async()=>{await esc();await win.keyboard.press('Alt+4');await win.keyboard.press('Shift+?');await settle()}],
    ['어두운-구상',async()=>{await esc();await win.evaluate(()=>{S.settings.theme='dark';applySettings();renderAll()});await tab('구상')}],
    ['어두운-타임라인',()=>tab('타임라인')],
    ['어두운-위키',()=>tab('위키')],
    ['어두운-설정',async()=>{await win.keyboard.press('Control+,');await settle()}],
  ];
  const result={};
  for(const [name,fn] of states){
    try{await fn()}catch(e){console.error('상태 실패',name,e.message.split('\n')[0])}
    result[name]=await win.evaluate(collect,null);
  }
  fs.writeFileSync(out,JSON.stringify(result));
  await close(app);
  if(against){
    const A=JSON.parse(fs.readFileSync(against,'utf8'));let n=0;
    for(const s of Object.keys(A)){const a=A[s],b=result[s]||{},d=[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>a[k]!==b[k]);
      if(d.length){n+=d.length;console.log(`  ${s}: ${d.length}개`,d.slice(0,3).join('  '))}}
    console.log('다른 요소',n);process.exitCode=n?1:0;
  }
})().catch(e=>{console.error(e);process.exit(1)});
