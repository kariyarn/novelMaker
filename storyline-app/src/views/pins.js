/* ---------- 핀 · 줄 ---------- */
function pinPoint(p,ang){      // 줄은 핀의 기둥(꽂힌 점에서 위로 21px)에 묶임: 핀 각도와 카드 기울기를 함께 반영
  const cx=p.x+p.w/2,cy=p.y+(p.h||CH)/2,t=(ang||0)*Math.PI/180,L=21,dx=L*Math.sin(t),dy=8-L*Math.cos(t)-(p.h||CH)/2,r=(p.r||0)*Math.PI/180;
  return [cx+dx*Math.cos(r)-dy*Math.sin(r),cy+dx*Math.sin(r)+dy*Math.cos(r)];
}
function toggleLink(a,b){
  act(()=>{const i=S.links.findIndex(l=>(l.a===a&&l.b===b)||(l.a===b&&l.b===a));if(i>=0)S.links.splice(i,1);else S.links.push({id:uid(),a,b})});
}
const STRING_COLORS=[['#c8412b','빨강'],['#1f1f1f','검정'],['#f4efe4','흰색'],['#2f6fd0','파랑'],['#2e8b57','초록'],['#e0a526','노랑'],['#8b5a2b','삼실 갈색']];
const STRING_W={s:1.6,m:2.6,l:4.2};
function drawStrings(){
  const svg=document.querySelector('.bview .strings');if(!svg)return;
  if(UI.mode==='all'){svg.innerHTML='';return}      // 전체 보기는 가지런히 펼친 모음이라 핀 줄은 그리지 않음
  const key=UI.sel,B=boardMap(key),vis=new Set(boardCards(key).map(c=>c.id)),g=UI.pinFocus;      // 보기(전체/미사용/사용)에 안 보이는 카드의 줄은 같이 사라짐
  const st=S.settings,style=st.stringStyle||'thread',w=STRING_W[st.stringW||'m']||2.6,gcol=st.stringColor||'#c8412b';
  const sagF=style==='taut'?0:(style==='loose'?.36:.16),sagMax=style==='loose'?280:150;
  const d=(a,b)=>{const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,sag=Math.min(sagMax,Math.hypot(b[0]-a[0],b[1]-a[1])*sagF);return `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${mx.toFixed(1)} ${(my+sag).toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`};
  let o='';
  if(st.showStrings!==false)S.links.forEach(l=>{
    const ca=cardById(l.a),cb=cardById(l.b);
    if(!ca||!cb||!ca.pin||!cb.pin||!vis.has(l.a)||!vis.has(l.b)||!B[l.a]||!B[l.b])return;
    const a=pinPoint(B[l.a],ca.pinAngle),b=pinPoint(B[l.b],cb.pinAngle),dim=g&&!(g.has(l.a)&&g.has(l.b)),dd=d(a,b),col=l.color||gcol;
    const base=`<path class="str" style="stroke:${col};stroke-width:${w}${style==='dash'?`;stroke-dasharray:${(w*3+4).toFixed(1)} ${(w*2+4).toFixed(1)}`:''}" d="${dd}"/>`;
    const tw=style==='dash'?'':`<path class="twist" style="stroke-width:${(w*.42).toFixed(2)}" d="${dd}"/>`;
    const kr=(w*.8+1.5).toFixed(1),knots=`<circle cx="${a[0].toFixed(1)}" cy="${a[1].toFixed(1)}" r="${kr}" style="fill:${col}"/><circle cx="${b[0].toFixed(1)}" cy="${b[1].toFixed(1)}" r="${kr}" style="fill:${col}"/>`;
    o+=`<g class="${dim?'sdim':''}"><path class="hit" data-lid="${l.id}" d="${dd}"/>${base}${tw}${knots}</g>`;
  });
  if(UI.tmpLine)o+=`<g class="tmpg"><path class="tmp" d="${d(UI.tmpLine.a,UI.tmpLine.b)}"/></g>`;
  svg.innerHTML=o;
}
function pinComponent(id){
  const set=new Set([id]),q=[id];
  while(q.length){const x=q.pop();S.links.forEach(l=>{const o=l.a===x?l.b:(l.b===x?l.a:null);if(o&&!set.has(o)){set.add(o);q.push(o)}})}
  return set;
}
function applyPinFocus(){
  const world=document.querySelector('.bworld');if(!world)return;
  const els=[...world.querySelectorAll('.kcard.board')];
  if(UI.pinFocus&&!els.some(e=>UI.pinFocus.has(e.dataset.id)))UI.pinFocus=null;
  const g=UI.pinFocus;world.classList.toggle('pf',!!g);
  els.forEach(e=>e.classList.toggle('pf-on',!!g&&g.has(e.dataset.id)));
  drawStrings();
}
function clearPinFocus(){if(UI.pinFocus){UI.pinFocus=null;applyPinFocus()}}
function togglePinFocus(id){
  if(UI.pinFocus&&UI.pinFocus.has(id))return clearPinFocus();
  UI.pinFocus=pinComponent(id);applyPinFocus();
  toast(UI.pinFocus.size>1?`핀으로 이어진 ${UI.pinFocus.size}장만 강조해요 · 빈 곳을 누르면 해제`:'이 포스트잇만 강조해요 · 빈 곳을 누르면 해제');
}
function bindPin(el,card,pinB,key){
  pinB.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;e.stopPropagation();e.preventDefault();
    const view=document.querySelector('.bview'),v=getView(key),sx=e.clientX,sy=e.clientY;let drag=false;
    const toW=ev=>{const r=view.getBoundingClientRect();return [(ev.clientX-r.left-v.x)/v.k,(ev.clientY-r.top-v.y)/v.k]};
    const mv=ev=>{
      if(!card.pin)return;
      if(!drag&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<5)return;
      drag=true;UI.tmpLine={a:pinPoint(boardMap(key)[card.id],card.pinAngle),b:toW(ev)};drawStrings();
    };
    const up=ev=>{
      removeEventListener('pointermove',mv);UI.tmpLine=null;
      if(!drag){act(()=>setPin(card,!card.pin));return}
      drawStrings();
      const t=document.elementFromPoint(ev.clientX,ev.clientY),te=t&&t.closest('.kcard.board'),other=te&&cardById(te.dataset.id);
      if(!other||other===card)return;
      if(!other.pin)return toast('핀을 꽂은 포스트잇끼리 줄로 이을 수 있어요');
      toggleLink(card.id,other.id);
    };
    addEventListener('pointermove',mv);addEventListener('pointerup',up,{once:true});
  });
}
