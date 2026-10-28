/* ---------- 가운데: 코르크보드 (무한 패닝 · 확대/축소 · 미니맵) ---------- */
const boardMap=key=>key==='none'?S.noneBoard:(key==='all'?S.allBoard:(key==='grave'?S.graveBoard:(key==='work'?{}:charById(key).board)));
const onBoard=()=>UI.mode==='story'||UI.mode==='all';
const validSel=()=>UI.sel==='none'||UI.sel==='all'||UI.sel==='grave'||!!charById(UI.sel);
const CH=130;      // 높이 추정값 (실제 높이는 내용에 따라 측정)
const noteW=()=>NOTE_W[(S.settings&&S.settings.noteWk)||'m']||300;      // 포스트잇 기본 너비
const noteMinH=()=>NOTE_MINH[(S.settings&&S.settings.noteHk)||'s']||0;      // 포스트잇 기본 최소 높이
function rectsOf(key,exceptId){const B=boardMap(key);return boardCards(key).filter(c=>c.id!==exceptId&&B[c.id]).map(c=>B[c.id])}
// 기존 카드와 겹치지 않는, 지정한 중심에서 가장 가까운 빈자리를 찾음
function freeSpot(key,w,hh,cx,cy,exceptId){
  const R=rectsOf(key,exceptId),gap=18,step=34;
  const hit=(x,y)=>R.some(r=>x<r.x+r.w+gap&&x+w+gap>r.x&&y<r.y+r.h+gap&&y+hh+gap>r.y);
  const x0=cx-w/2,y0=cy-hh/2;
  if(!hit(x0,y0))return {x:x0,y:y0};
  for(let ring=1;ring<80;ring++){
    const cand=[];
    for(let i=-ring;i<=ring;i++)cand.push([i,-ring],[i,ring],[-ring,i],[ring,i]);
    cand.sort((a,b)=>Math.hypot(a[0],a[1])-Math.hypot(b[0],b[1]));
    for(const [a,b] of cand){const x=x0+a*step,y=y0+b*step;if(!hit(x,y))return {x,y}}
  }
  return {x:x0,y:y0};
}
function getPos(key,id){
  const B=boardMap(key);
  if(!B[id]&&Object.keys(B).length>60){
    const L=Object.values(B);let last=null,x0=1e9,yb=-1e9;
    L.forEach(q=>{x0=Math.min(x0,q.x);yb=Math.max(yb,q.y+(q.h||CH));if(!last||q.y>last.y+40||(Math.abs(q.y-last.y)<=40&&q.x>last.x))last=q});
    let x=last.x+last.w+22,y=last.y;if(x-x0>2200){x=x0;y=yb+22}
    B[id]={x:Math.round(x),y:Math.round(y),w:noteW(),h:CH,z:++S.z};
  }
  if(!B[id]){
    const R=rectsOf(key,id);let cx=0,cy=0;
    if(R.length){const x0=Math.min(...R.map(r=>r.x)),x1=Math.max(...R.map(r=>r.x+r.w)),y0=Math.min(...R.map(r=>r.y)),y1=Math.max(...R.map(r=>r.y+r.h));cx=(x0+x1)/2;cy=(y0+y1)/2}
    const sp=freeSpot(key,noteW(),CH,cx,cy,id);B[id]={x:Math.round(sp.x),y:Math.round(sp.y),w:noteW(),h:CH,z:++S.z};
  }
  return B[id];
}
const getView=key=>UIP.views[key]||(UIP.views[key]={x:0,y:0,k:1,fit:true});
function viewSize(){const v=document.querySelector('.bview');return v?{W:v.clientWidth,H:v.clientHeight}:{W:800,H:600}}
const PATS=[['dot','도트'],['grid','격자'],['dash','점선'],['paper','종이 질감'],['plain','민무늬']];
const paperUrl=(rgb,alpha,freq,oct,size)=>`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${oct}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${rgb[0]} 0 0 0 0 ${rgb[1]} 0 0 0 0 ${rgb[2]} 0 0 0 ${alpha} 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`)}")`;
function applyView(){
  const view=document.querySelector('.bview');if(!view)return;
  const v=getView(UI.sel),pat=(S.settings&&S.settings.boardPat)||'dot',g=24*v.k;
  view.classList.add('moving');clearTimeout(applyView.mt);applyView.mt=setTimeout(()=>view.classList.remove('moving'),180);
  // 움직이는 동안은 한 장의 그림으로 (base.css .layered). 멈추면 배율이 바뀐 때만 그림을 풀어 지금 배율로 또렷하게 다시 그림
  //   휠을 툭툭 끊어 굴릴 때마다 풀었다 다시 만들면 그때마다 보드 전체를 새로 그려서 버벅이므로, 손을 확실히 뗀 뒤(0.45초) 한 번만
  view.classList.add('layered');clearTimeout(applyView.lt);
  applyView.lt=setTimeout(()=>{if(view._crispK!==v.k){view._crispK=v.k;view.classList.remove('layered')}},450);
  const dp=devicePixelRatio||1,px=n=>Math.round(n*dp)/dp;      // 화면 픽셀에 딱 맞춰야 글자가 번지지 않음
  view.firstChild.style.transform=`translate(${px(v.x)}px,${px(v.y)}px) scale(${v.k})`;
  let img='none',size='auto';
  if(pat==='dot'){img='radial-gradient(var(--dot) 1.3px,transparent 1.7px)';size=`${g}px ${g}px`}
  else if(pat==='grid'){img='linear-gradient(transparent 95.5%,var(--dot) 95.5%),linear-gradient(90deg,transparent 95.5%,var(--dot) 95.5%)';size=`${g}px ${g}px`}
  else if(pat==='dash'){      // 격자선 위에 배경색 조각을 덮어 점선처럼 보이게 함
    img='linear-gradient(90deg,var(--board) 50%,transparent 50%),linear-gradient(var(--board) 50%,transparent 50%),linear-gradient(transparent 95.5%,var(--dot) 95.5%),linear-gradient(90deg,transparent 95.5%,var(--dot) 95.5%)';
    size=`${g/2}px ${g}px,${g}px ${g/2}px,${g}px ${g}px,${g}px ${g}px`;
  }else if(pat==='paper'){
    const ck=(S.settings.theme||'')+'|'+(S.settings.boardBg||'')+'|'+matchMedia('(prefers-color-scheme:dark)').matches;
    if(applyView.ck!==ck){const m=(getComputedStyle(view).backgroundColor.match(/[\d.]+/g)||[255,255,255]).map(Number);applyView.dark=(.299*m[0]+.587*m[1]+.114*m[2])<110;applyView.ck=ck}
    const dark=applyView.dark;
    img=dark?paperUrl([1,1,1],.12,.8,3,260)+','+paperUrl([1,1,1],.06,.02,2,520):paperUrl([.36,.29,.18],.26,.8,3,260)+','+paperUrl([.45,.36,.2],.14,.02,2,520);
    size='260px 260px,520px 520px';
  }
  view.style.backgroundImage=img;view.style.backgroundSize=size;view.style.backgroundPosition=`${v.x}px ${v.y}px`;
  const zl=$('zoomlbl');if(zl)zl.textContent=Math.round(v.k*100)+'%';
  frBoardDef(view,v.k);      // 새단장: 글이 안 읽힐 만큼 작아지면 모양만 (features/fresh.js)
  scheduleMM();
}
function fitView(key,anim){
  const v=getView(key),{W,H}=viewSize(),R=rectsOf(key);v.fit=false;
  if(anim){let tx=W/2,ty=H/2,tk=1;if(R.length){const x0=Math.min(...R.map(r=>r.x)),x1=Math.max(...R.map(r=>r.x+r.w)),y0=Math.min(...R.map(r=>r.y)),y1=Math.max(...R.map(r=>r.y+r.h));tk=Math.max(.15,Math.min(1,(W-90)/(x1-x0),(H-90)/(y1-y0)));tx=W/2-(x0+x1)/2*tk;ty=H/2-(y0+y1)/2*tk}return animateView(v,tx,ty,tk)}
  if(!R.length){v.x=W/2;v.y=H/2;v.k=1}
  else{
    const x0=Math.min(...R.map(r=>r.x)),x1=Math.max(...R.map(r=>r.x+r.w)),y0=Math.min(...R.map(r=>r.y)),y1=Math.max(...R.map(r=>r.y+r.h));
    const k=Math.max(.15,Math.min(1,(W-90)/(x1-x0),(H-90)/(y1-y0)));
    v.k=k;v.x=W/2-(x0+x1)/2*k;v.y=H/2-(y0+y1)/2*k;
  }
  saveUIP();applyView();
}
const clampK=k=>Math.max(.12,Math.min(2.5,k));
let ZM={raf:0,tk:null,px:0,py:0,t:0},AV={raf:0};
// 확대/축소: 목표 배율을 정해 두고 매 프레임 부드럽게 따라가요 (커서 위치가 고정됨)
function zoomAt(px,py,f){
  const v=getView(UI.sel),view=document.querySelector('.bview');if(!view)return;
  cancelAnimationFrame(AV.raf);
  ZM.tk=clampK((ZM.tk==null?v.k:ZM.tk)*f);ZM.px=px;ZM.py=py;view.classList.add('zooming');
  if(!ZM.raf){ZM.t=performance.now();ZM.raf=requestAnimationFrame(zoomStep)}
}
function zoomStep(now){
  const v=getView(UI.sel),view=document.querySelector('.bview');
  if(!view||ZM.tk==null){ZM.raf=0;return}
  const dt=Math.min(64,now-ZM.t);ZM.t=now;
  const done=Math.abs(ZM.tk-v.k)<.0012*v.k,nk=done?ZM.tk:v.k+(ZM.tk-v.k)*(1-Math.exp(-dt/75)),r=nk/v.k;
  v.x=ZM.px-(ZM.px-v.x)*r;v.y=ZM.py-(ZM.py-v.y)*r;v.k=nk;applyView();
  if(done){ZM.raf=0;ZM.tk=null;view.classList.remove('zooming');clearTimeout(zoomAt.t);zoomAt.t=setTimeout(saveUIP,300)}
  else ZM.raf=requestAnimationFrame(zoomStep);
}
// 화면 이동 + 배율을 한 번에 부드럽게 (맞춤 버튼 등)
function animateView(v,tx,ty,tk){
  cancelAnimationFrame(AV.raf);cancelAnimationFrame(ZM.raf);ZM.raf=0;ZM.tk=null;
  const x0=v.x,y0=v.y,k0=v.k,t0=performance.now();
  const step=t=>{let q=Math.min(1,(t-t0)/340);q=1-Math.pow(1-q,3);v.x=x0+(tx-x0)*q;v.y=y0+(ty-y0)*q;v.k=k0+(tk-k0)*q;applyView();if(q<1)AV.raf=requestAnimationFrame(step);else saveUIP()};
  AV.raf=requestAnimationFrame(step);
}
/* 미니맵: 카드가 화면보다 훨씬 넓게 퍼지면 자동으로 나타남 (항상 보기도 가능) */
let mmRaf=0,MM=null;
function scheduleMM(){if(mmRaf)return;mmRaf=requestAnimationFrame(()=>{mmRaf=0;updateMinimap()})}
function updateMinimap(){
  const mm=document.querySelector('.minimap');if(!mm)return;
  const {W,H}=viewSize(),v=getView(UI.sel),B=boardMap(UI.sel),cards=boardCards(UI.sel);
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,n=0,sig=0;
  cards.forEach(c=>{const q=B[c.id];if(!q)return;n++;x0=Math.min(x0,q.x);y0=Math.min(y0,q.y);x1=Math.max(x1,q.x+q.w);y1=Math.max(y1,q.y+(q.h||CH));sig=(sig*31+q.x*7+q.y*13+q.w*3+(q.h||0))%1000000007});
  if(!n){mm.style.display='none';return}
  // 화면 밖으로 절반 이상 나간 포스트잇이 하나라도 있으면 자동으로 보여줌
  const vx0_=-v.x/v.k,vy0_=-v.y/v.k,vx1_=vx0_+W/v.k,vy1_=vy0_+H/v.k;
  const out=cards.some(c=>{const q=B[c.id];if(!q)return false;const hh=q.h||CH,ow=Math.max(0,Math.min(q.x+q.w,vx1_)-Math.max(q.x,vx0_)),oh=Math.max(0,Math.min(q.y+hh,vy1_)-Math.max(q.y,vy0_));return ow*oh<q.w*hh*.5});
  if(!out&&!UIP.mm&&!mm.dataset.d&&Date.now()>(mm._keep||0)){mm.style.display='none';return}      // 끄는 동안과 끝난 직후에는 유지 (다 보이게 되어도 사라지지 않게)
  mm.style.display='block';
  const vx0=-v.x/v.k,vy0=-v.y/v.k,vx1=vx0+W/v.k,vy1=vy0+H/v.k;
  let bx0=Math.min(x0,vx0)-60,by0=Math.min(y0,vy0)-60,bx1=Math.max(x1,vx1)+60,by1=Math.max(y1,vy1)+60;
  if(mm.dataset.d&&mm._fz){[bx0,by0,bx1,by1]=mm._fz}      // 끄는 동안은 지도 범위를 고정 (안 그러면 손을 따라 지도가 움직여 어려워요)
  else if(!mm.dataset.d)mm._fz=[bx0,by0,bx1,by1];
  const MW=190,MH=124,s=Math.min(MW/(bx1-bx0),MH/(by1-by0)),ox=(MW-(bx1-bx0)*s)/2,oy=(MH-(by1-by0)*s)/2;
  MM={s,bx0,by0,ox,oy};
  const key=UI.sel+'|'+n+'|'+sig+'|'+useMode();
  if(mm._key!==key){      // 카드가 바뀐 때만 점을 다시 만듦 (세계 좌표로 그려 두고 확대/이동은 변환으로)
    mm.textContent='';const inner=h('div',{class:'mmi'}),frag=document.createDocumentFragment();
    cards.forEach(c=>{const q=B[c.id];if(!q)return;frag.append(h('i',{style:`left:${q.x}px;top:${q.y}px;width:${q.w}px;height:${q.h||CH}px;background:${cardColor(c)}`}))});
    inner.append(frag);mm.append(inner,h('div',{class:'vp'}));mm._key=key;
  }
  const inner=mm.querySelector('.mmi'),vp=mm.querySelector('.vp');
  inner.style.transform=`translate(${ox-bx0*s}px,${oy-by0*s}px) scale(${s})`;
  vp.style.cssText=`left:${ox+(vx0-bx0)*s}px;top:${oy+(vy0-by0)*s}px;width:${(vx1-vx0)*s}px;height:${(vy1-vy0)*s}px`;
}
function bindMinimap(mm){
  const toW=e=>{const r=mm.getBoundingClientRect();return [(e.clientX-r.left-MM.ox)/MM.s+MM.bx0,(e.clientY-r.top-MM.oy)/MM.s+MM.by0]};
  let grab=null;
  const goto=e=>{if(!MM)return;const v=getView(UI.sel),{W,H}=viewSize(),[wx,wy]=toW(e);
    const cx=wx-(grab?grab[0]:0),cy=wy-(grab?grab[1]:0);      // 파란 영역을 잡았으면 잡은 자리 그대로, 빈 곳이면 그 점이 가운데로
    v.x=W/2-cx*v.k;v.y=H/2-cy*v.k;applyView()};
  mm.addEventListener('pointerdown',e=>{if(!MM)return;mm.setPointerCapture(e.pointerId);
    mm._fz=mm._fz||null;
    const v=getView(UI.sel),{W,H}=viewSize(),[wx,wy]=toW(e),vx0=-v.x/v.k,vy0=-v.y/v.k,vw=W/v.k,vh=H/v.k;
    const inVp=wx>=vx0&&wx<=vx0+vw&&wy>=vy0&&wy<=vy0+vh;
    grab=inVp?[wx-(vx0+vw/2),wy-(vy0+vh/2)]:null;
    mm.dataset.d='1';mm.classList.add('dragging');if(!inVp)goto(e);e.stopPropagation();e.preventDefault()});
  mm.addEventListener('pointermove',e=>{if(mm.dataset.d)goto(e)});
  const end=()=>{delete mm.dataset.d;mm.classList.remove('dragging');grab=null;mm._keep=Date.now()+1800;setTimeout(scheduleMM,1900);saveUIP();scheduleMM()};mm.addEventListener('pointerup',end);mm.addEventListener('pointercancel',end);
  mm.addEventListener('wheel',e=>e.stopPropagation());
}
function syncOne(el){
  const ta=el.querySelector('.ktext'),B=validSel()?boardMap(UI.sel):null,p=B&&B[el.dataset.id];
  if(p)p.h=el.offsetHeight;
  el.classList.toggle('clipped',ta.scrollHeight>ta.clientHeight+1);
  hlBlocks(el.querySelector('.kwrap'));
}
function syncBoard(){
  if(!onBoard())return;
  const els=[...document.querySelectorAll('.kcard.board')],B=validSel()?boardMap(UI.sel):null;
  const info=els.map(el=>{const ta=el.querySelector('.ktext');return {el,h:el.offsetHeight,clip:ta.scrollHeight>ta.clientHeight+1}});      // 읽기
  info.forEach(({el,h,clip})=>{const q=B&&B[el.dataset.id];if(q)q.h=h;el.classList.toggle('clipped',clip)});      // 쓰기
  applyPinFocus();
}
function enterEdit(el){
  if(el.classList.contains('board')&&frDefOn()){const id=el.dataset.id;setTimeout(()=>{if(frDefOn()&&Date.now()-(el._dbl||0)>400)frOpen(id)},230);return}      // 작게 보기에서는 글이 안 보이므로 원본을 띄워서 고침 (두 번 누르기 확대와 겹치지 않게 잠깐 기다림)
  const ta=el.querySelector('.ktext');if(!ta)return;
  el.classList.add('editing');ta.readOnly=false;ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);
}
let dsQ=0;const drawStringsSoon=()=>{if(dsQ)return;dsQ=requestAnimationFrame(()=>{dsQ=0;drawStrings()})};      // 끄는 동안 줄은 프레임당 한 번만
function boardInteract(el,card,ta,key){
  const pos=getPos(key,card.id);
  Object.assign(el.style,{left:pos.x+'px',top:pos.y+'px',width:pos.w+'px',minHeight:(pos.mh||0)+'px',zIndex:pos.z||1});
  el.style.setProperty('--rot',(pos.r||0)+'deg');
  const k=()=>getView(key).k;
  const run=(e,onMove,lift)=>{
    pos.z=++S.z;el.style.zIndex=pos.z;
    const sx=e.clientX,sy=e.clientY,o={...pos};let moved=false;
    const mv=ev=>{
      const dx=(ev.clientX-sx)/k(),dy=(ev.clientY-sy)/k();
      if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<3)return;
      if(!moved){moved=true;snap();if(lift)el.classList.add('lift')}
      onMove(o,dx,dy);
    };
    const up=()=>{removeEventListener('pointermove',mv);el.classList.remove('lift');if(moved){pos.x=Math.round(pos.x);pos.y=Math.round(pos.y);save();scheduleMM()}};
    addEventListener('pointermove',mv);addEventListener('pointerup',up,{once:true});
  };
  // 편집 중이 아닐 때는 카드의 어느 부분을 잡아도 끌어서 옮길 수 있음
  el.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    if(e.target.closest('select,button,label,.stars,.rz'))return;
    const wasSel=SELCARD===card.id&&!el.classList.contains('editing');
    selectCard(card.id);
    if(el.classList.contains('editing')&&e.target.closest('.ktext'))return;
    if(wasSel&&UI.mode!=='all'){const sx0=e.clientX,sy0=e.clientY;addEventListener('pointerup',ev=>{if(Math.hypot(ev.clientX-sx0,ev.clientY-sy0)<4&&!el.classList.contains('editing'))setTimeout(()=>enterEdit(el),0)},{once:true})}      // 이미 선택된 노트를 한 번 더 누르면 바로 글쓰기
    e.stopPropagation();e.preventDefault();
    if(el.classList.contains('editing')){
      if(!(card.text||'').trim()){el.dataset.hold='1';addEventListener('pointerup',()=>setTimeout(()=>{const x=document.querySelector(`.bview .kcard[data-id="${card.id}"]`);if(x)enterEdit(x)},0),{once:true})}      // 빈 포스트잇을 끌어 옮기면 놓은 뒤 이어서 씀
      ta.blur();delete el.dataset.hold}
    if(card.pin){      // 핀이 꽂힌 포스트잇: 꾹 누르면 이어진 것만 강조, 끌면 직접 옮길 수 있음 (자동 배치에서는 안 움직임)
      const t=setTimeout(()=>{cl();togglePinFocus(card.id)},520),cl=()=>{clearTimeout(t);removeEventListener('pointerup',cl)};
      addEventListener('pointerup',cl,{once:true});
      run(e,(o,dx,dy)=>{cl();pos.x=o.x+dx;pos.y=o.y+dy;el.style.left=pos.x+'px';el.style.top=pos.y+'px';drawStringsSoon()},true);
      return;
    }
    run(e,(o,dx,dy)=>{pos.x=o.x+dx;pos.y=o.y+dy;el.style.left=pos.x+'px';el.style.top=pos.y+'px';drawStringsSoon()},true);
  });
  el.addEventListener('dblclick',e=>{if(e.target.closest('select,button,label,.stars,.rz'))return;
    if(UI.mode==='all'){const to=eff(card)[0]||'none';UI.mode='story';UI.focusCard=null;setSel(to);setTimeout(()=>{const x=document.querySelector(`.bview .kcard[data-id="${card.id}"]`);if(x){selectCard(card.id);flashEl(x)}},120);return}      // 전체 보기: 그 카드의 인물 보드로
    if(frDefOn()){el._dbl=Date.now();return frZoomTo(card)}      // 작게 보기: 두 번 누르면 그 자리로 확대
    enterEdit(el)});
  {      // 작게 보기: 올리면 원래 크기 미리보기, 누르면 또렷한 원본
    el.addEventListener('mouseenter',()=>{if(frDefOn()&&!el.classList.contains('lift'))frPeek(card,el.getBoundingClientRect())});
    el.addEventListener('mouseleave',frPeekHide);
    el.addEventListener('pointerdown',e=>{if(e.button!==0||!frDefOn())return;frPeekHide();if(UI.mode==='all'||e.target.closest('select,button,label,.stars,.rz,.rzb,.rzc'))return;
      const sx=e.clientX,sy=e.clientY;addEventListener('pointerup',ev=>{if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<4)setTimeout(()=>{if(frDefOn()&&Date.now()-(el._dbl||0)>400)frOpen(card.id)},230)},{once:true})});      // 두 번 누르기(확대)와 겹치지 않게 잠깐 기다림
  }
  ta.addEventListener('blur',()=>{el.classList.remove('editing');ta.readOnly=true;if(!el.dataset.hold)dropIfEmpty(card.id)});
  const applyFix=()=>{
    if(pos.fh){el.classList.add('fixh');el.style.height=pos.fh+'px';el.style.minHeight='0'}
    else{el.classList.remove('fixh');el.style.height='';el.style.minHeight=(pos.mh||0)+'px'}
  };
  applyFix();
  // 오른쪽 가장자리=가로, 아래 가장자리=세로, 모서리=둘 다 (높이를 정하면 고정, 더블클릭하면 내용에 맞춤)
  const bindRz=(q,dw,dh)=>{
    const rz=el.querySelector(q);
    rz.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;e.stopPropagation();e.preventDefault();const h0=el.offsetHeight;
      run(e,(o,dx,dy)=>{
        if(dw){pos.w=Math.max(120,Math.round(o.w+dx));el.style.width=pos.w+'px'}
        if(dh){pos.fh=Math.max(70,Math.round(h0+dy));applyFix()}
        fitOne(ta);syncOne(el);drawStrings();
      },false);
    });
    if(dh)rz.addEventListener('dblclick',e=>{e.stopPropagation();delete pos.fh;applyFix();fitOne(ta);syncOne(el);drawStrings();save()});
  };
  bindRz('.rz',true,false);bindRz('.rzb',false,true);bindRz('.rzc',true,true);
  // 길어서 잘린 내용은 포스트잇 위에서 휠로 확인 (끝까지 가면 보드 이동으로 넘어감)
  el.addEventListener('wheel',e=>{
    if(e.ctrlKey||e.metaKey)return;
    const max=ta.scrollHeight-ta.clientHeight;if(max<=1)return;
    if((e.deltaY>0&&ta.scrollTop<max-1)||(e.deltaY<0&&ta.scrollTop>0)){e.preventDefault();e.stopPropagation();ta.scrollTop=Math.max(0,Math.min(max,ta.scrollTop+e.deltaY))}
  },{passive:false});
}
// ⌘Enter: 편집 끝 — 어느 입력칸이든, 한글을 조합하는 중이어도 (조합 중인 글자는 확정된 뒤 끝냄)
document.addEventListener('keydown',e=>{
  if(!(e.metaKey||e.ctrlKey)||(e.key!=='Enter'&&e.code!=='Enter'&&e.code!=='NumpadEnter'))return;
  const t=e.target;if(!t||!t.matches||!t.matches('textarea,input:not([type=checkbox]):not([type=radio]),[contenteditable=true]'))return;
  e.preventDefault();e.stopPropagation();
  if(e.isComposing||e.keyCode===229)setTimeout(()=>t.blur(),0);else t.blur();
},true);
