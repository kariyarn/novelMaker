/* ---------- 갈래: 비슷한 카드를 따로 두지 않고 한 카드의 갈래로 모아서, 한 줄 보기에서 나란히 비교 ----------
   본선은 카드 자신(card.text …), 갈래는 card.branches=[{id,text,stars,chars,offChars,created,updated,note}]
   갈래는 지우기 전까지 남음: 이걸로(본선과 자리 바꾸기) · 합치기(합친 글이 본선, 원래 본선은 갈래로) · 떼어내기(오른쪽 목록으로) · ✕(휴지통)
   원고 복사 · 내보내기 · 검색은 본선만 봄 */
let BRDRAG=null;      // 끌고 있는 갈래 {card,bid} — 카드 끌기(DRAG)와 따로 두어서 화 · 보관 칸 · 보드에는 놓이지 않게
const brs=c=>c&&Array.isArray(c.branches)?c.branches:[];
const BR_F=['text','stars','chars','offChars','created','updated'];
const brCopy=(from,to)=>{BR_F.forEach(k=>{const v=from[k];if(v!==undefined)to[k]=Array.isArray(v)?v.slice():v});return to};
const brSnap=c=>brCopy(c,{id:uid()});
const brOn=()=>UIP.tlBr!==false;      // 한 줄 보기에서 갈래 펼치기 (기본 켬)
const brFolded=id=>!!(UIP.brf&&UIP.brf[id]);
const brPrune=c=>{if(c&&Array.isArray(c.branches)&&!c.branches.length)delete c.branches};
const brFind=(id,bid)=>{const c=cardById(id),b=brs(c).find(x=>x.id===bid);return c&&b?{c,b}:null};
/* 갈래 → 따로 된 카드 (떼어내기 · 휴지통): 분류 · 색은 본선 카드를 따름 */
function brToCard(c,b){
  const n=newCard(c.kind,b.text||'');n.stars=b.stars||0;n.chars=(b.chars||[]).slice();n.offChars=(b.offChars||[]).slice();
  n.created=b.created||Date.now();if(b.updated)n.updated=b.updated;if(c.color)n.color=c.color;autoLinkCard(n);return n;
}
/* 갈래에 보이는 인물: 직접 연결 + 글에 이름이 있는 인물 (뺀 인물 제외) */
function brChars(b){
  const tx=(b.text||'').toLowerCase(),off=b.offChars||[],ids=[...(b.chars||[])];
  S.characters.forEach(c=>{if(!ids.includes(c.id)&&!off.includes(c.id)&&terms(c).some(t=>tx.includes(t)))ids.push(c.id)});
  return ids.filter(id=>charById(id));
}
/* 갈래가 있는 타임라인 카드 (화 순서) */
const brWide=()=>!U3()&&lineMode()&&brOn()&&brPlaced().some(id=>!brFolded(id));      // 펼친 갈래가 있음 → 한 줄 보기 폭을 넓힘 (render.js lineR)
function brPlaced(){const [lo,hi]=tlRange(),out=[];S.episodes.slice(lo,hi).forEach(e=>e.cardIds.forEach(id=>{const c=cardById(id);if(c&&brs(c).length&&kindOk(c))out.push(id)}));return out}

/* 그 카드의 갈래를 펼쳐서 보여 줌: 타임라인 · 한 줄 · 갈래 켬 · 접힌 화 · 접은 갈래 펴기 */
function brShow(id,then){
  if(U3())return frMap(id,{editLast:!!then});      // 새단장: 갈래는 원고에 펼치지 않고 갈래 지도에서
  const pl=episodeOf(id);if(!pl)return toast('타임라인 화에 놓은 카드만 갈래를 펼쳐 볼 수 있어요');
  UIP.tlMode='line';UIP.tlBr=true;if(UIP.brf)delete UIP.brf[id];if(UIP.tef)UIP.tef[pl.ep.id]=false;
  const [lo,hi]=tlRange();if(pl.i<lo||pl.i>=hi)UI.tlScope=null;
  saveUIP();if(UI.mode!=='tl')goMode('tl');else renderAll();
  brFocus(id,then);
}
function brFocus(id,then){if(U3())return;requestAnimationFrame(()=>{
  const f=document.querySelector(`#mid .brfork[data-id="${id}"]`)||document.querySelector(`#mid .kcard[data-id="${id}"]`);if(!f)return;
  f.scrollIntoView({block:'center',behavior:'smooth'});f.querySelectorAll('.kcard').forEach(flashEl);if(f.classList.contains('kcard'))flashEl(f);
  if(then)then(f);
})}
function brEditLast(id){brShow(id,f=>{const l=[...f.querySelectorAll('.brcard')].pop();if(l)setTimeout(()=>enterEditList(l),380)})}
/* 갈래 배지: 갈래를 펼친 한 줄 보기에서는 접기 · 펴기, 그 밖에서는 펼쳐서 보여 주기 */
function brBadge(card,opt){
  const n=brs(card).length;if(!n)return null;
  if(U3()){const live=brs(card).filter(b=>!b.discarded).length;      // 새단장: 폐기한 갈래는 빼고 세고, 누르면 갈래 지도
    return h('button',{class:'brbadge frbr',title:`갈래 ${n}개${live<n?` (폐기 ${n-live})`:''} — 눌러서 갈래 지도 열기`,onclick:e=>{e.stopPropagation();frMap(card.id)}},'⑂ '+(live||'·'))}
  const here=lineMode()&&brOn()&&opt&&opt.epId,folded=brFolded(card.id);
  return h('button',{class:'brbadge'+(here&&!folded?' on':''),title:here?(folded?`갈래 ${n}개 펴기`:'갈래 접기 (본선만 보이게)'):`갈래 ${n}개 — 눌러서 한 줄 보기에서 펼쳐 보기`,
    onclick:e=>{e.stopPropagation();if(!here)return brShow(card.id);UIP.brf=UIP.brf||{};if(folded)delete UIP.brf[card.id];else UIP.brf[card.id]=true;saveUIP();applyLayout();renderMid();if(folded)brFocus(card.id)}},'⑂'+(n+1));
}

/* ---- 갈래 다루기 (모두 되돌리기 가능) ---- */
function brMake(id){      // 지금 글을 복사해서 갈래를 땀
  const c=cardById(id);if(!c)return;
  act(()=>{const b=brSnap(c);b.created=b.updated=Date.now();(c.branches=brs(c)).push(b)});
  brEditLast(id);
}
function brAbsorb(fromId,toId){      // 카드를 다른 카드의 갈래로 넣음 (그 카드가 가진 갈래도 같이)
  const f=cardById(fromId),t=cardById(toId);if(!f||!t||f===t)return;
  if(U3())UI.stkId=toId;      // 새단장: 그려질 때 카드 밑으로 한 장 겹쳐 들어가는 효과
  act(()=>{const b=brSnap(f);(t.branches=brs(t)).push(b,...brs(f));
    S.cards=S.cards.filter(x=>x!==f);detach([fromId]);S.links=S.links.filter(l=>l.a!==fromId&&l.b!==fromId)});
  if(SELCARD===fromId)SELCARD=null;MSEL.delete(fromId);
  if(U3()){toast('갈래로 넣었어요 · ⑂ 표시를 누르면 갈래 지도가 열려요',{undo:true});return}      // 새단장: 카드 밑으로 한 장 겹쳐 들어가는 것만 보여 줌
  brShow(toId);toast('갈래로 넣었어요 · 잘못 넣었으면 ↩ 떼어내기',{undo:true});
}
function brKeep(id,bid){      // 이 갈래를 본선으로: 자리만 바꾸고 원래 본선은 같은 자리의 갈래로 남김
  act(()=>{const x=brFind(id,bid);if(!x)return;const {c,b}=x,L=c.branches,old=brSnap(c);old.note='이전 본선';
    brCopy(b,c);c.chars=c.chars||[];c.offChars=c.offChars||[];L[L.indexOf(b)]=old;stamp(c);autoLinkCard(c)});
  brFocus(id);toast('이 갈래를 본선으로 올렸어요 · 원래 본선은 갈래로 남겨 뒀어요',{undo:true});
}
function brDetach(id,bid){      // 떼어내기: 따로 된 카드로 오른쪽 목록 맨 위에
  let n=null;
  act(()=>{const x=brFind(id,bid);if(!x)return;const {c,b}=x;c.branches=c.branches.filter(y=>y!==b);brPrune(c);
    n=brToCard(c,b);S.cards.unshift(n);(UI.pnew=UI.pnew||new Set()).add(n.id)});
  if(n){setTimeout(()=>revealCard(n.id),0);toast('갈래를 떼어서 오른쪽 목록에 돌려놨어요',{undo:true})}
}
function brMove(id,bid,toId){      // 다른 카드의 갈래로 옮기기
  if(id===toId)return;
  act(()=>{const x=brFind(id,bid),t=cardById(toId);if(!x||!t)return;const {c,b}=x;c.branches=c.branches.filter(y=>y!==b);brPrune(c);delete b.note;(t.branches=brs(t)).push(b)});
  brShow(toId);toast('다른 카드의 갈래로 옮겼어요',{undo:true});
}
function brDel(id,bid){      // ✕: 이 갈래만 휴지통으로 (휴지통에서 되살리면 따로 된 카드로 돌아옴)
  act(()=>{const x=brFind(id,bid);if(!x)return;const {c,b}=x;c.branches=c.branches.filter(y=>y!==b);brPrune(c);
    if((b.text||'').trim())S.trash.push({id:uid(),type:'card',data:brToCard(c,b),at:Date.now()})});
  toast('갈래를 휴지통으로 보냈어요',{undo:true});
}
/* 합치기: 본선과 갈래를 문장 단위로 나란히 놓고, 문장을 눌러 합친 글에 끼워 넣음. 확정하면 합친 글이 본선, 원래 본선 · 갈래는 갈래로 남음 */
const brSplit=t=>String(t||'').split(/\n+|(?<=[.!?…][”"’'」』)]?)\s+/).map(s=>s.trim()).filter(Boolean);
function brMerge(id,bid){
  const x=brFind(id,bid);if(!x)return;const {c,b}=x;
  const ta=h('textarea',{class:'brmt',spellcheck:false},c.text||'');
  const ins=s=>{const a=ta.selectionStart,e=ta.selectionEnd,v=ta.value,pre=v.slice(0,a),sep=pre&&!/\s$/.test(pre)?' ':'';ta.value=pre+sep+s+v.slice(e);const p=(pre+sep+s).length;ta.focus();ta.setSelectionRange(p,p)};
  const col=(lab,cls,t)=>h('div',{class:'brmcol'},h('div',{class:'brmh'},h('span',{class:cls},lab)),...brSplit(t).map(s=>h('button',{class:'brms',title:'눌러서 합친 글의 커서 자리에 넣기',onclick:e=>{ins(s);e.currentTarget.classList.add('used')}},s)));
  const chars=[...new Set([...eff(c),...brChars(b)])].map(charById).filter(Boolean),stars=Math.max(c.stars||0,b.stars||0);
  const o=h('div',{class:'dlg brmerge',role:'dialog','aria-modal':'true'});
  const close=()=>{o.remove();document.removeEventListener('keydown',key,true)};
  const key=e=>{if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();close()}};
  const ok=()=>{const t=ta.value.trim();close();
    act(()=>{const y=brFind(id,bid);if(!y)return;const {c,b}=y;
      if(t&&t!==(c.text||'').trim()){const old=brSnap(c);old.note='이전 본선';c.branches.unshift(old);c.text=t}
      brChars(b).forEach(cid=>{if(!eff(c).includes(cid)&&!c.chars.includes(cid))c.chars.push(cid)});c.offChars=c.offChars.filter(cid=>!c.chars.includes(cid));
      c.stars=Math.max(c.stars||0,b.stars||0);stamp(c);autoLinkCard(c)});
    brFocus(id);toast('합친 글을 본선으로 · 원래 본선과 갈래는 그대로 남겨 뒀어요',{undo:true})};
  o.append(h('div',{class:'dlgbox brmbox'},
    h('div',{class:'brmt0'},'갈래 합치기'),
    h('div',{class:'muted'},'갈래 쪽 문장을 누르면 아래 합친 글의 커서 자리에 들어가요. 확정하면 합친 글이 본선이 되고, 원래 본선과 갈래는 갈래로 그대로 남아요.'),
    h('div',{class:'brmcols'},col('본선','brlbl main',c.text),col(`갈래 ${c.branches.indexOf(b)+2}`,'brlbl',b.text)),
    h('div',{class:'brmh'},'합친 글 (본선이 돼요)'),ta,
    h('div',{class:'brmmeta muted'},'인물 연결: ',...chars.map(ch=>h('span',{class:'kchip',style:`--cc:${ch.color}`},ch.name)),` · 별점은 큰 쪽 ${'★'.repeat(stars)||'없음'}`),
    h('div',{class:'dlgrow'},h('button',{onclick:close},'취소'),h('button',{class:'on',onclick:ok},'합쳐서 본선으로'))));
  o.addEventListener('mousedown',e=>{if(e.target===o)close()});
  document.addEventListener('keydown',key,true);document.body.append(o);
  ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);
}

/* ---- 그리기 ---- */
function brCard(card,b,i){
  const el=h('div',{class:'kcard tl brcard','data-bid':b.id,'data-stars':b.stars||0,style:`--kc0:${cardColor(card)}`});
  const ta=h('textarea',{class:'ktext autofit',rows:1,readonly:true,placeholder:'더블클릭해서 쓰기',
    oninput:e=>{edit(()=>{b.text=e.target.value;b.updated=Date.now()});fitOne(e.target)}},b.text||'');
  const mir=h('div',{class:'kmir','aria-hidden':'true'});hlFill(mir,b.text||'');
  const wrap=h('div',{class:'kwrap'},h('div',{class:'kblk'},h('div',{class:'kbi'})),mir,ta);
  ta.addEventListener('input',()=>{hlFill(mir,ta.value);hlBlocks(wrap)});
  ta.addEventListener('blur',()=>{el.classList.remove('editing');el.draggable=true;ta.readOnly=true});
  const foot=()=>h('div',{class:'kfoot'},...brChars(b).map(id=>{const ch=charById(id);return h('span',{class:'kchip'+((b.chars||[]).includes(id)?'':' auto'),style:`--cc:${ch.color}`},ch.name)}));
  ta.addEventListener('change',()=>{const f=el.querySelector('.kfoot');if(f)f.replaceWith(foot())});      // 글을 다 고치면 이름 자동 연결을 다시
  const st=h('span',{class:'stars',title:'쓰고 싶은 정도 (다시 누르면 해제)'},...[1,2,3].map(n=>h('span',{onclick:()=>act(()=>{const y=brFind(card.id,b.id);if(y)y.b.stars=y.b.stars===n?0:n})},(b.stars||0)>=n?'★':'☆')));
  el.append(
    h('div',{class:'khead'},h('span',{class:'grip',title:'끌어서 오른쪽 목록에 놓으면 떼어내기 · 다른 카드 가운데에 놓으면 그 카드의 갈래로'},'⠿'),
      h('span',{class:'brlbl'},`갈래 ${i+2}`+(b.note?' · '+b.note:'')),st,h('span',{class:'sp'}),
      h('button',{class:'x',title:'이 갈래만 휴지통으로',onclick:()=>brDel(card.id,b.id)},'✕')),
    wrap,foot(),
    h('div',{class:'brtools'},
      h('button',{class:'brkeep',title:'이 갈래를 본선으로 · 원래 본선은 갈래로 남아요',onclick:()=>brKeep(card.id,b.id)},'이걸로'),
      h('button',{title:'본선과 나란히 놓고 합치기',onclick:()=>brMerge(card.id,b.id)},'합치기'),
      h('button',{title:'잘못 넣은 갈래를 따로 된 카드로 오른쪽 목록에 돌려놓기 (끌어서 목록이나 다른 카드에 놓아도 돼요)',onclick:()=>brDetach(card.id,b.id)},'↩ 떼어내기')));
  el.draggable=true;
  el.addEventListener('dragstart',e=>{if(e.target!==el)return;BRDRAG={card:card.id,bid:b.id};e.dataTransfer.setData('text/plain',b.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setDragImage(el,12,12);
    setTimeout(()=>{el.classList.add('dragging');document.body.classList.add('brdragging');brBackHint(true)})});
  el.addEventListener('dragend',()=>{BRDRAG=null;el.classList.remove('dragging');document.body.classList.remove('brdragging');brBackHint(false);document.querySelectorAll('.brdrop').forEach(x=>x.classList.remove('brdrop'))});
  el.addEventListener('dblclick',e=>{if(e.target.closest('button,.stars'))return;enterEditList(el)});
  return el;
}
/* 갈래를 끄는 동안 오른쪽 목록 위에 “여기 놓으면 떼어내기” 칸 */
function brBackHint(on){
  document.querySelectorAll('.brback').forEach(x=>x.remove());
  const l=document.querySelector('#pool .plist');if(!on||!l)return;
  const hb=h('div',{class:'brback'},'↩ 여기 놓으면 갈래를 떼어서 따로 된 카드로 돌려놔요');
  hb.addEventListener('dragover',e=>{if(BRDRAG){e.preventDefault();hb.classList.add('over')}});
  hb.addEventListener('dragleave',()=>hb.classList.remove('over'));
  hb.addEventListener('drop',e=>{if(!BRDRAG)return;e.preventDefault();brDropPool()});
  l.before(hb);
}
function brDropPool(){const d=BRDRAG;BRDRAG=null;document.body.classList.remove('brdragging');brBackHint(false);if(d)brDetach(d.card,d.bid)}
/* 한 줄 보기 + 갈래 켬: 본선 | 갈래들 (가지 선으로 이음). 접어 둔 카드는 본선만 */
function brFork(card,opt){
  const main=kcard(card,'tl',opt),L=brs(card),folded=brFolded(card.id);
  const hd=main.querySelector('.khead');if(hd&&!folded)hd.insertBefore(h('span',{class:'brlbl main'},'본선'),hd.querySelector('.sp'));
  return h('div',{class:'brfork'+(folded?' folded':''),'data-id':card.id},h('div',{class:'brmain'},main),
    folded?null:h('div',{class:'brlanes'},...L.map((b,i)=>h('div',{class:'brlane'},brCard(card,b,i)))));
}
/* 타임라인 카드 위에 끌어 왔을 때: 가운데에 놓으면 갈래로 (위 · 아래 가장자리는 원래대로 앞 · 뒤에 넣기). 갈래를 끌 때는 어디든 갈래로 */
function brDragOver(e,el,card,opt){
  const ok=(U3()||lineMode()&&brOn())&&opt.epId;      // 새단장: 칸반 · 한 줄 어디서든 카드 가운데에 놓으면 갈래로
  let hit=false;
  if(BRDRAG)hit=ok&&BRDRAG.card!==card.id;
  else if(DRAG&&ok&&DRAG.id!==card.id){const r=el.getBoundingClientRect(),m=Math.min(r.height*.28,26);hit=e.clientY>r.top+m&&e.clientY<r.bottom-m}
  el.classList.toggle('brdrop',hit);
  if(hit){e.preventDefault();e.stopPropagation();el.classList.remove('drop-before','drop-after');ghostClear()}
  return hit||!!BRDRAG;      // 갈래를 끄는 중이면 앞 · 뒤 넣기는 하지 않음
}
function brDrop(e,el,card){
  if(!el.classList.contains('brdrop'))return !!BRDRAG;
  e.preventDefault();e.stopPropagation();el.classList.remove('brdrop');
  if(BRDRAG){const d=BRDRAG;BRDRAG=null;document.body.classList.remove('brdragging');brBackHint(false);brMove(d.card,d.bid,card.id)}
  else if(DRAG){const id=DRAG.id;DRAG=null;brAbsorb(id,card.id)}
  return true;
}
/* 위쪽 바: ⑂ 갈래 켜기 · 끄기 + 갈래 있는 곳 차례로 */
let BRNEXT=0;
function brBar(){
  const ids=brPlaced(),on=brOn();
  return [h('button',{class:'brtog'+(on?' on':''),title:on?'갈래 접기 (본선만 보이게)':'갈래 펼치기 — 비슷한 카드를 한 카드의 갈래로 모아 나란히 비교',onclick:()=>{UIP.tlBr=!on;saveUIP();applyLayout();renderMid()}},'⑂ 갈래',ids.length?h('small',{},ids.length):null),
    on&&ids.length?h('button',{class:'quiet brnext',title:'갈래가 있는 카드로 차례로 이동',onclick:()=>{const l=brPlaced();if(l.length)brFocus(l[BRNEXT++%l.length])}},'갈래 있는 곳 ›'):null];
}
