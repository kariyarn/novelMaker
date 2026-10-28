/* ============ 새단장: 정리 전은 노란 포스트잇, 정리된 타임라인은 하얀 색인 카드 · 원고 ============
   앱의 화면 디자인 (하나뿐). 데이터는 그대로 두고 그리는 방법만 바꿈.
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
const frSc=()=>['line','box'].includes(UIP.frsc)?UIP.frsc:'card';      // 한 줄 보기 모양: 원고(문단으로 이어짐) · 묶음(장면별 상자) · 카드(한 장씩 구분, 기본)
const frScCls=()=>({box:' scbox',card:' sccard'})[frSc()]||'';
function frSetW(w){UIP.frw=Math.max(520,Math.min(1100,Math.round(w/10)*10));const s=document.querySelector('.frsheet');if(s)s.style.setProperty('--frw',UIP.frw+'px');const r=document.querySelector('#frwr');if(r)r.value=UIP.frw}
function frLineBar(){
  return [h('span',{class:'frscm',title:'한 줄 보기 모양 — 원고: 문단으로 이어 읽기 · 묶음: 장면별 상자 · 카드: 한 장씩 구분'},segOld([['line','원고'],['box','묶음'],['card','카드']],frSc(),k=>{UIP.frsc=k;saveUIP();renderMid()})),
    h('button',{class:'cbtn frshtg'+(UIP.frshs?' on':''),title:UIP.frshs?'보관함 닫기':'보관함 열기 — 원고 옆에 나란히 두고 끌어 옮겨요',onclick:()=>{UIP.frshs=!UIP.frshs;saveUIP();renderMid()}},icon('shelfbox')),
    h('label',{class:'frwctl',title:'글 폭 — 원고 양옆을 끌어도 돼요'},'글 폭',h('input',{id:'frwr',type:'range',min:520,max:1100,step:10,value:frW(),oninput:e=>frSetW(+e.target.value),onchange:saveUIP})),
    h('span',{class:'frfsz',title:'글자 크기'},
      h('button',{class:'quiet','aria-label':'글자 작게',onclick:()=>{UIP.frfs=Math.max(14,frFs()-1);saveUIP();const s=document.querySelector('.frsheet');if(s)s.style.setProperty('--frfs',UIP.frfs+'px')}},'가'),
      h('button',{class:'quiet big','aria-label':'글자 크게',onclick:()=>{UIP.frfs=Math.min(22,frFs()+1);saveUIP();const s=document.querySelector('.frsheet');if(s)s.style.setProperty('--frfs',UIP.frfs+'px')}},'가'))];
}
function frRenderLine(m,E,lo,hi,build){
  const sheet=h('div',{class:'frsheet'+frScCls(),style:`--frw:${frW()}px;--frfs:${frFs()}px`});
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
  frPager(sheet);
  sheet.append(h('button',{class:'fradd',onclick:()=>addEpisode()},'＋ 화 추가'));
  if(UIP.frshs){      // 보관함을 원고 옆에 나란히 (따로 스크롤)
    const side=h('div',{class:'frsheet frshp'+frScCls(),style:`--frw:${frW()}px;--frfs:${frFs()}px`});frShelves(side,true);
    m.append(h('div',{class:'frline frside'},h('div',{class:'frlcol'},sheet),h('div',{class:'frlcol'},side)));return}
  if(!UI.tlScope)frShelves(sheet);      // 한 화 · 한 묶음만 볼 때는 원고 아래에 보관을 붙이지 않음 (위쪽 보관함 아이콘으로 열기)
  const wrap=h('div',{class:'frline'},sheet);m.append(wrap);
}

/* 한 화 · 한 묶음만 볼 때: 원고 끝에 이전 · 다음 */
function frPager(sheet){
  const sc=UI.tlScope,E=S.episodes;if(!sc)return;
  let prev=null,next=null;
  if(sc.e!==undefined){const go=i=>()=>{UI.tlScope={e:i};renderAll()};
    if(sc.e>0)prev=[`${sc.e}화`,go(sc.e-1)];if(sc.e<E.length-1)next=[`${sc.e+2}화`,go(sc.e+1)]}
  else if(sc.g!==undefined){const gps=tlGroups(),go=gi=>()=>{gps.forEach((_,k)=>{UIP.tg[k]=true});UIP.tg[gi]=false;UI.tlScope={g:gi};saveUIP();renderAll()};
    if(gps[sc.g-1])prev=[grpLab(...gps[sc.g-1]),go(sc.g-1)];if(gps[sc.g+1])next=[grpLab(...gps[sc.g+1]),go(sc.g+1)]}
  if(!prev&&!next)return;
  const b=(d,x)=>x?h('button',{class:'frpg '+d,onclick:x[1]},h('small',{},d==='prev'?'← 이전':'다음 →'),h('b',{},x[0])):h('span',{});
  sheet.append(h('nav',{class:'frpager'},b('prev',prev),b('next',next)));
}

/* 한 화 안의 장면 나누기: 이어지는 글과 따로 떨어진 장면을 구분 (ep.seps = 새 장면이 시작되는 카드 id) */
function frScenes(body,ep){
  const deco=()=>{
    const els=[...body.querySelectorAll(':scope>.kcard')],ids=els.map(e=>e.dataset.id),seps=new Set((ep.seps||[]).filter(id=>ids.indexOf(id)>0));
    body.classList.toggle('frhassc',!!seps.size);
    const setSeps=fn=>frSetSeps(ep,fn);
    els.forEach((el,i)=>{if(!i){el.classList.add('scfirst');return}
      if(seps.has(ids[i])){el.classList.add('scst');
        el.prepend(h('div',{class:'frsep',title:'장면 구분'},h('i',{}),h('button',{class:'frjoin',title:'구분 지우고 앞 장면과 잇기',onclick:e=>{e.stopPropagation();setSeps(a=>a.filter(x=>x!==ids[i]))}},'잇기')))}
      if(i===els.length-1||seps.has(ids[i+1]))el.classList.add('sclast')});
    if(els.length&&!els.slice(1).some(e=>e.classList.contains('scst')))els[els.length-1].classList.add('sclast');
  };
  if(body._fill){const f=body._fill;body._fill=()=>{f();deco()}}else deco();
}

function frSetSeps(ep,fn){act(()=>{ep.seps=fn((ep.seps||[]).filter(id=>ep.cardIds.includes(id)));if(!ep.seps.length)delete ep.seps})}

/* 문단 우클릭: 위 · 아래에 새 문단 / 장면 구분 넣기 · 지우기 / 다른 화로 */
function frCtx(ev,card,epId){
  const ep=S.episodes.find(e=>e.id===epId);if(!ep)return;
  const ids=ep.cardIds.filter(cardById),i=ids.indexOf(card.id),up=ids[i],down=ids[i+1],has=id=>(ep.seps||[]).includes(id);
  const add=at=>{const c=newCard(card.kind,'');
    act(()=>{S.cards.push(c);idxClear();ep.cardIds.splice(at,0,c.id)});
    requestAnimationFrame(()=>{const el=document.querySelector(`#mid .kcard[data-id="${c.id}"]`);if(el){el.scrollIntoView({block:'nearest'});enterEditList(el)}})};      // 비워 두고 나가면 저절로 지워짐
  const sepItem=(id,where)=>id&&ids.indexOf(id)>0?(has(id)?{label:`${where} 장면 구분 지우기`,fn:()=>frSetSeps(ep,a=>a.filter(x=>x!==id))}:{label:`${where}에 장면 구분 넣기`,fn:()=>frSetSeps(ep,a=>[...a,id])}):null;
  const items=[{label:'위에 새 문단',fn:()=>add(ep.cardIds.indexOf(card.id))},{label:'아래에 새 문단',fn:()=>add(ep.cardIds.indexOf(card.id)+1)},'sep',
    sepItem(up,'위'),sepItem(down,'아래'),'sep',
    {label:'다른 화로 옮기기…',fn:()=>setTimeout(()=>{const b=h('div',{style:`position:fixed;left:${cx}px;top:${cy}px;width:1px;height:1px`});document.body.append(b);msMenu(b,[card.id]);b.remove()},0)}].filter(Boolean);
  const cx=ev.clientX,cy=ev.clientY,a=h('div',{style:`position:fixed;left:${cx}px;top:${cy}px;width:1px;height:1px`});document.body.append(a);
  popMenu(a,items.filter((x,k,arr)=>!(x==='sep'&&(k===0||arr[k-1]==='sep'))));a.remove();
}

/* 원고 맨 아래: 보관 — 몇 화에 쓸지 아직 안 정한 장면 (보관 탭과 같은 칸) */
function frShelves(sheet,side){
  const shs=S.shelves||[],newShelf=async()=>{const name=((await askText('새 보관 칸 이름 (예: 30화 이후)','보관'))||'').trim();if(name)act(()=>S.shelves.push({id:uid(),name,cardIds:[]}))};
  if(!shs.length&&!side){sheet.append(h('button',{class:'fradd frshadd',onclick:newShelf},'＋ 보관 칸 · 몇 화에 쓸지 안 정한 장면'));return}
  sheet.append(h('div',{class:'frshdiv'},h('b',{},'보관'),h('span',{},'몇 화에 쓸지 아직 안 정한 장면'),side?h('button',{class:'cbtn frshx',title:'보관함 닫기',onclick:()=>{UIP.frshs=false;saveUIP();renderMid()}},'✕'):null));
  shs.forEach(sh=>{
    const cards=sh.cardIds.map(cardById).filter(Boolean).filter(kindOk);
    const body=h('div',{class:'tlbody'},...cards.map(c=>kcard(c,'tl',{shelfId:sh.id})));
    if(!cards.length)body.append(h('div',{class:'tlhint'},'원고의 문단이나 오른쪽 카드를 끌어다 놓기'));
    body.addEventListener('dragover',e=>{if(DRAG){e.preventDefault();body.classList.add('over');ghostByY(body,e.clientY)}});
    body.addEventListener('dragleave',e=>{if(!body.contains(e.relatedTarget)){body.classList.remove('over');ghostClearSoon()}});
    body.addEventListener('drop',e=>{e.preventDefault();body.classList.remove('over');if(DRAG){const id=DRAG.id,nb=ghostBeforeId(body);DRAG=null;shelfPlace(id,sh.id,nb)}});
    const send=cards.length?(()=>{const b=h('button',{class:'quiet frsend','data-pop':'1',title:'이 칸의 카드를 순서 그대로 한 화로 보내기',onclick:()=>shelfSendMenu(b,sh)},'화로 보내기 ▾');return b})():null;
    const head=h('div',{class:'tlhead'},h('b',{class:'frno'},'보관'),h('input',{value:sh.name,placeholder:'칸 이름',oninput:e=>edit(()=>sh.name=e.target.value)}),h('small',{class:'epcnt'},cntLabel(cards.map(c=>c.id),cards.length)),send);
    const sec=h('section',{class:'frch shelf','data-sh':sh.id},head,body);      // .shelf: 빈칸에 놓을 때 보관 칸으로 들어가게 (dragDrop.js)
    bindColDrop(sec,body,(id,nb)=>shelfPlace(id,sh.id,nb));sheet.append(sec)});
  sheet.append(h('button',{class:'fradd',onclick:newShelf},'＋ 보관 칸'));
}

/* ---------- 구상 보드 머리: 인물 소개 한 줄 (시트는 필요할 때만 펼침) ---------- */
function frProfile(c,n,hidden){
  const open=!UIP.cl.sheet,goal=(c.longGoal||'').trim(),isSet=c.kind==='setting';
  return h('div',{class:'bhead frprof'},
    h('div',{class:'frwho'},
      h('div',{class:'frnm'},h('b',{},c.name||'(이름 없음)'),c.role?h('small',{},c.role):null,
        h('span',{class:'fracts'},h('span',{class:'cnt'},`${n}장${hidden?` · 숨김 ${hidden}`:''}`),
          h('button',{class:'quiet frsht'+(open?' on':''),title:open?'인물 시트 접기':'인물 시트 펼치기 — 별칭 · 소개 · 목표 · 칸 묶음',onclick:()=>toggleCl('sheet')},open?'시트 접기':'시트 펼치기'))),
      open||!c.summary?null:h('p',{class:'frsum'},c.summary),
      open||isSet?null:h('p',{class:'frgoal',title:'눌러서 시트에서 목표 고치기',onclick:()=>slidePanel('sheet',false)},h('span',{},'목표'),goal||h('em',{},'아직 없어요 · 눌러서 적기'))));
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
  if(UI.mode!=='tl'||UIP.frLeftUser)return false;
  const want=innerWidth<FR_NARROW;if(!!UIP.cl.left===want)return false;
  UIP.cl.left=want;return true;
}

/* ============ 작게 보기 (데포르메): 구상 보드를 줄여 글이 안 읽힐 만큼 작아지면 포스트잇을 모양만 ============
   분류 색 종이 · 글 줄 · 인물 색 점 · 별(점 개수) · 핀 · 실은 그대로, 글만 지움.
   올리면 원래 크기 미리보기, 누르면 또렷한 원본(바로 고침), 두 번 누르면 그 자리로 확대.
   오른쪽 목록의 작은 아이콘도 같은 모양 (frIcon) */
const frDefPx=()=>{const v=S.settings.defPx;return v===undefined||v===null?8:+v};      // 0 이면 끔
const frBars=t=>Math.max(2,Math.min(4,Math.ceil(String(t||'').replace(/\s+/g,'').length/22)));
const frRot=id=>{let x=0;for(const ch of String(id))x=(x*31+ch.charCodeAt(0))>>>0;return [-6,4,-2,7,-4,3][x%6]};
function frDefLayer(card){      // 보드 포스트잇 안에 넣어 두는 모양 층 (작게 보기에서만 보임)
  return h('div',{class:'kdf','aria-hidden':'true'},...Array.from({length:frBars(card.text)},()=>h('i')),
    h('span',{class:'dd'},...eff(card).map(charById).filter(Boolean).map(c=>h('b',{style:`--c:${c.color}`}))),
    h('span',{class:'ds'},...Array.from({length:card.stars||0},()=>h('b'))));
}
const frDefOn=()=>onBoard()&&!!UI.bdef&&!!document.querySelector('.bview');      // 보드를 다시 그려도 상태를 기억 (UI.bdef)
function frBoardDef(view,k){      // applyView 에서 부름: 줄일 땐 기준에서, 키울 땐 12% 더 커져야 돌아옴 (경계에서 깜빡이지 않게)
  const T=frDefPx(),was=!!UI.bdef;
  const px=(S.settings.font||14)*1.04*k,on=!!T&&(was?px<T*1.12:px<T);
  UI.bdef=on;view.classList.toggle('bdef',on);if(was&&!on)frPeekHide();
  if(FRFL)frFloatPlace();
}

/* ---------- 떠오르는 원본: 미리보기 (반투명 · 누를 수 없음) / 열기 (또렷 · 고침) ---------- */
let FRFL=null;      // 열린 원본 {id, el}
function frRectOf(id){const el=document.querySelector(`.bview .kcard.board[data-id="${id}"]`)||document.querySelector(`#pool .frico[data-id="${id}"]`);return el?el.getBoundingClientRect():null}
function frPlace(box,r,prefer){      // 카드 옆(오른쪽, 모자라면 왼쪽)에 원래 크기로
  const W=box.offsetWidth||260,H=box.offsetHeight||160;let x=prefer==='left'?r.left-W-12:r.right+12;
  if(x+W>innerWidth-8)x=r.left-W-12;if(x<8)x=Math.min(innerWidth-W-8,Math.max(8,r.left+(r.width-W)/2));
  const y=Math.max(8,Math.min(innerHeight-H-8,r.top-8));box.style.left=x+'px';box.style.top=y+'px';
}
function frPeek(card,r,prefer){
  if(FRFL)return;let p=document.querySelector('.frpk:not(.open)');
  if(!p){p=h('div',{class:'frpk','aria-hidden':'true'});document.body.append(p)}
  const k=kindOf(card.kind);p.style.setProperty('--bg',cardColor(card));p.innerHTML='';
  p.append(h('small',{},h('span',{},k.name),h('span',{class:'s'},'★'.repeat(card.stars||0))),h('p',{},card.text||'(빈 포스트잇)'),
    h('div',{class:'who'},...eff(card).map(charById).filter(Boolean).map(c=>h('span',{},h('i',{style:`--c:${c.color}`}),c.name))));
  frPlace(p,r,prefer);requestAnimationFrame(()=>{frPlace(p,r,prefer);p.classList.add('on')});
}
function frPeekHide(){document.querySelectorAll('.frpk:not(.open)').forEach(p=>p.classList.remove('on'))}
function frOpen(id,prefer){
  const card=cardById(id);if(!card)return;
  frClose(true);frPeekHide();
  const ta=h('textarea',{class:'frpt',spellcheck:false,placeholder:'쓰고 싶은 장면 · 대사','aria-label':'포스트잇 글',oninput:e=>{edit(()=>{card.text=e.target.value;stamp(card)});fitOne(e.target)}},card.text||'');
  const head=h('div',{class:'frph'}),foot=h('div',{class:'frpf'});
  const el=h('div',{class:'frpk open',role:'dialog','aria-label':'포스트잇'},head,ta,foot,
    h('div',{class:'frpn'},h('span',{},'Esc로 닫기'),UI.mode==='story'&&frDefOn()?h('span',{},'두 번 누르면 확대'):h('span')));
  el.style.setProperty('--bg',cardColor(card));
  FRFL={id,el,head,foot,prefer};frFloatFill();
  el.addEventListener('dblclick',e=>{if(e.target===ta)return;const c=cardById(id);if(c&&UI.mode==='story')frZoomTo(c)});
  document.body.append(el);fitOne(ta);frFloatPlace();
  ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);
  setTimeout(()=>{document.addEventListener('pointerdown',frOutside,true);document.addEventListener('keydown',frKey,true)},0);
}
function frFloatFill(){      // 분류 · 별 · 지우기 · 인물 줄 (데이터가 바뀌면 다시 채움, 글 칸은 그대로라 쓰던 자리 유지)
  if(!FRFL)return;const card=cardById(FRFL.id);if(!card)return frClose(true);
  FRFL.el.style.setProperty('--bg',cardColor(card));
  FRFL.head.replaceChildren(kindSelect(card),starsEl(card),h('span',{class:'sp'}),episodeOf(card.id)?null:whenEl(card),h('button',{class:'x',title:'삭제 (휴지통)',onclick:()=>{const id=card.id;frClose(true);delCard(id)}},'✕'));
  FRFL.foot.replaceChildren(footEl(card));
}
onStateChange(()=>{if(FRFL)frFloatFill()});
function frFloatPlace(){if(!FRFL)return;const r=frRectOf(FRFL.id);if(r)frPlace(FRFL.el,r,FRFL.prefer)}
function frOutside(e){if(!FRFL||FRFL.el.contains(e.target)||e.target.closest('.pop,.dlg,#modal'))return;frClose()}
function frKey(e){if(e.key==='Escape'&&FRFL&&!e.isComposing){e.preventDefault();e.stopPropagation();frClose()}}
function frClose(quiet){
  if(!FRFL)return;const {id,el}=FRFL;FRFL=null;el.remove();
  document.removeEventListener('pointerdown',frOutside,true);document.removeEventListener('keydown',frKey,true);
  if(quiet)return;
  const c=cardById(id);if(c&&autoLinkCard(c))save();
  if(c&&!(c.text||'').trim()){S.cards=S.cards.filter(x=>x!==c);detach([id]);if(SELCARD===id)SELCARD=null;idxClear();commit();return}      // 빈 포스트잇은 저장하지 않고 지움
  renderAll();
}
function frZoomTo(card){      // 두 번 누르면: 그 포스트잇이 화면 가운데에 오게 100%로
  frClose(true);frPeekHide();const v=getView(UI.sel),{W,H}=viewSize(),p=boardMap(UI.sel)[card.id];if(!p)return;
  animateView(v,W/2-(p.x+p.w/2),H/2-(p.y+(p.h||CH)/2),1);
}

/* ---------- 오른쪽 목록: 같은 모양의 작은 포스트잇 아이콘 ---------- */
const frIcons=()=>UIP.pico!==false;
function frIcon(card){
  const used=episodeOf(card.id);
  const el=h('div',{class:'frico'+(used?' used':''),'data-id':card.id,'data-w':!used&&card.when||'',draggable:true,tabindex:0,style:`--bg:${cardColor(card)};--r:${frRot(card.id)}deg`,'aria-label':(card.text||'빈 포스트잇').slice(0,60)+(used?` · ${used.i+1}화 사용`:''),title:used?`${used.i+1}화 사용`:''},
    ...Array.from({length:Math.min(3,frBars(card.text))},()=>h('i')),
    h('span',{class:'dd'},...eff(card).map(charById).filter(Boolean).slice(0,4).map(c=>h('b',{style:`--c:${c.color}`}))));
  el.addEventListener('mouseenter',()=>{if(!DRAG)frPeek(card,el.getBoundingClientRect(),'left')});
  el.addEventListener('mouseleave',frPeekHide);
  el.addEventListener('click',()=>{selectCard(card.id);frOpen(card.id,'left')});
  el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();frOpen(card.id,'left')}});
  el.addEventListener('contextmenu',e=>{e.preventDefault();const a=h('div',{style:`position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:1px;height:1px`});document.body.append(a);msMenu(a,MSEL.has(card.id)&&MSEL.size>1?[...MSEL]:[card.id]);a.remove()});
  el.addEventListener('dragstart',e=>{frPeekHide();DRAG={id:card.id};e.dataTransfer.setData('text/plain',card.id);e.dataTransfer.effectAllowed='move';
    const g=h('div',{class:'frdragimg',style:`background:${cardColor(card)}`},(card.text||'').slice(0,160));document.body.append(g);e.dataTransfer.setDragImage(g,40,24);setTimeout(()=>g.remove(),0);      // 끌면 원래 크기 포스트잇이 따라옴
    setTimeout(()=>el.classList.add('dragging'))});
  el.addEventListener('dragend',()=>{DRAG=null;document.querySelectorAll('.dragging,.drop-before,.drop-after,.over').forEach(x=>x.classList.remove('dragging','drop-before','drop-after','over'))});
  return el;
}
