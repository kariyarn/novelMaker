/* 사용 카드 정리 목록: 화별로 묶고, 화면에 보이는 줄만 그림 (카드가 수만 장이어도 일정한 속도) */
function renderUsedList(view,cards,key,RO){
  const groups=new Map();
  cards.forEach(c=>{const e=episodeOf(c.id),i=e?e.i:-1;if(!groups.has(i))groups.set(i,[]);groups.get(i).push(c)});
  const rows=[];
  [...groups.keys()].sort((a,b)=>((a<0)-(b<0))||a-b).forEach(i=>{const list=groups.get(i),ep=S.episodes[i];      // 화에 안 쓴 카드(-1)는 맨 아래
    if(ep)list.sort((a,b)=>ep.cardIds.indexOf(a.id)-ep.cardIds.indexOf(b.id));
    rows.push({head:true,i,ep,n:list.length});
    list.forEach(c=>rows.push({c,i}));
  });
  const HH=46,RH=96,off=[];let tot=0;rows.forEach(r=>{off.push(tot);tot+=r.head?HH:RH});
  const box=h('div',{class:'ulist'}),inner=h('div',{class:'uin',style:`height:${tot+8}px`}),layer=h('div',{class:'ulayer'});
  const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');svg.setAttribute('class','ulinks');
  inner.append(svg,layer);box.append(inner);view.append(box);
  // 이어진 카드(핀 + 줄)는 목록 좌우 여백에 줄로 연결해서 보여줌: 줄끼리 겹치지 않게 층을 나누고, 왼쪽·오른쪽에 고르게 배분
  const rowOf=new Map();rows.forEach((r,x)=>{if(r.c)rowOf.set(r.c.id,x)});
  const rowY=x=>off[x]+(RH-6)/2,LK=[];
  {      // 사이의 카드가 목록에 없어도(숨겨져 있어도) 건너건너 이어진 카드끼리는 점선으로 연결
    const adj=new Map();(S.links||[]).forEach(l=>{(adj.get(l.a)||adj.set(l.a,[]).get(l.a)).push({id:l.b,l});(adj.get(l.b)||adj.set(l.b,[]).get(l.b)).push({id:l.a,l})});
    const best=new Map();      // 쌍 → 가장 가까운(숨은 카드가 적은) 연결
    rowOf.forEach((rv,v)=>{
      const seen=new Set([v]),q=[];(adj.get(v)||[]).forEach(e=>q.push({id:e.id,l:e.l,hid:0}));
      while(q.length){const cur=q.shift();if(seen.has(cur.id))continue;seen.add(cur.id);
        if(rowOf.has(cur.id)){const a=rowOf.get(v),b=rowOf.get(cur.id);if(a===b)continue;const key=a<b?a+'|'+b:b+'|'+a,old=best.get(key);if(!old||cur.hid<old.hid)best.set(key,{a:Math.min(a,b),b:Math.max(a,b),l:cur.l,hid:cur.hid});continue}
        (adj.get(cur.id)||[]).forEach(e=>{if(!seen.has(e.id))q.push({id:e.id,l:cur.l,hid:cur.hid+1})})}      // 숨은 카드를 지나서 계속 따라감
    });
    best.forEach(e=>LK.push({l:e.l,p:e.a,q:e.b,y1:rowY(e.a),y2:rowY(e.b),side:'L',lane:0,hid:e.hid}));
  }
  LK.sort((x,y)=>x.y1-y.y1||x.y2-y.y2);
  {const act={L:[],R:[]},cnt={L:0,R:0},free=sd=>{const u=new Set(act[sd].map(a=>a.lane));let n=0;while(u.has(n))n++;return n};
   LK.forEach(k=>{['L','R'].forEach(sd=>{act[sd]=act[sd].filter(a=>a.end>k.y1)});const fl=free('L'),fr=free('R');
     k.side=fl<fr?'L':(fr<fl?'R':(cnt.L<=cnt.R?'L':'R'));k.lane=k.side==='L'?fl:fr;cnt[k.side]++;act[k.side].push({end:k.y2,lane:k.lane})})}
  const GW=64,drawLinks=(from,to)=>{
    const W=inner.clientWidth;svg.style.cssText=`left:${-GW}px;top:${from}px;width:${W+GW*2}px;height:${to-from}px`;
    svg.setAttribute('viewBox',`${-GW} ${from} ${W+GW*2} ${to-from}`);svg.textContent='';
    const gp=document.createDocumentFragment();
    LK.forEach(k=>{if(k.y2<from||k.y1>to)return;
      const col=k.l.color||(S.settings&&S.settings.stringColor)||'#c8412b',xs=k.side==='L'?-1:1,X=k.side==='L'?0:W,g=16+k.lane*11,r=Math.min(9,(k.y2-k.y1)/2);
      const path=document.createElementNS(NS,'path');path.setAttribute('class','uln');path.setAttribute('stroke',col);if(k.hid)path.setAttribute('stroke-dasharray','6 5');
      path.setAttribute('d',`M${X} ${k.y1} h${xs*(g-r)} q${xs*r} 0 ${xs*r} ${r} V${k.y2-r} q0 ${r} ${-xs*r} ${r} h${-xs*(g-r)}`);
      const tt=document.createElementNS(NS,'title'),ca=rows[k.p].c,cb=rows[k.q].c;tt.textContent=`${(ca.text||'').trim().slice(0,16)} ↔ ${(cb.text||'').trim().slice(0,16)}${k.hid?` (사이에 숨은 카드 ${k.hid}장을 건너 이어짐)`:''}`;path.append(tt);gp.append(path);
      [k.y1,k.y2].forEach(y=>{const c=document.createElementNS(NS,'circle');c.setAttribute('cx',X);c.setAttribute('cy',y);c.setAttribute('r',5);c.setAttribute('fill',col);c.setAttribute('class','ulp');gp.append(c)})});
    svg.append(gp);
  };
  if(!rows.length){box.append(h('div',{class:'bempty',style:'top:40%'},'사용한 카드가 없어요.',h('br'),'타임라인에서 카드를 화에 배치하면 여기에 화별로 모여요.'));return}
  const goEp=(i,cid)=>{closeModal();UI.mode='tl';UIP.tlMode='line';UI.tlScope=null;UI.prevSel=UI.sel;
    const g=tlGroups().findIndex(([a,b])=>i>=a&&i<b);if(g>=0&&UIP.tg)UIP.tg[g]=false;saveUIP();renderAll();
    setTimeout(()=>{const el=document.querySelector(`.tlseg[data-ep="${i}"]`);if(el){el.scrollIntoView({block:'start',behavior:'smooth'});flashEl(el)}},120)};
  const text1=c=>(c.text||'').replace(/[ \t]+/g,' ').replace(/\n\s*\n+/g,'\n').trim()||'(빈 카드)';      // 줄바꿈은 그대로 살림 (빈 줄만 한 줄로)
  const open=(c,i)=>{
    if(RO)return goEp(i,c.id);
    const ta=h('textarea',{class:'fval autofit',rows:3,style:'width:100%;resize:none;overflow:hidden',oninput:e=>{edit(()=>c.text=e.target.value);fitOne(e.target);
        const t=box.querySelector(`.urow[data-id="${c.id}"] .utx`);if(t)t.textContent=text1(c)},onchange:()=>{if(autoLinkCard(c))save()}},c.text||'');
    const names=eff(c).map(id=>charById(id)).filter(Boolean).map(x=>x.name);
    openModal(mtitle('카드 고치기'),h('p',{class:'muted',style:'margin:0 0 8px'},`${i+1}화${S.episodes[i]&&S.episodes[i].title?' · '+S.episodes[i].title:''}${names.length?' · '+names.join(', '):''}`),ta,
      h('div',{class:'row',style:'margin-top:12px'},h('button',{onclick:()=>goEp(i,c.id)},'타임라인에서 보기'),h('span',{class:'sp'}),h('button',{class:'on',onclick:closeModal},'완료')));
    setTimeout(()=>{fitOne(ta);ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)},40);
  };
  const mk=r=>{
    if(r.head){const el=h('div',{class:'uhead',onclick:()=>{if(r.i>=0)goEp(r.i)}},h('b',{},r.i>=0?`${r.i+1}화`:'화에 안 쓴 카드'),r.ep&&r.ep.title?h('span',{class:'ut'},r.ep.title):null,h('small',{},`${r.n}장`),h('span',{class:'sp'}),r.i>=0?h('span',{class:'ugo'},'타임라인에서 보기 ›'):null);return el}
    const c=r.c,k=kindOf(c.kind),ch=eff(c).map(id=>charById(id)).filter(Boolean);
    return h('div',{class:'urow','data-id':c.id,onclick:()=>open(c,r.i),title:'눌러서 보기 · 고치기'},
      c.pin?h('span',{class:'upin',title:'핀 꽂은 카드'},icon('pin')):null,h('i',{class:'udot',style:`background:${k.colorMode==='random'?cardColor(c):k.color}`}),
      h('span',{class:'utx'},text1(c)),
      h('span',{class:'uch'},...ch.slice(0,3).map(x=>h('span',{class:'uchip'},h('i',{style:`background:${x.color}`}),x.name)),ch.length>3?h('small',{},`+${ch.length-3}`):null),
      c.stars?h('span',{class:'ust'},'★'.repeat(c.stars)):null);
  };
  let lastKey='';
  const draw=()=>{
    const st=box.scrollTop,vh=box.clientHeight||700,from=st-300,to=st+vh+300;
    let lo=0,hi=rows.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(off[mid]+(rows[mid].head?HH:RH)<from)lo=mid+1;else hi=mid}
    let i=lo,j=lo;while(j<rows.length&&off[j]<to)j++;
    const k2=i+'-'+j;if(k2===lastKey)return;lastKey=k2;
    layer.textContent='';const frag=document.createDocumentFragment();
    for(let x=i;x<j;x++){const el=mk(rows[x]);el.style.top=off[x]+'px';el.style.height=(rows[x].head?HH:RH)-6+'px';frag.append(el)}
    layer.append(frag);drawLinks(from,to);
  };
  let raf=0;box.addEventListener('scroll',()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;draw()})});
  new ResizeObserver(()=>{lastKey='';draw()}).observe(box);
  draw();
}
function fitDock(){      // 도구줄이 보드보다 넓으면 글자를 빼고 아이콘만
  document.querySelectorAll('.bview').forEach(v=>{const d=v.querySelector('.bdock');if(!d)return;
    v.classList.remove('compact','tiny');
    if(d.offsetWidth>v.clientWidth-24){v.classList.add('compact');if(d.offsetWidth>v.clientWidth-24)v.classList.add('tiny')}})
}
