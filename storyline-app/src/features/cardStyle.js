/* 폐기: 지우기엔 아깝지만 안 쓸 것 같은 포스트잇. 그 인물 보드에서만 붉은 X로 보이고 오른쪽 목록 · 전체 보기 · 타임라인 · 집중 모드에는 안 나옴 */
async function discardCard(id){
  const c=cardById(id);if(!c)return;const used=episodeOf(id);
  if(used&&!await askConfirm(`${used.i+1}화에 쓴 카드예요. 폐기하면 타임라인에서도 빠져요. 폐기할까요?`,{ok:'폐기'}))return;
  act(()=>{stamp(c);c.discarded=true;detach([id])});
  toast('폐기했어요 — 보기 ▸ 폐기(⌥4)에서 모아 볼 수 있어요',{undo:true});
}
function restoreCard(id){const c=cardById(id);if(!c)return;act(()=>{stamp(c);delete c.discarded});toast('폐기를 취소했어요')}
function trashCard(id){
  const c=cardById(id);if(!c)return;
  const empty=!(c.text||'').trim();
  act(()=>{if(!empty)S.trash.push({id:uid(),type:'card',data:c,at:Date.now()});S.cards=S.cards.filter(x=>x!==c);S.episodes.forEach(e=>e.cardIds=e.cardIds.filter(x=>x!==id))});
  if(SELCARD===id)SELCARD=null;toast(empty?'빈 포스트잇을 지웠어요':'휴지통으로 보냈어요',{undo:true});
}
async function deleteCardKey(id){      // ⌘⌫: 내용이 없으면 바로, 있으면 확인 후 삭제
  const c=cardById(id);if(!c)return;
  if(UI.mode==='all'&&document.querySelector('.bview'))return toast('전체 보기에서는 지울 수 없어요 — 인물 보드에서 지워 주세요');
  if((c.text||'').trim()){const used=episodeOf(id);
    if(!await askConfirm(`이 포스트잇을 삭제할까요?${used?`\n(${used.i+1}화에 사용 중이라 타임라인에서도 빠져요)`:''}\n휴지통에서 되살릴 수 있어요.`,{ok:'삭제',danger:true}))return}
  const a=document.activeElement;if(a&&a.blur)a.blur();
  trashCard(id);
}
/* 포스트잇 모양: 분류마다 따로 (전체 설정 따름 / 모양 하나 / 랜덤 — 랜덤은 카드마다 고정된 모양) */
const SHAPE_IDS=['','index','tape','spiral','round','polaroid','washi','bubble','dogear','receipt'];
function cardShape(card){const k=kindOf(card.kind),v=k&&k.shape;
  if(v==='random'){let h2=0;for(const ch of card.id)h2=(h2*31+ch.charCodeAt(0))>>>0;return SHAPE_IDS[h2%SHAPE_IDS.length]}
  return (v===undefined||v===null||v==='global')?(S.settings.noteShape||''):v}
function kcard(card,mode,opt={}){
  const k=kindOf(card.kind),pl=episodeOf(card.id),isB=mode==='board';
  const el=h('div',{class:'kcard '+mode+(pl&&mode!=='tl'?' used':'')+(SELCARD===card.id?' selc':''),'data-id':card.id,'data-stars':card.stars||0,'data-sl':'★'.repeat(card.stars||0),style:`--kc0:${cardColor(card)}`});
  if(MSEL.has(card.id))el.classList.add('msel');
  const bar=h('div',{class:isB?'kbar':'khead'},isB?null:h('span',{class:'grip',title:'카드 어디든 잡고 끌어서 옮길 수 있어요'},'⠿'),kindSelect(card),starsEl(card),isB?null:brBadge(card,opt),h('span',{class:'sp'}),
    pl&&mode==='pool'?h('span',{class:'placed use',title:'타임라인에 배치됨 (이미 쓴 카드)'},`${pl.i+1}화 사용`):null,
    !pl&&mode==='pool'&&card.when?h('span',{class:'whenb','data-w':card.when,title:'쓸 시기 (훑기에서 정함)'},whenName(card.when)):null,
    mode==='tl'&&opt.epId?h('button',{class:'cbtn brmk',title:'갈래 만들기 — 지금 글을 복사해서 다르게 써 보기',onclick:()=>brMake(card.id)},'⑂'):null,
    h('button',{class:'x',title:'삭제 (휴지통)',onclick:()=>delCard(card.id)},'✕'));
  const ta=h('textarea',{class:'ktext autofit',rows:1,readonly:true,placeholder:'더블클릭해서 쓰기',
    oninput:e=>{edit(()=>{card.text=e.target.value;stamp(card)});fitOne(e.target);if(isB)syncOne(el)},
    onchange:()=>{if(autoLinkCard(card)){save();refreshFoot(card.id);toast('인물 자동 연결을 갱신했어요')}}},card.text);
  const mir=h('div',{class:'kmir','aria-hidden':'true'});hlFill(mir,card.text||'');
  const blk=h('div',{class:'kblk'},h('div',{class:'kbi'}));
  const wrap=h('div',{class:'kwrap'},blk,mir,ta);
  ta.addEventListener('input',()=>{hlFill(mir,ta.value);hlBlocks(wrap);if(mir.scrollTop!==ta.scrollTop){mir.scrollTop=ta.scrollTop;blk.firstChild.style.transform=`translateY(${-mir.scrollTop}px)`}});      // 글을 고친 뒤에도 두 층의 스크롤을 맞춤 (한글 조합 중 포함)
  ta.addEventListener('scroll',()=>{mir.scrollTop=ta.scrollTop;blk.firstChild.style.transform=`translateY(${-mir.scrollTop}px)`});      // 글자는 mir이 보여주므로 mir의 실제 스크롤 위치를 따라감
  if(card.pin)el.classList.add('pinned');
  if(isB){
    {const sh=cardShape(card);if(sh)el.setAttribute('data-shp',sh)}
    el.append(bar,wrap,footEl(card));
    if(U3())el.append(frDefLayer(card));      // 작게 보기에서만 보이는 모양 층
    if(card.discarded){el.classList.add('disc');el.prepend(h('i',{class:'kx','aria-hidden':'true'}))}      // 폐기: 바탕에 붉은 X (글자 아래)
    if(pl)el.querySelector('.kfoot').append(h('span',{class:'placed use',title:'타임라인에 배치됨 (이미 쓴 카드)'},`${pl.i+1}화 사용`));
    el.append(h('div',{class:'rz',title:'좌우로 끌어서 너비 조절'}),h('div',{class:'rzb',title:'위아래로 끌어서 높이 조절 · 더블클릭하면 내용에 맞춤'}),h('div',{class:'rzc',title:'끌어서 가로·세로 조절 · 더블클릭하면 높이를 내용에 맞춤'}));
    const pinB=h('button',{class:'pin',title:card.pin?'핀 빼기 · 핀 머리를 다른 핀 쪽으로 끌면 줄로 연결 · 꾹 누르면 연결된 것만 강조':'핀 꽂기 — 꽂으면 배치(정리·랜덤 등)에서 안 움직여요 · 직접 끌어서는 옮길 수 있어요 (핀 머리를 끌면 줄로 연결)'});
    pinB.innerHTML=pinSvg(card.pinColor||S.settings.pinColor||'black');pinB.style.setProperty('--pa',(card.pinAngle||0)+'deg');
    pinB.setAttribute('data-pop','1');
    pinB.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();if(!card.pin)return;      // 오른쪽 클릭: 이 핀만 색 바꾸기
      const cur=card.pinColor||S.settings.pinColor||'black';
      popMenu(pinB,[{title:'이 핀 색'},...PIN_COLORS.map(pc=>({label:pc[1],sw:pc[2],on:cur===pc[0],fn:()=>act(()=>{card.pinColor=pc[0]})})),{label:'기본 색으로',fn:()=>act(()=>{delete card.pinColor})}])});
    el.append(h('i',{class:'ktape','aria-hidden':'true'}),pinB);bindPin(el,card,pinB,opt.key);
    boardInteract(el,card,ta,opt.key);
    if(UI.mode!=='all')el.addEventListener('contextmenu',e=>{      // 오른쪽 클릭: 폐기 / 폐기 취소
      if(e.target.closest('.pin'))return;e.preventDefault();e.stopPropagation();selectCard(card.id);
      const a=h('div',{style:`position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:1px;height:1px`});document.body.append(a);
      const cx=e.clientX,cy=e.clientY,ids=MSEL.has(card.id)&&MSEL.size>1?[...MSEL]:[card.id];
      popMenu(a,[{label:ids.length>1?`${ids.length}장을 다른 화로…`:'다른 화로 옮기기…',fn:()=>setTimeout(()=>{const b=h('div',{style:`position:fixed;left:${cx}px;top:${cy}px;width:1px;height:1px`});document.body.append(b);msMenu(b,ids);b.remove()},0)},
        'sep',card.discarded?{label:'폐기 취소',fn:()=>restoreCard(card.id)}:{label:'폐기',fn:()=>discardCard(card.id)}]);a.remove();
    });
  }else{
    el.append(bar,wrap,footEl(card));
    if(U3()&&mode==='tl')frCard(el,card,bar);      // 새단장: 색인 카드 · 원고 문단 (features/fresh.js)
    {const le=mode==='pool'?linksEl(card):null;if(le)el.append(le)}
    bar.insertBefore(h('button',{class:'pinx'+(card.pin?' isp':''),title:'핀 · 꽂으면 코르크보드의 자동 배치에서 안 움직여요 (직접 끌어서는 옮길 수 있어요)',onclick:()=>act(()=>setPin(card,!card.pin))},'📌'),bar.querySelector('.sp'));
    // 편집 중이 아닐 때는 카드의 어느 부분을 잡아도 끌 수 있고, 더블클릭하면 편집
    el.addEventListener('pointerdown',e=>{if(e.button===0&&!e.target.closest('select,button,label,.stars'))selectCard(card.id)});
    el.draggable=true;
    el.addEventListener('dragstart',e=>{if(e.target!==el)return;DRAG={id:card.id};e.dataTransfer.setData('text/plain',card.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setDragImage(el,12,12);setTimeout(()=>el.classList.add('dragging'))});
    el.addEventListener('dragend',()=>{DRAG=null;document.querySelectorAll('.dragging,.drop-before,.drop-after,.over').forEach(x=>x.classList.remove('dragging','drop-before','drop-after','over'))});
    el.addEventListener('dblclick',e=>{if(e.target.closest('select,button,label,.stars'))return;if(U3()&&mode==='tl'&&lineMode()&&!opt.shelfId)return frFocus(card.id);enterEditList(el)});      // 새단장 한 줄 보기: 두 번 누르면 집중
    ta.addEventListener('blur',()=>{el.classList.remove('editing');el.draggable=true;ta.readOnly=true;dropIfEmpty(card.id);if(mode==='tl')tlRecount(opt)});
    el.addEventListener('contextmenu',ev=>{if(ev.target.closest('input,select'))return;ev.preventDefault();ev.stopPropagation();      // 우클릭: 이 카드(또는 선택한 카드들)를 다른 화로
      if(U3()&&mode==='tl'&&opt.epId&&!(MSEL.has(card.id)&&MSEL.size>1))return frCtx(ev,card,opt.epId);      // 새단장: 위 · 아래에 새 문단 · 장면 구분
      const a=h('div',{style:`position:fixed;left:${ev.clientX}px;top:${ev.clientY}px;width:1px;height:1px`});document.body.append(a);
      msMenu(a,MSEL.has(card.id)&&MSEL.size>1?[...MSEL]:[card.id]);a.remove()});
    if(mode==='tl'){
      const row=()=>el.closest('.brfork')||el;      // 갈래를 펼친 카드는 본선 · 갈래 묶음 전체가 한 줄
      el.addEventListener('dragover',e=>{if(brDragOver(e,el,card,opt))return;if(!DRAG||DRAG.id===card.id)return;e.preventDefault();e.stopPropagation();const rw=row(),r=rw.getBoundingClientRect();
        const gh=GHOST&&GHOST.parentNode===rw.parentElement&&GHOST.classList.contains('on')?GHOST:null,shift=(gh&&(gh.compareDocumentPosition(rw)&Node.DOCUMENT_POSITION_FOLLOWING))?gh.offsetHeight+9:0;      // 빈칸이 아래로 밀어낸 만큼 빼고, 원래 자리 기준으로 판단
        const mid=r.top-shift+r.height/2,cur=gh?(gh.nextElementSibling===rw?'b':(gh.previousElementSibling===rw?'a':'')):'',dead=Math.min(14,r.height*.2);      // 경계 근처에서는 지금 자리를 유지 (히스테리시스)
        const b=cur==='b'?e.clientY<mid+dead:(cur==='a'?e.clientY<mid-dead:e.clientY<mid);el.classList.toggle('drop-before',b);el.classList.toggle('drop-after',!b);
        let nx=b?rw:rw.nextElementSibling;if(nx&&nx===GHOST)nx=nx.nextElementSibling;ghostPlace(rw.parentElement,nx)});
      el.addEventListener('dragleave',()=>el.classList.remove('drop-before','drop-after','brdrop'));
      el.addEventListener('drop',e=>{
        if(brDrop(e,el,card))return;
        if(!DRAG||DRAG.id===card.id)return;e.preventDefault();e.stopPropagation();
        const before=el.classList.contains('drop-before'),ep=opt.shelfId?S.shelves.find(x=>x.id===opt.shelfId):S.episodes.find(x=>x.id===opt.epId);
        let nextId=card.id;if(!before){const i=ep.cardIds.indexOf(card.id);nextId=ep.cardIds.slice(i+1).find(x=>x!==DRAG.id)||null}
        if(opt.shelfId)shelfPlace(DRAG.id,opt.shelfId,nextId);else placeCard(DRAG.id,opt.epId,nextId);
      });
    }
  }
  return el;
}
