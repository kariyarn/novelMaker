/* ---------- 훑기: 오른쪽 목록에 지금 보이는 조건(분류 · 연결 · 인물 · 검색) 중 화 · 보관 칸에 안 넣은 카드를 한 장씩 보며 쓸 시기(지금 · 곧 · 나중) 정하기 ---------- */
/* 순서: 아직 안 정한 카드(무작위) → 정한 지 오래된 카드부터 · 오른쪽 목록은 기본으로 이 시기 순 (pool.js) */
const WHEN=[['now','지금'],['soon','곧'],['later','나중']];
const whenName=w=>(WHEN.find(x=>x[0]===w)||[])[1]||'';
const whenRank=c=>({now:0,soon:1,later:2})[c.when]??3;
const triageCards=()=>S.cards.filter(c=>poolMatch(c)&&!episodeOf(c.id));
/* 카드의 쓸 시기 표시: 누를 때마다 지금 → 곧 → 나중 → 안 정함 (훑기를 안 열고도 바로) */
function whenEl(card){
  const nx={'':'now',now:'soon',soon:'later',later:''}[card.when||''];
  return h('button',{class:'whenb'+(card.when?'':' empty'),'data-w':card.when||'',title:`쓸 시기 — 눌러서 ${nx?whenName(nx):'안 정함'}으로`,
    onclick:e=>{e.stopPropagation();act(()=>{if(nx){card.when=nx;card.whenAt=Date.now()}else{delete card.when;delete card.whenAt}})}},card.when?whenName(card.when):'시기');
}
const whenAgo=t=>{const d=Math.floor((Date.now()-t)/864e5);return d<1?'오늘':d<7?`${d}일 전`:d<60?`${Math.floor(d/7)}주 전`:`${Math.floor(d/30)}달 전`};
function triageOpen(){
  const cs=triageCards();if(!cs.length)return toast('지금 보이는 분류에 훑을 카드가 없어요');
  const sh=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  const q=[...sh(cs.filter(c=>!c.when)),...cs.filter(c=>c.when).sort((a,b)=>(a.whenAt||0)-(b.whenAt||0))].map(c=>c.id);
  let i=0;const hist=[];      // 되돌리기: 지나온 카드 자리와 그때 정했는지
  const o=h('div',{class:'dlg tri',role:'dialog','aria-modal':'true'}),box=h('div',{class:'dlgbox tribox'});o.append(box);
  const prev=document.activeElement;
  const close=()=>{o.remove();document.removeEventListener('keydown',key,true);if(prev&&prev.focus&&document.contains(prev))try{prev.focus()}catch(e){}};
  const pick=w=>{const c=cardById(q[i]);if(!c)return next();act(()=>{c.when=w;c.whenAt=Date.now()});hist.push({i,set:true});i++;draw()};
  const drop=()=>{const c=cardById(q[i]);if(!c)return next();act(()=>{stamp(c);c.discarded=true});hist.push({i,set:true});i++;draw()};      // 안 쓸 카드는 바로 폐기
  const next=()=>{hist.push({i,set:false});i++;draw()};
  const back=()=>{const st=hist.pop();if(!st)return;if(st.set)undo();i=st.i;draw()};      // 앞 카드로 돌아감 (정했던 카드면 정한 것도 취소)
  const draw=()=>{
    while(i<q.length&&!cardById(q[i]))i++;      // 그사이 지워진 카드는 건너뜀
    const left=triageCards().filter(c=>!c.when).length;
    box.replaceChildren();
    if(i>=q.length){box.append(h('div',{class:'trihd'},h('b',{},'다 훑었어요'),h('span',{class:'sp'})),
      h('div',{class:'dlgmsg'},left?`아직 안 정한 카드가 ${left}장 있어요. 다음에 열면 그 카드부터 나와요.`:'오른쪽 목록이 지금 · 곧 · 나중 순으로 정리됐어요.'),
      h('div',{class:'dlgrow'},hist.length?h('button',{onclick:back},'되돌리기'):null,h('button',{class:'on',onclick:close},'닫기')));box.querySelector('.on').focus();return}
    const c=cardById(q[i]),k=kindOf(c.kind);
    box.append(h('div',{class:'trihd'},h('b',{},'훑기'),h('small',{class:'muted'},`${poolKindName()} · ${i+1} / ${q.length} · 안 정한 카드 ${left}장`),h('span',{class:'sp'}),h('button',{class:'x',title:'닫기 (Esc)',onclick:close},'✕')),
      h('div',{class:'tricard',style:`--kc0:${cardColor(c)}`},
        h('div',{class:'trimeta'},h('span',{},k.name),c.stars?h('span',{class:'stars'},'★'.repeat(c.stars)):null,h('span',{class:'sp'}),
          c.when?h('span',{class:'whenb','data-w':c.when},`지난번: ${whenName(c.when)} · ${whenAgo(c.whenAt||0)}`):null),
        h('div',{class:'tritext'},c.text||'(빈 카드)'),
        eff(c).length?h('div',{class:'trichars'},...eff(c).map(charById).filter(Boolean).map(e=>h('span',{class:'kchip',style:`--cc:${e.color}`},e.name))):null),
      h('div',{class:'tribtns'},...WHEN.map(([w,n],x)=>h('button',{class:'triw'+(c.when===w?' cur':''),'data-w':w,onclick:()=>pick(w)},h('kbd',{},x+1),n)),
        h('button',{class:'triw skip',onclick:next},h('kbd',{},4),'건너뛰기'),h('button',{class:'triw drop',title:'안 쓸 카드 — 폐기 (되돌리기 가능)',onclick:drop},h('kbd',{},5),'폐기')),
      h('div',{class:'trifoot muted'},hist.length?h('button',{class:'quiet',onclick:back},'← 되돌리기'):h('span'),h('span',{},'1~3 시기 · 4 건너뛰기 · 5 폐기 · Esc 닫기')));
  };
  const key=e=>{if(e.isComposing)return;
    const n={'1':'now','2':'soon','3':'later'}[e.key];
    if(e.key==='Escape')close();else if(n&&i<q.length)pick(n);else if((e.key==='4'||e.key==='ArrowRight')&&i<q.length)next();else if(e.key==='5'&&i<q.length)drop();
    else if(e.key==='Backspace'||e.key==='ArrowLeft'||((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'))back();else return;
    e.preventDefault();e.stopPropagation()};
  document.addEventListener('keydown',key,true);
  o.addEventListener('mousedown',e=>{if(e.target===o)close()});
  document.body.append(o);if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();draw();
}
