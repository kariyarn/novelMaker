/* 인물 등장표: 보고 있는 범위(전체 / 묶음 / 한 화)에서 실제로 등장한 인물만, 많이 나온 순으로 */
function renderMatrix(m,lo,hi){
  const E=S.episodes,withSet=!!UIP.mxSet,gs=UIP.gs===undefined?10:UIP.gs,sc=UI.tlScope;
  const pool=[...S.characters.filter(c=>c.kind!=='setting'),...(withSet?S.characters.filter(c=>c.kind==='setting'):[])];
  const shown=new Set(pool.map(c=>c.id));
  const cardsIn=ep=>ep.cardIds.map(cardById).filter(c=>c&&kindOk(c));
  const CM=new Map();      // 화마다 인물별 카드 수를 한 번만 세어 둠
  const cmap=ep=>{let m=CM.get(ep);if(m)return m;m=new Map();cardsIn(ep).forEach(c=>{const e=eff(c).filter(x=>shown.has(x));if(!e.length)m.set(null,(m.get(null)||0)+1);e.forEach(x=>m.set(x,(m.get(x)||0)+1))});CM.set(ep,m);return m};
  const cnt=(ep,id)=>cmap(ep).get(id)||0;
  const lastAny=E.reduce((a,e,i)=>e.cardIds.length?i:a,-1);
  const go=(id,idx)=>{UIP.tlMode='line';UI.tlChar=id===null?'all':id;if(!(idx>=lo&&idx<hi))UI.tlScope=null;saveUIP();renderAll();
    setTimeout(()=>{const el=document.querySelector(`.tlseg[data-ep="${idx}"]`);if(el){el.scrollIntoView({block:'start',behavior:'smooth'});flashEl(el)}},80)};
  if(lastAny<0){m.append(h('div',{class:'tlmx'},h('div',{class:'empty'},'아직 화에 배치한 카드가 없어요.',h('br'),h('button',{class:'on',style:'margin:10px 0',onclick:()=>{UIP.tlMode='kanban';saveUIP();renderAll()}},'칸반에서 카드 배치하기'),h('br'),'오른쪽 목록의 카드를 화로 끌어다 놓으면, 인물별 등장 현황이 여기에 자동으로 정리돼요.')));return}
  // 열: 전체를 볼 때는 묶음별로 접을 수 있음 (접으면 한 칸으로 합쳐서 보여줌)
  const groups=tlGroups(),grouped=gs>0&&!sc&&groups.length>0,cols=[];
  if(grouped)groups.forEach(([a,b],gi)=>{if(UIP.tg[gi])cols.push({g:gi,a,b});else for(let i=a;i<b;i++)cols.push({idx:i,ep:E[i],g:gi,first:i===a})});
  else for(let i=lo;i<hi;i++)cols.push({idx:i,ep:E[i]});
  const colN=(c,id)=>c.ep?cnt(c.ep,id):E.slice(c.a,c.b).reduce((x,ep)=>x+cnt(ep,id),0);
  // 행: 이 범위에서 한 번이라도 등장한 인물만, 많이 나온 순
  let rows0=[...pool.map(c=>({id:c.id,name:c.name,color:c.color,icon:c.icon,sq:c.kind==='setting'})),{id:null,name:withSet?'연결 없음':'인물 없음',color:'var(--sub)',none:true}].map(r=>{
    let total=0,last=-1;for(let i=lo;i<hi;i++){const n=cnt(E[i],r.id);total+=n;if(n)last=i}return {...r,total,last}}).filter(r=>r.total>0);
  const named=rows0.filter(r=>!r.none).sort((x,y)=>y.total-x.total||x.name.localeCompare(y.name,'ko')),none=rows0.filter(r=>r.none);
  const lim=UIP.mxN===undefined?15:UIP.mxN,cut=lim>0&&named.length>lim?named.length-lim:0;
  const rows=[...(lim>0?named.slice(0,lim):named),...none];
  const toggleG=gi=>{UIP.tg[gi]=!UIP.tg[gi];saveUIP();renderAll()};
  const gb=c=>c.ep&&gs>0&&c.idx>0&&c.idx%gs===0?' gb':'';
  const trs=[];
  if(grouped){const spans=[];cols.forEach(c=>{const l=spans[spans.length-1];if(l&&l.g===c.g)l.n++;else spans.push({g:c.g,n:1})});
    trs.push(h('tr',{class:'gh'},h('th',{class:'corner'},''),...spans.map(sp=>{const [a,b]=groups[sp.g],col=!!UIP.tg[sp.g];return h('th',{class:'ghc gb',colspan:sp.n,title:col?'눌러서 펴기':'눌러서 접기',onclick:()=>toggleG(sp.g)},(col?'▸ ':'▾ ')+grpLab(a,b))})))}
  trs.push(h('tr',{},h('th',{class:'corner'},'인물 · 화'),...cols.map(c=>c.ep?h('th',{class:'eh'+gb(c),title:`${c.idx+1}화${c.ep.title?' · '+c.ep.title:''}`},c.idx+1):h('th',{class:'eh gb',title:'접힌 묶음 (합계)',onclick:()=>toggleG(c.g)},c.b-c.a===1?`${c.a+1}`:`${c.a+1}–${c.b}`))));
  const body=rows.map(r=>h('tr',{},h('th',{class:'rh'},h('span',{class:'mrd'+(r.sq?' sq':''),style:`background:${r.color}`}),r.icon?r.icon+' ':'',r.name,h('span',{class:'meta'},`${r.total}장 · 마지막 ${r.last+1}화`)),
    ...cols.map(c=>{const n=colN(c,r.id);return h('td',{class:'c'+(n?' on':'')+gb(c)+(c.ep?'':' gb'),title:n?`${c.ep?c.idx+1+'화':grpLab(c.a,c.b)} · ${r.name} ${n}장`:'',onclick:n&&c.ep?()=>go(r.id,c.idx):(n?()=>toggleG(c.g):null)},n?h('span',{class:'mdot',style:`background:${r.color};opacity:${.5+Math.min(n,3)*.16}`},n>1?n:''):null)})));
  const foot=h('tr',{class:'tot'},h('th',{class:'rh'},'카드 수'),...cols.map(c=>h('td',{class:'c'+gb(c)+(c.ep?'':' gb')},(c.ep?cardsIn(c.ep).length:E.slice(c.a,c.b).reduce((x,ep)=>x+cardsIn(ep).length,0))||'')));
  const nOpts=[['5','5명'],['10','10명'],['15','15명'],['30','30명'],['0','전체']];
  m.append(h('div',{class:'tlmx'},
    h('div',{class:'mxbar'},h('span',{class:'muted'},'많이 등장한 순 · 표시 인원'),sel(nOpts,String(lim),v=>{UIP.mxN=+v;saveUIP();renderMid()}),
      cut?h('span',{class:'muted'},`등장한 ${named.length}명 중 ${cut}명은 숨겨져 있어요`):h('span',{class:'muted'},`이 범위에 등장한 ${named.length}명`),
      cut?h('button',{class:'quiet',onclick:()=>{UIP.mxN=0;saveUIP();renderMid()}},'모두 보기'):null),
    rows.length?h('table',{class:'mx'},h('thead',{},...trs),h('tbody',{},...body,foot)):h('div',{class:'empty'},'이 범위에는 등장한 인물이 없어요.'),
    h('div',{class:'muted',style:'padding:10px 2px'},'점을 누르면 그 인물의 그 화로 이동해요 · 점 속 숫자는 그 화에서 등장한 횟수예요'+(grouped?' · 위의 묶음 이름을 누르면 접고 펴요':'')+(withSet?' · 네모 표시는 설정 노트예요':''))));
}
