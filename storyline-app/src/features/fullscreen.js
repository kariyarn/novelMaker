/* 전체화면: 코르크보드만 보이기 */
/* 집중 모드 (⌘.): 위 줄과 양옆 패널을 치우고 가운데만 */
// 글꼴이 늦게 불러와지거나 패널 너비가 바뀌면 글 칸 높이를 다시 맞춤 (소개 등이 잘려 보이지 않게)
if(document.fonts&&document.fonts.addEventListener)document.fonts.addEventListener('loadingdone',()=>requestAnimationFrame(()=>{fitAll();hlLayoutAll()}));      // 글꼴이 늦게 로드돼도 말풍선 · 말 표시 위치를 다시 맞춤
if(window.ResizeObserver){      // 패널 너비가 바뀌면(접기 · 펴기 · 끌기) 다 바뀐 뒤 글 칸 높이를 다시 맞춤
  const T={};const ro=new ResizeObserver(es=>es.forEach(en=>{const el=en.target;clearTimeout(T[el.id]);T[el.id]=setTimeout(()=>{fitAll(el);if(el.id==='pool'){markClips();masonry()}if(el.id!=='sheet')hlLayoutAll(el)},90)}));
  ['sheet','pool','mid'].forEach(id=>ro.observe($(id)));
}
$('app').addEventListener('transitionend',e=>{if(e.target===$('app')){fitAll();markClips();masonry();hlLayoutAll()}});
function setFocusMode(on){setFull(on)}      // 전체 화면
function setFull(on){      // 집중 모드: 위 줄 · 양옆 패널을 치우고 가운데(보드 · 타임라인 · 표)만, 맥 전체화면으로
  document.body.classList.toggle('full',on);document.body.classList.toggle('focus',on);
  let t=document.getElementById('focusx');
  if(on&&!t){t=h('button',{id:'focusx',title:'전체 화면 끝내기 (Esc · ⌘.)',onclick:()=>setFull(false)},'전체 화면 · Esc로 끝내기');document.body.append(t)}
  else if(!on&&t)t.remove();
  if(on){if(document.documentElement.requestFullscreen&&!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{})}
  else if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
  applyLayout();
  if($('mid').firstChild){renderMid();if(onBoard())requestAnimationFrame(()=>{applyView();scheduleMM()})}
}
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.body.classList.contains('full'))setFull(false)});
