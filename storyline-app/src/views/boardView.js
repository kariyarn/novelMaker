/* ---------- 가운데: 코르크보드 그리기 · 전체 보기 배치 · 정리 ---------- */
function renderBoard(m){
  if(UI.sel==='work'&&UI.mode==='story')return renderWorkBoard(m);
  const key=UI.sel,c=charById(key),cards=boardCards(key),hidden=usedHidden(key);
  const name=key==='all'?'전체 코르크보드':(key==='none'?'미분류':(c?c.name:''));
  const full=document.body.classList.contains('full'),uf=useMode(),asList=uf==='used'&&!UI.usedAsBoard;      // 사용 카드는 정리 목록으로 (가볍고 한눈에)
  const trig=(label,items,title)=>{const b=h('button',{class:'menubtn','data-pop':'1',title,onclick:()=>popMenu(b,items())},label,h('span',{class:'caret'},'▾'));return b};
  if(c&&c.kind==='char'&&UI.mode==='story'&&!(U2()&&!UIP.cl.sheet&&!(c.longGoal||(c.goals||[]).some(g=>g.state==='active'))))m.append(goalStripEl(c));      // 새 디자인: 시트가 열려 있으면 빈 “목표 적기”는 시트의 목표 줄로 대신
  const view=h('div',{class:'bview'+(cards.length>80?' lite':'')+(asList?' ulistview':'')+(U3()&&UI.bdef&&!asList?' bdef':'')}),world=h('div',{class:'bworld'});
  view.append(world);m.append(view);
  // 왼쪽 위: 보드 이름 · 장수 (목표 알약도 여기에)
  const RO=UI.mode==='all',on=kindsOn();
  const bhead=h('div',{class:'bhead'},h('b',{},name),h('span',{class:'muted'},`${cards.length}장${hidden?` · ${hidden}장 숨김`:''}`),RO?h('span',{class:'robadge',title:'전체 보기는 모아 보기 전용이에요. 만들기 · 고치기는 인물 보드에서 해요 (포스트잇 두 번 누르면 이동)'},'보기 전용'):null);
  view.append(bhead);
  { const gs=m.querySelector('.goalstrip.mini');if(gs)bhead.append(gs); }
  // 아래 가운데: 도구 독 (새 포스트잇 · 보기 · 배치 · 배율 · 꾸미기)
  const pop=(b,items)=>popMenu(b,items);
  const dbtn=(ic,label,title,fn,cls)=>{const b=h('button',{class:'dk-b'+(cls?' '+cls:''),'data-pop':'1',title,onclick:()=>fn(b)},icon(ic),label?h('span',{},label):null);return b};
  const ufLabel={all:'전체',unused:'미사용',used:'사용',disc:'폐기'}[uf];
  const viewLabel=ufLabel+(on.length?` · ${on.map(id=>kindOf(id).name).join('·')}`:'');
  const dock=h('div',{class:'bdock'},
    RO?null:dbtn('zen','집중','집중 모드 — 포스트잇 한 장씩 크게 (⌥Z)',()=>zenOpen(),'dk-zen'),
    RO?null:dbtn('plusc','새 포스트잇','새 포스트잇 (빈 곳 더블클릭 · ⌘N)',b=>pop(b,[{title:'새 포스트잇'},...S.kinds.map(k=>({label:k.name,sw:k.colorMode==='random'?RANDOM_BG:k.color,hint:k.key?hk(k.key):'',fn:()=>addBoardCard(k.id)}))]),'dk-new'),
    dbtn('eye',viewLabel,'보이는 포스트잇 고르기 (사용 여부 · 분류)',b=>pop(b,()=>[{title:'보이는 포스트잇'},...[['all','전체','⌥1'],['unused','미사용 (타임라인에 안 쓴 것)','⌥2'],['used','사용','⌥3']].map(([k,n,hk2])=>({label:n,hint:hk2,on:useMode()===k,keep:true,fn:()=>setSetting('useFilter',k)})),
      'sep',{label:'폐기한 포스트잇만 모아 보기',hint:'⌥4',on:useMode()==='disc',keep:true,fn:()=>setSetting('useFilter',useMode()==='disc'?'unused':'disc')},
      'sep',{label:'핀 꽂은 카드는 사용했어도 계속 보이기',on:!!S.settings.pinAlways,keep:true,fn:()=>setSetting('pinAlways',!S.settings.pinAlways)},
      'sep',{title:'분류 (여러 개 함께)'},...S.kinds.map(k=>({label:k.name,sw:k.colorMode==='random'?RANDOM_BG:k.color,on:!kindsOn().length||kindsOn().includes(k.id),keep:true,fn:()=>toggleKind(k.id)}))]),(uf!=='all'||on.length)?'dk-on':''),
    asList?null:dbtn('grid','배치','카드 배치 바꾸기',b=>pop(b,[{title:'배치 (원점 기준)'},{label:'맞춤 — 모두 한눈에',hint:'⌥F',fn:()=>fitView(key,true)},{label:'정리 — 격자로 가지런히',hint:'⌥T',fn:tidyBoard},{label:'랜덤 — 중앙 근처에 흩기',hint:'⌥R',fn:()=>scatterBoard('random')},{label:'스프레드 — 겹치지 않게 펼치기',hint:'⌥S',fn:()=>scatterBoard('spread')}])),
    h('span',{class:'dk-sep'}),
    asList?null:h('span',{class:'dk-zoom'},
      h('button',{class:'ico',title:'축소',onclick:()=>{const {W,H}=viewSize();zoomAt(W/2,H/2,.78)}},'−'),
      h('button',{id:'zoomlbl',class:'zlbl',title:'눌러서 100%로',onclick:()=>{const {W,H}=viewSize(),v=getView(key);zoomAt(W/2,H/2,1/v.k)}},'100%'),
      h('button',{class:'ico',title:'확대',onclick:()=>{const {W,H}=viewSize();zoomAt(W/2,H/2,1.28)}},'＋'),
      h('button',{class:'ico',title:'처음 중앙점(원점)으로 돌아가기 · Home 키',onclick:()=>goOrigin(key)},'⌖')),
    asList?h('button',{class:'dk-b',title:'포스트잇을 보드에 펼쳐서 보기 (카드가 많으면 느려질 수 있어요)',onclick:()=>{UI.usedAsBoard=true;renderMid()}},icon('grid'),h('span',{},'보드로 보기')):null,
    h('span',{class:'dk-sep'}),
    asList?null:dbtn('brush','','꾸미기 — 배경 · 줄 · 말 표시 · 미니맵',b=>pop(b,()=>[
      {title:'배경 색'},...BOARDS.map(b=>({label:b[1],sw:b[2]||'var(--board)',on:(S.settings.boardBg||'')===b[0],fn:()=>setSetting('boardBg',b[0])})),
      'sep',{title:'배경 무늬'},...PATS.map(([k,n])=>({label:n,on:(S.settings.boardPat||'dot')===k,fn:()=>setSetting('boardPat',k)})),
      'sep',{label:'핀 줄 보이기',on:S.settings.showStrings!==false,fn:()=>setSetting('showStrings',S.settings.showStrings===false)},
      'sep',{title:'말(따옴표 · 대괄호) 표시'},{label:'끄기',on:(S.settings.hlStyle||'bubble')==='off',fn:()=>setSetting('hlStyle','off')},{label:'음각 (안으로 눌린 느낌)',on:(S.settings.hlStyle||'bubble')==='inset',fn:()=>setSetting('hlStyle','inset')},{label:'양각 (튀어나온 느낌)',on:(S.settings.hlStyle||'bubble')==='raised',fn:()=>setSetting('hlStyle','raised')},{label:'말풍선',on:(S.settings.hlStyle||'bubble')==='bubble',fn:()=>setSetting('hlStyle','bubble')},
      'sep',
      {label:'미니맵 항상 보기',on:!!UIP.mm,fn:()=>{UIP.mm=!UIP.mm;saveUIP();renderMid()}}])));
  for(let r=0;r<3;r++)[...dock.children].forEach(e=>{if(e.classList.contains('dk-sep')){const a=e.previousElementSibling,b=e.nextElementSibling;if(!a||!b||a.classList.contains('dk-sep')||b.classList.contains('dk-sep'))e.remove()}});      // 빈 구분선 정리
  // 사용 카드를 보드로 보고 있을 때: 목록으로 돌아가는 버튼 / 전체에서 사용 카드가 많을 때: 목록 안내
  if(uf==='used'&&UI.usedAsBoard)dock.append(h('span',{class:'dk-sep'}),h('button',{class:'dk-b',title:'화별 정리 목록으로 보기',onclick:()=>{UI.usedAsBoard=false;renderMid()}},icon('list'),h('span',{},'목록으로 보기')));
  if(uf==='all'&&cards.length>300){const nu=cards.filter(c=>episodeOf(c.id)).length;if(nu>150)bhead.append(h('button',{class:'quiet ulhint',title:'이미 쓴 카드는 화별 목록으로 보면 훨씬 빨라요',onclick:()=>setSetting('useFilter','used')},`사용 ${nu}장 · 목록으로 보기`))}
  view.append(dock);
  if(asList){renderUsedList(view,cards,key,RO);return}
  world.append(h('div',{class:'orig',title:'원점 (처음 중앙점)'}));
  cards.forEach(card=>world.append(kcard(card,'board',{key})));
  const mkSvg=c=>{const e=document.createElementNS('http://www.w3.org/2000/svg','svg');e.setAttribute('class','strings');e.setAttribute('width','1');e.setAttribute('height','1');return e};
  const strings=mkSvg('');
  // 줄을 누르면 이 줄만의 색을 고르거나 끊을 수 있음
  strings.addEventListener('click',e=>{
    const id=e.target.dataset&&e.target.dataset.lid,l=id&&S.links.find(x=>x.id===id);if(!l)return;
    const anchor=h('div',{style:`position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:1px;height:1px`});document.body.append(anchor);
    popMenu(anchor,[{title:'이 줄 색'},...STRING_COLORS.map(([c,n])=>({label:n,sw:c,on:(l.color||S.settings.stringColor||'#c8412b')===c,fn:()=>act(()=>{l.color=c})})),{label:'기본 색으로',fn:()=>act(()=>{delete l.color})},'sep',{label:'줄 끊기',fn:()=>act(()=>{S.links=S.links.filter(x=>x.id!==id)})}]);
    anchor.remove();
  });
  world.append(strings);
  if(!cards.length)view.append(h('div',{class:'bempty'},uf==='disc'?'폐기한 포스트잇이 없어요.':key==='none'?'미분류 카드가 없어요.':(key==='all'?'아직 포스트잇이 없어요.':'아직 카드가 없어요.'),h('br'),'빈 곳을 더블클릭하거나 ⌘N, 또는 오른쪽 목록의 카드를 끌어다 놓으세요.',h('br'),UI.mode==='all'?null:h('button',{class:'on',style:'pointer-events:auto;margin-top:12px',onclick:()=>newNoteShortcut()},'＋ 새 포스트잇')));
  const mm=h('div',{class:'minimap'});view.append(mm);bindMinimap(mm);
  if(UI.mode==='all')view.classList.add('ro');
  view.append(h('button',{class:'bfull','data-pop':'1',title:full?'전체 화면 끝내기 (Esc)':'전체 화면 — 패널을 치우고 크게 (⌘.)',onclick:()=>setFull(!full)},icon(full?'shrink':'expand')));
  // 빈 곳을 끌면 화면 이동(무한 패닝), 휠/트랙패드 스크롤도 이동, Ctrl(⌘)+휠은 확대·축소
  view.addEventListener('pointerdown',e=>{
    if(e.target!==view&&e.target!==world)return;if(e.button!==0&&e.button!==1)return;
    document.querySelectorAll('.kcard.editing .ktext').forEach(t=>t.blur());clearPinFocus();selectCard(null);
    const v=getView(key),sx=e.clientX,sy=e.clientY,ox=v.x,oy=v.y;view.classList.add('panning');view.setPointerCapture(e.pointerId);
    const mv=ev=>{v.x=ox+ev.clientX-sx;v.y=oy+ev.clientY-sy;applyView()};
    const up=()=>{view.classList.remove('panning');view.removeEventListener('pointermove',mv);saveUIP()};
    view.addEventListener('pointermove',mv);view.addEventListener('pointerup',up,{once:true});
  });
  view.addEventListener('dblclick',e=>{
    if(e.target!==view&&e.target!==world)return;
    if(UI.mode==='all')return;      // 전체 보기는 보기 전용
    const r=view.getBoundingClientRect(),v=getView(key);
    addBoardCard(kindOf(quickKind()).id,(e.clientX-r.left-v.x)/v.k,(e.clientY-r.top-v.y)/v.k);
  });
  view.addEventListener('wheel',e=>{
    e.preventDefault();const r=view.getBoundingClientRect();
    if(e.ctrlKey||e.metaKey)zoomAt(e.clientX-r.left,e.clientY-r.top,Math.exp(-Math.max(-40,Math.min(40,e.deltaY))*.01));
    else{cancelAnimationFrame(AV.raf);const v=getView(key);v.x-=e.deltaX;v.y-=e.deltaY;applyView();clearTimeout(zoomAt.t);zoomAt.t=setTimeout(saveUIP,300)}
  },{passive:false});
  view.addEventListener('dragover',e=>{if(DRAG){e.preventDefault();view.classList.add('over');
    if(UI.mode!=='all'){const w=world,r=view.getBoundingClientRect(),v=getView(key),wx=(e.clientX-r.left-v.x)/v.k,wy=(e.clientY-r.top-v.y)/v.k,cw=noteW();
      let g=w.querySelector('.bghost');if(!g){g=h('div',{class:'bghost'},'여기에 놓여요');w.append(g)}
      g.style.width=cw+'px';g.style.height=Math.max(CH-30,noteMinH())+'px';g.style.left=Math.round(wx-cw/2)+'px';g.style.top=Math.round(wy-20)+'px'}}});
  view.addEventListener('dragleave',e=>{if(!view.contains(e.relatedTarget)){view.classList.remove('over');view.querySelectorAll('.bghost').forEach(x=>x.remove())}});
  view.addEventListener('drop',e=>{
    e.preventDefault();view.classList.remove('over');if(!DRAG)return;
    const card=cardById(DRAG.id);DRAG=null;if(!card)return;
    const r=view.getBoundingClientRect(),v=getView(key),wx=(e.clientX-r.left-v.x)/v.k,wy=(e.clientY-r.top-v.y)/v.k;
    if(key==='none'&&eff(card).length)return toast('이미 인물에 연결된 카드예요. 인물 보드로 옮겨 주세요');
    act(()=>{if(key!=='none'&&key!=='all'&&!eff(card).includes(key)){card.chars.push(key);card.offChars=card.offChars.filter(x=>x!==key)}
      const B=boardMap(key),old=B[card.id]||{};B[card.id]={x:Math.round(wx-(old.w||noteW())/2),y:Math.round(wy-20),w:old.w||noteW(),h:old.h||CH,z:++S.z}});
  });
  requestAnimationFrame(()=>{
    if(!cards.length){const v=getView(key),{W,H}=viewSize();v.x=W/2;v.y=H/2;v.k=1;v.fit=false;applyView();return}      // 포스트잇이 하나도 없으면 화면 중앙(원점)에 맞춤
    if(UI.mode==='all'){const sig=cards.map(c=>c.id).sort().join(',');if(!UIP.allArr&&UIP.allSig!==sig){reflowAll();getView(key).fit=true}}      // 직접 배치해 둔 게 아니면, 카드가 바뀐 때만 자동 정렬
    if(getView(key).fit)fitView(key);else applyView();applyPinFocus()});
}
/* 전체 보기: 화면 비율에 맞춰 가운데를 중심으로 꽉 차게 가지런히 (서로 가리지 않음).
   처음 열 때 · 카드가 늘거나 줄었을 때만 자동으로 하고, 배치 버튼으로 직접 흩어 놓은 뒤에는 그대로 둠 */
function reflowAll(){
  const els=[...document.querySelectorAll('.bview .kcard.board')],B=S.allBoard,w=noteW(),gap=24;if(!els.length)return;
  const {W,H}=viewSize(),items=els.map(e=>({e,id:e.dataset.id,h:e.offsetHeight||CH,c:(cardById(e.dataset.id)||{}).created||0})).sort((a,b)=>a.c-b.c);
  const asp=W/Math.max(1,H),total=items.reduce((a,i)=>a+i.h+gap,0);
  let best=1,bs=1e9;      // 열 수: 전체 모양이 화면 비율에 가장 가깝게
  for(let n=1;n<=Math.min(14,items.length);n++){const ww=n*(w+gap)-gap,hh=total/n,sc=Math.abs(Math.log((ww/hh)/asp));if(sc<bs){bs=sc;best=n}}
  const n=best,colH=Array(n).fill(0),pos=[];
  items.forEach(it=>{let k=0;for(let j=1;j<n;j++)if(colH[j]<colH[k]-.5)k=j;pos.push([it,k,colH[k]]);colH[k]+=it.h+gap});
  const ww=n*(w+gap)-gap,hh=Math.max(...colH)-gap,ox=-ww/2,oy=-hh/2;      // 가운데(원점)가 전체의 한가운데
  pos.forEach(([it,k,y])=>{const x=ox+k*(w+gap),yy=oy+y;
    B[it.id]=Object.assign(B[it.id]||{},{x:Math.round(x),y:Math.round(yy),w,h:it.h,r:0});it.e.style.left=Math.round(x)+'px';it.e.style.top=Math.round(yy)+'px';it.e.style.width=w+'px';it.e.style.setProperty('--rot','0deg')});
  UIP.allSig=items.map(i=>i.id).sort().join(',');UIP.allArr=false;saveUIP();
}
function addBoardCard(kindId,wx,wy){
  if(UI.mode==='all')return toast('전체 보기에서는 만들 수 없어요 — 인물 보드나 오른쪽 목록에서 만들어 주세요');
  ensureKindVisible(kindId);
  const key=UI.sel,v=getView(key),{W,H}=viewSize(),w=noteW();
  let moveTo=null;
  act(()=>{const card=newCard(kindId,'');if(key!=='none'&&key!=='all')card.chars.push(key);S.cards.unshift(card);
    let x,y;
    if(wx!=null){x=wx-w/2;y=wy-20}        // 더블클릭한 자리
    else{      // 지금 보고 있는 화면 안의 빈자리(중앙에 가장 가까운 곳)에 만들고, 빈자리가 없으면 화면 밖 가까운 빈자리에 만든 뒤 화면을 그쪽으로 옮김
      const hh=Math.max(CH,noteMinH()),gap=14,vx0=-v.x/v.k,vy0=-v.y/v.k,vx1=vx0+W/v.k,vy1=vy0+H/v.k,ccx=(vx0+vx1)/2,ccy=(vy0+vy1)/2;
      const R=rectsOf(key,card.id).filter(r=>r.x<vx1+w&&r.x+r.w>vx0-w&&r.y<vy1+hh&&r.y+(r.h||CH)>vy0-hh);      // 화면 근처 카드만
      const hit=(px,py)=>R.some(r=>px<r.x+r.w+gap&&px+w+gap>r.x&&py<r.y+(r.h||CH)+gap&&py+hh+gap>r.y);
      let best=null,bd=Infinity;
      const m=16,st=Math.max(12,Math.round(18/v.k));
      for(let py=vy0+m;py+hh<=vy1-m;py+=st)for(let px=vx0+m;px+w<=vx1-m;px+=st){
        const d=Math.hypot(px+w/2-ccx,py+hh/2-ccy);if(d>=bd||hit(px,py))continue;bd=d;best=[px,py]}
      if(best){x=best[0];y=best[1]}
      else{const sp=freeSpot(key,w,hh,ccx,ccy,card.id);x=sp.x;y=sp.y;moveTo=[x+w/2,y+hh/2]}
    }
    boardMap(key)[card.id]={x:Math.round(x),y:Math.round(y),w,h:Math.max(CH,noteMinH()),mh:noteMinH(),r:+(Math.random()*10-5).toFixed(1),z:++S.z};UI.focusCard=card.id});
  if(moveTo){const v2=getView(key);animateView(v2,W/2-moveTo[0]*v2.k,H/2-moveTo[1]*v2.k,v2.k)}      // (다시 그리는 동안 바뀐 최신 화면 값을 씀)
  //      // 화면 안에 자리가 없을 때만 새 카드 쪽으로 이동
}
const pinnedRects=key=>{const B=boardMap(key);return boardCards(key).filter(c=>c.pin&&B[c.id]).map(c=>B[c.id])};
const hitRect=(x,y,w,hh,R,m)=>R.some(r=>x<r.x+r.w+m&&x+w+m>r.x&&y<r.y+(r.h||CH)+m&&y+hh+m>r.y);
function tidyBoard(){
  if(UI.mode==='all'){reflowAll();save();scheduleMM();const v=getView('all');v.fit=true;fitView('all',true);return}      // 전체 보기의 정리: 화면에 꽉 차게
  const key=UI.sel,all=boardCards(key),cards=all.filter(c=>!c.pin),v=getView(key),{W}=viewSize(),w=noteW(),R=pinnedRects(key);
  if(!all.length)return toast('카드가 없어요');
  if(!cards.length)return toast('핀 꽂힌 포스트잇은 배치로는 움직이지 않아요');
  const limit=Math.max(W/v.k-80,w*2.2);
  const flow=(ox,oy,obst)=>{      // 줄바꿈하며 가지런히. 핀 꽂힌 카드를 만나면 그 오른쪽으로 비켜 감
    const out=[];let x=ox,y=oy,rowH=0,x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    cards.forEach(c=>{const p=getPos(key,c.id);
      for(let g=0;g<400;g++){
        if(x>ox&&x+p.w>ox+limit){x=ox;y+=rowH+22;rowH=0}
        const hit=obst.find(r=>x<r.x+r.w+18&&x+p.w+18>r.x&&y<r.y+(r.h||CH)+18&&y+p.h+18>r.y);
        if(!hit)break;x=hit.x+hit.w+22;
      }
      out.push([p,x,y]);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+p.w);y1=Math.max(y1,y+p.h);x+=p.w+22;rowH=Math.max(rowH,p.h)});
    return {out,w:x1-x0,h:y1-y0};
  };
  const place=()=>{const bb=flow(0,0,[]);flow(-bb.w/2,-bb.h/2,R).out.forEach(([p,x,y])=>{p.x=Math.round(x);p.y=Math.round(y);p.r=0})};      // 원점 기준
  act(()=>{place()});
  place();const B=boardMap(key);
  document.querySelectorAll('.kcard.board').forEach(el=>{const p=B[el.dataset.id];if(p){el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.setProperty('--rot',(p.r||0)+'deg')}});
  save();scheduleMM();drawStrings();goOrigin(key);
}
// 보드의 원점(0,0)이 "처음 중앙점": 언제든 돌아올 수 있고, 배치는 항상 여기를 기준으로 시작
function goOrigin(key){const v=getView(key||UI.sel),{W,H}=viewSize();animateView(v,W/2,H/2,v.k)}
function scatterBoard(mode){
  if(UI.mode==='all')UIP.allArr=true;      // 직접 배치한 뒤에는 자동 정렬로 덮어쓰지 않음
  const key=UI.sel,all=boardCards(key),cards=all.filter(c=>!c.pin);
  if(!all.length)return toast('카드가 없어요');
  if(!cards.length)return toast('핀 꽂힌 포스트잇은 배치로는 움직이지 않아요');
  const v=getView(key),{W,H}=viewSize(),aspect=W/H,vw=W/v.k,vh=H/v.k,R=pinnedRects(key);
  const items=cards.map(c=>getPos(key,c.id)),n=items.length;
  const rnd=(a,b)=>a+Math.random()*(b-a),shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  const mw=Math.max(...items.map(p=>p.w)),mh=Math.max(...items.map(p=>p.h));
  act(()=>{
    if(mode==='spread'){      // 칸을 넉넉히 잡고, 핀 꽂힌 카드와 겹치는 칸은 빼고, 일부 칸만 골라 살짝 흔들어 배치 (원점 기준)
      const cw0=mw*1.3+30,ch0=mh*1.3+30;let total=Math.ceil(n*1.25),cols=1,rows=1,f=1,cells=[];
      for(let tries=0;tries<10;tries++){
        cols=Math.max(1,Math.ceil(Math.sqrt(total*aspect*ch0/cw0)));rows=Math.ceil(total/cols);
        f=Math.max(.55,Math.min(1,vw*1.15/(cols*cw0),vh*1.15/(rows*ch0)));
        const cw=cw0*f,ch=ch0*f;cells=[];
        for(let i=0;i<cols*rows;i++){const cc=i%cols,rr=Math.floor(i/cols);if(!hitRect((cc-(cols-1)/2)*cw-cw/2,(rr-(rows-1)/2)*ch-ch/2,cw,ch,R,6))cells.push(i)}
        if(cells.length>=n)break;total=Math.ceil(total*1.35);
      }
      const cw=cw0*f,ch=ch0*f;
      shuf(cells).slice(0,n).forEach((cell,i)=>{
        const p=items[i],cc=cell%cols,rr=Math.floor(cell/cols),jx=Math.max(0,(cw-p.w)/2-8),jy=Math.max(0,(ch-p.h)/2-8);
        p.x=Math.round((cc-(cols-1)/2)*cw-p.w/2+rnd(-jx,jx));p.y=Math.round((rr-(rows-1)/2)*ch-p.h/2+rnd(-jy,jy));
        p.r=+rnd(-3.5,3.5).toFixed(1);p.z=++S.z});
    }else{      // 랜덤: 원점 근처 영역에 무작위로 (핀 꽂힌 카드 자리는 피함)
      const rw=Math.min(Math.sqrt(n*mw*mh*1.1*aspect),vw*1.15),rh=Math.min(rw/aspect,vh*1.15);
      items.forEach(p=>{let x=0,y=0;for(let t=0;t<40;t++){x=Math.round(rnd(-rw/2,rw/2)-p.w/2);y=Math.round(rnd(-rh/2,rh/2)-p.h/2);if(!hitRect(x,y,p.w,p.h,R,10))break}
        p.x=x;p.y=y;p.r=+rnd(-7,7).toFixed(1);p.z=++S.z});
    }
  });
  goOrigin(key);
}

registerMidView({id:'board',order:30,match:onBoard,appClass:()=>UI.mode==='story'?'m-story':'m-tl',render:renderBoard});      // 구상 · 전체 보기
