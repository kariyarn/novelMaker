/* ---- 말풍선: "" 대사는 둥근 말풍선, '' 속마음은 생각 구름 ---- */
const BUB_SVG='http://www.w3.org/2000/svg';
function bubOutline(w,h,r,step){
  const pts=[];
  const edge=(x0,y0,x1,y1,nx,ny)=>{const L=Math.hypot(x1-x0,y1-y0),n=Math.max(1,Math.round(L/step));for(let i=0;i<n;i++){const t=i/n;pts.push({x:x0+(x1-x0)*t,y:y0+(y1-y0)*t,nx,ny})}};
  const arc=(cx,cy,a0)=>{for(let i=0;i<4;i++){const a=a0+i*Math.PI/9;pts.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r,nx:Math.cos(a),ny:Math.sin(a)})}};
  edge(r,0,w-r,0,0,-1);arc(w-r,r,-Math.PI/2);edge(w,r,w,h-r,1,0);arc(w-r,h-r,0);edge(w-r,h,r,h,0,1);arc(r,h-r,Math.PI/2);edge(0,h-r,0,r,-1,0);arc(r,r,Math.PI);
  return pts;
}
function cloudD(w,h,r,gap,bulge){      // 둥근 사각형 둘레를 같은 간격으로 나누고 점 사이를 바깥으로 볼록한 호로 이음 → 모서리까지 고른 구름
  const f=n=>n.toFixed(1);r=Math.max(1,Math.min(r,h/2,w/2));
  const sx=w-2*r,sy=h-2*r,arcL=Math.PI*r/2,P=2*sx+2*sy+4*arcL,N=Math.max(8,Math.round(P/gap)),step=P/N;
  const pt=q=>{q=((q%P)+P)%P;
    if(q<sx)return [r+q,0];q-=sx;
    if(q<arcL){const t=-Math.PI/2+q/r;return [w-r+Math.cos(t)*r,r+Math.sin(t)*r]}q-=arcL;
    if(q<sy)return [w,r+q];q-=sy;
    if(q<arcL){const t=q/r;return [w-r+Math.cos(t)*r,h-r+Math.sin(t)*r]}q-=arcL;
    if(q<sx)return [w-r-q,h];q-=sx;
    if(q<arcL){const t=Math.PI/2+q/r;return [r+Math.cos(t)*r,h-r+Math.sin(t)*r]}q-=arcL;
    if(q<sy)return [0,h-r-q];q-=sy;
    const t=Math.PI+q/r;return [r+Math.cos(t)*r,r+Math.sin(t)*r]};
  const pts=Array.from({length:N},(_,i)=>pt(i*step));let d=`M${f(pts[0][0])} ${f(pts[0][1])}`;
  pts.forEach((a,i)=>{const b=pts[(i+1)%N],c=Math.hypot(b[0]-a[0],b[1]-a[1]),rad=Math.max(1,c*bulge);d+=`A${f(rad)} ${f(rad)} 0 0 1 ${f(b[0])} ${f(b[1])}`});
  return d+'Z';
}
function bubblePath(w,h,kind,lv){
  const f=n=>n.toFixed(1),A=[2,3,4.6][lv],B=[2.2,3.3,4.8][lv],T=3,VC=3;      // T 꼬리 · VC 위아래로 튀어나오는 한계
  const rr=(r,tail)=>{      // 둥근 사각형 (아래쪽에 작은 꼬리를 낼 수 있음)
    let d=`M${f(r)} 0H${f(w-r)}Q${f(w)} 0 ${f(w)} ${f(r)}V${f(h-r)}Q${f(w)} ${f(h)} ${f(w-r)} ${f(h)}`;
    if(tail&&w>56){if(tail==='L')d+=`H${f(r+12)}L${f(r+3)} ${f(h+T)}L${f(r+5)} ${f(h)}`;else d+=`H${f(w-r-5)}L${f(w-r-3)} ${f(h+T)}L${f(w-r-12)} ${f(h)}`}
    return d+`H${f(r)}Q0 ${f(h)} 0 ${f(h-r)}V${f(r)}Q0 0 ${f(r)} 0Z`};
  const zig=(r,step,amp,wave)=>{      // 윤곽을 따라 밖으로 톱니(wave=false) 또는 물결(wave=true)
    const q=bubOutline(w,h,r,step).map((p,i)=>{const o=wave?amp*Math.sin(i*2*Math.PI/5):(i%2?amp:0);return {x:p.x+p.nx*o,y:p.y+p.ny*Math.max(-VC,Math.min(VC,o))}});
    return 'M'+q.map(p=>f(p.x)+' '+f(p.y)).join('L')+'Z'};
  if(kind==='ex')return {d:zig(Math.min(5,h/2),10,[3.2,4.6,6.4][lv])};      // ! 외침: 뾰족한 폭발
  if(kind==='ge')return {d:zig(2,4.5,[1.4,2,2.8][lv])};      // …! 이를 악묾: 각진 상자 + 촘촘한 이빨
  if(kind==='qe')return {d:zig(Math.min(9,h/2),3,[1.3,1.9,2.6][lv],true)};      // ?! 어처구니없음: 출렁이는 물결
  if(kind==='eq')return {d:zig(Math.min(9,h/2),3,[1.1,1.6,2.2][lv],true)};      // …? 어리둥절: 물결 + 점선
  if(kind==='th')return {d:cloudD(w,h,Math.min(9,h/2),13,[.6,.64,.72][lv]),dots:[[-2,h+2.5,1.3]]};      // 구름: 둘레를 고르게 나눈 작은 호 · 꼬리 점은 왼쪽 아래 모서리 바깥에 떼어 둠 (구름 혹과 겹치면 얼룩처럼 보임)
  if(kind==='q')return {d:rr(Math.min(h/2,16),'R')};      // 알약 + 오른쪽 꼬리
  return {d:rr(Math.min(9,h/2),'L')};      // 마침표 · 말줄임: 둥근 상자 + 왼쪽 꼬리
}
function bubbleEl(b,j){
  const lv=Math.max(0,Math.min(2,(+(S.settings.bubbleLv||'1'))-1)),padL=b.tl?4:8,padR=b.tr?4:8,R=3;      // R: 위 · 아래로 삐져나올 수 있는 최대치 (이웃 풍선과 겹치지 않게 줄 높이 안에 가둠)
  const l=Math.min(...b.lines.map(L=>L.l))-padL,r=Math.max(...b.lines.map(L=>L.r))+padR,top=Math.min(...b.lines.map(L=>L.cy))-j.lh/2+R,bot=Math.max(...b.lines.map(L=>L.cy))+j.lh/2-R;
  const w=r-l,h=bot-top,kind=b.cls==='hs'?'th':'dot',shape=bubblePath(w,h,kind,lv);
  const svg=document.createElementNS(BUB_SVG,'svg');svg.setAttribute('class','kbub k-'+kind);svg.setAttribute('width',w.toFixed(1));svg.setAttribute('height',h.toFixed(1));svg.style.cssText=`left:${l.toFixed(1)}px;top:${top.toFixed(1)}px`;
  const P=(d,c)=>{const e=document.createElementNS(BUB_SVG,'path');e.setAttribute('d',d);e.setAttribute('class',c);svg.append(e);return e};
  P(shape.d,'bb');
  if(shape.inner){const g=document.createElementNS(BUB_SVG,'g');g.setAttribute('transform',`translate(${shape.ins} ${shape.ins}) scale(${((w-shape.ins*2)/w).toFixed(4)} ${((h-shape.ins*2)/h).toFixed(4)})`);const e=document.createElementNS(BUB_SVG,'path');e.setAttribute('d',shape.inner);e.setAttribute('class','bi');g.append(e);svg.append(g)}
  (shape.dots||[]).forEach(([x,y,rad])=>{const c=document.createElementNS(BUB_SVG,'circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',rad);c.setAttribute('class','bb');svg.append(c)});
  return svg;
}
function hlLayoutAll(root){hlBatch([...(root||document).querySelectorAll('.kwrap')])}
let hlT=null;const hlLater=()=>{clearTimeout(hlT);hlT=setTimeout(()=>hlLayoutAll(),140)};
addEventListener('resize',hlLater);
function setPin(card,on){card.pin=!!on;if(on)card.pinAngle=Math.round(Math.random()*90-45);      // 꽂을 때마다 -45°~45° 임의의 각도
  else{delete card.pinAngle;S.links=S.links.filter(l=>l.a!==card.id&&l.b!==card.id)}}
function enterEditList(el){
  const ta=el.querySelector('.ktext');if(!ta)return;
  el.classList.add('editing');el.draggable=false;ta.readOnly=false;ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);
}
