/* ---------- 캐릭터 목표: 장기 목표 + 단기 목표 체크리스트 (달성 · 포기는 보관 목록으로) ---------- */
const goalDate=t=>{const d=new Date(t||Date.now());return `${d.getMonth()+1}/${d.getDate()}`};
function refreshGoalStrip(c){const old=document.querySelector('.goalstrip');if(old&&UI.mode==='story'&&UI.sel===c.id)old.replaceWith(goalStripEl(c))}
function goalSection(c){
  c.goals=Array.isArray(c.goals)?c.goals:[];
  const live=c.goals.filter(g=>g.state==='active'),arch=c.goals.filter(g=>g.state!=='active').sort((a,b)=>(b.at||0)-(a.at||0));
  const open=!!(UIP.ga&&UIP.ga[c.id]);
  const row=g=>h('div',{class:'gl'},
    h('button',{class:'gck',title:'달성! 체크하면 아래 보관 목록으로 옮겨져요',onclick:()=>act(()=>{g.state='done';g.at=Date.now()})}),
    h('input',{class:'gt',value:g.text,placeholder:'목표',oninput:e=>edit(()=>{g.text=e.target.value;refreshGoalStrip(c)})}),
    h('button',{class:'quiet gdrop',title:'이루지 못하고 접기 (포기로 보관해요)',onclick:()=>act(()=>{g.state='dropped';g.at=Date.now()})},'포기'),
    h('button',{class:'x gx',title:'삭제',onclick:()=>act(()=>{c.goals=c.goals.filter(x=>x!==g)})},'✕'));
  const add=h('input',{class:'goal-add',placeholder:'지금 이루려는 것을 쓰고 Enter',onkeydown:e=>{
    if(e.key!=='Enter'||e.isComposing)return;const v=add.value.trim();if(!v)return;
    act(()=>c.goals.push({id:uid(),text:v,state:'active',created:Date.now()}));
    setTimeout(()=>{const i=document.querySelector('#sheet .goal-add');if(i)i.focus()},30)}});
  const archRow=g=>h('div',{class:'gl arch '+g.state},
    h('span',{class:'gst',title:g.state==='done'?'달성':'포기'},g.state==='done'?'✓':'✕'),
    h('span',{class:'gt'},g.text||'(빈 목표)'),h('small',{class:'muted'},`${g.state==='done'?'달성':'포기'} ${goalDate(g.at)}`),
    h('button',{class:'quiet gback',title:'다시 진행 중으로',onclick:()=>act(()=>{g.state='active';delete g.at})},'되돌리기'),
    h('button',{class:'x gx',title:'삭제',onclick:()=>act(()=>{c.goals=c.goals.filter(x=>x!==g)})},'✕'));
  const gk=c.id+':__goal',gopen=U2()?UIP.gc[gk]===false:!UIP.gc[gk];      // 새 디자인에서는 처음에 접혀 있음
  const gh=U2()
    ?h('div',{class:'gh sfold2',title:gopen?'접기':'펴기',onclick:()=>{UIP.gc[gk]=gopen;saveUIP();renderSheet();fitAll($('sheet'))}},icon(gopen?'chevD':'chevR'),h('span',{},'목표'),h('small',{},(c.longGoal?1:0)+live.length))
    :h('div',{class:'gh',style:'cursor:pointer;user-select:none',title:gopen?'접기':'펴기',onclick:()=>{UIP.gc[gk]=gopen;saveUIP();renderSheet();fitAll($('sheet'))}},(gopen?'▾ ':'▸ ')+'🎯 목표',gopen?null:h('span',{class:'muted',style:'font-weight:400;margin-left:8px'},c.longGoal?c.longGoal.slice(0,24):`단기 ${live.length}개`));
  if(!gopen)return h('div',{class:'goalsec'},gh);
  return h('div',{class:'goalsec'},
    gh,
    h('label',{class:'fl',title:'한 번 정하면 잘 안 바뀌는, 끝까지 이루고 싶은 것'},'장기 목표',h('span',{class:'muted'},'한 번 정하면 잘 안 바뀌는, 끝까지 이루고 싶은 것')),
    h('textarea',{class:'ghost box autofit goal-long',rows:1,placeholder:'예: 빚에서 벗어나 내 가게를 갖는다',style:'resize:none;overflow:hidden;width:100%;box-sizing:border-box;display:block',oninput:e=>{edit(()=>c.longGoal=e.target.value);fitOne(e.target);refreshGoalStrip(c)}},c.longGoal||''),
    h('label',{class:'fl',style:'margin-top:10px',title:'지금 이루려는 것 · 현황에 따라 바뀌어요'},'단기 목표',h('span',{class:'muted'},'지금 이루려는 것 · 현황에 따라 바뀌어요')),
    h('div',{class:'glist'},...live.map(row),!live.length?h('div',{class:'muted',style:'padding:4px 2px 2px'},'진행 중인 단기 목표가 없어요'):null),
    h('div',{class:'gadd'},add),
    h('button',{class:'quiet garch-t',onclick:()=>{UIP.ga=UIP.ga||{};UIP.ga[c.id]=!open;saveUIP();renderSheet();fitAll($('sheet'))}},`${open?'▾':'▸'} 달성 · 포기 보관 (${arch.length})`),
    open?h('div',{class:'glist'},...(arch.length?arch.map(archRow):[h('div',{class:'muted',style:'padding:4px 2px'},'아직 보관된 목표가 없어요')])):null);
}
function goalStripEl(c){      // 보드 위: 목표가 없으면 작은 알약, 있으면 한 줄 (장기 · 진행 중인 단기)
  const live=(c.goals||[]).filter(g=>g.state==='active'),none=!c.longGoal&&!live.length;
  const go=()=>{UIP.cl.sheet=false;saveUIP();renderAll();setTimeout(()=>{const t=document.querySelector('#sheet .goal-long');if(t){t.scrollIntoView({block:'center'});t.focus()}},60)};
  if(none)return h('div',{class:'goalstrip mini'},h('button',{class:'gpill',title:'이 캐릭터의 장기 · 단기 목표 적기',onclick:go},EM('🎯 ','target'),'목표 적기'));
  return h('div',{class:'goalstrip',title:'눌러서 목표 고치기',onclick:go},
    h('span',{class:'gtag'},EM('🎯 ','target'),'장기'),
    h('span',{class:'lg'+(c.longGoal?'':' empty')},c.longGoal||'아직 없어요'),
    live.length?h('span',{class:'gtag gtag2'},'단기'):null,
    ...live.slice(0,3).map(g=>h('span',{class:'sg'},g.text||'(빈 목표)')),
    live.length>3?h('span',{class:'muted'},`+${live.length-3}`):null);
}
