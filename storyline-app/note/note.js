/* 포스트잇 창: 쓰는 대로 지금 작품에 카드로 저장 · 지난 포스트잇 넘겨보며 고치기 */
const $=id=>document.getElementById(id);
const OPS=[1,.85,.7,.55,.4,.25];
let kinds=[],kind=null,list=[],i=-1,cur=null,dirty=false,saving=Promise.resolve(),t=0,opacity=1,onTop=true,isMac=false;
// i=-1: 새 글 · i>=0: list[i] (최근 것부터)
const ta=$('ta');

function paint(){
  const k=kinds.find(x=>x.id===kind)||kinds[0];
  $('kind').textContent=k?k.name:'';
  $('note').style.setProperty('--bg',(cur&&cur.color)||(k&&k.color)||'#fff1a6');
  $('pos').textContent=i<0?'새 글':`${i+1} / ${list.length}`;
  $('prev').disabled=i>=list.length-1;$('next').disabled=i<0;
  $('top').classList.toggle('on',onTop);
}
function load(){cur=i<0?null:list[i];ta.value=cur?cur.text:'';kind=cur?cur.kind:(kind||kinds[0]&&kinds[0].id);dirty=false;paint();ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)}
function status(s){$('st').textContent=s;$('hint').hidden=!!s&&s!=='저장됨'}

/* 저장: 새 글은 처음 글자가 생길 때 카드가 되고, 그다음부터는 그 카드를 고침 */
function flush(){
  if(!dirty)return saving;dirty=false;clearTimeout(t);
  const text=ta.value,k=kind,c=cur;
  saving=saving.then(async()=>{
    if(c){const r=await noteApi.update(c.id,text,k);if(r){c.text=text;c.kind=k;c.color=r.color}}
    else if(text.trim()){const r=await noteApi.add(text,k);if(r){cur={id:r.id,text,kind:k,color:r.color};list.unshift(cur);i=0;paint()}}
    status('저장됨');
  }).catch(()=>status('저장 못 함'));
  return saving;
}
ta.addEventListener('input',()=>{dirty=true;status('');clearTimeout(t);t=setTimeout(flush,600)});

async function go(n){      // n: 새 i
  await flush();
  if(n<-1||n>=list.length)return;
  i=n;load();
}
async function fresh(){await flush();i=-1;load();status('')}
$('prev').onclick=()=>go(i+1);
$('next').onclick=()=>go(i-1);
$('kind').onclick=()=>{const j=kinds.findIndex(x=>x.id===kind);kind=kinds[(j+1)%kinds.length].id;if(cur)cur.color=null;dirty=dirty||!!cur;paint();if(cur)flush()};
$('op').onclick=()=>{const j=OPS.findIndex(x=>Math.abs(x-opacity)<.01);opacity=OPS[(j+1)%OPS.length];noteApi.setOpacity(opacity);status(`투명도 ${Math.round(opacity*100)}%`)};
$('top').onclick=()=>{onTop=!onTop;noteApi.setOnTop(onTop);paint()};
$('main').onclick=async()=>{await flush();noteApi.openMain()};
$('hide').onclick=async()=>{await flush();noteApi.hide()};

document.addEventListener('keydown',e=>{
  const mod=isMac?e.metaKey:e.ctrlKey;
  if(e.key==='Escape'){e.preventDefault();flush().then(()=>noteApi.hide());return}
  if(mod&&e.key==='Enter'){e.preventDefault();fresh();return}      // 다 썼음 → 새 포스트잇
  if(e.altKey&&!mod&&e.key==='ArrowLeft'){e.preventDefault();go(i+1);return}
  if(e.altKey&&!mod&&e.key==='ArrowRight'){e.preventDefault();go(i-1);return}
});

async function refresh(){      // 창을 꺼낼 때마다 최신 목록 (큰 창에서 고친 것 반영)
  const d=await noteApi.init();
  kinds=d.kinds;list=d.list;opacity=d.opacity;onTop=d.onTop;isMac=d.isMac;
  if(!kind||!kinds.some(k=>k.id===kind))kind=d.defaultKind;
  const k=isMac?'⌘':'Ctrl+';
  $('hint').textContent=`${k}Enter 새 글 · Alt+←→ · Esc 숨김`;
  if(dirty){paint();ta.focus();return}      // 쓰던 중이면 그대로
  i=cur?list.findIndex(x=>x.id===cur.id):-1;      // 보던 포스트잇 (지워졌으면 새 글)
  load();
}
noteApi.onShown(refresh);
noteApi.onFlush(()=>flush());
refresh();
