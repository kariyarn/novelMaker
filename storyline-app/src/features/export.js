/* ---------- 3) 내보내기 ---------- */
function exportTimelineMd(){
  const L=['# 타임라인','',`> 내보낸 날짜: ${new Date().toLocaleString()}`,''];
  const card=c=>{
    const names=eff(c).map(id=>charById(id).name).join(', ');
    L.push(`- **[${kindOf(c.kind).name}]**${c.star?' ★':''}${names?' · '+names:''}`);
    String(c.text||'(빈 카드)').split('\n').forEach(t=>L.push('  '+t));
  };
  S.episodes.forEach((ep,i)=>{
    const cs=ep.cardIds.map(cardById).filter(Boolean);if(!cs.length&&!ep.title&&!ep.memo)return;
    L.push(`## ${i+1}화${ep.title?' · '+ep.title:''}`,'');
    if(ep.memo)L.push('> '+ep.memo.replace(/\n/g,'\n> '),'');
    cs.forEach(card);L.push('');
  });
  const un=S.cards.filter(c=>!episodeOf(c.id));
  if(un.length){L.push('## 아직 배치하지 않은 카드','');un.forEach(card);L.push('')}
  dlBlob(`${fileBase()}-timeline-${todayStr()}.md`,new Blob([L.join('\n')],{type:'text/markdown'}));toast('타임라인을 Markdown으로 내보냈어요');
}
/* 원고 .txt: 화에 넣은 카드의 본선 글만 화 순서대로 (보관 칸 · 오른쪽 목록 · 무덤 카드는 빠짐). 장면 구분은 * * * */
const MS_SEP='* * *';
function epManuscript(ep){
  const seps=new Set(ep.seps||[]),out=[];
  ep.cardIds.map(cardById).filter(Boolean).forEach(c=>{
    const t=(c.text||'').replace(/^\s*\n/,'').replace(/\s+$/,'');if(!t.trim())return;
    if(out.length&&seps.has(c.id))out.push(MS_SEP);
    out.push(t);
  });
  return out.join('\n\n');
}
function manuscriptText(lo,hi,titles){
  const parts=[];let eps=0,cards=0,len=0;
  S.episodes.slice(lo,hi).forEach((ep,k)=>{
    const body=epManuscript(ep);if(!body)return;
    eps++;len+=body.split(MS_SEP).join('').replace(/\s/g,'').length;cards+=ep.cardIds.map(cardById).filter(c=>c&&(c.text||'').trim()).length;
    parts.push(titles?`${lo+k+1}화${ep.title&&ep.title.trim()?' · '+ep.title.trim():''}\n\n${body}`:body);
  });
  return {txt:parts.join(titles?'\n\n\n':'\n\n'+MS_SEP+'\n\n')+(parts.length?'\n':''),eps,cards,len};
}
function exportManuscriptTxt(lo,hi,titles=true){
  const E=S.episodes,{txt,eps,cards,len}=manuscriptText(lo,hi,titles);
  if(!eps)return toast('내보낼 원고가 없어요'),false;
  const rng=lo===0&&hi===E.length?'전체':(hi-lo===1?`${lo+1}화`:`${lo+1}-${hi}화`);
  dlBlob(`${fileBase()}-원고-${rng}-${todayStr()}.txt`,new Blob([txt],{type:'text/plain;charset=utf-8'}));
  toast(`원고를 내보냈어요 · ${eps}화 · 카드 ${cards}장 · 공백 빼고 ${len.toLocaleString()}자`);
  return true;
}
/* 원고 내보내기 창: 전체 / 몇 화부터 몇 화까지 + 화 제목 넣기. 처음 범위는 지금 타임라인에서 보는 범위 */
function showManuscriptExport(range){
  const E=S.episodes,N=E.length;if(!N)return toast('아직 화가 없어요');
  const [lo0,hi0]=range||(typeof tlRange==='function'?tlRange():[0,N]);
  const num=v=>h('input',{type:'number',class:'msnum',min:1,max:N,value:v,oninput:upd});
  const a=num(lo0+1),b=num(hi0),tt=h('input',{type:'checkbox',checked:UIP.msNoTitle?false:true,onchange:upd});
  const info=h('div',{class:'muted msinfo'});
  const rng=()=>{let x=Math.max(1,Math.min(N,parseInt(a.value,10)||1)),y=Math.max(1,Math.min(N,parseInt(b.value,10)||N));if(x>y)[x,y]=[y,x];return [x-1,y]};
  function upd(){const [x,y]=rng(),r=manuscriptText(x,y,tt.checked);info.textContent=r.eps?`${x+1}~${y}화 중 글이 있는 ${r.eps}화 · 카드 ${r.cards}장 · 공백 빼고 ${r.len.toLocaleString()}자`:'이 범위에는 내보낼 글이 없어요'}
  const quick=(label,x,y)=>h('button',{class:'quiet',onclick:()=>{a.value=x+1;b.value=y;upd()}},label);
  const o=h('div',{class:'dlg',role:'dialog','aria-modal':'true'});
  const close=()=>{o.remove();document.removeEventListener('keydown',key,true)};
  const go=()=>{const [x,y]=rng();UIP.msNoTitle=!tt.checked;saveUIP();if(exportManuscriptTxt(x,y,tt.checked))close()};
  const key=e=>{if(e.isComposing)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();go()}};
  o.append(h('div',{class:'dlgbox msdlg'},
    h('div',{class:'dlgmsg'},h('b',{},'원고 .txt로 내보내기'),'\n화에 넣은 카드의 글만 화 순서대로 이어 붙여요. 보관 칸 · 아직 안 쓴 카드는 빠져요.'),
    h('div',{class:'msrow'},a,h('span',{},'화부터'),b,h('span',{},'화까지')),
    h('div',{class:'msrow'},quick(`전체 ${N}화`,0,N),...(range||(lo0===0&&hi0===N)?[]:[quick('지금 보는 범위',lo0,hi0)])),
    h('label',{class:'msrow'},tt,'화마다 “1화 · 제목” 머리말 넣기'),
    info,
    h('div',{class:'dlgrow'},h('button',{onclick:close},'취소'),h('button',{class:'on',onclick:go},'내보내기'))));
  o.addEventListener('mousedown',e=>{if(e.target===o)close()});
  document.addEventListener('keydown',key,true);
  document.body.append(o);upd();a.focus();a.select();
}
function exportSheetsMd(){
  const L=['# 인물 · 설정','',`> 내보낸 날짜: ${new Date().toLocaleString()}`,''];
  S.characters.forEach(c=>{
    L.push(`## ${c.name}${c.kind==='setting'?' (설정)':''}`,'');
    if(c.role)L.push(`- 역할: ${c.role}`);
    if((c.aliases||[]).length)L.push(`- 별칭: ${c.aliases.join(', ')}`);
    if(c.summary)L.push(`- 소개: ${c.summary}`);
    const f=S.folders.find(x=>x.id===folderOf(c));if(f)L.push(`- 폴더: ${f.name}`);
    L.push('');
    if(c.memo)L.push(c.memo,'');
    if(c.kind!=='setting'&&(c.longGoal||(c.goals||[]).length)){
      L.push('### 목표','');if(c.longGoal)L.push(`**장기 목표**: ${c.longGoal}`,'');
      const gl=c.goals||[];gl.filter(g=>g.state==='active').forEach(g=>L.push(`- [ ] ${g.text}`));
      gl.filter(g=>g.state==='done').forEach(g=>L.push(`- [x] ${g.text} (달성 ${goalDate(g.at)})`));
      gl.filter(g=>g.state==='dropped').forEach(g=>L.push(`- ~~${g.text}~~ (포기 ${goalDate(g.at)})`));
      L.push('');
    }
    const groups=[];(c.fields||[]).forEach(x=>{if(x.value&&x.value.trim()&&!groups.includes(x.group))groups.push(x.group)});
    groups.forEach(g=>{L.push(`### ${g}`,'');(c.fields||[]).filter(x=>x.group===g&&x.value&&x.value.trim()).forEach(x=>{L.push(`**${x.label}**`,'',x.value.trim(),'')})});
  });
  dlBlob(`${fileBase()}-sheets-${todayStr()}.md`,new Blob([L.join('\n')],{type:'text/markdown'}));toast('인물 · 설정 시트를 Markdown으로 내보냈어요');
}
const pinStandalone=k=>{
  const pc=PIN_COLORS.find(x=>x[0]===k)||PIN_COLORS[0],kk=pc[0],b=pc[2],l=pc[3],dk=pc[4];
  const defs=`<defs><linearGradient id="pinGold" x1="0" x2="1"><stop offset="0" stop-color="#8a6d2b"/><stop offset=".5" stop-color="#f1d98a"/><stop offset="1" stop-color="#7a5f22"/></linearGradient><linearGradient id="pinMetal" x1="0" x2="1"><stop offset="0" stop-color="#8d939a"/><stop offset=".5" stop-color="#e6e9ec"/><stop offset="1" stop-color="#7d838a"/></linearGradient><radialGradient id="pinShadow"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient><radialGradient id="pinHead_${kk}" cx=".34" cy=".3" r=".85"><stop offset="0" stop-color="${l}"/><stop offset=".42" stop-color="${b}"/><stop offset="1" stop-color="${dk}"/></radialGradient><linearGradient id="pinBody_${kk}" x1="0" x2="1"><stop offset="0" stop-color="${dk}"/><stop offset=".3" stop-color="${l}" stop-opacity=".85"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${dk}"/></linearGradient></defs>`;
  return pinSvg(k).replace('<svg viewBox="0 0 30 52">','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 52" width="90" height="156">'+defs);
};
async function renderBoardCanvas(){
  const key=UI.sel,B=boardMap(key),items=boardCards(key).map(c=>({c,p:B[c.id]})).filter(x=>x.p);
  if(!items.length)return null;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  items.forEach(({p})=>{x0=Math.min(x0,p.x-20);y0=Math.min(y0,p.y-45);x1=Math.max(x1,p.x+p.w+20);y1=Math.max(y1,p.y+(p.h||CH)+30)});
  x0-=50;y0-=50;x1+=50;y1+=50;
  const W0=x1-x0,H0=y1-y0,sc=Math.min(2,7000/W0,7000/H0);
  const cv=document.createElement('canvas');cv.width=Math.max(1,Math.ceil(W0*sc));cv.height=Math.max(1,Math.ceil(H0*sc));
  const g=cv.getContext('2d');g.scale(sc,sc);g.translate(-x0,-y0);
  const root=getComputedStyle(document.documentElement),bv=document.querySelector('.bview'),bg=bv?getComputedStyle(bv).backgroundColor:'#efede8',dotc=(root.getPropertyValue('--dot')||'rgba(0,0,0,.15)').trim();
  g.fillStyle=bg;g.fillRect(x0,y0,W0,H0);
  const pat=S.settings.boardPat||'dot';
  if(pat==='dot'){g.fillStyle=dotc;for(let x=Math.ceil(x0/24)*24;x<x1;x+=24)for(let y=Math.ceil(y0/24)*24;y<y1;y+=24){g.beginPath();g.arc(x,y,1.3,0,Math.PI*2);g.fill()}}
  else if(pat==='grid'||pat==='dash'){g.strokeStyle=dotc;g.lineWidth=1;if(pat==='dash')g.setLineDash([6,6]);for(let x=Math.ceil(x0/24)*24;x<x1;x+=24){g.beginPath();g.moveTo(x,y0);g.lineTo(x,y1);g.stroke()}for(let y=Math.ceil(y0/24)*24;y<y1;y+=24){g.beginPath();g.moveTo(x0,y);g.lineTo(x1,y);g.stroke()}g.setLineDash([])}
  const ff=getComputedStyle(document.body).fontFamily,fs=(S.settings.font||14)*1.04,lh=fs*1.55;
  const wrap=(text,maxW)=>{const out=[];let idx=0;String(text).split('\n').forEach(par=>{let line='',ls=idx;for(const ch of par){if(g.measureText(line+ch).width>maxW&&line){out.push({t:line,s:ls});ls+=line.length;line=ch}else line+=ch}out.push({t:line,s:ls});idx+=par.length+1});return out};
  const pinImgs={};
  const getPinImg=async k=>{if(pinImgs[k])return pinImgs[k];const im=new Image();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(pinStandalone(k));try{await im.decode()}catch(e){}return pinImgs[k]=im};
  const rr=(x,y,w,h2,r)=>{g.beginPath();g.roundRect(x,y,w,h2,r)};
  items.sort((a,b)=>(a.p.z||0)-(b.p.z||0));
  for(const {c,p} of items){
    const h2=p.h||CH,used=episodeOf(c.id);
    g.save();g.translate(p.x+p.w/2,p.y+h2/2);g.rotate((p.r||0)*Math.PI/180);g.translate(-p.w/2,-h2/2);
    g.shadowColor='rgba(0,0,0,.30)';g.shadowBlur=14;g.shadowOffsetY=8;g.fillStyle=cardColor(c);rr(0,0,p.w,h2,[3,3,16,3]);g.fill();
    g.shadowColor='transparent';g.shadowBlur=0;g.shadowOffsetY=0;
    const gr=g.createLinearGradient(0,0,0,34);gr.addColorStop(0,'rgba(255,255,255,.4)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;rr(0,0,p.w,h2,[3,3,16,3]);g.fill();
    if(c.star){g.strokeStyle='#f0a60a';g.lineWidth=2.5;rr(0,0,p.w,h2,[3,3,16,3]);g.stroke()}
    if(used){g.strokeStyle='#e5484d';g.lineWidth=2;rr(1,1,p.w-2,h2-2,[3,3,16,3]);g.stroke()}
    g.fillStyle='#1d1d1f';g.font=`400 ${fs}px ${ff}`;g.textBaseline='top';
    const maxLines=Math.max(1,Math.floor((h2-38-36)/lh)),lines=wrap(c.text||'',p.w-28);
    const txt=String(c.text||''),mask=new Uint8Array(txt.length+1),hs=S.settings.hlStyle||'bubble',vis=lines.slice(0,maxLines);
    if(hs!=='off')for(const m of txt.matchAll(HLRE))mask.fill(m[0][0]==='['?2:(m[0][0]==='`'?3:1),m.index,m.index+m[0].length);
    if(hs!=='off')vis.forEach((L,i)=>{      // 말 블록: 줄을 넘어 이어지면 한 덩어리로
      const y=40+i*lh;let j=0;
      while(j<L.t.length){
        const v=mask[L.s+j];if(!v){j++;continue}
        let k2=j;while(k2<L.t.length&&mask[L.s+k2]===v)k2++;
        const contPrev=j===0&&i>0&&L.s>0&&mask[L.s-1]===v,contNext=k2===L.t.length&&i<vis.length-1&&mask[L.s+k2]===v;
        const xa=contPrev?11:14+g.measureText(L.t.slice(0,j)).width-3,xb=contNext?p.w-11:14+g.measureText(L.t.slice(0,k2)).width+3;
        g.fillStyle=hs!=='inset'?(v===2?'rgba(222,236,255,.68)':'rgba(255,255,255,.56)'):(v===2?'rgba(40,80,170,.09)':'rgba(0,0,0,.085)');
        g.fillRect(xa,y-.3,xb-xa,lh+.6);j=k2;
      }
    });
    g.fillStyle='#1d1d1f';
    vis.forEach((L,i)=>{let tt=L.t;if(i===maxLines-1&&lines.length>maxLines)tt=tt.replace(/.{0,1}$/,'…');g.fillText(tt,14,40+i*lh+(lh-fs)/2)});
    if(c.star){g.fillStyle='#c98100';g.font=`${fs*.8}px ${ff}`;g.textAlign='right';g.fillText('★',p.w-9,8);g.textAlign='left'}
    let cx=10;const cy=h2-26;g.font=`11px ${ff}`;
    for(const id of eff(c)){const e=charById(id);if(!e)continue;const tw=g.measureText(e.name).width+22;if(cx+tw>p.w-8)break;
      g.fillStyle='rgba(255,255,255,.62)';rr(cx,cy,tw,18,9);g.fill();g.fillStyle=e.color;g.beginPath();g.arc(cx+9,cy+9,3.2,0,Math.PI*2);g.fill();g.fillStyle='#3a3a3c';g.fillText(e.name,cx+16,cy+3);cx+=tw+4}
    if(used){const t=`${used.i+1}화 사용`,tw=g.measureText(t).width+14;if(cx+tw<=p.w-6){g.fillStyle='#e5484d';rr(cx,cy,tw,18,9);g.fill();g.fillStyle='#fff';g.fillText(t,cx+7,cy+3)}}
    if(c.pin){const im=await getPinImg(c.pinColor||S.settings.pinColor||'black');g.save();g.translate(p.w/2,-29+37.2);g.rotate((c.pinAngle||0)*Math.PI/180);g.drawImage(im,-11,-37.2,22,38);g.restore()}
    g.restore();
  }
  // 핀 줄
  if(S.settings.showStrings!==false){
    const st=S.settings,style=st.stringStyle||'thread',w=STRING_W[st.stringW||'m']||2.6,gcol=st.stringColor||'#c8412b',sagF=style==='taut'?0:(style==='loose'?.36:.16),sagMax=style==='loose'?280:150,vis=new Set(items.map(i=>i.c.id));
    S.links.forEach(l=>{const ca=cardById(l.a),cb=cardById(l.b);if(!ca||!cb||!ca.pin||!cb.pin||!vis.has(l.a)||!vis.has(l.b)||!B[l.a]||!B[l.b])return;
      const a=pinPoint(B[l.a],ca.pinAngle),b=pinPoint(B[l.b],cb.pinAngle),sag=Math.min(sagMax,Math.hypot(b[0]-a[0],b[1]-a[1])*sagF),col=l.color||gcol;
      g.save();g.lineCap='round';g.shadowColor='rgba(0,0,0,.3)';g.shadowBlur=2;g.shadowOffsetY=1.5;g.strokeStyle=col;g.lineWidth=w;if(style==='dash')g.setLineDash([w*3+4,w*2+4]);
      g.beginPath();g.moveTo(a[0],a[1]);g.quadraticCurveTo((a[0]+b[0])/2,(a[1]+b[1])/2+sag,b[0],b[1]);g.stroke();
      if(style!=='dash'){g.shadowColor='transparent';g.strokeStyle='rgba(255,255,255,.42)';g.lineWidth=w*.42;g.setLineDash([1.4,3.2]);g.lineCap='butt';g.stroke()}
      g.restore();g.fillStyle=col;[a,b].forEach(q=>{g.beginPath();g.arc(q[0],q[1],w*.8+1.5,0,Math.PI*2);g.fill()})});
  }
  return cv;
}
async function exportBoardPng(){
  if(!onBoard()||!document.querySelector('.bview'))return toast('구상 · 전체 화면에서 내보낼 수 있어요');
  toast('이미지를 만드는 중…');const cv=await renderBoardCanvas();
  if(!cv)return toast('내보낼 포스트잇이 없어요');
  const name=UI.sel==='all'?'전체':(UI.sel==='none'?'미분류':UI.sel==='grave'?'무덤':(charById(UI.sel)||{name:'보드'}).name);
  cv.toBlob(b=>{if(!b)return toast('이미지를 만들지 못했어요');dlBlob(`${fileBase()}-${name}-${todayStr()}.png`,b);toast('코르크보드를 이미지로 내보냈어요')},'image/png');
}
