/* 작품 노트 가운데: 아이디어 메모 (일반 카드와 별개 · 목록 · 전체 보기 · 타임라인에 나오지 않음) */
function addWorkIdea(){const id=uid();UI.wfocus=id;act(()=>S.work.ideas.unshift({id,text:'',at:Date.now()}))}      // 포커스는 배치가 끝난 뒤에 줌 (배치하면서 칸을 옮기면 포커스가 풀리므로)
function renderWorkBoard(m){
  const W=S.work,wrap=h('div',{class:'wboard'});
  wrap.append(h('div',{class:'wbhead'},h('b',{},'아이디어'),h('span',{class:'muted'},`${W.ideas.length}장`),h('span',{class:'sp'}),
    h('button',{class:'on',title:'새 아이디어 (⌘N) · 작품 노트 안에만 저장돼요',onclick:addWorkIdea},'＋ 아이디어')));
  const grid=h('div',{class:'wgrid'}),mrow=h('div',{class:'mrow'}),els=[];
  if(!W.ideas.length)grid.append(h('div',{class:'muted',style:'padding:30px 4px'},'컨셉 조각, 쓰고 싶은 분위기, 떠오른 장면 등을 자유롭게 붙여두세요.'));
  W.ideas.forEach(it=>els.push(h('div',{class:'widea','data-wid':it.id},
    h('textarea',{class:'autofit',rows:3,placeholder:'떠오른 아이디어',oninput:e=>{edit(()=>it.text=e.target.value);fitOne(e.target)}},it.text),
    h('button',{class:'x',title:'삭제',onclick:()=>{act(()=>{W.ideas=W.ideas.filter(x=>x!==it)});toast('아이디어를 지웠어요',{undo:true})}},'✕'))));
  if(els.length)grid.append(mrow);
  wrap.append(grid);m.append(wrap);
  // 높이가 제각각이어도 빈칸이 없게: 순서대로 가장 짧은 열에 쌓음 (오른쪽 목록과 같은 방식)
  const lay=()=>{const act0=document.activeElement,keepF=act0&&wrap.contains(act0)&&act0.tagName==='TEXTAREA'?[act0,act0.selectionStart,act0.selectionEnd]:null;
    const Wd=mrow.clientWidth;if(!Wd||!els.length)return;const gap=14,n=Math.max(1,Math.floor((Wd+gap)/(160+gap)));
    let cols=[...mrow.children];
    if(cols.length!==n){mrow.replaceChildren();cols=Array.from({length:n},()=>h('div',{class:'mcol'}));mrow.append(...cols);els.forEach((e,i)=>cols[i%n].append(e));}
    const hs=els.map(e=>e.offsetHeight),tot=cols.map(()=>0),pick=els.map((e,i)=>{let k=0;for(let j=1;j<n;j++)if(tot[j]<tot[k]-.5)k=j;tot[k]+=hs[i]+gap;return k});
    els.forEach((e,i)=>cols[pick[i]].append(e));
    if(keepF&&document.activeElement!==keepF[0]){keepF[0].focus({preventScroll:true});try{keepF[0].setSelectionRange(keepF[1],keepF[2])}catch(e){}}};
  wrap._lay=lay;requestAnimationFrame(()=>{fitAll(wrap);lay();
    if(UI.wfocus){const t=wrap.querySelector(`.widea[data-wid="${UI.wfocus}"] textarea`);UI.wfocus=null;if(t){t.focus({preventScroll:true});t.scrollIntoView({block:'nearest'})}}});
  if(window.ResizeObserver)new ResizeObserver(()=>{clearTimeout(lay.t);lay.t=setTimeout(lay,80)}).observe(wrap);
  wrap.addEventListener('focusout',()=>setTimeout(()=>{const a=document.activeElement;if(!(a&&wrap.contains(a)&&a.tagName==='TEXTAREA'))lay()},60));
}
function renderSettingSheet(p,c){
  p.append(h('div',{class:'shead'},
    h('input',{class:'nm',value:c.name,placeholder:'설정 이름',onchange:e=>{
      const v=e.target.value.trim(),d=v&&dupName(v,c.id);
      if(!v||d){e.target.value=c.name;return toast(!v?'이름은 비워둘 수 없어요':`'${d.name}'은(는) 이미 있는 이름이에요`)}
      act(()=>{c.name=v;autoLinkAll()})}}),
    h('label',{class:'fl'},'한 줄 정의',h('span',{class:'muted'},'사전처럼 한 줄이면 충분해요')),
    h('textarea',{class:'ghost box autofit',rows:1,placeholder:'한 줄 정의',style:'resize:none;overflow:hidden',oninput:e=>{edit(()=>c.summary=e.target.value);fitOne(e.target)}},c.summary),
    h('label',{class:'fl'},'별칭',h('span',{class:'muted'},'쉼표로 구분 · 글에 나오면 카드가 자동으로 연결돼요')),
    h('textarea',{class:'ghost box autofit',rows:1,placeholder:'예: 지하, 월세방',style:'resize:none;overflow:hidden',onchange:e=>act(()=>{c.aliases=e.target.value.split(/[,，\n]/).map(x=>x.trim()).filter(Boolean);autoLinkAll()}),oninput:e=>fitOne(e.target)},c.aliases.join(', '))));
  sheetProps(p.lastChild,c);
  p.append(h('div',{class:'sgrp'},
    h('label',{class:'fl'},'설정 메모',h('span',{class:'muted'},'세계관 · 장소 · 조직 · 규칙 … 자유롭게')),
    h('textarea',{class:'fval autofit',rows:4,placeholder:'이 설정에 대해 적어 두세요',oninput:e=>{edit(()=>c.memo=e.target.value);fitOne(e.target)}},c.memo||'')));
  p.append(h('div',{class:'sgrp',style:'padding:10px 20px 30px'},h('button',{class:'quiet',style:'color:var(--warn)',onclick:async()=>{if(await askConfirm(`'${c.name}' 설정 노트를 휴지통으로 보낼까요? (카드는 남아요)`)){act(()=>{S.trash.push({id:uid(),type:'char',data:c,at:Date.now()});S.characters=S.characters.filter(x=>x!==c);UI.sel=firstEntity()});toast('휴지통으로 보냈어요',{undo:true})}}},'이 설정 노트 삭제')));
}
