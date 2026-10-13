/* 작은 팝오버 메뉴 */
let POP=null;
function closePop(){if(POP){POP.remove();POP=null}}
document.addEventListener('pointerdown',e=>{if(POP&&!POP.contains(e.target)&&!e.target.closest('[data-pop]'))closePop()},true);
addEventListener('blur',closePop);
function popMenu(btn,items){
  if(POP&&POP._btn===btn){closePop();return}
  closePop();
  const m=h('div',{class:'pop'});m._btn=btn;
  const build=()=>{
    m.textContent='';
    (typeof items==='function'?items():items).forEach(it=>{
      if(it==='sep')m.append(h('div',{class:'psep'}));
      else if(it.title)m.append(h('div',{class:'ptitle'},it.title));
      else if(it.node)m.append(it.node);
      else m.append(h('button',{class:'pi'+(it.on?' on':''),onclick:()=>{if(it.keep){it.fn();build()}else{closePop();it.fn()}}},h('span',{class:'ck'},it.on?'✓':''),it.sw?h('i',{class:'psw',style:`background:${it.sw}`}):null,h('span',{class:'pl'},it.label),it.hint?h('kbd',{},it.hint):null));
    });
  };
  build();
  document.body.append(m);
  const r=btn.getBoundingClientRect(),mw=m.offsetWidth;
  const mh=m.offsetHeight,up=r.bottom+6+mh>innerHeight-8&&r.top-6-mh>8;      // 아래 자리가 없으면 위로
  m.style.left=Math.max(8,Math.min(innerWidth-mw-8,btn.closest&&btn.closest('.bdock')?r.left+r.width/2-mw/2:r.right-mw))+'px';m.style.top=(up?r.top-6-mh:r.bottom+6)+'px';
  POP=m;
}
