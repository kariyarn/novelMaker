/* ============ 단축키 ============ */
document.addEventListener('keydown',e=>{
  if(e.altKey&&!e.metaKey&&!e.ctrlKey&&/^Digit[1234]$/.test(e.code||'')&&onBoard()&&!$('modal').classList.contains('on')){      // ⌥1 · ⌥2 · ⌥3 · ⌥4: 보드에 보일 포스트잇 (전체 · 미사용 · 사용 · 폐기)
    const a=document.activeElement;if(!(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'&&!a.readOnly))){e.preventDefault();const k=['all','unused','used','disc'][+e.code.slice(5)-1];setSetting('useFilter',k);toast('보기: '+{all:'전체',unused:'미사용',used:'사용',disc:'폐기한 포스트잇'}[k]);return}
  }
  if(e.altKey&&!e.metaKey&&!e.ctrlKey&&/^Key[FTRS]$/.test(e.code||'')&&onBoard()&&!$('modal').classList.contains('on')){      // ⌥F 맞춤 · ⌥T 정리 · ⌥R 랜덤 · ⌥S 스프레드
    const a=document.activeElement;if(!(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'&&!a.readOnly))){e.preventDefault();const k=e.code.slice(3);
      if(k==='F')fitView(UI.sel,true);else if(k==='T')tidyBoard();else if(k==='R')scatterBoard('random');else scatterBoard('spread');return}
  }
  if(e.ctrlKey||e.metaKey){
    if(e.altKey)return;
    {      // ⌘+키: 분류별 새 포스트잇 (⌘1, ⌘2 …)
      const m=/^(?:Digit|Key)(.)$/.exec(e.code||''),kk=!e.shiftKey&&m&&m[1],kind=kk&&S.kinds.find(x=>x.key===kk);
      if(kind){e.preventDefault();newNoteShortcut(kind.id);return}
    }
    if((e.key==='Backspace'||e.key==='Delete')&&!e.shiftKey&&!$('modal').classList.contains('on')&&!document.querySelector('.dlg')){      // ⌘⌫: 선택 · 편집 중인 포스트잇 삭제
      const a=document.activeElement,ed=a&&a.classList&&a.classList.contains('ktext')?a.closest('.kcard'):null;
      const typing=a&&(a.tagName==='INPUT'||(a.tagName==='TEXTAREA'&&!ed));
      const id=ed?ed.dataset.id:(SELCARD&&document.querySelector(`.kcard[data-id="${SELCARD}"]`)?SELCARD:null);
      if(id&&!typing){e.preventDefault();deleteCardKey(id);return}
    }
    const typingNow=(()=>{const a=document.activeElement;return !!a&&((a.tagName==='TEXTAREA'&&!a.readOnly)||(a.tagName==='INPUT'&&/^(text|search|)$/.test(a.type||'')))})();
    if((e.key==='z'||e.key==='Z'||e.key==='y')&&typingNow){e.preventDefault();document.execCommand((e.key==='y'||e.shiftKey)?'redo':'undo');return}      // 글을 쓰는 중의 ⌘Z / ⌘⇧Z는 그 글(입력칸) 안에서만 되돌리기 · 다시 하기 — 노트 전체 되돌리기는 입력을 마친 뒤에
    if(e.key==='z'||e.key==='Z'){e.preventDefault();e.shiftKey?redo():undo()}
    else if(e.key==='y'){e.preventDefault();redo()}
    else if(e.key===','){e.preventDefault();showSettings()}
    else if(e.key==='.'){e.preventDefault();setFull(!document.body.classList.contains('full'))}
    else if(e.key==='s'||e.key==='S'){e.preventDefault();saveNow();toast('저장했어요')}
    else if(e.code==='KeyN'&&!e.shiftKey){e.preventDefault();newNoteShortcut()}
    else if(e.code==='KeyF'&&!e.shiftKey){e.preventDefault();openSearch()}
    else if(e.code==='Slash'){e.preventDefault();showShortcuts()}
    else if(e.code==='KeyF'&&e.shiftKey){e.preventDefault();setFull(!document.body.classList.contains('full'))}
    return;
  }
  if(e.key==='?'){const a=document.activeElement;if(!(a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT'||a.tagName==='SELECT'))&&!SPOT){e.preventDefault();showShortcuts()}}
  if(e.key==='Home'){const a=document.activeElement;if(!(a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT'))&&onBoard()&&document.querySelector('.bview')){e.preventDefault();goOrigin(UI.sel)}}
  if(e.key==='Escape'){
    const a=document.activeElement,typing=a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT');
    closePop();closeModal();clearPinFocus();if(!typing)selectCard(null);if(a&&a.blur)a.blur();
    if(!typing&&document.body.classList.contains('full'))setFull(false);
    else if(!typing&&UI.mode==='graph'&&!$('modal').classList.contains('on'))goMode(UI.prevMode&&UI.prevMode!=='graph'?UI.prevMode:'story');      // 관계망에서 Esc: 하던 화면으로
  }
});
addEventListener('resize',()=>{if(autoFitSheet()|frAutoLeft()){saveUIP();renderAll()}if(onBoard()){scheduleMM();setTimeout(fitDock,0)}if(lineMode()||UI.mode==='story')applyLayout()});      // 구상: 창 폭에 맞춰 인물 시트 폭을 다시 제한
// ⌘N: 새 포스트잇 (구상 화면은 마우스가 보드 위에 있으면 그 자리, 아니면 화면 중앙 / 타임라인 화면은 목록에 새 카드)
let PTR={x:-1,y:-1};document.addEventListener('mousemove',e=>{PTR={x:e.clientX,y:e.clientY}},{passive:true});
function newNoteShortcut(kindId){
  if($('modal').classList.contains('on'))return;
  if(UI.mode==='graph')return;
  if(UI.sel==='work'&&UI.mode==='story')return addWorkIdea();
  if(UI.mode==='story'&&UI.folderView){const i=document.querySelector('.tadd input');if(i)i.focus();return}      // 표 보기에서는 새 항목 입력칸으로
  let kid;
  if(kindId)kid=kindOf(kindId).id;
  else{      // 캐릭터를 보고 있으면 장면 · 대사, 그 밖(설정 노트 · 미분류 · 전체 · 타임라인)이면 메모
    const e=onBoard()?charById(UI.sel):null,want=(e&&e.kind!=='setting')?'scene':'memo';
    kid=(S.kinds.find(k=>k.id===want)||S.kinds[want==='memo'?S.kinds.length-1:0]).id;
  }
  if(onBoard()){if(document.querySelector('.bview'))addBoardCard(kid)}      // 화면 중앙 근처 임의 위치에 생성
  else act(()=>{const c=newCard(kid,'');S.cards.unshift(c);UI.focusCard=c.id;(UI.pnew=UI.pnew||new Set()).add(c.id);ensureKindVisible(kid);});
}
