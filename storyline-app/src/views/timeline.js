/* ---------- 가운데: 타임라인 ---------- */
function addEpisode(){      // 화 추가: 보고 있던 자리를 지키고, 새 화가 보이게
  const i=S.episodes.length,[lo,hi]=UI.mode==='tl'?tlRange():[0,i];
  act(()=>{S.episodes.push(newEp());
    if(UI.tlScope&&!(i>=lo&&i<hi+1&&UI.tlScope.g!==undefined))UI.tlScope=null;      // 한 화만 보고 있었다면 전체로
    const g=tlGroups().findIndex(([a,b])=>i>=a&&i<b);if(g>=0&&UIP.tg)UIP.tg[g]=false;      // 접힌 묶음이면 펴기
    UI.scrollEp=i});
}

function placeCard(cardId,epId,beforeId){
  {const c0=cardById(cardId);if(c0)ensureKindVisible(c0.kind)}
  act(()=>{detach([cardId]);
    const ep=S.episodes.find(e=>e.id===epId);let i=beforeId?ep.cardIds.indexOf(beforeId):-1;if(i<0)i=ep.cardIds.length;ep.cardIds.splice(i,0,cardId)});
}
const unplaceCard=id=>act(()=>detach([id]));
function shelfPlace(cardId,shelfId,beforeId){      // 보관 칸에 넣기 (칸 안 순서도 지정)
  act(()=>{detach([cardId]);const sh=S.shelves.find(x=>x.id===shelfId);if(!sh)return;let i=beforeId?sh.cardIds.indexOf(beforeId):-1;if(i<0)i=sh.cardIds.length;sh.cardIds.splice(i,0,cardId)});
}
let TLIO=null;
/* 빈 곳을 잡고 끌어서 이동 (휠 · 트랙패드 이동은 그대로) */
function bindPanScroll(el){
  el.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.target.closest('.kcard,input,textarea,select,button,.tlhead,.tlmemo,.rbadge,[contenteditable]'))return;
    const sx=e.clientX,sy=e.clientY,sl=el.scrollLeft,st=el.scrollTop;let on=false;
    const mv=ev=>{const dx=ev.clientX-sx,dy=ev.clientY-sy;if(!on&&Math.hypot(dx,dy)<5)return;
      if(!on){on=true;el.classList.add('panning');document.body.style.userSelect='none'}
      el.scrollLeft=sl-dx;el.scrollTop=st-dy};
    const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);
      el.classList.remove('panning');document.body.style.userSelect='';
      if(on){const sup=ev=>{ev.stopPropagation();ev.preventDefault()};addEventListener('click',sup,{capture:true,once:true});setTimeout(()=>removeEventListener('click',sup,true),0)}};
    addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',up);
  });
}
/* 길어서 스크롤되는 화 칸: 위 · 아래에 더 있으면 그쪽 끝을 살짝 흐리게 */
function tlCue(b){const up=b.scrollTop>2,dn=b.scrollTop<b.scrollHeight-b.clientHeight-2&&b.scrollHeight>b.clientHeight+2;b.classList.toggle('mu',up);b.classList.toggle('md',dn)}
function tlCues(root){
  const go=()=>root.querySelectorAll('.tlbody').forEach(b=>{if(!b._cue){b._cue=1;b.addEventListener('scroll',()=>tlCue(b),{passive:true});if(window.ResizeObserver)new ResizeObserver(()=>tlCue(b)).observe(b)}tlCue(b)});
  requestAnimationFrame(go);setTimeout(go,400);
}
/* 한 화의 카드를 순서대로 이어 붙여 원고 글로 복사 (카드 사이는 빈 줄 하나) */
async function copyEpisodeText(i){
  const ep=S.episodes[i];if(!ep)return;
  const parts=ep.cardIds.map(cardById).filter(Boolean).map(c=>(c.text||'').replace(/^\s*\n/,'').replace(/\s+$/,'')).filter(t=>t.trim());
  if(!parts.length)return toast('복사할 글이 없어요');
  const txt=parts.join('\n\n');
  try{await navigator.clipboard.writeText(txt)}catch(e){const ta=h('textarea',{style:'position:fixed;left:-999px;top:0'},txt);document.body.append(ta);ta.select();document.execCommand('copy');ta.remove()}
  toast(`${i+1}화 원고를 복사했어요 · 카드 ${parts.length}장 · 공백 빼고 ${txt.replace(/\s/g,'').length}자`);
}
/* 보관: 화 번호 없이 이름만 붙인 칸에 장면을 순서대로 이어 둠 — 몇 화에 쓸지 정해지면 화로 보냄 */
async function copyCardsText(ids,label){
  const parts=ids.map(cardById).filter(Boolean).map(c=>(c.text||'').replace(/^\s*\n/,'').replace(/\s+$/,'')).filter(t=>t.trim());
  if(!parts.length)return toast('복사할 글이 없어요');
  const txt=parts.join('\n\n');
  try{await navigator.clipboard.writeText(txt)}catch(e){const ta=h('textarea',{style:'position:fixed;left:-999px;top:0'},txt);document.body.append(ta);ta.select();document.execCommand('copy');ta.remove()}
  toast(`${label} 원고를 복사했어요 · 카드 ${parts.length}장 · 공백 빼고 ${txt.replace(/\s/g,'').length}자`);
}
/* 카드 몇 장 · 글자 수 (공백 빼고) 요약 */
const textLen=ids=>ids.map(cardById).filter(Boolean).reduce((n,c)=>n+(c.text||'').replace(/\s/g,'').length,0);
const cntLabel=(ids,n)=>{if(!n)return '비어 있음';const t=textLen(ids);return t?`${n}장 · ${t.toLocaleString()}자`:`${n}장`};
/* 보관 칸 → 화로 보내기: 칸 통째로(ids 생략) 또는 그 칸에서 고른 카드만. 칸 안의 순서 그대로 */
function shelfSendMenu(btn,sh,picked){
  const ids=picked||sh.cardIds.filter(cardById),whole=!picked,E=S.episodes;
  if(!ids.length)return toast('보낼 카드가 없어요');
  const done=()=>{if(whole&&UIP.shDel&&S.shelves.length>1){const i=S.shelves.indexOf(sh);if(i>=0&&!sh.cardIds.length)S.shelves.splice(i,1)}};      // 다 보낸 빈 칸 지우기 (같은 되돌리기 안에서)
  const go=t=>msMove(ids,t,done);
  popMenu(btn,()=>{
    const items=[{title:whole?`‘${sh.name}’ ${ids.length}장을 보낼 곳`:`고른 ${ids.length}장을 보낼 곳`},
      {label:'맨 뒤에 새 화로',fn:()=>go({newEnd:true})},
      {label:'화 번호 입력…',fn:async()=>{const v=parseInt(await askText(`몇 화로 보낼까요? (1~${E.length||1}, 그보다 크면 맨 뒤 새 화)`,String(E.length||1)),10);if(!(v>=1))return;go(v>E.length?{newEnd:true}:{ep:v-1})}}];
    const recent=[...new Set([...E.map((e,i)=>e.cardIds.length?i:-1).filter(i=>i>=0),...E.map((_,i)=>i).slice(-3)])].sort((a,b)=>b-a).slice(0,12);      // 카드가 든 화 + 맨 뒤 몇 화
    if(recent.length){items.push('sep',{title:'바로 보내기'});recent.forEach(i=>items.push({label:`${i+1}화${E[i].title?' · '+E[i].title:''}`,hint:E[i].cardIds.length?`${E[i].cardIds.length}장`:'',fn:()=>go({ep:i})}))}
    const others=S.shelves.filter(x=>x!==sh);
    items.push('sep',{title:'다른 보관 칸으로'});
    others.forEach(x=>items.push({label:`보관 · ${x.name}`,fn:()=>msShelve(ids,x.id,done)}));
    items.push({label:'새 보관 칸…',fn:()=>msShelve(ids,'__ask',done)});
    if(whole)items.push('sep',{label:'다 보낸 빈 칸은 지우기',on:!!UIP.shDel,keep:true,fn:()=>{UIP.shDel=!UIP.shDel;saveUIP()}});
    return items});
}
/* 여러 장 선택 중 그 칸에 든 카드가 있으면 칸 머리에 “고른 n장 보내기” */
function syncShelfSel(){
  document.querySelectorAll('.shelf[data-sh]').forEach(el=>{
    const sh=(S.shelves||[]).find(x=>x.id===el.dataset.sh),slot=el.querySelector('.shselslot');if(!sh||!slot)return;
    const ids=sh.cardIds.filter(id=>MSEL.has(id));
    slot.replaceChildren(ids.length?(()=>{const b=h('button',{class:'on shsel','data-pop':'1',title:'이 칸에서 고른 카드만 보내기',onclick:()=>shelfSendMenu(b,sh,sh.cardIds.filter(id=>MSEL.has(id)))},`고른 ${ids.length}장 보내기 ▾`);return b})():'');
  });
}
function renderShelf(m){
  if(!S.shelves.length){S.shelves.push({id:uid(),name:'보관',cardIds:[]});save()}
  const wrap=h('div',{class:'shelfwrap'});m.append(wrap);bindPanScroll(wrap);
  UIP.shf=UIP.shf||{};
  S.shelves.forEach((sh,si)=>{
    const cards=sh.cardIds.map(cardById).filter(Boolean),body=h('div',{class:'tlbody shbody'}),folded=!!UIP.shf[sh.id]&&cards.length>0;
    cards.forEach(c=>body.append(kcard(c,'tl',{shelfId:sh.id})));
    if(!cards.length)body.append(h('div',{class:'shhint'},
      h('span',{},'오른쪽 목록의 카드를 여기로 끌어다 놓으세요'),
      h('span',{},'여러 장은 ',h('kbd',{class:'kbd'},'⌘'),'클릭으로 고른 뒤 아래 막대의 ',h('b',{},'화로 보내기 → 보관'))));
    body.addEventListener('dragover',e=>{if(DRAG){e.preventDefault();body.classList.add('over');ghostByY(body,e.clientY)}});
    body.addEventListener('dragleave',e=>{if(!body.contains(e.relatedTarget)){body.classList.remove('over');ghostClearSoon()}});
    body.addEventListener('drop',e=>{e.preventDefault();body.classList.remove('over');if(DRAG){const id=DRAG.id,nb=ghostBeforeId(body);DRAG=null;shelfPlace(id,sh.id,nb)}});
    const send=cards.length?(()=>{const b=h('button',{class:'quiet shsend','data-pop':'1',title:'이 칸의 카드를 순서 그대로 한 화로 보내기',onclick:()=>shelfSendMenu(b,sh)},'화로 보내기 ▾');return b})():null;
    const shEl=h('div',{class:'shelf'+(folded?' folded':''),'data-sh':sh.id},
      h('div',{class:'shhead'},
        cards.length?h('button',{class:'cbtn shfold',title:folded?'펴기':'접기',onclick:()=>{UIP.shf[sh.id]=!folded;saveUIP();renderMid()}},icon(folded?'chevR':'chevD')):null,
        h('b',{class:'shno'},'보관'),h('input',{value:sh.name,placeholder:'칸 이름 (예: 25화쯤)',oninput:e=>edit(()=>sh.name=e.target.value)}),
        h('small',{class:'shcnt epcnt'},cntLabel(sh.cardIds,cards.length)),
        h('span',{class:'shselslot'}),
        send,
        cards.length?h('button',{class:'cbtn tlcopy shcopy',title:'이 칸의 글을 이어 붙여서 복사',onclick:()=>copyCardsText(sh.cardIds,`‘${sh.name}’`)},icon('copy')):null,
        S.shelves.length>1||cards.length?h('button',{class:'x',title:'칸 삭제 (카드는 오른쪽 목록으로 돌아가요)',onclick:async()=>{if(cards.length&&!await askConfirm(`‘${sh.name}’ 칸을 지울까요? 카드 ${cards.length}장은 오른쪽 목록으로 돌아가요.`))return;act(()=>{S.shelves=S.shelves.filter(x=>x!==sh);if(!S.shelves.length)S.shelves.push({id:uid(),name:'보관',cardIds:[]})})}},'✕'):null),
      body);
    bindColDrop(shEl,body,(id,nb)=>shelfPlace(id,sh.id,nb));      // 칸의 머리 · 여백에 놓아도 마우스 높이에 맞는 자리로
    wrap.append(shEl)});
  wrap.addEventListener('dragover',e=>{if(DRAG&&!e.target.closest('.shelf'))e.preventDefault()});      // 칸 사이 · 아래 빈 곳에 놓으면 가장 가까운 칸으로
  wrap.addEventListener('drop',e=>{if(!DRAG||e.target.closest('.shelf'))return;e.preventDefault();
    const shs=[...wrap.querySelectorAll('.shelf')];let best=null,bd=1e9;shs.forEach(el=>{const r=el.getBoundingClientRect(),d=e.clientY<r.top?r.top-e.clientY:(e.clientY>r.bottom?e.clientY-r.bottom:0);if(d<bd){bd=d;best=el}});
    if(best){const id=DRAG.id;DRAG=null;shelfPlace(id,best.dataset.sh,null)}});
  wrap.append(h('div',{class:'addcol shadd',onclick:async()=>{const name=((await askText('새 보관 칸 이름 (예: 30화 이후)','보관'))||'').trim();if(!name)return;act(()=>S.shelves.push({id:uid(),name,cardIds:[]}))}},'＋ 보관 칸 추가'));
  syncShelfSel();
}
/* 화 통째로: 순서 옮기기 · 이웃 화와 합치기 · 카드 전부 다른 화/보관 칸으로 */
function moveEpisode(i,to){
  const E=S.episodes;to=Math.max(0,Math.min(E.length-1,to));if(to===i)return;
  act(()=>{const [ep]=E.splice(i,1);E.splice(to,0,ep);UI.tlScope=null;UI.scrollEp=to});
  toast(`${i+1}화를 ${to+1}화 자리로 옮겼어요`,{undo:true});
}
function mergeEpisode(a,b){      // b화를 a화 뒤에 이어 붙이고 b화는 지움
  const E=S.episodes,A=E[a],B=E[b];if(!A||!B)return;
  act(()=>{
    if(b===a+1)A.cardIds.push(...B.cardIds);else A.cardIds.unshift(...B.cardIds);
    if(!(A.title||'').trim())A.title=B.title||'';
    const memo=[...(b===a+1?[A.memo,B.memo]:[B.memo,A.memo])].map(x=>(x||'').trim()).filter(Boolean);A.memo=memo.join('\n');
    E.splice(b,1);UI.tlScope=null;UI.scrollEp=E.indexOf(A)});
  toast(`${Math.min(a,b)+1}화와 ${Math.max(a,b)+1}화를 합쳤어요`,{undo:true});
}
function epMenu(btn,idx){
  const E=S.episodes,ep=E[idx],n=ep.cardIds.filter(cardById).length;
  popMenu(btn,[{title:`${idx+1}화${ep.title?' · '+ep.title:''}`},
    ...(n?[{label:`카드 ${n}장 모두 보내기…`,fn:()=>setTimeout(()=>msMenu(btn,ep.cardIds.filter(cardById)),0)}]:[]),
    'sep',{title:'화 순서'},
    ...(idx>0?[{label:`앞으로 한 칸 (${idx}화 자리)`,fn:()=>moveEpisode(idx,idx-1)}]:[]),
    ...(idx<E.length-1?[{label:`뒤로 한 칸 (${idx+2}화 자리)`,fn:()=>moveEpisode(idx,idx+1)}]:[]),
    {label:'몇 화 자리로…',fn:async()=>{const v=parseInt(await askText(`몇 화 자리로 옮길까요? (1~${E.length})`,String(idx+1)),10);if(v>=1)moveEpisode(idx,v-1)}},
    'sep',{title:'합치기'},
    ...(idx>0?[{label:`${idx}화 뒤에 이어 붙이기`,fn:()=>mergeEpisode(idx-1,idx)}]:[]),
    ...(idx<E.length-1?[{label:`${idx+2}화를 이 화 뒤에 이어 붙이기`,fn:()=>mergeEpisode(idx,idx+1)}]:[])]);
}
function renderTimeline(m){
  const E=S.episodes,mode=UIP.tlMode||'kanban',[lo,hi]=tlRange(),sc=UI.tlScope;
  const chip=(label,on,fn,col)=>h('span',{class:'chip'+(on?' on':''),onclick:fn},col&&!on?h('i',{style:`display:inline-block;width:7px;height:7px;border-radius:50%;background:${col};margin-right:5px`}):null,label);
  const slider=(key,min,max,lab)=>h('label',{class:'muted',style:'display:flex;align-items:center;gap:6px'},lab,h('input',{type:'range',min,max,step:10,value:UIP[key]||(key==='tll'?420:250),style:'width:100px;padding:0;background:transparent;border:0',oninput:e=>{UIP[key]=+e.target.value;applyLayout()},onchange:saveUIP}));
  const tlRangeSel=()=>{      // 새 디자인: 전체 / 묶음 / 한 화 범위를 드롭다운 하나로 (왼쪽 화 목록과 같은 동작)
    const gps=tlGroups(),useG=gps.length>1&&(UIP.gs===undefined?10:UIP.gs)>0;
    const opts=[['all',`전체 ${E.length}화`],...(useG?gps.map(([a,b],gi)=>['g'+gi,grpLab(a,b)]):[])];
    let cur=!sc?'all':(sc.g!==undefined?'g'+sc.g:'e');
    if(cur==='e')opts.push(['e',`${sc.e+1}화`]);
    return sel(opts,cur,v=>{if(v==='all')UI.tlScope=null;else if(v[0]==='g'){const gi=+v.slice(1);gps.forEach((_,k)=>{UIP.tg[k]=true});UIP.tg[gi]=false;UI.tlScope={g:gi}}saveUIP();renderAll()},'seg2');
  };
  m.append(h('div',{class:'mbar'},
    U2()?null:h('b',{},'타임라인'),
    (U2()?tabs:seg)([['kanban','칸반'],['line','한 줄'],['matrix','등장표'],['shelf','보관']],mode,k=>{UIP.tlMode=k;saveUIP();renderAll()}),
    U2()?h('span',{class:'sp'}):null,
    kindFilterBtn(),
    ...(mode==='matrix'?[h('span',{class:'muted'},'표시'),seg([['c','인물만'],['cs','인물 + 설정']],UIP.mxSet?'cs':'c',k=>{UIP.mxSet=k==='cs';saveUIP();renderAll()})]:(()=>{const tc=UI.tlChar!=='all'&&charById(UI.tlChar);if(UI.tlChar!=='all'&&!tc)UI.tlChar='all';return tc?[chip('인물: '+tc.name+'  ✕',true,()=>{UI.tlChar='all';renderAll()},tc.color)]:[]})()),
    U2()?null:h('span',{class:'sp'}),
    U2()?tlRangeSel():h('span',{class:'muted'},!sc?`전체 ${E.length}화`:(sc.e!==undefined?`${sc.e+1}화`:grpLab(lo,hi))),
    mode==='kanban'?(U2()?(()=>{const b=h('button',{class:'cbtn','data-pop':'1',title:'열 너비',onclick:()=>popMenu(b,[{title:'열 너비'},{node:h('div',{class:'popsl'},slider('tlw',200,480,''))}])},icon('xcol'));return b})():slider('tlw',200,480,'열 너비')):null,
    h('button',{class:'quiet',onclick:()=>addEpisode()},U2()?icon('plus'):null,U2()?'화':'＋ 화')));
  if(mode==='matrix')return renderMatrix(m,lo,hi);
  if(mode==='shelf')return renderShelf(m);
  const gps=tlGroups(),useG=gps.length>1&&(UIP.gs===undefined?10:UIP.gs)>0;
  if(useG&&!U2()){      // 위에 한 줄 (새 디자인에서는 위쪽 바의 “범위” 드롭다운으로): 전체 보기 / 묶음별 보기 — 묶음을 누르면 그 묶음의 화만 보고(다른 묶음은 접힘), 전체를 누르면 모든 화를 다 봄
    m.append(h('div',{class:'tlgrow'},
      h('button',{class:'tlgb'+(!sc?' on':''),title:'모든 화 보기',onclick:()=>{UI.tlScope=null;saveUIP();renderAll()}},'전체',h('small',{},E.length)),
      ...gps.map(([a,b],gi)=>{const on=!!sc&&sc.g===gi,cnt=E.slice(a,b).reduce((x,e)=>x+e.cardIds.length,0);
        return h('button',{class:'tlgb'+(on?' on':''),title:'이 묶음의 화만 보기',onclick:()=>{gps.forEach((_,k)=>{UIP.tg[k]=true});UIP.tg[gi]=false;UI.tlScope={g:gi};saveUIP();renderAll()}},grpLab(a,b),cnt?h('small',{},cnt):null)})));
  }
  const shown=()=>true;      // 전체 보기는 말 그대로 전체 (왼쪽 목록에서 접은 묶음과 상관없음)
  if(TLIO)TLIO.disconnect();
  const LAZY=E.slice(lo,hi).reduce((x,e)=>x+e.cardIds.length,0)>150;
  TLIO=new IntersectionObserver(es=>es.forEach(en=>{if(!en.isIntersecting)return;const b=en.target;TLIO.unobserve(b);if(b._fill){b._fill();b._fill=null;fitAll(b);hlLayoutAll(b)}}),{rootMargin:'500px'});
  // 한 화의 머리(제목·메모)와 카드 목록: 칸반과 한 줄 모드가 같이 씀
  const build=(ep,idx)=>{
    const body=h('div',{class:'tlbody'});
    const cards=ep.cardIds.map(cardById).filter(Boolean).filter(kindOk).filter(c=>UI.tlChar==='all'||eff(c).includes(UI.tlChar));
    if(LAZY&&cards.length){      // 카드가 많으면 화면에 보일 때 채움
      body.style.minHeight=Math.min(cards.length*74,1600)+'px';
      body._fill=()=>{body.style.minHeight='';cards.forEach(c=>body.append(kcard(c,'tl',{epId:ep.id})))};TLIO.observe(body);
    }else cards.forEach(c=>body.append(kcard(c,'tl',{epId:ep.id})));
    if(!cards.length)body.append(h('div',{class:'tlhint'},UI.tlChar==='all'?'오른쪽 카드를 끌어다 놓기':'이 인물의 카드가 없어요'));
    body.addEventListener('dragover',e=>{if(DRAG){e.preventDefault();body.classList.add('over');ghostByY(body,e.clientY)}});
    body.addEventListener('dragleave',e=>{if(!body.contains(e.relatedTarget)){body.classList.remove('over');ghostClearSoon()}});
    body.addEventListener('drop',e=>{e.preventDefault();body.classList.remove('over');if(DRAG){const id=DRAG.id,nb=ghostBeforeId(body);DRAG=null;placeCard(id,ep.id,nb)}});
    const folded=!!(UIP.tef&&UIP.tef[ep.id]);
    const fold=mode==='line'?h('button',{class:'cbtn foldb',title:folded?'펴기':'접기',onclick:()=>{UIP.tef=UIP.tef||{};UIP.tef[ep.id]=!folded;saveUIP();renderMid()}},folded?'▸':'▾'):null;
    const cnt=h('small',{class:'epcnt',title:'카드 수 · 공백 빼고 글자 수'},cntLabel(cards.map(c=>c.id),cards.length));
    return [h('div',{class:'tlhead'},fold,h('b',{},`${idx+1}화`),h('input',{value:ep.title,placeholder:'제목',oninput:e=>edit(()=>ep.title=e.target.value)}),cnt,
        ep.cardIds.length?h('button',{class:'cbtn tlcopy',title:'이 화의 글을 원고로 이어 붙여서 복사',onclick:()=>copyEpisodeText(idx)},icon('copy')):null,
        (()=>{const b=h('button',{class:'cbtn epmenu','data-pop':'1',title:'화 순서 옮기기 · 합치기 · 카드 모두 보내기',onclick:()=>epMenu(b,idx)},icon('more'));return b})(),
        h('button',{class:'x',title:'화 삭제 (카드는 목록으로 돌아가요)',onclick:async()=>{if(ep.cardIds.length&&!await askConfirm(`${idx+1}화를 지울까요? 카드 ${ep.cardIds.length}장은 미배치로 돌아가요.`))return;act(()=>{S.episodes=S.episodes.filter(x=>x!==ep);if(!S.episodes.length)S.episodes.push(newEp());UI.tlScope=null})}},'✕')),
      h('textarea',{class:'tlmemo autofit',rows:1,placeholder:'한 줄 메모',oninput:e=>{edit(()=>ep.memo=e.target.value);fitOne(e.target)}},ep.memo),body];
  };
  if(mode==='line'){      // 한 줄: 세로로 쭉 이어짐 (오른쪽 사이드바를 넓게 씀)
    const inner=h('div',{class:'tllinein'});
    E.slice(lo,hi).forEach((ep,j)=>{if(!shown(lo+j))return;
      const idx=lo+j,folded=!!(UIP.tef&&UIP.tef[ep.id]),parts=build(ep,idx),n=ep.cardIds.map(cardById).filter(Boolean).filter(kindOk).filter(c=>UI.tlChar==='all'||eff(c).includes(UI.tlChar)).length;
      inner.append(h('div',{class:'tlseg','data-ep':idx},
        h('button',{class:'rbadge',title:folded?'눌러서 펴기':'눌러서 접기',onclick:()=>{UIP.tef=UIP.tef||{};UIP.tef[ep.id]=!folded;saveUIP();renderMid()}},idx+1),
        (()=>{const bx=h('div',{class:'tlbox'+(folded?' folded':'')+(!n&&!(ep.memo||'').trim()?' emptyep':'')},...parts);bindColDrop(bx,parts[parts.length-1],(id,nb)=>placeCard(id,ep.id,nb));return bx})()))});
    inner.append(h('div',{class:'addcol',style:'flex:none;width:100%',onclick:()=>addEpisode()},'＋ 화 추가'));
    const tll=h('div',{class:'tlline'},inner);bindPanScroll(tll);m.append(tll);return;
  }
  const cols=h('div',{class:'tlcols'});
  // 칸반 휠: 세로로만 도는 휠은 빈 곳에서 좌우 이동 (부드럽게) · 길어서 스크롤되는 화 칸 위에서는 그 칸이 위아래로 (⌥ / ⇧ 휠은 어디서든 좌우) · 좌우 성분이 있는 스크롤(트랙패드)은 그대로
  {let tgt=null,raf=0;
   const step=()=>{raf=0;const d=tgt-cols.scrollLeft;if(Math.abs(d)<.6){cols.scrollLeft=tgt;tgt=null;return}cols.scrollLeft+=d*.28;raf=requestAnimationFrame(step)};
   cols.addEventListener('wheel',e=>{
     if(e.ctrlKey||e.metaKey)return;
     const ax=Math.abs(e.deltaX),ay=Math.abs(e.deltaY);if(ax>ay*.5&&ax>0)return;      // 좌우 성분이 있으면 브라우저 기본 이동
     if(!ay)return;
     const body=e.target.closest&&e.target.closest('.tlbody');
     if(body&&body.scrollHeight>body.clientHeight+1&&!e.altKey&&!e.shiftKey){const down=e.deltaY>0;if(down?body.scrollTop<body.scrollHeight-body.clientHeight-1:body.scrollTop>0)return}      // 길어서 스크롤되는 화 칸 위에서는 그 칸이 위아래로
     e.preventDefault();
     const d=e.deltaMode===1?e.deltaY*40:e.deltaY,max=cols.scrollWidth-cols.clientWidth;
     if(!tgt)tgt=cols.scrollLeft;tgt=Math.max(0,Math.min(max,tgt+d));
     if(!raf)raf=requestAnimationFrame(step);
   },{passive:false});
   cols.addEventListener('pointerdown',()=>{tgt=null});}
  E.slice(lo,hi).forEach((ep,j)=>{if(shown(lo+j)){const parts=build(ep,lo+j),col=h('div',{class:'tlcol','data-ep':lo+j},...parts);bindColDrop(col,parts[parts.length-1],(id,nb)=>placeCard(id,ep.id,nb));cols.append(col)}});
  cols.append(h('div',{class:'addcol',onclick:()=>addEpisode()},'＋ 화 추가'));
  bindPanScroll(cols);m.append(cols);
  tlCues(cols);
}

registerMidView({id:'timeline',order:90,match:()=>true,appClass:()=>UI.mode==='tl'?'m-tl2':'m-tl',render:renderTimeline});      // 나머지: 타임라인
