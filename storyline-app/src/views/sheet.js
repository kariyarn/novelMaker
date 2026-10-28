/* ---------- 인물 시트 ---------- */
function renderSheet(){renderSheet0();peekWrap('sheet');$('sheet').querySelectorAll('.fl').forEach(l=>{const m=l.querySelector('.muted');if(m&&!l.title)l.title=m.textContent})}      // 회색 설명은 툴팁으로
function sheetProps(head,c){      // 색 · 폴더 · 아이콘은 이름 옆 색 점을 누르면 나오는 작은 창으로
  const props=h('div',{class:'sprops'},h('div',{class:'row'},...PAL.map(col=>h('button',{class:'sw'+(c.color===col?' on':''),style:`background:${col}`,title:'색',onclick:()=>act(()=>c.color=col)}))),folderSel(c));
  const open=!!UI.sprops,dotb=h('button',{class:'sdot'+(open?' on':''),title:'색 · 폴더 · 아이콘',style:`--c:${c.color}`,onclick:()=>{UI.sprops=!open;renderSheet();fitAll($('sheet'))}});
  head.prepend(h('div',{class:'snrow'},dotb,head.querySelector('.nm')));
  const after=head.querySelector('.role')||head.querySelector('.snrow');
  if(open)after.after(props);
}
function renderSheet0(){
  const p=$('sheet');p.innerHTML='';
  const c=charById(UI.sel),isSet=!!c&&c.kind==='setting';
  p.classList.toggle('cl',!!UIP.cl.sheet&&UI.peek!=='sheet');
  if(UIP.cl.sheet&&UI.peek!=='sheet'&&UI.mode==='story'&&c)return;      // 새단장: 보드 머리말의 '시트 펼치기'와 같은 일이라 접힌 시트 아이콘은 두지 않음
  if(UIP.cl.sheet&&UI.peek!=='sheet'){p.append(h('button',{class:'ctab ctab-s'+(UIP.cl.left?' low':''),onmouseenter:()=>peekSoon('sheet'),onfocus:()=>startPeek('sheet',true),title:(isSet?'설정 노트':'인물 시트')+' 펴기',onclick:()=>toggleCl('sheet')},icon('people')));return}
  const allKeys=c&&!isSet?[...new Set(c.fields.map(f=>f.group)),'__goal'].map(g=>c.id+':'+g):[];
  const isCl=k=>UIP.gc[k]!==false;
  const allClosed=allKeys.length&&allKeys.every(isCl);
  p.append(h('div',{class:'phead'},h('span',{class:'sp'}),
    allKeys.length?h('button',{class:'quiet',style:'padding:0 8px;font-size:.84em',title:'목표 · 칸 묶음을 모두 접거나 펴요',onclick:()=>{allKeys.forEach(k=>{UIP.gc[k]=!allClosed});saveUIP();renderSheet();fitAll($('sheet'))}},allClosed?'모두 펴기':'모두 접기'):null,
    ptog('sheet')));
  if(UI.sel==='work'&&S.work)return renderWorkSheet(p,S.work);
  if(!c){p.append(h('div',{class:'empty'},UI.sel==='none'?'미분류 보드예요. 왼쪽에서 캐릭터를 고르면 시트가 열려요.':'아직 캐릭터가 없어요.',h('br'),h('button',{class:'on',style:'margin-top:12px',onclick:()=>addEntity('char')},'＋ 캐릭터 만들기')));return}
  if(isSet)return renderSettingSheet(p,c);
  const head=h('div',{class:'shead'},
    h('input',{class:'nm',value:c.name,placeholder:'이름',onchange:e=>{
      const v=e.target.value.trim(),d=v&&dupName(v,c.id);
      if(!v||d){e.target.value=c.name;return toast(!v?'이름은 비워둘 수 없어요':`'${d.name}'은(는) 이미 있는 이름이에요`)}
      act(()=>{c.name=v;autoLinkAll()})}}),
    h('input',{class:'ghost role',value:c.role,placeholder:'역할 (주인공, 상대역 …)',oninput:e=>edit(()=>c.role=e.target.value)}),
    h('label',{class:'fl',title:'쉼표로 구분 · 글에 이름이 나오면 카드가 자동으로 연결돼요'},'별칭',h('span',{class:'muted'},'쉼표로 구분 · 글에 이름이 나오면 카드가 자동으로 연결돼요')),
    h('textarea',{class:'ghost box autofit',rows:1,placeholder:'예: 도윤, 이 군, 라이더',style:'resize:none;overflow:hidden',onchange:e=>act(()=>{c.aliases=e.target.value.split(/[,，\n]/).map(x=>x.trim()).filter(Boolean);autoLinkAll()}),oninput:e=>fitOne(e.target)},c.aliases.join(', ')),
    h('label',{class:'fl'},'소개'),h('textarea',{class:'ghost box autofit',rows:1,placeholder:'한 줄 소개',style:'resize:none;overflow:hidden',oninput:e=>{edit(()=>c.summary=e.target.value);fitOne(e.target)}},c.summary));
  sheetProps(head,c);
  p.append(head);
  p.append(goalSection(c));
  const groups=[];c.fields.forEach(f=>{if(!groups.includes(f.group))groups.push(f.group)});
  groups.forEach(g=>{
    const open=UIP.gc[c.id+':'+g]===false;      // 칸 묶음은 기본으로 접혀 있음
    const box=h('div',{class:'sgrp'});
    box.append(h('div',{class:'sgh',onclick:()=>{UIP.gc[c.id+':'+g]=open?true:false;saveUIP();renderSheet();fitAll($('sheet'))}},icon(open?'chevD':'chevR'),h('span',{},g),h('small',{class:'gcnt'},c.fields.filter(f=>f.group===g).length),h('span',{class:'sp'}),
      h('button',{class:'quiet',style:'padding:0 8px;font-size:.95em',title:'이 묶음에 칸 추가',onclick:async e=>{e.stopPropagation();const l=((await askText('새 칸 이름'))||'').trim();if(l)act(()=>c.fields.push({id:uid(),group:g,label:l,hint:'',value:''}))}},'＋ 칸'),
      h('button',{class:'x gdel',title:'이 묶음 삭제',onclick:async e=>{e.stopPropagation();const mine=c.fields.filter(f=>f.group===g),filled=mine.filter(f=>(f.value||'').trim()).length;
        if(!await askConfirm(`'${g}' 묶음을 삭제할까요?\n칸 ${mine.length}개${filled?` (적어 둔 내용이 ${filled}칸 있어요)`:''}가 함께 사라져요. 되돌리기(⌘Z)로 복구할 수 있어요.`,{ok:'삭제',danger:true}))return;
        act(()=>{c.fields=c.fields.filter(f=>f.group!==g)});toast(`'${g}' 묶음을 삭제했어요`,{undo:true})}},'✕')));
    if(open)c.fields.filter(f=>f.group===g).forEach(f=>box.append(h('div',{class:'frow'},
      h('div',{class:'fhead'},h('input',{class:'flabel',value:f.label,title:'칸 이름 (눌러서 고치기)',oninput:e=>edit(()=>f.label=e.target.value)}),h('button',{class:'x',title:'칸 삭제',onclick:()=>act(()=>c.fields=c.fields.filter(x=>x!==f))},'✕')),
      h('textarea',{class:'fval autofit',rows:1,placeholder:f.hint||'',oninput:e=>{edit(()=>f.value=e.target.value);fitOne(e.target)}},f.value))));
    p.append(box);
  });
  p.append(h('div',{class:'sgrp'},h('button',{class:'quiet',onclick:async()=>{const g=((await askText('새 묶음 이름 (예: 능력, 비밀)'))||'').trim();if(!g)return;const l=((await askText('첫 칸 이름'))||'').trim();if(l)act(()=>c.fields.push({id:uid(),group:g,label:l,hint:'',value:''}))}},'＋ 묶음 추가')));
  p.append(h('div',{class:'sgrp',style:'padding:10px 20px 30px'},h('button',{class:'quiet',style:'color:var(--warn)',onclick:async()=>{if(await askConfirm(`'${c.name}' 캐릭터를 휴지통으로 보낼까요? (카드는 남아요)`)){act(()=>{S.trash.push({id:uid(),type:'char',data:c,at:Date.now()});S.characters=S.characters.filter(x=>x!==c);UI.sel=firstEntity()});toast('휴지통으로 보냈어요',{undo:true})}}},'이 캐릭터 삭제')));
}
