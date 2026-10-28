/* ---------- 2) 전체 검색 (⌘F) ---------- */
let SPOT=null;
function closeSearch(){if(SPOT){SPOT.remove();SPOT=null}}
const normQ=t=>String(t||'').toLowerCase();
function snippet(text,toks,len=80){
  const t=String(text||'').replace(/\s+/g,' ').trim(),lo=normQ(t);let i=-1;
  for(const k of toks){const j=lo.indexOf(k);if(j>=0&&(i<0||j<i))i=j}
  const a=Math.max(0,(i<0?0:i)-22);return (a>0?'…':'')+t.slice(a,a+len)+(t.length>a+len?'…':'');
}
function markNodes(text,toks){
  const frag=document.createDocumentFragment(),lo=normQ(text);let i=0;
  const hits=[];toks.forEach(k=>{let p=0;while(k&&(p=lo.indexOf(k,p))>=0){hits.push([p,p+k.length]);p+=k.length}});
  hits.sort((a,b)=>a[0]-b[0]);
  hits.forEach(([a,b])=>{if(a<i)return;if(a>i)frag.append(text.slice(i,a));frag.append(h('mark',{},text.slice(a,b)));i=b});
  if(i<text.length)frag.append(text.slice(i));return frag;
}
function runSearch(q){
  const toks=normQ(q).split(/\s+/).filter(Boolean),out=[];if(!toks.length)return {out,toks};
  const has=hay=>{const lo=normQ(hay);return toks.every(k=>lo.includes(k))};
  S.characters.forEach(c=>{
    const base=[c.name,(c.aliases||[]).join(' '),c.role,c.summary,c.memo,c.longGoal,(c.goals||[]).map(g=>g.text).join(' ')].join(' ');
    if(has(base))out.push({kind:c.kind==='setting'?'설정':'캐릭터',title:c.name,sub:snippet([c.role,c.summary,c.memo,c.longGoal?'장기 목표 '+c.longGoal:'',(c.goals||[]).map(g=>g.text).join(' ')].filter(Boolean).join(' · '),toks),color:c.color,go:()=>{UI.mode='story';setSel(c.id)}});
    else (c.fields||[]).some(f=>{if(has(f.label+' '+f.value)){out.push({kind:c.kind==='setting'?'설정':'캐릭터',title:c.name+' · '+f.label,sub:snippet(f.value,toks),color:c.color,go:()=>{UI.mode='story';UIP.cl.sheet=false;setSel(c.id);UIP.cl.sheet=false;renderAll()}});return true}});
  });
  S.cards.forEach(c=>{if(has(c.text))out.push({kind:kindOf(c.kind).name,title:snippet(c.text,toks,60),sub:eff(c).map(id=>charById(id).name).join(', ')||'미분류',color:kindOf(c.kind).color,card:c,go:()=>goToCard(c.id)})});
  S.episodes.forEach((e,i)=>{if(has((e.title||'')+' '+(e.memo||'')))out.push({kind:'화',title:`${i+1}화${e.title?' · '+e.title:''}`,sub:snippet(e.memo,toks),color:'var(--acc)',go:()=>{UI.mode='tl';UI.tlScope=null;if((UIP.tlMode||'kanban')==='matrix')UIP.tlMode='kanban';renderAll();setTimeout(()=>{const col=document.querySelector(`[data-ep="${i}"]`);if(col){col.scrollIntoView({inline:'center',block:'start',behavior:'smooth'});flashEl(col)}},60)}})});
  const order={'캐릭터':0,'설정':0,'화':1};
  out.sort((a,b)=>((order[a.kind]??2)-(order[b.kind]??2)));
  return {out:out.slice(0,60),toks};
}
function goToCard(id){      // 카드가 있는 보드로 가서 보여줌 (필터에 가려져 있으면 보기를 '전체'로)
  const c=cardById(id);if(!c)return;
  UI.folderView=null;
  if(!(onBoard()&&validSel()&&cardsOf(UI.sel).some(x=>x.id===id))){
    if(UI.mode==='tl')UI.mode='story';
    const ids=eff(c);UI.sel=c.discarded?'grave':(ids[0]||'none');      // 무덤 카드는 무덤 보드에서
   sheetFor(UI.sel);saveUIP();
  }
  if(onBoard()&&!boardCards(UI.sel).some(x=>x.id===id)){S.settings.useFilter='all';S.settings.kindFilter=[];toast('보기를 “전체”로 바꿨어요')}
  UI.pused='all';renderAll();setTimeout(()=>revealCard(id),60);
}
function openSearch(){
  closeSearch();closePop();
  const inp=h('input',{class:'spotin',placeholder:'카드 · 캐릭터 · 설정 · 화 검색   (↑↓ 이동 · Enter 열기 · Esc 닫기)',autofocus:true});
  const list=h('div',{class:'sres'}),box=h('div',{class:'spotbox'},inp,list),ov=h('div',{class:'spot',onmousedown:e=>{if(e.target===ov)closeSearch()}},box);
  let res=[],cur=0;
  const draw=()=>{
    list.textContent='';
    const {out,toks}=runSearch(inp.value);res=out;cur=Math.min(cur,Math.max(0,res.length-1));
    if(!inp.value.trim()){list.append(h('div',{class:'sempty'},'찾고 싶은 말을 입력하세요. 카드 글, 캐릭터 시트, 설정 메모, 화 제목까지 한 번에 찾아요.'));return}
    if(!res.length){list.append(h('div',{class:'sempty'},'결과가 없어요.'));return}
    res.forEach((r,i)=>{
      const row=h('div',{class:'sr'+(i===cur?' on':''),onmouseenter:()=>{cur=i;[...list.children].forEach((x,j)=>x.classList.toggle('on',j===i))},onclick:()=>{closeSearch();r.go()}},
        h('i',{class:'sdot',style:`background:${r.color}`}),h('span',{class:'stag'},r.kind),
        h('span',{class:'sbody'},h('span',{class:'stitle'},markNodes(r.title,toks)),r.sub?h('span',{class:'ssub'},markNodes(r.sub,toks)):null));
      list.append(row);
    });
  };
  inp.addEventListener('input',()=>{cur=0;draw()});
  inp.addEventListener('keydown',e=>{
    if(e.isComposing)return;
    if(e.key==='ArrowDown'){e.preventDefault();cur=Math.min(res.length-1,cur+1);draw();list.children[cur]&&list.children[cur].scrollIntoView({block:'nearest'})}
    else if(e.key==='ArrowUp'){e.preventDefault();cur=Math.max(0,cur-1);draw();list.children[cur]&&list.children[cur].scrollIntoView({block:'nearest'})}
    else if(e.key==='Enter'){e.preventDefault();const r=res[cur];if(r){closeSearch();r.go()}}
    else if(e.key==='Escape'){e.preventDefault();closeSearch()}
  });
  document.body.append(ov);SPOT=ov;draw();inp.focus();
}
