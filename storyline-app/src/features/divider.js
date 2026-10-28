/* --- 구분선으로 카드 나누기: 한 줄에 --- 를 치면 ────── 로 바뀌고, Enter 를 누르면 그 아래가 새 카드. 붙여넣은 글의 구분선도 같음 */
const ZDIV='──────────────',DIVRE=/^[ \t]*(?:-{3,}|─{3,})[ \t]*$/;
function zenParts(text){const parts=[[]];let found=false;(text||'').split('\n').forEach(l=>{if(DIVRE.test(l)){found=true;parts.push([])}else parts[parts.length-1].push(l)});return found?parts.map(p=>p.join('\n').replace(/^\n+|\n+$/g,'')):null}
function zenRandom(){
  if(!ZEN)return;const n=ZEN.ids.length;if(n<2)return toast(n?'다른 카드가 아직 없어요':'카드가 없어요');
  let pool=ZEN.ids.filter((id,i)=>i!==ZEN.i&&!ZEN.seen.includes(id));      // 한 바퀴 돌 때까지 같은 카드가 또 나오지 않게
  if(!pool.length){ZEN.seen=[];pool=ZEN.ids.filter((id,i)=>i!==ZEN.i)}
  const id=pool[Math.floor(Math.random()*pool.length)];ZEN.seen.push(id);zenSwitch(id,0);
}
function zenClose(){
  if(!ZEN)return;clearInterval(ZEN.tm);zenTidy(ZEN.ids[ZEN.i]);const el=ZEN.el,k=ZEN.key,cur=ZEN.ids[ZEN.i];ZEN=null;
  el.classList.add('out');setTimeout(()=>el.remove(),160);
  idxClear();renderAll();
  if(cur&&cardById(cur))selectCard(cur);
}
function zenDraw(){
  if(!ZEN)return;const el=ZEN.el,list=zenCards(),i=ZEN.i,c=list[i];
  if(!c){zenClose();return}
  const side=(cc,dir)=>cc?h('div',{class:'zside '+(dir<0?'zl':'zr'),title:dir<0?'이전 카드 (⌥←)':'다음 카드 (⌥→)',style:`--kc0:${cardColor(cc)}`,onclick:()=>zenGo(i+dir)},h('div',{class:'zst'},(cc.text||'').replace(/\n{2,}/g,'\n').trim()||'(빈 카드)')):h('div',{class:'zside zghost '+(dir<0?'zl':'zr')},dir>0?h('div',{class:'zgh',onclick:()=>zenNew()},'＋ 새 카드',h('small',{},'⌘N')):null);
  const k=kindOf(c.kind),names=eff(c).map(id=>charById(id)).filter(Boolean);
  const kb=h('button',{class:'zkind','data-pop':'1',title:'분류 바꾸기',onclick:()=>popMenu(kb,S.kinds.map(kk=>({label:kk.name,sw:kk.colorMode==='random'?RANDOM_BG:kk.color,on:kk.id===c.kind,fn:()=>{edit(()=>{c.kind=kk.id});zenDraw()}})))},h('i',{style:`background:${k.colorMode==='random'?cardColor(c):k.color}`}),k.name);
  const stars=h('span',{class:'zstars',title:c.star?'꼭 쓸 것 — 다시 누르면 해제':'꼭 쓸 것 표시 — 붙이면 무덤에 안 가요'},h('span',{onclick:()=>{edit(()=>{if(c.star)delete c.star;else c.star=true});zenDraw()}},c.star?'★':'☆'));
  const rid=c.id,U0=zUnit(rid);
  const ta=h('textarea',{class:'fval zta',placeholder:'생각나는 대로 적어요…  (--- 를 치면 구분선 · 이어서 쓰면 새 카드가 핀으로 이어져요)',spellcheck:false,
    oninput:e=>{
      if(e.inputType==='insertText'&&e.data==='-'){const v=ta.value,p=ta.selectionStart,ls=v.lastIndexOf('\n',p-1)+1;      // 줄에 --- 를 치면 구분선으로 바꿈
        if(v.slice(ls,p)==='---'&&ta.selectionEnd===p&&(p===v.length||v[p]==='\n')){ta.setRangeText(ZDIV,ls,p,'end')}}
      edit(()=>zenSync(rid,ta.value));zenFit(ta);zenMadeUpdate();zenLinkUpdate()},
    onchange:()=>{zUnit(rid).forEach(x=>autoLinkCard(x));save();const ch=el.querySelector('.zch');if(ch)ch.replaceWith(zch())}},U0.map(x=>x.text||'').join('\n'+ZDIV+'\n'));
  const zch=()=>h('span',{class:'zch'},...eff(c).map(id=>charById(id)).filter(Boolean).map(x=>h('span',{class:'uchip'},h('i',{style:`background:${x.color}`}),x.name)));
  const zmir=h('div',{class:'kmir','aria-hidden':'true'});hlFill(zmir,ta.value);      // 말(따옴표)을 코르크보드와 같은 모양으로
  const zwrap=h('div',{class:'kwrap zwrap'},h('div',{class:'kblk'},h('div',{class:'kbi'})),zmir,ta);
  ta.addEventListener('input',()=>{hlFill(zmir,ta.value);zenFit(ta);hlBlocks(zwrap)});
  ta.addEventListener('scroll',()=>{zmir.scrollTop=ta.scrollTop;zwrap.querySelector('.kbi').style.transform=`translateY(${-zmir.scrollTop}px)`});
  requestAnimationFrame(()=>hlBlocks(zwrap));
  const main=h('div',{class:'zmain'+(ZEN.dir>0?' fromr':ZEN.dir<0?' froml':''),style:`--kc0:${cardColor(c)}`},
    h('div',{class:'zhead'},kb,zch(),h('span',{class:'zlink',title:'구분선으로 이어 쓴 카드 — 핀이 꽂히고 줄로 이어져요',hidden:U0.length<2},`${U0.length}장 이어짐`),h('span',{class:'sp'}),h('span',{class:'zuse'+(episodeOf(c.id)?' used':''),title:episodeOf(c.id)?'타임라인에 배치된 카드':'아직 화에 쓰지 않은 카드'},episodeOf(c.id)?`${episodeOf(c.id).i+1}화 사용`:'미사용'),stars),zwrap,
    h('div',{class:'zfoot'},h('span',{},`${i+1} / ${list.length}`),h('span',{class:'sp'}),h('span',{class:'zhint'},'⌘N 새 카드 · --- 이어 쓰기 · ⌘1 ⌘2 분류 · ⌥R 랜덤 · ⌥←→ · Esc')));
  el.textContent='';
  el.append(h('div',{class:'zbk',onclick:()=>zenClose()}),h('div',{class:'zrow'},side(list[i-1],-1),main,side(list[i+1],1)),zenCtl(),zenInfo(list));zenVars();if(ZEN.timer&&ZEN.timer.done&&!el.querySelector('.ztimeup'))zenShowUp();
  ZEN.dir=0;zenFit(ta);setTimeout(()=>{ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)},20);
}
function zenVars(){if(!ZEN)return;const st=ZEN.el.style;st.setProperty('--zop',(UIP.zenOp===undefined?94:UIP.zenOp)+'%');st.setProperty('--zfs',(UIP.zenFs||26)+'px');st.setProperty('--zblur',(UIP.zenOp===undefined?94:UIP.zenOp)>=99?'0px':'14px')}
function zenLinkUpdate(){if(!ZEN)return;const l=ZEN.el.querySelector('.zlink');if(!l)return;const n=zUnit(ZEN.ids[ZEN.i]).length;l.hidden=n<2;l.textContent=`${n}장 이어짐`}
const zenMadeN=()=>[...ZEN.made].filter(id=>{const c=cardById(id);return c&&(c.text||'').trim()}).length;
const zenMadeText=()=>{const n=ZEN?zenMadeN():0;return n?`이번에 +${n}장`:''};
function zenMadeUpdate(){if(!ZEN)return;const m=ZEN.el.querySelector('.zmade');if(m)m.textContent=zenMadeText();const c=ZEN.el.querySelector('.zcnt');if(c)c.textContent=`${ZEN.ids.length}장`}
function zenInfo(list){      // 왼쪽 위: 지금 어느 인물(노트) 보드이고 몇 장인지
  const ent=charById(ZEN.key),name=ent?ent.name:'미분류',col=ent?ent.color:'var(--sub)',uf=useMode(),on=kindsOn();
  const flt=[uf!=='all'?{unused:'미사용만',used:'사용만'}[uf]:null,on.length?on.map(id=>kindOf(id).name).join('·'):null].filter(Boolean);
  return h('div',{class:'zinfo',title:'지금 집중 모드로 보고 있는 인물 보드'},h('i',{style:`background:${col}`}),h('b',{},name),h('span',{class:'zcnt'},`${list.length}장`),h('span',{class:'zmade',title:'이번 집중 모드에서 새로 쓴 카드'},zenMadeText()),flt.length?h('span',{class:'zfl'},flt.join(' · ')):null);
}
const zenTimerLabel=()=>{const t=ZEN&&ZEN.timer;if(!t)return '';const r=Math.max(0,Math.ceil((t.end-Date.now())/1000));return `${String(Math.floor(r/60)).padStart(2,'0')}:${String(r%60).padStart(2,'0')}`};
function zenTimerMenu(btn){
  const start=m=>{ZEN.timer={end:Date.now()+m*60000,done:false};UIP.zenMin=m;saveUIP();const b=ZEN.el.querySelector('.ztimeup');if(b)b.remove();zenTick();toast(`${m}분 타이머를 시작했어요`);const t=ZEN.el.querySelector('.zta');if(t)t.focus()};
  if(ZEN.timer&&!ZEN.timer.done)return popMenu(btn,[{title:`남은 시간 ${zenTimerLabel()}`},{label:'5분 더',fn:()=>{ZEN.timer.end+=300000;zenTick()}},{label:'타이머 끄기',fn:()=>{ZEN.timer=null;zenTick()}}]);
  popMenu(btn,[{title:'타이머'},...[5,10,15,25].map(m=>({label:`${m}분`,on:UIP.zenMin===m,fn:()=>start(m)})),{label:'직접 입력…',fn:async()=>{const n=parseInt(await askText('몇 분 동안 쓸까요? (숫자)',String(UIP.zenMin||10)),10);if(n>0)start(Math.min(n,240))}}]);
}
function zenBeep(){try{const A=new (window.AudioContext||window.webkitAudioContext)(),o=A.createOscillator(),g=A.createGain();o.type='sine';o.frequency.value=660;g.gain.setValueAtTime(.0001,A.currentTime);g.gain.exponentialRampToValueAtTime(.18,A.currentTime+.04);g.gain.exponentialRampToValueAtTime(.0001,A.currentTime+.9);o.connect(g);g.connect(A.destination);o.start();o.stop(A.currentTime+.95)}catch(e){}}
function zenTick(){
  if(!ZEN)return;const tv=ZEN.el.querySelector('.ztm .tv');if(tv)tv.textContent=zenTimerLabel();
  const t=ZEN.timer;if(!t||t.done||Date.now()<t.end)return;
  t.done=true;zenBeep();zenShowUp();
}
function zenShowUp(){
  const b=h('div',{class:'ztimeup'},h('b',{},'⏱ 시간이 끝났어요'),h('span',{},zenMadeN()?`이번에 +${zenMadeN()}장`:'수고했어요'),
    h('button',{onclick:()=>{ZEN.timer={end:Date.now()+300000,done:false};b.remove();zenTick();const x=ZEN.el.querySelector('.zta');if(x)x.focus()}},'5분 더'),
    h('button',{class:'on',onclick:()=>zenClose()},'마치기'),h('button',{class:'quiet',onclick:()=>{ZEN.timer=null;b.remove();zenTick();const x=ZEN.el.querySelector('.zta');if(x)x.focus()}},'계속 쓰기'));
  ZEN.el.append(b);
}
function zenCtl(){      // 오른쪽 위: 배경 투명도 · 글자 크기
  const op=UIP.zenOp===undefined?94:UIP.zenOp,fs=UIP.zenFs||26;
  const back=()=>{const t=ZEN&&ZEN.el.querySelector('.zta');if(t)t.focus()};
  const setFs=v=>{UIP.zenFs=Math.max(16,Math.min(56,v));saveUIP();zenVars();const t=ZEN.el.querySelector('.zta');if(t)zenFit(t);hlLayoutAll(ZEN.el);const l=ZEN.el.querySelector('.zfsv');if(l)l.textContent=UIP.zenFs;back()};
  const slider=h('input',{type:'range',min:30,max:100,step:2,value:op,title:'포스트잇 바깥(배경)이 얼마나 가려질지 · 오른쪽으로 갈수록 진해요',oninput:e=>{UIP.zenOp=+e.target.value;zenVars()},onchange:()=>{saveUIP();back()}});
  const tb=h('button',{class:'ztm','data-pop':'1',title:'타이머 — 정해 둔 시간 동안 쓰기',onclick:()=>zenTimerMenu(tb)},'⏱',h('span',{class:'tv'},zenTimerLabel()));
  return h('div',{class:'zctl',onmousedown:e=>{if(e.target.tagName!=='INPUT')e.preventDefault()}},
    tb,h('span',{class:'zsep'}),h('span',{class:'zcl'},'배경'),slider,h('span',{class:'zsep'}),
    h('button',{title:'글자 작게 (⌘−)',onclick:()=>setFs((UIP.zenFs||26)-2)},'A−'),h('b',{class:'zfsv'},fs),h('button',{title:'글자 크게 (⌘＋)',onclick:()=>setFs((UIP.zenFs||26)+2)},'A＋'));
}
function zenFit(t){t.style.height='auto';t.style.height=Math.min(t.scrollHeight+2,Math.round(innerHeight*.55))+'px'}
// 집중 모드의 키보드: 열려 있는 동안 다른 단축키보다 먼저 받음
document.addEventListener('keydown',e=>{
  if(e.altKey&&!e.metaKey&&!e.ctrlKey&&e.code==='KeyZ'&&!e.isComposing){const a=document.activeElement;if(ZEN){e.preventDefault();e.stopPropagation();zenClose();return}
    if(!(a&&(a.tagName==='INPUT'||(a.tagName==='TEXTAREA'&&!a.readOnly)))&&!$('modal').classList.contains('on')){e.preventDefault();zenOpen();return}}
  if(!ZEN||document.querySelector('.dlg'))return;
  const k=e.code;
  if(k==='Escape'){e.preventDefault();e.stopPropagation();if(POP){closePop();return}zenClose();return}
  if(modKey(e)&&!e.shiftKey&&!e.altKey){const m=/^(?:Digit|Key)(.)$/.exec(k),kind=m&&S.kinds.find(x=>x.key===m[1]);      // ⌘1 · ⌘2: 지금 카드의 분류 바꾸기
    if(kind){e.preventDefault();e.stopPropagation();const c=cardById(ZEN.ids[ZEN.i]);if(c){edit(()=>{c.kind=kind.id;delete c.color;if(kind.colorMode==='random')c.color=randomCardColor()});const keep=ZEN.el.querySelector('.zta');const pos=keep?keep.selectionStart:0;zenDraw();setTimeout(()=>{const t=ZEN&&ZEN.el.querySelector('.zta');if(t)t.setSelectionRange(pos,pos)},40);toast(`분류: ${kind.name}`)}return}}
  if(e.altKey&&k==='KeyR'){e.preventDefault();e.stopPropagation();zenRandom();return}
  if(e.altKey&&k==='ArrowLeft'){e.preventDefault();e.stopPropagation();zenGo(ZEN.i-1);return}
  if(e.altKey&&k==='ArrowRight'){e.preventDefault();e.stopPropagation();zenGo(ZEN.i+1);return}
  if((e.metaKey||e.ctrlKey)&&k==='KeyN'){e.preventDefault();e.stopPropagation();zenNew();return}
  if((e.metaKey||e.ctrlKey)&&(k==='Equal'||k==='NumpadAdd'||k==='Minus'||k==='NumpadSubtract')){e.preventDefault();e.stopPropagation();const b=ZEN.el.querySelectorAll('.zctl button');(k==='Equal'||k==='NumpadAdd'?b[1]:b[0]).click();return}
  if((e.metaKey||e.ctrlKey)&&(e.key==='Backspace'||e.key==='Delete')){e.preventDefault();e.stopPropagation();const rid=ZEN.ids[ZEN.i],U=zUnit(rid);if(!U.length)return;
    (async()=>{const any=U.some(c=>(c.text||'').trim());
      if(any&&!await askConfirm(U.length>1?`이어 쓴 카드 ${U.length}장을 모두 삭제할까요? 휴지통에서 되살릴 수 있어요.`:'이 카드를 삭제할까요? 휴지통에서 되살릴 수 있어요.',{ok:'삭제',danger:true}))return;
      snap();U.forEach(c=>{if((c.text||'').trim())S.trash.push({id:uid(),type:'card',data:c,at:Date.now()});zRemove(c)});idxClear();save();
      const at=ZEN.ids.indexOf(rid);if(at>=0)ZEN.ids.splice(at,1);if(ZEN.i>=ZEN.ids.length)ZEN.i=Math.max(0,ZEN.ids.length-1);toast(any?'휴지통으로 보냈어요':'빈 카드를 지웠어요');
      if(!ZEN.ids.length)zenNew();else zenDraw()})();return}
  if((e.metaKey||e.ctrlKey)&&k==='KeyZ'){      // 집중 모드의 ⌘Z: 쓰고 있는 글 안에서만 되돌림 (코르크보드의 노트가 되돌려지지 않게 앱 메뉴 동작도 막음)
    e.preventDefault();e.stopPropagation();const a=document.activeElement;
    if(a&&a.tagName==='TEXTAREA'&&!a.readOnly)document.execCommand(e.shiftKey?'redo':'undo');return}
  if(e.metaKey||e.ctrlKey){if(['KeyF'].includes(k))e.stopPropagation()}      // 집중 모드 중에는 검색 같은 큰 동작을 막음
},true);
