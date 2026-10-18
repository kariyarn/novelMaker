/* ---------- 왼쪽: 캐릭터 · 설정 · 폴더 (폴더 안 폴더, 아이콘, 끌어서 이동) ---------- */
const folderById=id=>S.folders.find(f=>f.id===id);
const folderOf=c=>{const f=c.folder&&folderById(c.folder);return f?f.id:(c.kind==='setting'?'f_setting':null)};
const parentOf=f=>{const p=f.parent&&folderById(f.parent);return p&&p!==f?p.id:null};
const childFolders=pid=>S.folders.filter(f=>parentOf(f)===pid);
const inside=(fid,anc)=>{let x=folderById(fid),n=0;while(x&&n++<50){if(x.id===anc)return true;x=x.parent?folderById(x.parent):null}return false};      // fid 가 anc 이거나 그 안쪽인가
const folderPath=f=>{const nm=[];let x=f,n=0;while(x&&n++<20){nm.unshift(x.name);x=x.parent?folderById(x.parent):null}return nm.join(' / ')};
const folderCount=fid=>S.characters.filter(c=>folderOf(c)===fid).length+childFolders(fid).reduce((a,f)=>a+folderCount(f.id),0);
const ICON_SET=['📁','📂','🗂️','⭐','🎬','🎭','🏠','🏙️','🌍','🗝️','💼','📚','🧩','🔥','💧','🌙','🍀','❤️','⚔️','🎵','👤','🧑','👩','👨','🧒','👑','🐱','🐶','🗺️','🏛️','📍','📜','🔮','⚙️','💡','🎲','🌸','☕','🚗','✈️'];
const ICON_TABS=[['기본',ICON_SET],
 ['판타지',['🐉','🧙','🧝','🧚','🦄','🏰','🗡️','🛡️','🔮','📜','🪄','👑','💎','🧪','🌲','🌋','🏔️','⚔️','🦅','🐺','🌙','✨','🔥','🧞','🪙','🗝️','🏹','🧛','👹','🧟','⚗️','🕯️','🪦','🌌','🦇','🕷️','🐍','🦉','🍄','⛲']],
 ['무협',['🥋','🏯','⛰️','🐅','🐲','🏮','🍶','🍵','🎋','🧘','🥷','📿','🌸','🎎','🛕','🏞️','🌊','☯️','🧧','🪶','🏹','💀','🩸','🌕','🛖','⛩️','🔱','🗡️','⚔️','🔥','🌬️','🐉','🦅','🐯','🐍','🌾','🎐','🪵','🏺','🩹']],
 ['현대판타지',['🏢','🌆','🏙️','📱','💻','🚇','🚗','🏥','🏫','🏦','🕳️','🌀','⚡','👁️','🧬','🔫','💊','🎮','📡','🛸','🧿','🎰','🃏','💳','🎧','📷','🏆','🔰','🎯','🔑','🖥️','🛰️','🕹️','📺','🚨','🧪','🌃','🚪','📊','🧑']]];
function pickIcon(anchor,cur,fn){      // 아이콘 고르기: 장르별 목록에서 고르거나 이모지를 직접 입력
  let tab=Math.min(Math.max(+UIP.icTab||0,0),ICON_TABS.length-1);
  const grid=h('div',{class:'icgrid'}),tabs=h('div',{class:'ictabs'});
  const fill=()=>{grid.innerHTML='';tabs.innerHTML='';
    ICON_TABS.forEach(([n],i)=>tabs.append(h('button',{class:'ictab'+(i===tab?' on':''),onclick:e=>{e.stopPropagation();tab=i;UIP.icTab=i;saveUIP();fill()}},n)));
    ICON_TABS[tab][1].forEach(ic=>grid.append(h('button',{class:'icb'+(cur===ic?' on':''),onclick:()=>{closePop();fn(ic)}},ic)))};
  fill();
  const inp=h('input',{class:'icin',placeholder:'직접 입력 (이모지·글자 1~2개)',maxlength:4,onkeydown:e=>{if(e.key==='Enter'&&!e.isComposing&&inp.value.trim()){closePop();fn(inp.value.trim())}}});
  popMenu(anchor,[{title:'아이콘'},{node:tabs},{node:grid},{node:h('div',{class:'icrow'},inp,h('button',{onclick:()=>{closePop();fn('')}},'기본값'))}]);
  setTimeout(()=>{if(POP)inp.focus()},0);
}
const setEntIcon=(c,ic)=>act(()=>{if(ic)c.icon=ic;else delete c.icon});
const setFolderIcon=(f,ic)=>act(()=>{if(ic)f.icon=ic;else delete f.icon});
/* 인물 시트 열림/닫힘: 인물을 고를 때는 마지막으로 직접 접거나 편 상태를 그대로 (예전처럼 매번 펴지 않음) · 작품 노트는 펴고 설정은 접음 */
function sheetFor(id){const c=charById(id);UIP.cl.sheet=id==='work'?false:(c&&c.kind!=='setting'?!!UIP.chCl:true)}
function setSel(id){UI.peek=(UI.peek==='left')?null:UI.peek;UI.folderView=null;UI.sel=id;sheetFor(id);saveUIP();renderAll()}
let DRAGE=null,DRAGF=null;
const dragOn=on=>$('left').classList.toggle('ldrag',on);
function folderChoices(isOn,fn,except){      // 폴더 목록(경로 표시). except 는 자기 자신과 그 안쪽을 제외
  return S.folders.filter(f=>!except||!inside(f.id,except)).map(f=>({label:'　'.repeat(Math.max(0,folderPath(f).split(' / ').length-1))+(f.icon?f.icon+' ':'📁 ')+f.name,on:isOn(f),fn:()=>fn(f)}));
}
function entItems(c){
  return [{label:'아이콘 바꾸기…',fn:()=>setTimeout(()=>{const a=document.querySelector(`#left [data-eid="${c.id}"] .eic`);if(a)pickIcon(a,c.icon,v=>setEntIcon(c,v))},30)},
    {label:'이름 바꾸기',fn:()=>renameEntity(c)},'sep',{title:'폴더로 이동'},
    {label:c.kind==='setting'?'기본 위치 (설정)':'폴더 밖으로',on:!c.folder,fn:()=>act(()=>{delete c.folder})},
    ...folderChoices(f=>folderOf(c)===f.id&&!!c.folder,f=>act(()=>{c.folder=f.id}))];
}
function entMenu(e,c){
  const a=h('div',{style:`position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:1px;height:1px`});document.body.append(a);
  popMenu(a,entItems(c));a.remove();
}
async function renameEntity(c){
  const v=((await askText(c.kind==='setting'?'설정 노트 이름':'캐릭터 이름',c.name))||'').trim();if(!v||v===c.name)return;
  const d=dupName(v,c.id);if(d)return toast(`'${d.name}'은(는) 이미 있는 이름이에요`);
  act(()=>{c.name=v;autoLinkAll()});
}
const folderSel=c=>h('div',{class:'row'},h('span',{class:'muted'},'폴더'),
  sel([['',c.kind==='setting'?'(기본: 설정)':'(폴더 없음)'],...S.folders.map(f=>[f.id,folderPath(f)])],c.folder||'',v=>act(()=>{if(v)c.folder=v;else delete c.folder})),
  (()=>{const b=h('button',{class:'quiet','data-pop':'1',title:'아이콘 바꾸기',style:'padding:0 8px',onclick:()=>pickIcon(b,c.icon,v=>setEntIcon(c,v))},c.icon||'아이콘 ＋');return b})());
async function addEntity(kind,folder){
  const name=((await askText(kind==='setting'?'새 설정 노트 이름 (예: 반지하, 세계관)':'새 캐릭터 이름'))||'').trim();if(!name)return;
  const d=dupName(name);if(d){setSel(d.id);return toast(`'${d.name}'은(는) 이미 있는 이름이에요`)}
  let id;
  act(()=>{const c=kind==='setting'?newSetting(name):newChar(name,PAL[S.characters.length%PAL.length]);if(folder){c.folder=folder;UIP.fo[folder]=false}S.characters.push(c);id=c.id;autoLinkAll()});
  setSel(id);
}
const addChar=()=>addEntity('char');
async function addFolder(parent){
  const name=((await askText(parent?'새 하위 폴더 이름':'새 폴더 이름'))||'').trim();if(!name)return;
  if(S.folders.some(f=>parentOf(f)===(parent||null)&&nameKey(f.name)===nameKey(name)))return toast('같은 곳에 같은 이름의 폴더가 있어요');
  act(()=>{const f={id:uid(),name,builtin:false};if(parent){f.parent=parent;UIP.fo[parent]=false}S.folders.push(f)});
}
async function renameFolder(f){const n=((await askText('폴더 이름',f.name))||'').trim();if(n&&!S.folders.some(x=>x!==f&&parentOf(x)===parentOf(f)&&nameKey(x.name)===nameKey(n)))act(()=>{f.name=n})}
async function deleteFolder(f){
  if(!await askConfirm(`'${f.name}' 폴더를 지울까요? 안에 있는 폴더와 항목은 한 단계 위로 나와요.`))return;
  act(()=>{S.folders.forEach(x=>{if(x.parent===f.id){if(f.parent)x.parent=f.parent;else delete x.parent}});S.characters.forEach(c=>{if(c.folder===f.id){if(f.parent)c.folder=f.parent;else delete c.folder}});S.folders=S.folders.filter(x=>x!==f)});
}
function setFoldersOpen(list,open){      // 폴더들을 그 안쪽 폴더까지 한꺼번에 펴기 · 접기
  const ids=new Set();list.forEach(f=>scopeIds(f.id).forEach(id=>ids.add(id)));
  ids.forEach(id=>{UIP.fo[id]=!open});saveUIP();renderLeft();
}
function moveFolder(fid,to){      // to: 폴더 id 또는 null(최상위). 자기 자신/자기 안쪽으로는 못 옮김
  const f=folderById(fid);if(!f||f.builtin||fid===to||(to&&inside(to,fid)))return;
  act(()=>{if(to){f.parent=to;UIP.fo[to]=false}else delete f.parent});
}
const tlGroups=()=>{const gs=UIP.gs===undefined?10:UIP.gs,E=S.episodes,g=[];if(gs>0)for(let st=0;st<E.length;st+=gs)g.push([st,Math.min(st+gs,E.length)]);return g};
function tlRange(){      // 지금 보는 범위: 전체 / 한 묶음 / 한 화
  const E=S.episodes,sc=UI.tlScope,g=tlGroups();
  if(sc&&sc.e!==undefined&&E[sc.e])return [sc.e,sc.e+1];
  if(sc&&sc.g!==undefined&&g[sc.g])return g[sc.g];
  UI.tlScope=null;return [0,E.length];
}
const grpLab=(a,b)=>b-a===1?`${a+1}화`:`${a+1}–${b}화`;      // 한 화뿐인 묶음은 '1–1화'가 아니라 '1화'
function renderEpisodeList(p){
  const E=S.episodes,groups=tlGroups(),gs=UIP.gs===undefined?10:UIP.gs,sc=UI.tlScope;
  p.append(h('div',{class:'phead'},h('b',{},'화 목록'),h('span',{class:'sp'}),h('button',{class:'cbtn',title:'화 추가',onclick:()=>addEpisode()},'＋'),ptog('left')));
  const opts=[['0','묶음 없음'],['5','5화씩'],['10','10화씩'],['20','20화씩'],['25','25화씩'],['50','50화씩']];
  if(!opts.some(o=>o[0]===String(gs)))opts.push([String(gs),`${gs}화씩`]);opts.push(['c','직접 입력…']);
  p.append(h('div',{class:'epset'},h('span',{class:'muted'},'묶음 단위'),sel(opts,String(gs),async v=>{
    if(v==='c'){const n=parseInt(await askText('몇 화씩 묶어 볼까요? (숫자)',String(gs||10)),10);if(!(n>0))return renderLeft();UIP.gs=Math.min(n,500)}
    else UIP.gs=+v;
    UI.tlScope=null;UIP.tg={};saveUIP();renderAll();
  }),gs>0?h('button',{class:'quiet',title:'묶음 모두 접기 / 펴기',onclick:()=>{const all=groups.every((_,gi)=>UIP.tg[gi]);UIP.tg={};if(!all)groups.forEach((_,gi)=>UIP.tg[gi]=true);saveUIP();renderAll()}},groups.every((_,gi)=>UIP.tg[gi])?'모두 펴기':'모두 접기'):null));
  const total=E.reduce((a,e)=>a+e.cardIds.length,0);
  p.append(h('div',{class:'ep all'+(!sc?' act':''),onclick:()=>{UI.tlScope=null;renderAll()}},h('span',{class:'eno'},'전체'),h('span',{class:'en'},`${E.length}화`),h('small',{},total)));
  const epRow=(ep,i)=>{
    const row=h('div',{class:'ep'+(sc&&sc.e===i?' act':'')+(ep.cardIds.length?'':' empty'),onclick:()=>{UI.tlScope={e:i};renderAll()}},
      h('span',{class:'eno'},`${i+1}화`),h('span',{class:'en'},ep.title||''),h('small',{},ep.cardIds.length||''));
    row.addEventListener('dragover',e=>{if(DRAG){e.preventDefault();row.classList.add('over')}});      // 카드를 화 위로 끌어다 놓으면 그 화에 배치
    row.addEventListener('dragleave',()=>row.classList.remove('over'));
    row.addEventListener('drop',e=>{e.preventDefault();row.classList.remove('over');if(DRAG){const id=DRAG.id;DRAG=null;placeCard(id,ep.id,null)}});
    return row;
  };
  if(gs>0)groups.forEach(([a,b],gi)=>{
    if(b-a===1){p.append(epRow(E[a],a));return}      // 한 화짜리 묶음은 화 줄만
    const collapsed=!!UIP.tg[gi],cnt=E.slice(a,b).reduce((x,e)=>x+e.cardIds.length,0);
    const toggleG=()=>{      // 펼치면: 다른 묶음은 접고 이 묶음의 화만 보기 · 접으면: (이 묶음을 보고 있었다면) 전체 보기로
      if(collapsed){groups.forEach((_,k)=>{UIP.tg[k]=true});UIP.tg[gi]=false;UI.tlScope={g:gi}}
      else{UIP.tg[gi]=true;if(sc&&sc.g===gi)UI.tlScope=null}
      saveUIP();renderAll()};
    const car=h('span',{class:'car',title:collapsed?'펴기':'접기',onclick:e=>{e.stopPropagation();toggleG()}},collapsed?'▸':'▾');
    p.append(h('div',{class:'epg'+(sc&&sc.g===gi?' act':''),title:collapsed?'눌러서 펴기':'눌러서 접기',onclick:toggleG},car,h('span',{class:'gn'},grpLab(a,b)),      // 묶음을 펼치면 그 묶음의 화만 보여줌
      
      h('button',{class:'cbtn epeye',title:'이 묶음만 보기',onclick:e=>{e.stopPropagation();UI.tlScope={g:gi};renderAll()}},icon('eye')),h('small',{},cnt)));
    if(!collapsed){const kids=h('div',{class:'epkids'});for(let i=a;i<b;i++)kids.append(epRow(E[i],i));p.append(kids)}      // 묶음 안의 화는 들여써서 속한 게 보이게
  });
  else E.forEach((ep,i)=>p.append(epRow(ep,i)));
}
function renderLeft(){renderLeft0();peekWrap('left');fitChips()}
/* 이름표 줄 채우기: 다음 이름표가 못 들어와서 생긴 작은 틈, 또는 거의 찬 마지막 줄만 늘려서 채움. 한 개뿐이거나 틈이 큰 줄은 그대로 */
function fitChips(){
  const boxes=[...document.querySelectorAll('#left .lchips')],add=[];
  boxes.forEach(box=>[...box.children].forEach(c=>c.classList.remove('fill','rs')));
  if(document.querySelector('#left .ltext')){boxes.forEach(box=>{let top=null;[...box.children].forEach(c=>{if(top===null||Math.abs(c.offsetTop-top)>4){c.classList.add('rs');top=c.offsetTop}})});return}      // 글자 모양: 줄 첫 이름 앞에는 구분선 없음
  boxes.forEach(box=>{
    const cs=[...box.children];
    const W=box.clientWidth;if(!W||cs.length<2)return;
    const rows=[];cs.forEach(c=>{const t=c.offsetTop,r=rows[rows.length-1];if(r&&Math.abs(r.t-t)<4)r.list.push(c);else rows.push({t,list:[c]})});
    rows.forEach((r,ri)=>{
      if(r.list.length<2)return;
      const used=r.list.reduce((a,c)=>a+c.offsetWidth,0)+5*(r.list.length-1),slack=W-used;
      const last=ri===rows.length-1;
      if(!last||slack<=W*.24)add.push(...r.list);
    });
  });
  add.forEach(c=>c.classList.add('fill'));
}
let FCT=0;if(window.ResizeObserver)new ResizeObserver(()=>{clearTimeout(FCT);FCT=setTimeout(fitChips,60)}).observe($('left'));
function renderLeft0(){
  const p=$('left');p.innerHTML='';
  p.classList.toggle('cl',!!UIP.cl.left&&UI.peek!=='left');
  if(UIP.cl.left&&UI.peek!=='left'){p.append(h('button',{class:'ctab ctab-l',onmouseenter:()=>peekSoon('left'),onfocus:()=>startPeek('left',true),title:UI.mode==='tl'?'화 목록 펴기':'인물 · 설정 목록 펴기',onclick:()=>toggleCl('left')},icon(UI.mode==='tl'?'list':'sheet')));return}
  if(UI.mode==='tl')return renderEpisodeList(p);
  const addBtn=h('button',{class:'cbtn','data-pop':'1',title:'더 보기',onclick:()=>popMenu(addBtn,[{label:'설정 표로 보기',fn:()=>openFolderTable()},'sep',{label:'모든 폴더 펴기',fn:()=>{S.folders.forEach(f=>{UIP.fo[f.id]=false});saveUIP();renderLeft()}},{label:'모든 폴더 접기',fn:()=>{S.folders.forEach(f=>{UIP.fo[f.id]=true});saveUIP();renderLeft()}}])},'⋯');
  p.append(h('div',{class:'phead'},h('b',{title:'캐릭터 · 설정'},'인물·설정'),h('span',{class:'sp'}),h('button',{class:'cbtn',title:'설정 표로 한눈에 보기',onclick:()=>openFolderTable()},'▦'),addBtn,ptog('left')));
  const q=nameKey(UI.lq||'');
  const find=h('input',{class:'lfind',placeholder:'이름으로 찾기',value:UI.lq||'',oninput:e=>{UI.lq=e.target.value;clearTimeout(renderLeft.t);renderLeft.t=setTimeout(()=>{const pos=e.target.selectionStart;renderLeft();const i=document.querySelector('#left .lfind');if(i){i.focus();i.setSelectionRange(pos,pos)}},180)}});
  p.append(h('div',{class:'lfwrap'},find));
  const matchE=c=>!q||nameKey(c.name).includes(q)||(c.aliases||[]).some(a=>nameKey(a).includes(q));
  const entsIn=fid=>S.characters.filter(c=>folderOf(c)===fid&&matchE(c));
  const hasMatch=f=>!q||nameKey(f.name).includes(q)||entsIn(f.id).length>0||childFolders(f.id).some(hasMatch);
  // 명함첩: 인물 / 설정 / 미분류는 각각 작은 판, 폴더는 판 안의 더 작은 판, 항목은 이름표(칩)
  const chip=c=>{
    const n=boardCards(c.id).length;
    const el=h('div',{class:'lchip'+(UI.sel===c.id?' act':'')+(isEmptyEntry(c)?' emp':''),'data-eid':c.id,draggable:true,title:`${c.name} · 카드 ${n}장${c.summary?'\n'+c.summary:''}`,
        onclick:()=>setSel(c.id),oncontextmenu:e=>{e.preventDefault();entMenu(e,c)}},
      h('span',{class:'eic'},c.icon?c.icon:h('i',{class:'dot'+(c.kind==='setting'?' sq':''),style:`background:${c.color}`})),h('span',{class:'cn'},c.name||'(이름 없음)'),n?h('small',{},n):null);
    el.addEventListener('dragstart',e=>{DRAGE=c.id;DRAGF=null;e.dataTransfer.setData('text/plain',c.id);e.dataTransfer.effectAllowed='move';setTimeout(()=>dragOn(true),0)});
    el.addEventListener('dragend',()=>{DRAGE=null;dragOn(false);document.querySelectorAll('#left .dover').forEach(x=>x.classList.remove('dover'))});
    return el;
  };
  const canDrop=f=>DRAGE||(DRAGF&&DRAGF!==f.id&&!inside(f.id,DRAGF));
  const dropOn=(el,ok,fn)=>{
    el.addEventListener('dragover',ev=>{if(ok()){ev.preventDefault();ev.stopPropagation();el.classList.add('dover')}});
    el.addEventListener('dragleave',ev=>{if(!el.contains(ev.relatedTarget))el.classList.remove('dover')});
    el.addEventListener('drop',ev=>{ev.preventDefault();ev.stopPropagation();el.classList.remove('dover');fn()});
  };
  const isSetF=f=>inside(f.id,'f_setting');      // 설정 아래 폴더면 설정 노트, 인물 쪽 폴더면 캐릭터 노트 (고르게 하지 않음)
  const folderMenu=(f,mb)=>popMenu(mb,[
      {label:'표로 보기',fn:()=>openFolderTable(f.id)},'sep',
      isSetF(f)?{label:'새 설정 노트',fn:()=>addEntity('setting',f.id)}:{label:'새 캐릭터',fn:()=>addEntity('char',f.id)},{label:'하위 폴더 추가',fn:()=>addFolder(f.id)},
      'sep',{label:'아이콘 바꾸기…',fn:()=>setTimeout(()=>{const a=document.querySelector(`#left [data-fid="${f.id}"] .fic`);if(a)pickIcon(a,f.icon,v=>setFolderIcon(f,v))},30)},
      ...(f.builtin?[]:[{label:'이름 바꾸기',fn:()=>renameFolder(f)},'sep',{title:'폴더 이동'},{label:'최상위로',on:!f.parent,fn:()=>moveFolder(f.id,null)},...folderChoices(x=>f.parent===x.id,x=>moveFolder(f.id,x.id),f.id),'sep',{label:'폴더 삭제',fn:()=>deleteFolder(f)}])]);
  // 판(분류) 또는 폴더 판: 제목 줄 + 이름표들 + 안쪽 폴더 판
  const sub=(f,depth)=>{
    const open=q?true:!UIP.fo[f.id];
    const fic=h('span',{class:'fic','data-pop':'1',title:'아이콘 바꾸기'},f.icon||EM(open?'📂':'📁','folder'));
    fic.addEventListener('click',e=>{e.stopPropagation();pickIcon(fic,f.icon,v=>setFolderIcon(f,v))});
    const mb=h('button',{class:'cbtn fmenu','data-pop':'1',title:'폴더 메뉴',onclick:ev=>{ev.stopPropagation();folderMenu(f,mb)}},'⋯');
    const head=h('div',{class:'lsh'+(UI.folderView===f.id?' tview':''),'data-fid':f.id,draggable:!f.builtin,title:open?'눌러서 접기':'눌러서 펴기'},
      h('span',{class:'car'},open?'▾':'▸'),fic,h('span',{class:'fn'},f.name),h('small',{},folderCount(f.id)),h('span',{class:'sp'}),
      h('button',{class:'cbtn mk',title:isSetF(f)?'이 폴더에 새 설정 노트':'이 폴더에 새 캐릭터',onclick:ev=>{ev.stopPropagation();addEntity(isSetF(f)?'setting':'char',f.id)}},icon('noteplus')),
      h('button',{class:'cbtn mk',title:'이 폴더 안에 새 폴더',onclick:ev=>{ev.stopPropagation();addFolder(f.id)}},icon('folderplus')),
      h('button',{class:'cbtn ftb',title:'표로 보기',onclick:ev=>{ev.stopPropagation();openFolderTable(f.id)}},'▦'),mb);
    head.addEventListener('click',()=>{if(q)return;UIP.fo[f.id]=open;saveUIP();renderLeft()});
    if(!f.builtin)head.addEventListener('dblclick',e=>{e.stopPropagation();renameFolder(f)});
    head.addEventListener('dragstart',e=>{if(f.builtin){e.preventDefault();return}DRAGF=f.id;DRAGE=null;e.dataTransfer.setData('text/plain',f.id);e.dataTransfer.effectAllowed='move';setTimeout(()=>dragOn(true),0)});
    head.addEventListener('dragend',()=>{DRAGF=null;dragOn(false);document.querySelectorAll('#left .dover').forEach(x=>x.classList.remove('dover'))});
    const box=h('div',{class:'lsub d'+Math.min(depth,3)},head);
    dropOn(box,()=>canDrop(f),()=>{if(DRAGE){const c=charById(DRAGE);DRAGE=null;dragOn(false);if(c)act(()=>{c.folder=f.id;UIP.fo[f.id]=false})}else if(DRAGF){const id=DRAGF;DRAGF=null;dragOn(false);moveFolder(id,f.id)}});
    if(open){
      const items=entsIn(f.id),subs=childFolders(f.id).filter(hasMatch);
      if(items.length)box.append(h('div',{class:'lchips'},...items.map(chip)));
      subs.forEach(sf=>box.append(sub(sf,depth+1)));
      if(!items.length&&!subs.length)box.append(h('div',{class:'fhint'},q?'일치하는 항목이 없어요':'비어 있어요 · 이름표를 끌어다 놓아요'));
    }
    return box;
  };
  const board=(key,title,count,acts,body,drop)=>{
    const open=q?true:!UIP.fo[key];
    const head=h('div',{class:'lbh',title:open?'눌러서 접기':'눌러서 펴기',onclick:()=>{if(q)return;UIP.fo[key]=open;saveUIP();renderLeft()}},h('span',{class:'car'},open?'▾':'▸'),h('b',{},title),h('small',{},count),h('span',{class:'sp'}),...acts);
    const el=h('div',{class:'lboard'},head,...(open?body():[]));
    if(drop)dropOn(el,()=>DRAGE||DRAGF,drop);
    return el;
  };
  const stop=fn=>e=>{e.stopPropagation();fn(e)};
  const wrap=h('div',{class:'ltree'+((S.settings.leftStyle||'text')==='text'?' ltext':'')});      // 이름 목록 모양: 기본은 글자 (설정에서 이름표로)
  // 인물: 폴더 밖의 캐릭터 + 최상위 폴더들
  const rootChars=entsIn(null),rootFolders=childFolders(null).filter(f=>!f.builtin).filter(hasMatch);
  const nChars=S.characters.filter(c=>c.kind!=='setting').length;
  if(!q||rootChars.length||rootFolders.length)wrap.append(board('__chars','인물',nChars,[
      h('button',{class:'cbtn mk add',title:'새 캐릭터',onclick:stop(()=>addEntity('char'))},icon('noteplus')),
      h('button',{class:'cbtn mk',title:'새 폴더',onclick:stop(()=>addFolder())},icon('folderplus')),
      h('span',{class:'cslot'}),      // 표 보기 자리 (아이콘 열 맞춤)
      (()=>{const mb=h('button',{class:'cbtn','data-pop':'1',title:'인물 메뉴',onclick:stop(()=>popMenu(mb,[
        {label:'새 캐릭터',fn:()=>addEntity('char')},{label:'새 폴더',fn:()=>addFolder()},'sep',
        {label:'인물 폴더 모두 펴기',fn:()=>setFoldersOpen(childFolders(null).filter(f=>!f.builtin),true)},{label:'인물 폴더 모두 접기',fn:()=>setFoldersOpen(childFolders(null).filter(f=>!f.builtin),false)}]))},'⋯');return mb})()],
    ()=>[rootChars.length?h('div',{class:'lchips'},...rootChars.map(chip)):(!rootFolders.length?h('div',{class:'fhint'},'아직 캐릭터가 없어요 · ',h('button',{class:'fadd',onclick:stop(()=>addEntity('char'))},'＋ 새 캐릭터')):null),...rootFolders.map(f=>sub(f,1))].filter(Boolean),
    ()=>{if(DRAGE){const c=charById(DRAGE);DRAGE=null;dragOn(false);if(c)act(()=>{delete c.folder})}else if(DRAGF){const id=DRAGF;DRAGF=null;dragOn(false);moveFolder(id,null)}}));
  // 설정: 기본 설정 폴더(그 안의 폴더는 더 작은 판)
  const sf=folderById('f_setting');
  if(sf&&hasMatch(sf)){const items=entsIn(sf.id),subs=childFolders(sf.id).filter(hasMatch);
    wrap.append(board('f_setting',(sf.icon?sf.icon+' ':'')+sf.name,folderCount(sf.id),[
        h('button',{class:'cbtn mk add',title:'새 설정 노트',onclick:stop(()=>addEntity('setting',sf.id))},icon('noteplus')),
        h('button',{class:'cbtn mk',title:'새 폴더',onclick:stop(()=>addFolder(sf.id))},icon('folderplus')),
        h('button',{class:'cbtn',title:'표로 보기',onclick:stop(()=>openFolderTable(sf.id))},'▦'),
        (()=>{const mb=h('button',{class:'cbtn','data-pop':'1',title:'폴더 메뉴',onclick:stop(()=>folderMenu(sf,mb))},'⋯');return mb})()],
      ()=>[items.length?h('div',{class:'lchips'},...items.map(chip)):(!subs.length?h('div',{class:'fhint'},q?'일치하는 항목이 없어요':['아직 설정이 없어요 · ',h('button',{class:'fadd',onclick:stop(()=>addEntity('setting',sf.id))},'＋ 새 설정 노트')]):null),...subs.map(f=>sub(f,1))].filter(Boolean),
      ()=>{if(DRAGE){const c=charById(DRAGE);DRAGE=null;dragOn(false);if(c)act(()=>{c.folder=sf.id})}else if(DRAGF){const id=DRAGF;DRAGF=null;dragOn(false);moveFolder(id,sf.id)}}))}
  // 미분류: 어느 인물·설정에도 안 이어진 카드
  if(!q&&S.work)wrap.insertBefore(h('div',{class:'lboard lwork'+(UI.sel==='work'?' act':''),title:'소설 전체의 컨셉 · 목표 · 연재 진행 · 아이디어',onclick:()=>{if(UI.mode!=='story'){UI.mode='story'}setSel('work')}},
    h('div',{class:'lbh'},h('span',{class:'car'},''),h('b',{},EM('📖 ','book'),'작품 노트'),h('small',{},workProgText(S.work)))),wrap.firstChild);
  if(!q)wrap.append(h('div',{class:'lboard lnone'+(UI.sel==='none'?' act':''),title:'어느 인물·설정에도 연결되지 않은 카드',onclick:()=>setSel('none')},
    h('div',{class:'lbh'},h('span',{class:'car'},''),h('b',{},'미분류'),h('small',{},boardCards('none').length+'장'))));
  p.append(wrap);
}
