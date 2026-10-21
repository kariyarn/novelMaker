/* 포스트잇 창: 쓰는 대로 지금 작품에 카드로 저장 · 지난 포스트잇 넘겨보며 고치기 */
const $=id=>document.getElementById(id);
let kinds=[],kind=null,list=[],i=-1,cur={id:null,text:''},dirty=false,saving=Promise.resolve(),t=0,opacity=1,onTop=true,isMac=false,fs=15;
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
    const r0=c.id?await noteApi.update(c.id,text,k):null;
    if(r0){c.text=text;c.kind=k;c.color=r0.color}
    else if(text.trim()){const r=await noteApi.add(text,k);if(r){c.id=r.id;c.text=text;c.kind=k;c.color=r.color;list=[c,...list.filter(x=>x.id!==r.id)];if(cur===c)i=0;else if(i>=0)i++;paint()}}      // 새 글 · 큰 창에서 카드가 없어졌으면 새 카드로 (쓴 글을 버리지 않음)
    status('저장됨');
  }).catch(()=>status('저장 못 함'));
  return saving;
}
ta.addEventListener('input',()=>{dirty=true;status('');clearTimeout(t);t=setTimeout(flush,600)});
let composing=false;      // 한글 조합 중: 글자를 다시 넣으면 조합이 깨짐
ta.addEventListener('compositionstart',()=>{composing=true});
ta.addEventListener('compositionend',()=>{composing=false});
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
$('op').addEventListener('input',e=>{opacity=+e.target.value/100;noteApi.setOpacity(opacity);status(`투명도 ${e.target.value}%`)});      // 끄는 동안 바로 반영
$('op').addEventListener('change',()=>{setTimeout(()=>{if($('st').textContent.startsWith('투명도'))status('')},1200);ta.focus()});
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

/* 작품 고르기: 쓰던 걸 저장하고 큰 창의 작품을 바꾼 뒤, 그 작품의 새 글로 */
function paintWorks(w){
  const s=$('work');s.textContent='';
  (w&&w.list||[]).forEach(n=>{const o=document.createElement('option');o.value=n.id;o.textContent='📖 '+n.name;s.append(o)});
  s.value=w&&w.current||'';s.hidden=!s.options.length;
}
$('work').addEventListener('change',async e=>{
  const id=e.target.value;await flush();
  const ok=await noteApi.openWork(id);
  cur={id:null,text:''};i=-1;ta.value='';dirty=false;
  await refresh();status(ok?'작품을 바꿨어요':'작품을 열 수 없어요');ta.focus();
});
async function refresh(){      // 창을 꺼낼 때마다 최신 목록 (큰 창에서 고친 것 반영)
  const d=await noteApi.init();
  kinds=d.kinds;list=d.list;opacity=d.opacity;onTop=d.onTop;isMac=d.isMac;setFs(d.fontSize||15,false);document.body.classList.toggle('flat',!d.glass);$('op').value=Math.round(opacity*100);
  if(!kind||!kinds.some(k=>k.id===kind))kind=d.defaultKind;
  paintWorks(d.works);
  const k=isMac?'⌘':'Ctrl+';
  $('hint').textContent=`${k}Enter 새 글 · Alt+←→ · Esc 숨김`;
  const j=cur.id?list.findIndex(x=>x.id===cur.id):-1;
  const same=j>=0&&list[j].text===ta.value;      // 큰 창 글과 같음: 다시 넣으면 커서만 끝으로 튐 (동기화 뒤마다 글쓰기가 끊겼음)
  const lost=cur.id&&j<0&&ta.value.trim()&&document.hasFocus();      // 쓰던 포스트잇이 큰 창에서 없어짐: 쓴 글을 새 카드로 살림
  const busy=lost||dirty||composing||(!cur.id&&ta.value.trim());      // 쓰던 중 · 카드로 만드는 중
  if(lost){dirty=true;flush()}
  if(j>=0)list[j]=busy&&!same?cur:Object.assign(cur,list[j]);      // 보던 포스트잇은 같은 객체로 (저장 중인 것과 어긋나지 않게)
  if(busy||same){if(j>=0)i=j;paint();if(document.activeElement!==ta)ta.focus();return}      // 쓰던 건 그대로
  i=j;load();      // 보던 포스트잇 (지워졌으면 새 글)
}
noteApi.onShown(refresh);
noteApi.onFlush(()=>flush());
refresh();
