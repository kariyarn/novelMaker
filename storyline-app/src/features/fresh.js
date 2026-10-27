/* ============ 새단장: 정리 전은 노란 포스트잇, 정리된 타임라인은 하얀 색인 카드 · 원고 ============
   설정 → 겉모습 → 화면 디자인 → 새단장 일 때만 씀 (U3). 데이터는 그대로 두고 그리는 방법만 바꿈.
   - 칸반: 상자 없는 화 레인 + 색인 카드 (인물은 첫 글자 동그라미, 도구는 마우스를 올릴 때만)
   - 한 줄: 원고 한 장 (화 = 장, 카드 = 문단) · 글 폭 · 글자 크기 · 문단을 두 번 누르면 집중
   - 갈래: 원고엔 겹친 종이 + ⑂ 표시만, 누르면 갈래 지도 (양쪽 · 오른쪽 · 아래로 · 둘레)
   - 창이 좁으면(13인치) 타임라인 화 목록 · 인물 시트를 저절로 접음 (직접 열고 닫으면 그 선택이 우선) */
const FR_NARROW=1500;
const frLive=c=>brs(c).filter(b=>!b.discarded);
/* 인물 첫 글자: 세 글자 이름은 성을 빼고 (이도윤 → 도) */
const frInitial=n=>{n=String(n||'').trim();return /^[가-힣]{3}$/.test(n)?n[1]:(n[0]||'?')};
function frCast(ids){
  return h('span',{class:'frcast'},...ids.map(charById).filter(Boolean).map(c=>h('i',{style:`--c:${c.color}`,title:c.name},frInitial(c.name))));
}
/* 타임라인 카드를 새단장 모양으로: kcard(…,'tl') 를 만든 뒤 덧붙임 */
function frCard(el,card,bar){
  el.classList.add('fr');
  if(kindOf(card.kind).id==='memo')el.classList.add('frmemo');
  const n=brs(card).length;if(n)el.classList.add(n>1?'stk2':'stk1');      // 갈래가 있으면 종이가 겹쳐 보임
  if(UI.landId===card.id){el.classList.add('land');setTimeout(()=>{if(UI.landId===card.id)UI.landId=null},1200)}
  if(UI.stkId===card.id){el.classList.add('stkin');setTimeout(()=>{if(UI.stkId===card.id)UI.stkId=null},900)}
  // 아래 줄: 인물 동그라미 + 갈래 표시 (원래 이름표 줄은 고르거나 고칠 때만 보임)
  const row=h('div',{class:'frrow'},frCast(eff(card)));
  const bb=bar.querySelector('.brbadge');if(bb)row.append(bb);
  el.insertBefore(row,el.querySelector('.kfoot'));
  // 도구: 휴지통 대신 ↩ 빼기 · 폐기
  const x=bar.querySelector(':scope>.x');
  const tools=[h('button',{class:'frbk',title:'오른쪽 목록으로 돌려놓기',onclick:e=>{e.stopPropagation();unplaceCard(card.id);toast('오른쪽 목록으로 돌려놨어요',{undo:true})}},'↩',h('span',{class:'frlb'},' 빼기')),
    h('button',{class:'frdc',title:'폐기 — 지우지 않고 치워 둬요 · 구상 보드 ▸ 폐기(⌥4)에서 되살릴 수 있어요',onclick:e=>{e.stopPropagation();frDiscard(card.id)}},'폐기')];
  if(x)x.replaceWith(...tools);else bar.append(...tools);
}
function frDiscard(id){
  const c=cardById(id);if(!c)return;
  const el=document.querySelector(`#mid .kcard[data-id="${id}"]`);
  const go=()=>{act(()=>{stamp(c);c.discarded=true;detach([id])});toast('폐기했어요 · 구상 보드 ▸ 폐기(⌥4)에서 되살릴 수 있어요',{undo:true})};
  if(el&&!matchMedia('(prefers-reduced-motion: reduce)').matches){el.classList.add('frout');setTimeout(go,380)}else go();      // 붉은 X가 그어지며 작아져 사라짐
}

/* ---------- 한 줄 보기: 원고 한 장 ---------- */
const frW=()=>UIP.frw||720,frFs=()=>UIP.frfs||16.5;
function frSetW(w){UIP.frw=Math.max(520,Math.min(1100,Math.round(w/10)*10));const s=document.querySelector('.frsheet');if(s)s.style.setProperty('--frw',UIP.frw+'px');const r=document.querySelector('#frwr');if(r)r.value=UIP.frw}
function frLineBar(){
  return [h('label',{class:'frwctl',title:'글 폭 — 원고 양옆을 끌어도 돼요'},'글 폭',h('input',{id:'frwr',type:'range',min:520,max:1100,step:10,value:frW(),oninput:e=>frSetW(+e.target.value),onchange:saveUIP})),
    h('span',{class:'frfsz',title:'글자 크기'},
      h('button',{class:'quiet','aria-label':'글자 작게',onclick:()=>{UIP.frfs=Math.max(14,frFs()-1);saveUIP();const s=document.querySelector('.frsheet');if(s)s.style.setProperty('--frfs',UIP.frfs+'px')}},'가'),
      h('button',{class:'quiet big','aria-label':'글자 크게',onclick:()=>{UIP.frfs=Math.min(22,frFs()+1);saveUIP();const s=document.querySelector('.frsheet');if(s)s.style.setProperty('--frfs',UIP.frfs+'px')}},'가'))];
}
function frRenderLine(m,E,lo,hi,build){
  const sheet=h('div',{class:'frsheet',style:`--frw:${frW()}px;--frfs:${frFs()}px`});
  ['l','r'].forEach(side=>{const g=h('span',{class:'freg '+side,title:'끌어서 글 폭 조절'});sheet.append(g);
    g.addEventListener('pointerdown',e=>{e.preventDefault();g.setPointerCapture(e.pointerId);g.classList.add('on');const x0=e.clientX,w0=frW(),dir=side==='r'?1:-1;
      const mv=ev=>frSetW(w0+dir*2*(ev.clientX-x0)),up=()=>{g.classList.remove('on');g.removeEventListener('pointermove',mv);g.removeEventListener('pointerup',up);saveUIP()};
      g.addEventListener('pointermove',mv);g.addEventListener('pointerup',up)})});
  const chapter=idx=>{const parts=build(E[idx],idx),ch=h('section',{class:'frch','data-ep':idx},...parts);bindColDrop(ch,parts[parts.length-1],(id,nb)=>placeCard(id,E[idx].id,nb));return ch};
  // 이어진 빈 화는 한 줄로 접어 둠 · 카드를 끌어 올리면 펼쳐짐
  UI.frOpenRun=UI.frOpenRun||{};
  let run=[];
  const flush=()=>{if(!run.length)return;const a=run[0],b=run[run.length-1],key=E[a].id,open=!!UI.frOpenRun[key];
    const box=h('div',{class:'frrun'+(open?' open':'')},
      h('button',{class:'frrunh',onclick:()=>{UI.frOpenRun[key]=!open;renderMid()}},`${a===b?a+1:(a+1)+'–'+(b+1)}화 · 아직 비어 있어요`,h('span',{},open?' ▾':' ▸')),
      ...run.map(chapter));
    box.addEventListener('dragenter',()=>{if(DRAG)box.classList.add('hov')});
    box.addEventListener('dragleave',e=>{if(!box.contains(e.relatedTarget))box.classList.remove('hov')});
    sheet.append(box);run=[]};
  for(let idx=lo;idx<hi;idx++){const ep=E[idx];
    if(!ep.cardIds.some(cardById)&&!(ep.title||'').trim()&&!(ep.memo||'').trim()){run.push(idx);continue}
    flush();sheet.append(chapter(idx))}
  flush();
  sheet.append(h('button',{class:'fradd',onclick:()=>addEpisode()},'＋ 화 추가'));
  const wrap=h('div',{class:'frline'},sheet);m.append(wrap);
}

/* ---------- 집중: 원고에서 문단을 두 번 누르면 그 카드 한 장만 크게 ---------- */
function frFocus(id){
  const c=cardById(id);if(!c)return;
  document.querySelector('.frfocus')?.remove();
  const pl=episodeOf(id),ta=h('textarea',{class:'frft','aria-label':'카드 글',spellcheck:false,oninput:e=>{edit(()=>{c.text=e.target.value;stamp(c)})}},c.text||'');
  const o=h('div',{class:'frfocus',role:'dialog','aria-modal':'true'},
    h('div',{class:'frfp'},h('div',{class:'frlb'},pl?`${pl.i+1}화${pl.ep.title?' · '+pl.ep.title:''}`:'카드'),ta,
      h('div',{class:'frff'},h('span',{},'쓰는 대로 저장돼요'),h('span',{},'Esc 또는 바깥을 눌러 닫기'))));
  const close=()=>{o.remove();document.removeEventListener('keydown',key,true);if(autoLinkCard(c))save();renderAll()};
  const key=e=>{if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();close()}};
  o.addEventListener('mousedown',e=>{if(e.target===o)close()});
  document.addEventListener('keydown',key,true);document.body.append(o);
  ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);
}

/* ---------- 갈래 지도: 집중 모드처럼 창을 띄우고, 가운데 본선 둘레에 갈래를 마인드맵처럼 ---------- */
let FRMAP=null;      // {id, sel(키보드로 고른 갈래 번호), editLast}
const FR_ML=[['both','양쪽'],['right','오른쪽'],['down','아래로'],['radial','둘레']];
function frMap(id,opt={}){
  if(!cardById(id))return;
  if(!episodeOf(id)&&UI.mode!=='tl')return toast('타임라인 화에 놓은 카드만 갈래 지도를 열 수 있어요');
  FRMAP={id,sel:-1,editLast:!!opt.editLast};frMapDraw(true);
}
function frMapClose(){const o=document.querySelector('.frmap');if(o)o.remove();FRMAP=null;document.removeEventListener('keydown',frMapKey,true)}
function frMapKey(e){
  if(!FRMAP||document.querySelector('.dlg')||e.isComposing)return;
  const a=document.activeElement;if(a&&a.tagName==='TEXTAREA'&&!a.readOnly){if(e.key==='Escape'){e.preventDefault();a.blur()}return}      // 고치는 중이면 Esc는 고치기만 끝냄
  const L=brs(cardById(FRMAP.id)||{});
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();frMapClose()}
  else if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();if(L.length){FRMAP.sel=(FRMAP.sel+1)%L.length;frMapDraw()}}
  else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();if(L.length){FRMAP.sel=(FRMAP.sel-1+L.length)%L.length;frMapDraw()}}
  else if(e.key==='Enter'&&FRMAP.sel>=0&&L[FRMAP.sel]){e.preventDefault();brKeep(FRMAP.id,L[FRMAP.sel].id)}
}
onStateChange(()=>{if(FRMAP)frMapDraw()});      // 되돌리기 · 다른 곳에서 고친 것도 지도에 바로
function frMapDraw(first){
  const c=FRMAP&&cardById(FRMAP.id);if(!c){frMapClose();return}
  let o=document.querySelector('.frmap');
  if(!o){o=h('div',{class:'frmap',role:'dialog','aria-modal':'true','aria-label':'갈래 지도'});document.body.append(o);document.addEventListener('keydown',frMapKey,true);
    o.addEventListener('mousedown',e=>{if(e.target===o||e.target.classList.contains('frlinks'))frMapClose()})}
  else if(first)o.classList.remove('quiet');
  if(!first)o.classList.add('quiet');
  o.innerHTML='';
  const L=brs(c),ml=UIP.frml||'both',pl=episodeOf(c.id);
  const W=innerWidth,H=innerHeight,nodes=[...L.map((b,j)=>({b,j})),{add:true}],N=nodes.length;
  let cx=W/2,cy=H/2+20;
  if(ml==='both'){const rx=Math.min(430,W*.3),gap=Math.min(230,(H-200)/Math.ceil(N/2)),R=[],Lf=[];nodes.forEach((n,k)=>(k%2?Lf:R).push(n));
    const put=(arr,side)=>arr.forEach((n,j)=>{n.x=cx+side*rx;n.y=cy+(j-(arr.length-1)/2)*gap;n.side=side});put(R,1);put(Lf,-1)}
  else if(ml==='right'){cx=W*.27;const gap=Math.min(190,(H-180)/N);nodes.forEach((n,j)=>{n.x=W*.68;n.y=cy+(j-(N-1)/2)*gap;n.side=1})}
  else if(ml==='down'){cy=Math.max(200,H*.26);const per=Math.min(N,4),gx=Math.min(320,(W-160)/per);nodes.forEach((n,j)=>{const r=Math.floor(j/per),k=j%per,cnt=Math.min(per,N-r*per);n.x=cx+(k-(cnt-1)/2)*gx;n.y=cy+250+r*220})}
  else{const rx=Math.min(470,W*.33),ry=Math.min(270,H*.33);nodes.forEach((n,j)=>{const a=-Math.PI/2+Math.PI*2*j/N+(N%2?0:Math.PI/N);n.x=cx+rx*Math.cos(a);n.y=cy+ry*Math.sin(a)})}
  const link=n=>{if(ml==='down'){const y1=cy+70,y2=n.y-80,my=(y1+y2)/2;return `M${cx} ${y1} C ${cx} ${my}, ${n.x} ${my}, ${n.x} ${y2}`}
    if(ml==='radial')return `M${cx} ${cy} L ${n.x} ${n.y}`;
    const x1=cx+n.side*170,x2=n.x-n.side*140,mx=(x1+x2)/2;return `M${x1} ${cy} C ${mx} ${cy}, ${mx} ${n.y}, ${x2} ${n.y}`};
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','frlinks');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  svg.innerHTML=nodes.map(n=>`<path d="${link(n)}" fill="none" stroke="var(--br)" stroke-width="1.5"${n.add||n.b&&n.b.discarded?' stroke-dasharray="4 5"':''} opacity="${n.add?.4:.55}"/>`).join('');
  // 글은 두 번 눌러 고침 (갈래 · 본선 모두)
  const txt=(val,save)=>{const ta=h('textarea',{class:'frnt autofit',rows:1,readonly:true,spellcheck:false,title:'두 번 눌러 고치기',oninput:e=>{edit(()=>save(e.target.value));fitOne(e.target)}},val||'');
    ta.addEventListener('dblclick',()=>{ta.readOnly=false;ta.focus()});ta.addEventListener('blur',()=>{ta.readOnly=true});return ta};
  const mainN=h('div',{class:'frn main',style:`left:${cx}px;top:${cy}px`},
    h('div',{class:'frtag'},'본선',h('span',{class:'st'},'★'.repeat(c.stars||0))),
    txt(c.text,v=>{c.text=v;stamp(c)}),frCast(eff(c)));
  const live=L.filter(b=>!b.discarded).length;
  o.append(h('header',{},h('b',{},'갈래 지도'),h('span',{},`${pl?`${pl.i+1}화${pl.ep.title?' · '+pl.ep.title:''} · `:''}갈래 ${live}개${live<L.length?` · 폐기 ${L.length-live}`:''}`),
      h('nav',{class:'frml'},...FR_ML.map(([k,n])=>h('button',{class:ml===k?'on':'',onclick:()=>{UIP.frml=k;saveUIP();frMapDraw()}},n))),
      h('button',{class:'frx',onclick:frMapClose},'닫기 · Esc')),
    svg,mainN,
    ...nodes.map(n=>{
      if(n.add)return h('button',{class:'frn add',style:`left:${n.x}px;top:${n.y}px`,onclick:()=>{act(()=>{const b=brSnap(c);b.created=b.updated=Date.now();(c.branches=brs(c)).push(b)});FRMAP.editLast=true;frMapDraw()}},'＋ 지금 본선을 복사해',h('br'),'새 갈래 쓰기');
      const {b,j}=n,off=!!b.discarded;
      return h('div',{class:'frn alt'+(off?' off':'')+(FRMAP.sel===j?' sel':''),style:`left:${n.x}px;top:${n.y}px`,'data-bid':b.id},
        h('div',{class:'frtag'},`갈래 ${j+1}`,h('small',{},(off?'폐기 · ':'')+(b.note||''))),
        txt(b.text,v=>{b.text=v;b.updated=Date.now()}),
        frCast(brChars(b)),
        h('div',{class:'fraa'},
          h('button',{class:'pick',title:'본선과 자리 바꾸기 · 원래 본선은 갈래로 남아요 (Enter)',onclick:()=>brKeep(c.id,b.id)},'이걸로'),
          h('button',{title:'문장을 골라 합친 글을 본선으로',onclick:()=>brMerge(c.id,b.id)},'합치기'),
          h('button',{title:'따로 된 카드로 오른쪽 목록에',onclick:()=>brDetach(c.id,b.id)},'↩ 떼어내기'),
          h('button',{class:'del',title:off?'폐기 취소':'폐기 — 지우지 않고 갈래로 남겨 두고 X만 표시해요',onclick:()=>{act(()=>{const y=brFind(c.id,b.id);if(!y)return;if(off)delete y.b.discarded;else y.b.discarded=true;y.b.updated=Date.now()});if(!off)toast('갈래를 폐기했어요 · 지도에 X로 남아 있어요',{undo:true})}},off?'되살리기':'폐기')))}),
    h('footer',{},'← → 갈래 고르기 · Enter 이걸로 · Esc 닫기 · 이걸로 · 합치기 해도 원래 본선은 갈래로 남아요'));
  fitAll(o);
  if(FRMAP.editLast){FRMAP.editLast=false;const t=[...o.querySelectorAll('.frn.alt .frnt')].pop();if(t){t.readOnly=false;t.focus();t.setSelectionRange(t.value.length,t.value.length)}}
}

/* ---------- 창 폭에 따라 저절로: 타임라인의 화 목록 ---------- */
/* 구상 인물 목록과 타임라인 화 목록은 같은 접기 값을 쓰므로, 새단장에서는 화면을 바꿀 때 따로 기억해 둠 */
function frLeftSwap(from,to){
  const kf=from==='tl'?'tl':'etc',kt=to==='tl'?'tl':'etc';if(kf===kt)return;
  UIP.frCl=UIP.frCl||{};UIP.frCl[kf]=!!UIP.cl.left;
  if(UIP.frCl[kt]!==undefined)UIP.cl.left=UIP.frCl[kt];
  if(kt==='tl'&&!UIP.frLeftUser)UIP.cl.left=innerWidth<FR_NARROW;
}
function frAutoLeft(){      // 직접 접거나 편 적이 없으면: 좁은 창에선 접고, 넓은 창에선 폄
  if(!U3()||UI.mode!=='tl'||UIP.frLeftUser)return false;
  const want=innerWidth<FR_NARROW;if(!!UIP.cl.left===want)return false;
  UIP.cl.left=want;return true;
}
