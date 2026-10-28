/* ---------- 카드 (보드 / 목록 / 타임라인 공통) ---------- */
let DRAG=null;
const kdark=col=>`color-mix(in srgb,${col} 62%,#555)`;      // 흰 배경에서도 보이는 분류 점 색
function kindSelect(card){
  const k=kindOf(card.kind);
  const s=sel([...S.kinds.map(k=>[k.id,k.name]),['__new','＋ 분류 추가…']],card.kind,async v=>{
    if(v==='__new'){
      const name=((await askText('새 카드 분류 이름'))||'').trim();if(!name)return renderAll();
      if(S.kinds.some(k=>nameKey(k.name)===nameKey(name))){toast('이미 있는 분류예요');return renderAll()}
      act(()=>{const kk={id:uid(),name,color:KIND_PAL[S.kinds.length%KIND_PAL.length],icon:'●',key:HOTKEYS.find(x=>x&&!S.kinds.some(k=>k.key===x))||''};S.kinds.push(kk);card.kind=kk.id});
    }else{ensureKindVisible(v);act(()=>{stamp(card);card.kind=v;delete card.color;if(kindOf(v).colorMode==='random')card.color=randomCardColor()})}
  });
  return h('label',{class:'kpill',style:`--kd:${kdark(cardColor(card))}`},h('i',{}),s);
}
function starsEl(card){
  return h('span',{class:'stars',title:'쓰고 싶은 정도 (다시 누르면 해제)'},...[1,2,3].map(n=>h('span',{onclick:()=>act(()=>{stamp(card);card.stars=card.stars===n?0:n})},card.stars>=n?'★':'☆')));
}
function footEl(card){
  const ids=eff(card);
  const chips=ids.map(id=>{const c=charById(id),auto=!card.chars.includes(id);
    return h('span',{class:'kchip'+(auto?' auto':''),style:`--cc:${c.color}`,title:auto?'이름이 글에 있어서 자동 연결됨':'직접 연결'},c.name,
      h('button',{title:'연결 해제',onclick:()=>act(()=>{stamp(card);card.chars=card.chars.filter(x=>x!==id);card.autoChars=card.autoChars.filter(x=>x!==id);if(!card.offChars.includes(id))card.offChars.push(id)})},'✕'))});
  const rest=S.characters.filter(c=>!ids.includes(c.id));
  const add=rest.length?sel([['','＋ 인물'],...rest.map(c=>[c.id,c.name])],'',v=>{if(v)act(()=>{stamp(card);if(!card.chars.includes(v))card.chars.push(v);card.offChars=card.offChars.filter(x=>x!==v)})},'kadd'):null;
  return h('div',{class:'kfoot'},...chips,add);
}
function refreshFoot(id){const c=cardById(id);document.querySelectorAll(`.kcard[data-id="${id}"] .kfoot`).forEach(f=>f.replaceWith(footEl(c)));document.querySelectorAll(`.kcard.board[data-id="${id}"]`).forEach(syncOne)}
async function delCard(id){
  const c=cardById(id);if(!c)return;
  const used=episodeOf(id),u=used?`${used.i+1}화에 사용 중`:'',pn=c.pin?'핀을 꽂은 중요한 카드':'';
  const why=u&&pn?`${u}이고, ${pn}예요`:(u?`${u}이에요`:`${pn}예요`);
  if((u||pn)&&!await askConfirm(`이 카드는 ${why}.\n삭제하면 ${used?'타임라인에서도 빠지고 ':''}휴지통으로 가요. 삭제할까요?`,{ok:'삭제',danger:true}))return;
  const empty=!(c.text||'').trim();      // 빈 포스트잇은 휴지통을 거치지 않고 바로 지움 (되돌리기는 돼요)
  act(()=>{if(!empty)S.trash.push({id:uid(),type:'card',data:c,at:Date.now()});S.cards=S.cards.filter(x=>x!==c);S.episodes.forEach(e=>e.cardIds=e.cardIds.filter(x=>x!==id))});
  toast(empty?'빈 포스트잇을 지웠어요':'휴지통으로 보냈어요',{undo:true});
}
function dropIfEmpty(id){      // 글을 다 쓰고 나왔는데 비어 있으면 저장하지 않고 지움 (휴지통 · 되돌리기 기록 없이)
  setTimeout(()=>{
    if(!document.hasFocus())return;      // 다른 앱으로 잠깐 넘어간 것뿐
    const c=cardById(id),a=document.activeElement;if(!c||(c.text||'').trim())return;
    if(a&&a.closest&&a.closest(`.kcard[data-id="${id}"]`))return;      // 같은 카드 안에서 다시 쓰는 중
    S.cards=S.cards.filter(x=>x!==c);detach([id]);
    if(SELCARD===id)SELCARD=null;idxClear();commit();
  },0);
}
/* 따옴표·대괄호 강조: 글자 모양은 그대로 두고 배경 표시만 겹쳐서 보여줌 */
const HLRE=/"(?:[^"\n]|\n(?!\n)){1,300}"|“(?:[^”\n]|\n(?!\n)){1,300}”|(?<![\p{L}\p{N}])'[^'\n]+'|‘[^’\n]+’|「(?:[^」\n]|\n(?!\n)){1,300}」|『(?:[^』\n]|\n(?!\n)){1,300}』|《(?:[^》\n]|\n(?!\n)){1,300}》|\[[^\]\n]+\]|`[^`\n]+`/gu;
function hlFill(box,text){
  box.textContent='';
  const typ=t=>t==='['?'hb':t==='`'?'hc':(t==="'"||t==='‘')?'hs':'hq',groups=[];
  const kindOfQ=(m,cls)=>{if(cls==='hs')return 'th';const t=m.slice(1,-1).trim().replace(/[\s"”’'」』》]+$/,'');
    if(/(\.{2,}|…)\s*[!?]+$/.test(t))return /\?/.test(t.slice(-2))?(/!/.test(t.slice(-2))?'qe':'eq'):'ge';      // …! 이를 악문 외침 · …? 어리둥절
    if(/(\?!|!\?)$/.test(t))return 'qe';if(/(\.{2,}|…)$/.test(t))return 'el';if(/!$/.test(t))return 'ex';if(/\?$/.test(t))return 'q';return 'dot'};
  for(const m of text.matchAll(HLRE)){
    const cls=typ(m[0][0]),k=cls==='hq'||cls==='hs'?kindOfQ(m[0],cls):'';
    // 줄이 바뀌면 다른 사람의 말이므로 풍선도 따로
    groups.push({i:m.index,e:m.index+m[0].length,cls,k});
  }
  let p=0;
  groups.forEach(g=>{if(g.i>p)box.append(text.slice(p,g.i));box.append(h('span',{class:'hl '+g.cls,'data-k':g.k||'','data-mid':(g.cls==='hq'||g.cls==='hs')&&/\S/.test(text.slice(text.lastIndexOf('\n',g.i-1)+1,g.i))?'1':'','data-tl':(g.i>0&&!/\s/.test(text[g.i-1]))?'1':'','data-tr':(g.e<text.length&&!/\s/.test(text[g.e]))?'1':''},text.slice(g.i,g.e)));p=g.e});
  if(p<text.length)box.append(text.slice(p));
  if(text===''||text.endsWith('\n'))box.append('​');
}
const PIN_COLORS=[['black','검정','#1a1a1c','#6a6a70','#050506'],['red','빨강','#d8402e','#ff9d8c','#85180c'],['blue','파랑','#2f6fd0','#8fb7ff','#10306b'],['green','초록','#2e8b57','#8fe0b0','#0f4527'],['yellow','노랑','#e0a526','#ffe08a','#7a5300'],['white','흰색','#e6e6e6','#ffffff','#9a9a9a'],['pink','분홍','#e0608f','#ffb3cc','#7a1f40']];
(function(){      // 색마다 그라데이션을 만들어 둠
  const d=document.querySelector('body>svg defs');if(!d)return;
  d.insertAdjacentHTML('beforeend',`<linearGradient id="pinGold" x1="0" x2="1"><stop offset="0" stop-color="#8a6d2b"/><stop offset=".5" stop-color="#f1d98a"/><stop offset="1" stop-color="#7a5f22"/></linearGradient>`+PIN_COLORS.map(([k,n,b,l,dk])=>
    `<radialGradient id="pinHead_${k}" cx=".34" cy=".3" r=".85"><stop offset="0" stop-color="${l}"/><stop offset=".42" stop-color="${b}"/><stop offset="1" stop-color="${dk}"/></radialGradient>`+
    `<linearGradient id="pinBody_${k}" x1="0" x2="1"><stop offset="0" stop-color="${dk}"/><stop offset=".3" stop-color="${l}" stop-opacity=".85"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${dk}"/></linearGradient>`).join(''));
})();
const pinSvg=k=>{const pc=PIN_COLORS.find(x=>x[0]===k)||PIN_COLORS[0],kk=pc[0],dk=pc[4];
  // 사진 속 압정: 머리판 · 기둥 · 더 넓은 받침판 · 은색 바늘 (위에서 아래로 꽂힌 모습)
  return `<svg viewBox="0 0 30 52"><ellipse cx="21" cy="49.6" rx="9.5" ry="2.7" fill="url(#pinShadow)"/>`+
  `<path d="M14.1 40.5H15.9L15.3 51.2H14.7Z" fill="url(#pinMetal)"/>`+
  `<path d="M10.4 11.5H19.6L21 34H9Z" fill="url(#pinBody_${kk})"/><rect x="11.6" y="12" width="1.8" height="21" rx=".9" fill="rgba(255,255,255,.3)"/>`+
  `<path d="M2.6 36C2.6 33.3 8 31.8 15 31.8S27.4 33.3 27.4 36V38.2C27.4 40.9 22 42.4 15 42.4S2.6 40.9 2.6 38.2Z" fill="url(#pinBody_${kk})"/>`+
  `<path d="M2.6 36C2.6 38.7 8 40.2 15 40.2S27.4 38.7 27.4 36C27.4 38.9 22 40.4 15 40.4S2.6 38.9 2.6 36Z" fill="${dk}" opacity=".55"/>`+
  `<ellipse cx="15" cy="35.6" rx="12.4" ry="3.7" fill="url(#pinHead_${kk})"/><ellipse cx="15" cy="35.9" rx="4.2" ry="1.2" fill="${dk}" opacity=".5"/>`+
  `<path d="M4 6.4C4 3.4 9 1.6 15 1.6S26 3.4 26 6.4V8.4C26 11 21 12.4 15 12.4S4 11 4 8.4Z" fill="url(#pinBody_${kk})"/>`+
  `<ellipse cx="15" cy="6" rx="11" ry="3.7" fill="url(#pinHead_${kk})"/>`+
  `<path d="M5.6 5.2C7.6 3.8 11 3.1 15 3.1" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.2" stroke-linecap="round"/>`+
  `<path d="M3.3 36.2C5 34.4 9 33.4 15 33.4" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.1" stroke-linecap="round"/></svg>`};
/* 우측 목록: 줄로 이어진 카드를 태그로 표시, 누르면 그 노트를 보여줌 */
function linksEl(card){
  const cs=[...new Set(S.links.filter(l=>l.a===card.id||l.b===card.id).map(l=>l.a===card.id?l.b:l.a))].map(cardById).filter(Boolean);
  if(!cs.length)return null;
  const ex=t=>{const x=(t||'').replace(/\s+/g,' ').trim();return x?(x.length>16?x.slice(0,16)+'…':x):'(빈 카드)'};
  return h('div',{class:'klinks'},h('span',{class:'klabel'},EM('🧵 ','link'),'이어진 노트'),...cs.map(c=>h('button',{class:'klink',title:(c.text||'(빈 카드)')+' — 눌러서 보기',onclick:e=>{e.stopPropagation();revealCard(c.id)}},ex(c.text))));
}
function flashEl(el){if(!el)return;el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1800)}
$('pool').addEventListener('scroll',()=>{const p=$('pool');if(p.scrollTop+p.clientHeight>p.scrollHeight-320){const b=p.querySelector('.morebtn');if(b)b.click()}});
function revealCard(id){
  const c=cardById(id);if(!c)return;
  if(poolClosed()){setPoolClosed(false);saveUIP();applyLayout();renderPool()}
  let el=document.querySelector(`#pool .kcard[data-id="${id}"]`);
  if(!el){UI.pchar='';UI.pq='';UI.pused='all';UI.poolLimit=1e9;(UI.pnew=UI.pnew||new Set()).add(id);ensureKindVisible(c.kind);renderPool();el=document.querySelector(`#pool .kcard[data-id="${id}"]`)}
  if(el){el.scrollIntoView({block:'center',behavior:'smooth'});flashEl(el)}
  if(onBoard()&&validSel()){      // 지금 보고 있는 보드에 있으면 그쪽도 가운데로
    const p=boardMap(UI.sel)[id];
    if(p&&boardCards(UI.sel).some(x=>x.id===id)){
      const v=getView(UI.sel),{W,H}=viewSize();animateView(v,W/2-(p.x+p.w/2)*v.k,H/2-(p.y+(p.h||CH)/2)*v.k,v.k);
      setTimeout(()=>flashEl(document.querySelector(`.kcard.board[data-id="${id}"]`)),360);
    }
  }
}
/* 말 블록: 줄바꿈과 상관없이 한 덩어리의 코드 블록처럼 배경을 그림 (글자 뒤 별도 레이어) */
function hlBlocks(wrap){if(wrap)hlBatch([wrap])}
// 측정은 화면 밖 복제본(기울기·확대 없음)에서 한꺼번에: 읽기 → 쓰기 → 읽기 → 쓰기 순서로 모아 레이아웃 계산을 한 번만
// 화면(위아래 700px 여유) 밖 카드는 건너뛰고, 가까워지면 그때 그림
const HLIO=new IntersectionObserver(es=>{const ws=es.filter(e=>e.isIntersecting).map(e=>(HLIO.unobserve(e.target),e.target)).filter(w=>w.isConnected);if(ws.length)hlBatch(ws,true)},{rootMargin:'700px'});
function hlBatch(wraps,force){
  if(!force){const vh=innerHeight,vw=innerWidth;wraps=wraps.filter(w=>{const r=w.getBoundingClientRect();
    if(!r.width&&!r.height)return true;
    const vis=r.bottom>-700&&r.top<vh+700&&r.right>-700&&r.left<vw+700;if(!vis)HLIO.observe(w);return vis})}
  const on=document.documentElement.classList.contains('hl-on'),jobs=[];
  wraps.forEach(wrap=>{
    const mir=wrap.querySelector('.kmir'),bi=wrap.querySelector('.kbi');if(!mir||!bi)return;
    if(!on||!mir.querySelector('.hl')||!mir.offsetWidth){jobs.push({bi,empty:true});return}
    const cs=getComputedStyle(mir);
    jobs.push({bi,mir,w:mir.offsetWidth,fs:cs.fontSize,ff:cs.fontFamily,fw:cs.fontWeight,fst:cs.fontStyle,ls:cs.letterSpacing,lh:parseFloat(cs.lineHeight)||20,pad:cs.padding});
  });
  const real=jobs.filter(j=>!j.empty);
  if(real.length){
    const probe=h('div',{style:'position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none'});
    real.forEach(j=>{const c=j.mir.cloneNode(true);c.className='kprobe';c.removeAttribute('aria-hidden');Object.assign(c.style,{display:'block',position:'static',width:j.w+'px',fontSize:j.fs,fontFamily:j.ff,fontWeight:j.fw,fontStyle:j.fst,letterSpacing:j.ls,lineHeight:j.lh+'px',padding:j.pad,margin:'0',border:'0',boxSizing:'border-box',whiteSpace:'pre-wrap',overflowWrap:'break-word',wordBreak:'normal',height:'auto',overflow:'visible',color:'transparent'});j.probe=c;probe.append(c)});
    document.body.append(probe);
    real.forEach(j=>{
      const m=j.probe.getBoundingClientRect();j.blocks=[];
      j.probe.querySelectorAll('.hl').forEach(sp=>{
        const rg=document.createRange();rg.selectNodeContents(sp);
        const lines=[];[...rg.getClientRects()].filter(r=>r.width>.5).forEach(r=>{
          const cy=(r.top+r.bottom)/2,L=lines.find(l=>Math.abs(l.cy-cy)<j.lh*.45);
          if(L){L.l=Math.min(L.l,r.left);L.r=Math.max(L.r,r.right)}else lines.push({cy,l:r.left,r:r.right});
        });
        if(!lines.length)return;lines.sort((a,b)=>a.cy-b.cy);
        j.blocks.push({cls:sp.className.replace('hl ',''),k:sp.dataset.k,mid:sp.dataset.mid==='1',tl:sp.dataset.tl==='1',tr:sp.dataset.tr==='1',lines:lines.map(L=>({cy:L.cy-m.top,l:L.l-m.left,r:L.r-m.left}))});
      });
    });
    probe.remove();
  }
  jobs.forEach(j=>{
    j.bi.textContent='';if(j.empty)return;
    const frag=document.createDocumentFragment(),pad=3;
    const bub=document.documentElement.classList.contains('hl-bubble');
    j.blocks.forEach(b=>{
      if(bub&&(b.cls==='hq'||b.cls==='hs')){if(!b.mid)frag.append(bubbleEl(b,j));return}      // 문장 중간에 있는 따옴표는 풍선 없이 그대로
      const n=b.lines.length,R=Math.max(...b.lines.map(L=>L.r))+pad,Lm=Math.min(...b.lines.map(L=>L.l))-pad;
      b.lines.forEach((L,i)=>{
        const left=i===0?L.l-pad:Lm,right=n===1?L.r+pad:(i===n-1?L.r+pad:R);
        frag.append(h('div',{class:'kb '+b.cls+(n===1?' bs':(i===0?' bf':(i===n-1?' bl':''))),style:`left:${left.toFixed(1)}px;top:${(L.cy-j.lh/2-.3).toFixed(1)}px;width:${(right-left).toFixed(1)}px;height:${(j.lh+.6).toFixed(1)}px`}));
      });
    });
    j.bi.append(frag);
  });
}
