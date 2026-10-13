/* ---------- 오른쪽: 쓰고 싶은 장면·대사 ---------- */
/* 오른쪽 목록 보기 기준: 분류(기본 장면 · 대사만) · 종류(인물 / 설정 / 미분류, 기본 미분류 제외) · 정렬(등록일 / 수정일) */
const poolKinds=()=>{const a=UIP.pk;if(Array.isArray(a)){const ids=a.filter(id=>S.kinds.some(k=>k.id===id));return ids.length?ids:S.kinds.map(k=>k.id)}
  return S.kinds.some(k=>k.id==='scene')?['scene']:S.kinds.map(k=>k.id)};
const poolOwn=()=>Object.assign({char:true,setting:true,none:false},UIP.pown||{});
const poolSort=()=>({by:UIP.psort==='updated'?'updated':'created',dir:UIP.pdir==='asc'?'asc':'desc'});
function cardOwners(c){const ids=eff(c);if(!ids.length)return {none:true};const o={};ids.forEach(id=>{const e=charById(id);if(e)o[e.kind==='setting'?'setting':'char']=true});return o}
function poolPass(c){
  if(c.discarded||shelfOf(c.id))return false;      // 폐기한 카드 · 보관 칸에 둔 카드는 오른쪽 목록에 안 나옴      // 폐기한 카드는 오른쪽 목록에 안 나옴
  if(!poolKinds().includes(c.kind))return false;
  if(UI.pnew&&UI.pnew.has(c.id))return true;      // 방금 이 목록에서 만든 카드는 종류와 상관없이 보임
  const own=poolOwn(),o=cardOwners(c);return (own.char&&o.char)||(own.setting&&o.setting)||(own.none&&o.none)||false;
}
const poolDefault=()=>{const k=poolKinds(),o=poolOwn(),s=poolSort();return k.length===1&&k[0]==='scene'&&o.char&&o.setting&&!o.none&&s.by==='created'&&s.dir==='desc'};
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
  const fOn=UI.pused!=='all'||!poolDefault()||UI.pchar||UI.pq;
  const fb=h('button',{class:'cbtn pfbtn'+(fOn?' fon':''),'data-pop':'1',title:'필터 — 사용 여부 · 분류 · 인물 · 검색 · 노트 크기',onclick:()=>{
    const si=h('input',{class:'psearch',placeholder:'검색',value:UI.pq,oninput:e=>{UI.pq=e.target.value;clearTimeout(renderPool.t);renderPool.t=setTimeout(()=>renderPool(),220)}});
    popMenu(fb,()=>[{title:'보이는 노트'},...[['all','전체'],['unused','미사용'],['used','사용']].map(([k,n])=>({label:n,on:UI.pused===k,keep:true,fn:()=>{UI.pused=k;renderPool()}})),
      'sep',{title:'분류 (여러 개 함께)'},...S.kinds.map(k=>({label:k.name,sw:k.colorMode==='random'?RANDOM_BG:k.color,on:poolKinds().includes(k.id),keep:true,fn:()=>{const cur=new Set(poolKinds());if(cur.has(k.id)){if(cur.size>1)cur.delete(k.id)}else cur.add(k.id);UIP.pk=[...cur];saveUIP();renderPool()}})),
      'sep',{title:'노트 종류'},...[['char','인물'],['setting','설정'],['none','미분류']].map(([k,n])=>({label:n,on:!!poolOwn()[k],keep:true,fn:()=>{UIP.pown=Object.assign(poolOwn(),{[k]:!poolOwn()[k]});saveUIP();renderPool()}})),
      'sep',{title:'정렬'},...[['created','등록일'],['updated','수정일']].map(([k,n])=>({label:n,on:poolSort().by===k,keep:true,fn:()=>{UIP.psort=k;saveUIP();renderPool()}})),
      ...[['desc','최신 순 ↓'],['asc','오래된 순 ↑']].map(([k,n])=>({label:n,on:poolSort().dir===k,keep:true,fn:()=>{UIP.pdir=k;saveUIP();renderPool()}})),
      'sep',{title:'인물'},{node:sel([['','모든 인물'],...S.characters.map(c=>[c.id,c.name])],UI.pchar,v=>{UI.pchar=v;renderPool()},'psel')},{node:si},
      'sep',{title:'노트 크기'},...[['x','요약 (긴 글은 3줄까지)'],['s','소'],['m','중'],['l','대']].map(([k,n])=>({label:n,on:(UIP.ps||'m')===k,keep:true,fn:()=>{UIP.ps=k;saveUIP();renderPool()}})),
      ...((UIP.ps||'m')==='x'?['sep',{title:'요약 카드를 누르면'},...[['slide','그 자리에서 펼치기 (슬라이드)'],['pop','팝업으로 보기']].map(([k,n])=>({label:n,on:(UIP.xm||'slide')===k,keep:true,fn:()=>{UIP.xm=k;saveUIP();renderPool()}}))]:[])]);
    setTimeout(()=>{if(UI.pq)si.focus()},0)}},icon('filter'),fOn?h('i',{class:'fdot'}):null);
  if(U2())p.append(h('div',{class:'phead'},h('b',{title:'쓰고 싶은 장면 · 대사'},'쓰고 싶은 장면'),h('small',{class:'pcnt'},S.cards.length),h('span',{class:'sp'}),fb,ptog('pool')));
  else p.append(h('div',{class:'phead'},h('b',{},'쓰고 싶은 장면 · 대사'),h('span',{class:'sp'}),h('span',{class:'muted'},`${S.cards.length}장`),fb,ptog('pool')));
  const qi=h('input',{placeholder:`한 줄 쓰고 Enter → ${kindOf(quickKind()).name}`,
    onkeydown:e=>{if(e.key!=='Enter'||e.isComposing)return;const v=qi.value.trim();if(!v)return;
      act(()=>{const c=newCard(quickKind(),v);autoLinkCard(c);S.cards.unshift(c);(UI.pnew=UI.pnew||new Set()).add(c.id);if(!poolKinds().includes(c.kind)){UIP.pk=[...poolKinds(),c.kind];saveUIP()}});setTimeout(()=>{const i=document.querySelector('#pool .pquick input');if(i)i.focus()})}});
  const sum=[UI.pused!=='all'&&!U2()?{all:'전체',unused:'미사용',used:'사용'}[UI.pused]:null,(poolKinds().length===1&&poolKinds()[0]==='scene')?null:(poolKinds().length<S.kinds.length?poolKinds().map(id=>kindOf(id).name).join('·'):'모든 분류'),(()=>{const o=poolOwn();return o.char&&o.setting&&!o.none?null:['char','setting','none'].filter(k=>o[k]).map(k=>({char:'인물',setting:'설정',none:'미분류'}[k])).join('·')||'종류 없음'})(),poolSort().by==='created'&&poolSort().dir==='desc'?null:`${poolSort().by==='updated'?'수정일':'등록일'} ${poolSort().dir==='asc'?'↑':'↓'}`,UI.pchar&&charById(UI.pchar)?charById(UI.pchar).name:null,UI.pq?`“${UI.pq}”`:null].filter(Boolean);
  if(U2()){qi.placeholder='한 줄 쓰고 Enter';qi.title=`Enter → ${kindOf(quickKind()).name}`}
  p.append(h('div',{class:'pquick'},qi,U2()?tabs([['unused','미사용'],['used','사용'],['all','전체']],UI.pused,k=>{UI.pused=k;renderPool()}):null,sum.length?h('div',{class:'psum'},h('span',{},sum.join(' · ')),h('button',{class:'quiet',onclick:()=>{UI.pused='all';UI.pchar='';UI.pq='';UIP.pk=S.kinds.map(k=>k.id);UIP.pown={char:true,setting:true,none:true};UIP.psort='created';UIP.pdir='desc';saveUIP();renderAll()}},'모두 보기')):null));
  const list=h('div',{class:'plist'});
  const q=UI.pq.trim().toLowerCase();
  const sig=`${poolKinds().join()}|${JSON.stringify(poolOwn())}|${poolSort().by}${poolSort().dir}|${UI.pchar}|${UI.pused}|${UI.pq}`;if(renderPool.sig!==sig){UI.poolLimit=60;renderPool.sig=sig}      // 필터가 바뀌면 처음부터
  const lim=UI.poolLimit||60;
  const ps=poolSort(),pv=c=>ps.by==='updated'?(c.updated||c.created||0):(c.created||0),pd=ps.dir==='asc'?1:-1;
  const items=S.cards.filter(c=>{const u=!!episodeOf(c.id);return poolPass(c)&&(!UI.pchar||eff(c).includes(UI.pchar))&&(UI.pused==='all'||(UI.pused==='used'?u:!u))&&(!q||c.text.toLowerCase().includes(q))})
    .map((c,i)=>[c,i]).sort((a,b)=>(pv(a[0])-pv(b[0]))*pd||(a[1]-b[1])*(ps.dir==='asc'?-1:1)).map(x=>x[0]);
  const mrow=h('div',{class:'mrow'});list._cards=items.slice(0,lim).map(c=>kcard(c,'pool'));      // 많을 때는 나눠서 그림 (스크롤하면 더 불러옴)
  if(list._cards.length)list.append(mrow);
  if(items.length>lim)list.append(h('button',{class:'quiet morebtn',style:'width:100%;margin-top:10px',onclick:()=>{const st=$('pool').scrollTop;UI.poolLimit=lim+80;renderPool();$('pool').scrollTop=st}},`＋ ${items.length-lim}장 더 보기`));
  if(!list.children.length)list.append(h('div',{class:'empty'},S.cards.length?'조건에 맞는 카드가 없어요.':'쓰고 싶은 장면이나 대사를 위에 한 줄씩 적어 보세요.',
    S.cards.length?h('div',{},h('button',{class:'quiet',style:'margin-top:8px',onclick:()=>{UI.pchar='';UI.pq='';UI.pused='all';UIP.pk=S.kinds.map(k=>k.id);UIP.pown={char:true,setting:true,none:true};saveUIP();renderAll()}},'필터 모두 풀기')):h('div',{},h('button',{class:'on',style:'margin-top:10px',onclick:()=>{const i=document.querySelector('#pool .pquick input');if(i)i.focus()}},'첫 카드 쓰기'))));
  list.addEventListener('dragover',e=>{if(DRAG&&(episodeOf(DRAG.id)||shelfOf(DRAG.id))){e.preventDefault();list.classList.add('over')}});
  list.addEventListener('dragleave',e=>{if(!list.contains(e.relatedTarget))list.classList.remove('over')});
  list.addEventListener('drop',e=>{e.preventDefault();list.classList.remove('over');if(DRAG){const id=DRAG.id;DRAG=null;unplaceCard(id)}});
  p.append(list);
  fitAll(p);markClips(list);masonry(list);hlLayoutAll(p);
  requestAnimationFrame(()=>{fitAll(p);markClips(list);masonry(list)});      // 레이아웃이 자리 잡은 뒤 한 번 더 (접힘 판단은 실제 높이가 필요)
}
