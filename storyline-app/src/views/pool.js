/* ---------- 오른쪽: 쓰고 싶은 장면·대사 ---------- */
/* 오른쪽 목록 보기 기준: 분류(칩 · 기본 장면 · 대사만) · 연결(인물 / 설정 노트 / 연결 없음, 기본 모두) · 정렬(쓸 시기 / 등록일 / 수정일, 기본 쓸 시기) */
const poolKinds=()=>{const a=UIP.pk;if(Array.isArray(a)){const ids=a.filter(id=>S.kinds.some(k=>k.id===id));return ids.length?ids:S.kinds.map(k=>k.id)}
  return S.kinds.some(k=>k.id==='scene')?['scene']:S.kinds.map(k=>k.id)};
const poolOwn=()=>Object.assign({char:true,setting:true,none:true},UIP.pown||{});
const poolOwnAll=()=>{const o=poolOwn();return o.char&&o.setting&&o.none};
const poolSort=()=>({by:['updated','created'].includes(UIP.psort)?UIP.psort:'when',dir:UIP.pdir==='asc'?'asc':'desc'});
function cardOwners(c){const ids=eff(c);if(!ids.length)return {none:true};const o={};ids.forEach(id=>{const e=charById(id);if(e)o[e.kind==='setting'?'setting':'char']=true});return o}
function poolPass(c){
  if(c.discarded||shelfOf(c.id))return false;      // 폐기한 카드 · 보관 칸에 둔 카드는 오른쪽 목록에 안 나옴      // 폐기한 카드는 오른쪽 목록에 안 나옴
  if(!poolKinds().includes(c.kind))return false;
  if(UI.pnew&&UI.pnew.has(c.id))return true;      // 방금 이 목록에서 만든 카드는 종류와 상관없이 보임
  const own=poolOwn(),o=cardOwners(c);return (own.char&&o.char)||(own.setting&&o.setting)||(own.none&&o.none)||false;
}
const poolMatch=c=>poolPass(c)&&(!UI.pchar||eff(c).includes(UI.pchar))&&(!UI.pq.trim()||c.text.toLowerCase().includes(UI.pq.trim().toLowerCase()));      // 사용 탭만 빼고 지금 목록 조건 전부 (훑기도 이 범위)
const poolKindName=()=>{const k=poolKinds();return k.length>=S.kinds.length?'전체':k.map(id=>kindOf(id).name).join(' · ')};
/* 분류 칩: [전체]가 켜진 상태에서 하나를 누르면 그 분류만 · 그다음부터는 누를 때마다 켜고 끄기 (다 끄면 전체로) */
function kindChips(){
  const cur=poolKinds(),all=cur.length>=S.kinds.length;
  const set=ids=>{UIP.pk=ids.length?ids:S.kinds.map(k=>k.id);saveUIP();renderPool()};
  return h('div',{class:'pkchips'},h('button',{class:'pkchip'+(all?' on':''),onclick:()=>set([])},'전체'),
    ...S.kinds.map(k=>h('button',{class:'pkchip'+(!all&&cur.includes(k.id)?' on':''),style:`--kd:${kdark(k.colorMode==='random'?'#999':k.color)}`,
      onclick:()=>set(all?[k.id]:cur.includes(k.id)?cur.filter(x=>x!==k.id):[...cur,k.id])},h('i'),k.name)));
}
function renderPool(){
  const pl=$('pool'),st=pl.scrollTop,sig0=renderPool.sig;      // 카드를 옮겨도 오른쪽 목록의 보던 자리를 유지 (필터가 바뀌면 처음부터)
  const _fl=FLIPON?null:flipRecord();try{renderPool0();peekWrap('pool')}finally{flipPlay(_fl)}
  if(st&&renderPool.sig===sig0){pl.scrollTop=st;requestAnimationFrame(()=>{pl.scrollTop=st;requestAnimationFrame(()=>{pl.scrollTop=st})})}
}
/* 요약 크기: 3줄을 넘는 글은 3줄까지만 보이고(⋯), 카드를 누르면 펼쳐짐 (같은 곳을 다시 누르면 접힘) */
const XLINES=3;
function markClips(list){
  const on=(UIP.ps||'m')==='x';
  (list||document.querySelector('#pool .plist')||document).querySelectorAll('.kcard.pool').forEach(c=>{
    const w=c.querySelector('.kwrap'),ta=c.querySelector('.ktext');if(!w||!ta)return;
    if(!on){w.style.maxHeight='';c.classList.remove('xclip','xo');return}
    const cs=getComputedStyle(ta),lh=parseFloat(cs.lineHeight)||ta.clientHeight/3,lim=lh*XLINES+(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0);
    const full=ta.scrollHeight>lim+lh*.5;c.classList.toggle('xclip',full);
    w.dataset.lim=lim;if(!w.classList.contains('xanim'))w.style.maxHeight=(full&&!c.classList.contains('xo'))?lim+'px':''})
}
function xpopClose(){document.querySelectorAll('.xpop').forEach(x=>x.remove())}
function xpopOpen(c){      // 팝업으로 보기: 카드 전체를 그 자리 위에 띄움 (바깥을 누르거나 Esc로 닫힘)
  xpopClose();const id=c.dataset.id,card=cardById(id);if(!card)return;
  const r=c.getBoundingClientRect(),pop=h('div',{class:'xpop'},kcard(card,'pool'));
  pop.style.cssText=`left:${Math.max(8,Math.min(innerWidth-r.width-8,r.left))}px;top:${Math.max(8,r.top)}px;width:${r.width}px`;
  document.body.append(pop);fitAll(pop);hlLayoutAll(pop);
  requestAnimationFrame(()=>{const b=pop.getBoundingClientRect();if(b.bottom>innerHeight-8)pop.style.top=Math.max(8,innerHeight-8-b.height)+'px'});
  const off=ev=>{if(pop.contains(ev.target))return;xpopClose();document.removeEventListener('pointerdown',off,true)};setTimeout(()=>document.addEventListener('pointerdown',off,true),0);
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.xpop')){xpopClose()}},true);
document.addEventListener('click',e=>{
  if((UIP.ps||'m')!=='x')return;const w=e.target.closest&&e.target.closest('#pool .kcard.pool .kwrap');if(!w)return;
  const c=w.closest('.kcard.pool');if(!c.classList.contains('xclip')||c.classList.contains('editing'))return;
  if((UIP.xm||'slide')==='pop'){xpopOpen(c);return}
  const ta=c.querySelector('.ktext'),cs=getComputedStyle(ta),full=ta.scrollHeight+(parseFloat(cs.paddingTop)||0)*0,lim=+w.dataset.lim||w.offsetHeight;
  const done=()=>{w.classList.remove('xanim');w.style.transition='';markClips($('pool').querySelector('.plist'));masonry()};
  if(w._xt){clearTimeout(w._xt)}
  w.classList.add('xanim');w.style.transition='max-height .28s ease';
  if(c.classList.contains('xo')){      // 접기: 지금 높이에서 3줄 높이로 부드럽게
    w.style.maxHeight=w.offsetHeight+'px';void w.offsetHeight;w.style.maxHeight=lim+'px';w._xt=setTimeout(()=>{c.classList.remove('xo');done()},300)}
  else{      // 펴기: 3줄 높이에서 전체 높이로 부드럽게
    c.classList.add('xo');w.style.maxHeight=lim+'px';void w.offsetHeight;w.style.maxHeight=full+'px';w._xt=setTimeout(()=>{w.style.maxHeight='';done()},300)}
},true);
/* 오른쪽 목록 배치: 등록 순서대로 가장 짧은 열에 차례로 쌓음 (왼→오른쪽, 위→아래 · 아래 빈틈 최소) */
function masonry(list){
  list=list||document.querySelector('#pool .plist');if(!list||!list._cards)return;
  const mrow=list.querySelector('.mrow'),cards=list._cards;if(!mrow)return;
  const W=mrow.clientWidth;if(!W)return;
  const small=(UIP.ps||'m')==='s',gap=small?8:10,min={s:168,m:230,l:320,x:230}[UIP.ps||'m'];
  const n=Math.max(1,Math.floor((W+gap)/(min+gap)));
  let cols=[...mrow.children];
  if(cols.length!==n){mrow.replaceChildren();cols=Array.from({length:n},()=>h('div',{class:'mcol'}));mrow.append(...cols);cards.forEach((c,i)=>cols[i%n].append(c));fitAll(mrow)}      // 같은 폭에서 높이를 재기 위해 먼저 고르게 나눔
  const hs=cards.map(c=>c.offsetHeight),tot=cols.map(()=>0),pick=cards.map((c,i)=>{let m=0;for(let k=1;k<n;k++)if(tot[k]<tot[m]-.5)m=k;tot[m]+=hs[i]+gap;return m});
  cards.forEach((c,i)=>{if(c.parentNode!==cols[pick[i]]||false)cols[pick[i]].append(c)});
  cols.forEach((col,k)=>cards.forEach((c,i)=>{if(pick[i]===k&&c.parentNode===col)col.append(c)}));      // 열 안에서도 순서대로
  list._mn=n;
}
let masonT=0;const masonSoon=()=>{clearTimeout(masonT);masonT=setTimeout(()=>{const a=document.activeElement;if(a&&a.closest&&a.closest('#pool')&&/TEXTAREA|INPUT|SELECT/.test(a.tagName))return;masonry()},160)};
document.addEventListener('focusout',e=>{if(e.target.closest&&e.target.closest('#pool .plist'))masonSoon()});
function renderPool0(){
  idxClear();
  const p=$('pool');p.innerHTML='';p.dataset.ps=UIP.ps||'m';
  p.classList.toggle('cl',poolClosed()&&UI.peek!=='pool');
  if(poolClosed()&&UI.peek!=='pool'){p.append(h('button',{class:'ctab ctab-r',onmouseenter:()=>peekSoon('pool'),onfocus:()=>startPeek('pool',true),title:'장면 · 대사 목록 펴기',onclick:()=>togglePool()},icon('cards')));return}
  const fOn=UI.pchar||!poolOwnAll();      // 필터 팝업 안의 조건(인물 · 연결)이 걸려 있으면 점 표시
  const fb=h('button',{class:'cbtn pfbtn'+(fOn?' fon':''),'data-pop':'1',title:'필터 — 인물 · 연결',onclick:()=>
    popMenu(fb,()=>[{title:'인물'},{node:sel([['','모든 인물'],...S.characters.map(c=>[c.id,c.name])],UI.pchar,v=>{UI.pchar=v;renderPool()},'psel')},
      'sep',{title:'연결된 노트'},...[['char','인물 노트'],['setting','설정 노트'],['none','연결 없음']].map(([k,n])=>({label:n,on:!!poolOwn()[k],keep:true,fn:()=>{UIP.pown=Object.assign(poolOwn(),{[k]:!poolOwn()[k]});saveUIP();renderPool()}})),
      ...(fOn?['sep',{label:'초기화',fn:()=>{UI.pchar='';delete UIP.pown;saveUIP();renderPool()}}]:[])])},icon('filter'),fOn?h('i',{class:'fdot'}):null);
  const vb=h('button',{class:'cbtn pvbtn','data-pop':'1',title:'보기 — 정렬 · 노트 크기',onclick:()=>
    popMenu(vb,()=>[{title:'모양'},...[[true,'작은 포스트잇 아이콘'],[false,'크게 (글까지)']].map(([v,n])=>({label:n,on:frIcons()===v,keep:true,fn:()=>{UIP.pico=v;saveUIP();renderPool()}})),'sep',{title:'정렬'},...[['when','쓸 시기 (지금 · 곧 · 나중)'],['created','등록일'],['updated','수정일']].map(([k,n])=>({label:n,on:poolSort().by===k,keep:true,fn:()=>{UIP.psort=k;saveUIP();renderPool()}})),
      ...(poolSort().by==='when'?[]:[['desc','최신 순 ↓'],['asc','오래된 순 ↑']]).map(([k,n])=>({label:n,on:poolSort().dir===k,keep:true,fn:()=>{UIP.pdir=k;saveUIP();renderPool()}})),
      ...(frIcons()?[]:['sep',{title:'노트 크기'},...[['x','요약 (긴 글은 3줄까지)'],['s','소'],['m','중'],['l','대']].map(([k,n])=>({label:n,on:(UIP.ps||'m')===k,keep:true,fn:()=>{UIP.ps=k;saveUIP();renderPool()}}))]),      // 작은 아이콘일 때는 노트 크기가 상관없음
      ...(!frIcons()&&(UIP.ps||'m')==='x'?['sep',{title:'요약 카드를 누르면'},...[['slide','그 자리에서 펼치기 (슬라이드)'],['pop','팝업으로 보기']].map(([k,n])=>({label:n,on:(UIP.xm||'slide')===k,keep:true,fn:()=>{UIP.xm=k;saveUIP();renderPool()}}))]:[])])},icon('sort'));
  const sb=h('button',{class:'cbtn psbtn'+(UI.pq?' fon':''),title:'이 목록에서 찾기 (전체 검색은 위쪽 돋보기 · ⌘F)',onclick:()=>{UI.psOpen=!UI.psOpen;if(!UI.psOpen)UI.pq='';renderPool();if(UI.psOpen)setTimeout(()=>{const i=document.querySelector('#pool .psearch');if(i)i.focus()})}},icon('search'));
  const left=S.cards.filter(c=>poolMatch(c)&&!episodeOf(c.id)).length;      // 지금 조건에서 아직 화 · 보관 칸에 안 넣은 장수 (미사용 탭에 붙임 · 줄어드는 만큼 정리된 것)
  const tn=triageCards().filter(c=>!c.when).length;
  const triB=h('button',{class:'cbtn tribtn',title:'훑기 — 지금 보이는 분류의 카드를 한 장씩 보며 쓸 시기(지금 · 곧 · 나중) 정하기'+(tn?` · 안 정한 카드 ${tn}장`:''),onclick:triageOpen},'훑기',tn?h('i',{class:'trin'},tn>99?'99+':tn):null);
  p.append(h('div',{class:'phead'},h('b',{title:'쓰고 싶은 장면 · 대사'},'쓰고 싶은 장면'),h('span',{class:'sp'}),triB,sb,vb,fb,ptog('pool')));
  const qi=h('input',{placeholder:`한 줄 쓰고 Enter → ${kindOf(quickKind()).name}`,
    onkeydown:e=>{if(e.key!=='Enter'||e.isComposing)return;const v=qi.value.trim();if(!v)return;
      act(()=>{const c=newCard(quickKind(),v);autoLinkCard(c);S.cards.unshift(c);(UI.pnew=UI.pnew||new Set()).add(c.id);if(!poolKinds().includes(c.kind)){UIP.pk=[...poolKinds(),c.kind];saveUIP()}});setTimeout(()=>{const i=document.querySelector('#pool .pquick input');if(i)i.focus()})}});
  qi.placeholder='한 줄 쓰고 Enter';qi.title=`Enter → ${kindOf(quickKind()).name}`;
  const si=UI.psOpen||UI.pq?h('input',{class:'psearch',placeholder:'이 목록에서 찾기 (Esc 닫기)',value:UI.pq,oninput:e=>{UI.pq=e.target.value;clearTimeout(renderPool.t);renderPool.t=setTimeout(()=>{const a=document.activeElement===e.target,s=e.target.selectionStart;renderPool();if(a){const i=document.querySelector('#pool .psearch');if(i){i.focus();i.setSelectionRange(s,s)}}},220)},
    onkeydown:e=>{if(e.key==='Escape'&&!e.isComposing){e.stopPropagation();UI.pq='';UI.psOpen=false;renderPool()}}}):null;
  p.append(h('div',{class:'pquick'},qi,si,tabs([['unused',`미사용 ${left}`],['used','사용'],['all','전체']],UI.pused,k=>{UI.pused=k;renderPool()}),kindChips()));
  const list=h('div',{class:'plist'});
  const sig=`${poolKinds().join()}|${JSON.stringify(poolOwn())}|${poolSort().by}${poolSort().dir}|${UI.pchar}|${UI.pused}|${UI.pq}`;if(renderPool.sig!==sig){UI.poolLimit=60;renderPool.sig=sig}      // 필터가 바뀌면 처음부터
  const ICON=frIcons(),lim=ICON?Math.max(UI.poolLimit||60,300):UI.poolLimit||60;      // 새단장 아이콘은 가벼워서 한 번에 더 많이
  const ps=poolSort(),pv=c=>ps.by==='updated'?(c.updated||c.created||0):(c.created||0),pd=ps.dir==='asc'?1:-1;
  const cmp=ps.by==='when'?(a,b)=>whenRank(a[0])-whenRank(b[0])||(b[0].stars||0)-(a[0].stars||0)||(b[0].created||0)-(a[0].created||0)||a[1]-b[1]      // 쓸 시기 → 별점 → 최근 등록
    :(a,b)=>(pv(a[0])-pv(b[0]))*pd||(a[1]-b[1])*(ps.dir==='asc'?-1:1);
  const items=S.cards.filter(c=>{const u=!!episodeOf(c.id);return poolMatch(c)&&(UI.pused==='all'||(UI.pused==='used'?u:!u))})
    .map((c,i)=>[c,i]).sort(cmp).map(x=>x[0]);
  if(ICON){list.classList.add('frics');items.slice(0,lim).forEach(c=>list.append(frIcon(c)))}      // 새단장: 작은 포스트잇 아이콘 (features/fresh.js)
  else{const mrow=h('div',{class:'mrow'});list._cards=items.slice(0,lim).map(c=>kcard(c,'pool'));      // 많을 때는 나눠서 그림 (스크롤하면 더 불러옴)
  if(list._cards.length)list.append(mrow)}
  if(items.length>lim)list.append(h('button',{class:'quiet morebtn',style:'width:100%;margin-top:10px',onclick:()=>{const st=$('pool').scrollTop;UI.poolLimit=lim+(ICON?300:80);renderPool();$('pool').scrollTop=st}},`＋ ${items.length-lim}장 더 보기`));
  const tidy=UI.pused==='unused'&&S.cards.length&&!S.cards.some(c=>!c.discarded&&!shelfOf(c.id)&&!episodeOf(c.id));      // 필터 때문이 아니라 다 정리해서 빈 것
  if(!list.children.length)list.append(h('div',{class:'empty'},tidy?'다 정리했어요. 남은 카드를 모두 화나 보관 칸에 넣었어요.':S.cards.length?'조건에 맞는 카드가 없어요.':'쓰고 싶은 장면이나 대사를 위에 한 줄씩 적어 보세요.',
    tidy?null:S.cards.length?h('div',{},h('button',{class:'quiet',style:'margin-top:8px',onclick:()=>{UI.pchar='';UI.pq='';UI.psOpen=false;UI.pused='all';UIP.pk=S.kinds.map(k=>k.id);delete UIP.pown;saveUIP();renderPool()}},'필터 모두 풀기')):h('div',{},h('button',{class:'on',style:'margin-top:10px',onclick:()=>{const i=document.querySelector('#pool .pquick input');if(i)i.focus()}},'첫 카드 쓰기'))));
  list.addEventListener('dragover',e=>{if(BRDRAG||DRAG&&(episodeOf(DRAG.id)||shelfOf(DRAG.id))){e.preventDefault();list.classList.add('over')}});
  list.addEventListener('dragleave',e=>{if(!list.contains(e.relatedTarget))list.classList.remove('over')});
  list.addEventListener('drop',e=>{e.preventDefault();list.classList.remove('over');if(BRDRAG)return brDropPool();if(DRAG){const id=DRAG.id;DRAG=null;unplaceCard(id)}});
  p.append(list);
  fitAll(p);markClips(list);masonry(list);hlLayoutAll(p);
  requestAnimationFrame(()=>{fitAll(p);markClips(list);masonry(list)});      // 레이아웃이 자리 잡은 뒤 한 번 더 (접힘 판단은 실제 높이가 필요)
}
