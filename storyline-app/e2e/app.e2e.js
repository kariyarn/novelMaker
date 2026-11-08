// 진짜 앱을 켜서 핵심 흐름을 확인 (npm run test:e2e · 리눅스에선 xvfb-run 으로)
const test=require('node:test');
const assert=require('node:assert');
const {launch,newHome,waitSaved,close}=require('./helpers');

test('켜기: 예시 작품이 뜨고 화면 오류 · CSP 위반이 없음', async()=>{
  const {app,win,problems}=await launch(newHome());
  try{
    assert.ok(await win.evaluate(()=>S.cards.length>0),'예시 카드가 있어야 함');
    for(const t of ['전체','구상','타임라인','관계망','위키'])await win.getByRole('button',{name:t,exact:true}).first().click();
    assert.ok(await win.evaluate(()=>typeof require==='undefined'&&typeof process==='undefined'),'화면 코드는 sandbox 안에서 돌아야 함');
    await win.waitForTimeout(300);
    assert.deepEqual(problems,[]);
  }finally{await close(app)}
});

test('화면이 다른 페이지로 넘어가지 않음', async()=>{
  const {app,win}=await launch(newHome());
  try{
    const before=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.getURL());
    await win.evaluate(()=>{setTimeout(()=>{location.href='file:///etc/hosts'},0)});
    await new Promise(r=>setTimeout(r,800));
    const after=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.getURL());
    assert.equal(after,before);
  }finally{await close(app)}
});

test('새 메모를 쓰면 끄고 다시 켜도 남아 있음', async()=>{
  const home=newHome(),text='끄고 켜도 남는 메모 '+Date.now();
  let {app,win,problems}=await launch(home);
  try{
    await win.getByRole('button',{name:'구상',exact:true}).first().click();
    await win.keyboard.press('Control+N');
    const box=win.locator('textarea:focus, [contenteditable="true"]:focus');
    await box.waitFor({timeout:5000});
    await win.keyboard.type(text);
    await win.keyboard.press('Escape');
    await waitSaved(win);
    assert.ok(await win.evaluate(t=>S.cards.some(c=>c.text===t),text),'방금 쓴 메모가 상태에 있어야 함');
    assert.deepEqual(problems,[]);
  }finally{await close(app)}
  ({app,win}=await launch(home));
  try{
    assert.ok(await win.evaluate(t=>S.cards.some(c=>c.text===t),text),'다시 켜도 메모가 남아 있어야 함');
  }finally{await close(app)}
});

test('카드를 화에 넣으면 타임라인 · 다시 켠 뒤에도 그 화에 있음', async()=>{
  const home=newHome();
  let {app,win,problems}=await launch(home),card,ep;
  try{
    await win.getByRole('button',{name:'타임라인',exact:true}).first().click();
    ({card,ep}=await win.evaluate(()=>{      // 아직 화에 없는 원고 분류 카드 하나 → 첫 화 (끌어다 놓기와 같은 함수)
      const c=S.cards.find(c=>!episodeOf(c.id)&&!isWikiKind(c.kind)&&(c.text||'').trim());const e=S.episodes[0];
      placeCard(c.id,e.id);return {card:{id:c.id,text:c.text},ep:e.id};
    }));
    assert.ok(await win.evaluate(({card,ep})=>S.episodes.find(e=>e.id===ep).cardIds.includes(card.id),{card,ep}));
    await win.locator('#mid').getByText(card.text.split('\n')[0].slice(0,12)).first().waitFor({timeout:5000});
    await waitSaved(win);
    assert.deepEqual(problems,[]);
  }finally{await close(app)}
  ({app,win}=await launch(home));
  try{
    assert.ok(await win.evaluate(({card,ep})=>S.episodes.find(e=>e.id===ep).cardIds.includes(card.id),{card,ep}),'다시 켜도 그 화에 있어야 함');
  }finally{await close(app)}
});

test('메모를 위키로 보내고 다시 메모로 되돌리기', async()=>{
  const {app,win,problems}=await launch(newHome());
  try{
    await win.getByRole('button',{name:'위키',exact:true}).first().click();
    const memo=win.locator('.wkto').first();
    await memo.waitFor({timeout:5000});
    const id=await memo.evaluate(b=>{const el=b.closest('[data-id]');return el&&el.dataset.id});
    const before=await win.evaluate(()=>wikiRows().length);
    await memo.click();
    await win.locator('.pop').getByText(/바로 아래/).first().click();
    await win.waitForFunction(n=>wikiRows().length===n+1,before);
    const filed=await win.evaluate(id=>id?cardById(id).filed:S.cards.find(c=>c.filed).filed,id);
    assert.ok(filed,'메모가 행에 들어가야 함');
    const revert=win.getByRole('button',{name:'메모로 되돌리기'});
    await revert.waitFor({timeout:5000});
    await revert.click();
    await win.waitForFunction(n=>wikiRows().length===n,before);
    assert.ok(await win.evaluate(f=>!S.cards.some(c=>c.filed===f),filed),'되돌린 메모는 다시 목록으로');
    await waitSaved(win);
    assert.deepEqual(problems,[]);
  }finally{await close(app)}
});

test('더 새 앱이 고친 작품은 읽기만: 알림 띠가 뜨고 고쳐도 파일은 그대로', async()=>{
  const fs=require('fs'),path=require('path');
  const {DATA_VERSION}=require('../storage/dataVersion');
  const home=newHome();
  let {app,win}=await launch(home),file;
  try{
    await win.getByRole('button',{name:'구상',exact:true}).first().click();
    await win.keyboard.press('Control+N');await win.keyboard.type('파일을 만들기 위한 메모');await win.keyboard.press('Escape');
    await waitSaved(win);
    file=path.join(home,'data','main','works',await win.evaluate(()=>LIB.current),'storyline.json');
  }finally{await close(app)}
  const d=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(d.version,DATA_VERSION,'저장할 때 지금 데이터 버전을 적어야 함');
  d.version=DATA_VERSION+1;d.futureField={from:'새 앱'};      // 새 앱이 만든 작품인 척
  const newer=JSON.stringify(d);fs.writeFileSync(file,newer);
  ({app,win}=await launch(home));
  try{
    assert.equal(await win.evaluate(()=>UI.tooNew),true);
    await win.locator('#banner').getByText('더 새 버전의 앱에서 고쳤어요').waitFor({timeout:5000});
    await win.keyboard.press('Control+N');await win.keyboard.type('저장되면 안 되는 메모');await win.keyboard.press('Escape');
    await win.waitForTimeout(1500);
  }finally{await close(app)}
  assert.equal(fs.readFileSync(file,'utf8'),newer,'더 새 데이터 파일은 그대로여야 함');
});
