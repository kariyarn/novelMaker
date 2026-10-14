/* 포스트잇 창: 쓰는 대로 지금 작품에 카드로 저장 · 지난 포스트잇 넘겨보며 고치기 */
const $=id=>document.getElementById(id);
let kinds=[],kind=null,list=[],i=-1,cur={id:null,text:''},dirty=false,saving=Promise.resolve(),t=0,paper=1,ink=1,onTop=true,isMac=false,fs=15;
// i=-1: 새 글 · i>=0: list[i] (최근 것부터)
const ta=$('ta');

function paint(){
  const k=kinds.find(x=>x.id===kind)||kinds[0];
  $('kind').textContent=k?k.name:'';
  $('pos').textContent=i<0?'새 글':`${i+1} / ${list.length}`;
  $('prev').disabled=i>=list.length-1;$('next').disabled=i<0;
  $('top').classList.toggle('on',onTop);
}
function load(){cur=i<0?{id:null,text:''}:list[i];ta.value=cur.text;kind=cur.id?cur.kind:(kind||kinds[0]&&kinds[0].id);dirty=false;paint();ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)}
function status(s){$('st').textContent=s;$('hint').hidden=!!s&&s!=='저장됨'}

/* 저장: 새 글은 처음 글자가 생길 때 카드가 되고, 그다음부터는 그 카드를 고침
   새 글도 처음부터 cur 객체(id 없음)를 하나 두고, 저장 순서 안에서 id 가 생겼는지 봄
   → 카드를 만드는 중에 또 저장해도 카드가 두 장 생기지 않음 */
function flush(){
  if(!dirty)return saving;dirty=false;clearTimeout(t);
  const text=ta.value,k=kind,c=cur;
  saving=saving.then(async()=>{
    if(c.id){const r=await noteApi.update(c.id,text,k);if(r){c.text=text;c.kind=k;c.color=r.color}}
    else if(text.trim()){const r=await noteApi.add(text,k);if(r){c.id=r.id;c.text=text;c.kind=k;c.color=r.color;list=[c,...list.filter(x=>x.id!==r.id)];if(cur===c)i=0;else if(i>=0)i++;paint()}}
    status('저장됨');
  }).catch(()=>status('저장 못 함'));
  return saving;
}
ta.addEventListener('input',()=>{dirty=true;status('');clearTimeout(t);t=setTimeout(flush,600)});
/* 글자 크기: 포스트잇 창에만 (이 컴퓨터에 기억) */
function setFs(n,save=true){fs=Math.max(11,Math.min(32,Math.round(n)));document.documentElement.style.setProperty('--fs',fs+'px');if(save){noteApi.setFontSize(fs);status(`글자 ${fs}`);clearTimeout(setFs.t);setFs.t=setTimeout(()=>{if($('st').textContent.startsWith('글자'))status('')},1200)}}
$('fsm').onclick=()=>{setFs(fs-1);ta.focus()};
$('fsp').onclick=()=>{setFs(fs+1);ta.focus()};
ta.addEventListener('wheel',e=>{if(isMac?e.metaKey:e.ctrlKey){e.preventDefault();setFs(fs+(e.deltaY<0?1:-1))}},{passive:false});

async function go(n){      // n: 새 i
  await flush();
  if(n<-1||n>=list.length)return;
  i=n;load();
}
async function fresh(){await flush();i=-1;load();status('')}
$('prev').onclick=()=>go(i+1);
$('next').onclick=()=>go(i-1);
$('kind').onclick=()=>{const j=kinds.findIndex(x=>x.id===kind);kind=kinds[(j+1)%kinds.length].id;if(cur.id){cur.color=null;dirty=true}paint();if(cur.id)flush()};
/* 투명도: 종이(바탕)와 글자를 따로. 0 이면 완전히 투명 (창 전체를 흐리게 하지 않고 화면에서 칠함) */
function look(){
  const r=document.documentElement.style;r.setProperty('--pa',paper);r.setProperty('--ia',ink);
  r.setProperty('--ua',Math.max(paper,ink,.35));      // 둘 다 옅어도 단추 줄은 찾을 수 있게
  $('pa').value=Math.round(paper*100);$('ia').value=Math.round(ink*100);$('pav').textContent=$('pa').value+'%';$('iav').textContent=$('ia').value+'%';
}
let lt=0;const lookSave=()=>{clearTimeout(lt);lt=setTimeout(()=>noteApi.setLook({paper,ink}),250)};
$('pa').addEventListener('input',e=>{paper=+e.target.value/100;look();lookSave()});      // 끄는 동안 바로 반영
$('ia').addEventListener('input',e=>{ink=+e.target.value/100;look();lookSave()});
$('op').onclick=()=>{const on=$('look').classList.toggle('on');$('op').classList.toggle('on',on);if(!on)ta.focus()};
/* Windows: 오른쪽 아래 손잡이로 크기 바꾸기 */
$('grip').addEventListener('pointerdown',e=>{
  e.preventDefault();const g=e.currentTarget,x0=e.screenX,y0=e.screenY,w0=window.outerWidth,h0=window.outerHeight;g.setPointerCapture(e.pointerId);
  let raf=0;const mv=ev=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>noteApi.resize(w0+ev.screenX-x0,h0+ev.screenY-y0))};
  const up=()=>{g.removeEventListener('pointermove',mv);g.removeEventListener('pointerup',up);noteApi.resize(null)};
  g.addEventListener('pointermove',mv);g.addEventListener('pointerup',up);
});
$('top').onclick=()=>{onTop=!onTop;noteApi.setOnTop(onTop);paint()};
$('main').onclick=async()=>{await flush();noteApi.openMain()};
$('hide').onclick=async()=>{await flush();noteApi.hide()};

document.addEventListener('keydown',e=>{
  const mod=isMac?e.metaKey:e.ctrlKey;
  if(e.key==='Escape'){e.preventDefault();flush().then(()=>noteApi.hide());return}
  if(mod&&e.key==='Enter'){e.preventDefault();fresh();return}      // 다 썼음 → 새 포스트잇
  if(mod&&!e.altKey&&(e.key==='='||e.key==='+')){e.preventDefault();setFs(fs+1);return}      // 글자 크게 · 작게 · 기본
  if(mod&&!e.altKey&&(e.key==='-'||e.key==='_')){e.preventDefault();setFs(fs-1);return}
  if(mod&&!e.altKey&&e.key==='0'){e.preventDefault();setFs(15);return}
  if(e.altKey&&!mod&&e.key==='ArrowLeft'){e.preventDefault();go(i+1);return}
  if(e.altKey&&!mod&&e.key==='ArrowRight'){e.preventDefault();go(i-1);return}
});

async function refresh(){      // 창을 꺼낼 때마다 최신 목록 (큰 창에서 고친 것 반영)
  const d=await noteApi.init();
  kinds=d.kinds;list=d.list;paper=d.paper;ink=d.ink;onTop=d.onTop;isMac=d.isMac;setFs(d.fontSize||15,false);document.body.classList.toggle('wgrip',!!d.grip);look();
  if(!kind||!kinds.some(k=>k.id===kind))kind=d.defaultKind;
  const k=isMac?'⌘':'Ctrl+';
  $('hint').textContent=`${k}Enter 새 글 · Alt+←→ · Esc 숨김`;
  const busy=dirty||(!cur.id&&ta.value.trim());      // 쓰던 중 · 카드로 만드는 중
  const j=cur.id?list.findIndex(x=>x.id===cur.id):-1;
  if(j>=0)list[j]=busy?cur:Object.assign(cur,list[j]);      // 보던 포스트잇은 같은 객체로 (저장 중인 것과 어긋나지 않게)
  if(busy){if(j>=0)i=j;paint();ta.focus();return}      // 쓰던 건 그대로
  i=j;load();      // 보던 포스트잇 (지워졌으면 새 글)
}
noteApi.onShown(refresh);
noteApi.onFlush(()=>flush());
refresh();
