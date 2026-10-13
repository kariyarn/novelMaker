/* ============ 모달: 설정 / 휴지통 ============ */
const openModal=(...n)=>{const b=$('mbox');b.innerHTML='';b.style.width='';
  const fsb=h('button',{class:'cbtn',title:'크게 보기 / 원래 크기 (팝업 전체화면)',onclick:()=>{UIP.mfs=!UIP.mfs;saveUIP();$('modal').classList.toggle('fs',!!UIP.mfs);fsb.replaceChildren(icon(UIP.mfs?'shrink':'expand'));window.dispatchEvent(new Event('modalresize'))}},UIP.mfs?'⤡':'⤢');
  b.append(h('div',{class:'mtools'},fsb,h('button',{class:'cbtn',title:'닫기 (Esc)',onclick:closeModal},'✕')),...n.filter(x=>x!=null&&x!==false));
  if(!$('modal').classList.contains('on'))MODAL_RET=document.activeElement;$('modal').classList.toggle('fs',!!UIP.mfs);$('modal').classList.add('on');
  setTimeout(()=>{if(!$('mbox').contains(document.activeElement)){const f=$('mbox').querySelector('input:not([type=file]):not([type=range])');(f||$('mbox')).focus({preventScroll:true})}},0)};
let MODAL_RET=null;
const closeModal=()=>{if(!$('modal').classList.contains('on'))return;$('modal').classList.remove('on');if(MODAL_RET&&document.contains(MODAL_RET))try{MODAL_RET.focus()}catch(e){}MODAL_RET=null};
document.addEventListener('keydown',e=>{
  const t=e.target;
  if((e.key==='Enter'||e.key===' ')&&t&&t.getAttribute&&t.getAttribute('role')==='button'&&!e.isComposing){e.preventDefault();t.click()}
  if(e.key==='Tab'&&$('modal').classList.contains('on')&&!document.querySelector('.dlg')){      // 팝업 안에서만 포커스 이동
    const f=[...$('mbox').querySelectorAll('button:not([disabled]),input,select,textarea,[tabindex="0"]')].filter(x=>x.offsetParent);if(!f.length)return;
    const i=f.indexOf(document.activeElement);if(i<0||(e.shiftKey&&i===0)||(!e.shiftKey&&i===f.length-1)){e.preventDefault();f[e.shiftKey?(i<=0?f.length-1:i-1):0].focus()}}
});
$('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
const mtitle=t=>h('h3',{style:'margin:0 0 8px;font-size:1.25em;font-weight:700;letter-spacing:-.02em'},t);
const closeRow=(...x)=>h('div',{class:'row',style:'margin-top:14px'},...x,h('span',{class:'sp'}),h('button',{class:'on',onclick:closeModal},'완료'));

/* 글꼴 업로드: 파일을 이 브라우저(IndexedDB)에 보관 */
const FONTS=[];
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('storyline',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const idbGet=async k=>{const db=await idb();return new Promise((res,rej)=>{const q=db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})};
const idbSet=async(k,v)=>{const db=await idb();return new Promise((res,rej)=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})};
async function registerFont(f){const ff=new FontFace('UF_'+f.id,f.data);await ff.load();document.fonts.add(ff);if(!FONTS.some(x=>x.id===f.id))FONTS.push({id:f.id,name:f.name,ff})}
async function loadFonts(){try{for(const f of (await idbGet('fonts'))||[]){try{await registerFont(f)}catch(e){}}}catch(e){}applySettings();requestAnimationFrame(()=>{fitAll();hlLayoutAll()})}
async function addFontFile(file){
  if(!file)return;if(file.size>20*1024*1024)return notice('20MB 이하의 글꼴 파일만 올릴 수 있어요');
  const f={id:uid(),name:file.name.replace(/\.[^.]+$/,''),data:await file.arrayBuffer()};
  try{await registerFont(f)}catch(e){return notice('글꼴로 읽을 수 없는 파일이에요 (ttf / otf / woff / woff2)')}
  try{const l=(await idbGet('fonts'))||[];l.push(f);await idbSet('fonts',l)}catch(e){return notice('브라우저에 글꼴을 보관하지 못했어요')}
  setSetting('family','u:'+f.id);toast('글꼴을 적용했어요');
}
async function delFont(id){
  if(!await askConfirm('이 글꼴을 목록에서 지울까요?'))return;
  try{await idbSet('fonts',((await idbGet('fonts'))||[]).filter(f=>f.id!==id))}catch(e){}
  const i=FONTS.findIndex(f=>f.id===id);if(i>=0){document.fonts.delete(FONTS[i].ff);FONTS.splice(i,1)}
  if(S.settings.family==='u:'+id)S.settings.family='';saveNow();applySettings();showSettings();
}
const THEME_ALIAS={emerald:'forest',sky:'light',mint:'cotori',peach:'rose',sepia:'cotori',graphite:'dark',ocean:'midnight',
  snow:'light',solarized:'cotori',moss:'cotori',plum:'midnight',olive:'forest',terminal:'forest',cyber:'midnight',hitel:'midnight'};      // 없어진 테마는 가장 비슷한 테마로 (2026-10 정리: 겹치거나 너무 튀는 테마를 뺌)
function applySettings(){
  const s=S.settings,r=document.documentElement;
  document.body.classList.toggle('ui2',s.uiStyle==='new');      // 화면 디자인: 기존 / 새 디자인 (기본은 기존)
  if(THEME_ALIAS[s.theme]){s.theme=THEME_ALIAS[s.theme];save()}
  if(!s.theme||s.theme==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',s.theme);
  if(s.noteTheme)delete s.noteTheme;      // 예전 색 테마 설정은 정리
  r.style.setProperty('--fs',(s.font||14)+'px');
  const hs=s.hlStyle||'bubble';r.classList.toggle('hl-on',hs!=='off');r.classList.toggle('hl-inset',hs==='inset');r.classList.toggle('hl-raised',hs==='raised');r.classList.toggle('hl-bubble',hs==='bubble');
  ['1','2','3'].forEach(n=>r.classList.toggle('bub-'+n,(s.bubbleLv||'1')===n));
  {const dm=(getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g)||[255,255,255]).map(Number);r.classList.toggle('dk',(.299*dm[0]+.587*dm[1]+.114*dm[2])<110)}
  const bb=BOARDS.find(b=>b[0]===(s.boardBg||''));
  if(bb&&bb[0]){r.style.setProperty('--board',bb[2]);r.style.setProperty('--dot',bb[3]?'rgba(255,255,255,.14)':(bb[0]==='cork'?'rgba(120,80,20,.28)':'rgba(0,0,0,.16)'))}
  else{r.style.removeProperty('--board');r.style.removeProperty('--dot')}
  applyView();
  const base='-apple-system,BlinkMacSystemFont,"SF Pro Text","Pretendard","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif',fam={'':base,serif:'"Noto Serif KR","Batang","AppleMyungjo",serif',sans:'"Noto Sans KR","Nanum Gothic","Apple SD Gothic Neo",sans-serif'};
  const f=s.family||'';r.style.setProperty('--ff',f.startsWith('u:')?`"UF_${f.slice(2)}",${base}`:(fam[f]||base));
}
function setSetting(k,v){if(k==='useFilter')UI.usedAsBoard=false;S.settings[k]=v;if(k==='hlStyle')S.settings.hlTouched=true;saveNow();applySettings();if($('modal').classList.contains('on'))showSettings();if(k==='showUsed'||k==='pinAlways'||k==='useFilter'||k==='showStrings'||k==='hlStyle'||k==='bubbleLv'||k==='bubbleShape'||k==='stringStyle'||k==='stringW'||k==='stringColor'||k==='pinColor')renderAll()}
function showSettings(){      // 설정: 겉모습 / 글쓰기 / 데이터 — 자주 쓰는 것만 보이고 나머지는 “더 보기”
  const s=S.settings,size=s.font||14,tab=UI.setTab||'look';
  const row=(label,note,...ctrl)=>h('div',{class:'srow'},h('div',{class:'sl'},label,note?h('span',{class:'muted'},note):null),h('div',{class:'sc'},...ctrl));
  const TH=[['auto','자동','linear-gradient(90deg,#f5f5f7 50%,#1c1c1e 50%)'],['light','밝게','#f5f5f7'],['paper','종이','linear-gradient(135deg,#fffcf0 55%,#205ea6 55%)'],['cotori','베이지','#efe3cf'],['lavender','라벤더','#ddd6f3'],['rose','로즈','#ecd3d9'],['contrast','고대비','linear-gradient(90deg,#fff 50%,#000 50%)'],
    ['dark','어둡게','#1c1c1e'],['ink','먹','linear-gradient(135deg,#1c1b1a 55%,#4385be 55%)'],['midnight','밤하늘','#12162a'],['nord','노드','linear-gradient(135deg,#3b4252 55%,#88c0d0 55%)'],['mocha','모카','linear-gradient(135deg,#2b231f 55%,#e0a96d 55%)'],['forest','숲','linear-gradient(135deg,#343f44 55%,#a7c080 55%)']];
  const DARK=new Set(['dark','ink','midnight','nord','mocha','forest']);
  const cur=TH.find(t=>t[0]===(s.theme||'auto'))||TH[0];
  const dot=([k,n,bg])=>h('button',{class:'tsw'+((s.theme||'auto')===k?' sel':''),title:n,onclick:()=>setSetting('theme',k)},h('i',{style:`background:${bg}`}),h('span',{},n.replace(/\s*\(.*\)/,'')));
  const SHAPES=[['','포스트잇'],['index','인덱스 카드'],['tape','테이프 메모'],['spiral','스프링 노트'],['round','둥근 카드'],['polaroid','폴라로이드'],['washi','마스킹 테이프'],['bubble','말풍선'],['dogear','접힌 모서리'],['receipt','영수증']];
  const MORE_T={look:'보드 · 핀 · 줄 · 글꼴',write:'카드 분류',data:'폴더'};
  const more=(key,...items)=>{const open=!!(UI.setMore&&UI.setMore[key]),tg=()=>{UI.setMore=UI.setMore||{};UI.setMore[key]=!open;showSettings()};
    if(U2())return [h('button',{class:'sfold',onclick:tg},icon(open?'chevD':'chevR'),h('span',{},MORE_T[key]),h('small',{},key==='write'?S.kinds.length:key==='data'?2:items.filter(Boolean).length)),...(open?items:[])];      // 새 디자인: 접힌 한 줄 (제목 + 개수)
    return [h('button',{class:'quiet smore',onclick:tg},open?'▾ 접기':'▸ 더 보기'),...(open?items:[])]};
  const kinds=S.kinds.map(k=>h('div',{class:'krow'},
    h('input',{type:'color',value:k.color,title:k.colorMode==='random'?'랜덤 색 사용 중':'포스트잇 색',style:k.colorMode==='random'?'opacity:.3':'',disabled:k.colorMode==='random',onchange:e=>{act(()=>k.color=e.target.value);showSettings()},oninput:e=>edit(()=>k.color=e.target.value)}),
    h('input',{value:k.name,class:'kname',onchange:e=>{const v=e.target.value.trim();if(!v||S.kinds.some(x=>x!==k&&nameKey(x.name)===nameKey(v))){e.target.value=k.name;return toast('이름이 비었거나 이미 있어요')}act(()=>k.name=v);showSettings()}}),
    seg([['fixed','고정'],['random','랜덤']],k.colorMode||'fixed',v=>{act(()=>{k.colorMode=v});showSettings()}),
    h('span',{class:'khk',title:'이 키를 누르면 이 분류의 포스트잇이 바로 만들어져요'},h('span',{class:'muted'},'⌘'),
      sel(HOTKEYS.map(x=>[x,x||'없음']),k.key||'',v=>{
        const o=v&&S.kinds.find(x=>x!==k&&x.key===v);
        act(()=>{if(o)o.key='';k.key=v});if(o)toast(`'${o.name}'의 단축키를 비웠어요 (같은 키)`);showSettings()})),
    h('button',{class:'kdel',disabled:S.kinds.length<2,title:'삭제 (이 분류의 카드는 다른 분류로 옮겨져요)',onclick:async()=>{if(!await askConfirm(`'${k.name}' 분류를 지울까요? 이 분류의 카드는 '${S.kinds.find(x=>x!==k).name}'(으)로 옮겨져요.`))return;const to=S.kinds.find(x=>x!==k).id;act(()=>{S.cards.forEach(c=>{if(c.kind===k.id)c.kind=to});S.kinds=S.kinds.filter(x=>x!==k)});showSettings()}},'✕')));
  const T={
    look:[
      row('이름 목록 모양','왼쪽 인물 · 설정 목록',segOld([['text','글자 (｜로 구분)'],['chip','이름표']],s.leftStyle||'text',k=>{setSetting('leftStyle',k);renderLeft()})),
      row('화면 디자인',null,segOld([['old','기존'],['new','새 디자인']],s.uiStyle==='new'?'new':'old',k=>{setSetting('uiStyle',k);renderAll();showSettings()})),
      row('화면 색',cur[1],h('div',{class:'tdots'},h('span',{class:'tlab'},'자동'),dot(TH[0]),U2()?null:h('span',{class:'muted',style:'font-size:.82em'},'기기의 밝게 · 어둡게 설정을 따라요')),h('div',{class:'tdots'},h('span',{class:'tlab'},'라이트'),...TH.filter(t=>t[0]!=='auto'&&!DARK.has(t[0])).map(dot)),h('div',{class:'tdots'},h('span',{class:'tlab'},'다크'),...TH.filter(t=>DARK.has(t[0])).map(dot))),
      row('포스트잇 모양','기본',h('div',{class:'swgrid'},...SHAPES.map(([k,n])=>h('button',{class:'swb'+((s.noteShape||'')===k?' on':''),onclick:()=>setSetting('noteShape',k)},h('span',{class:'shp '+k},h('b'),k==='tape'||k==='bubble'?h('i'):null),n))),
        h('div',{class:'kshape'},h('span',{class:'muted'},'분류별로 다르게'),...S.kinds.map(k=>h('label',{class:'kshr'},h('i',{style:`background:${k.colorMode==='random'?RANDOM_BG:k.color}`}),k.name,
          sel([['global','기본 모양'],...SHAPES,['random','랜덤']],k.shape===undefined||k.shape===null?'global':k.shape,v=>{act(()=>{if(v==='global')delete k.shape;else k.shape=v});showSettings()}))))),
      row('글자',null,h('button',{onclick:()=>setSetting('font',Math.max(11,size-1))},'A−'),h('b',{class:'val'},size+'px'),h('button',{onclick:()=>setSetting('font',Math.min(22,size+1))},'A＋'),h('span',{class:'vsep'}),seg([['','기본'],['sans','고딕'],['serif','명조'],...FONTS.map(f=>['u:'+f.id,f.name])],s.family||'',k=>setSetting('family',k))),
      ...more('look',
        row('보드 배경',null,h('div',{class:'swgrid'},...BOARDS.map(([k,n,col])=>h('button',{class:'swb'+((s.boardBg||'')===k?' on':''),onclick:()=>setSetting('boardBg',k)},h('span',{class:'tprev',style:`background:${col||'linear-gradient(90deg,#efede8 50%,#19191b 50%)'}`}),n))),seg(PATS,s.boardPat||'dot',k=>setSetting('boardPat',k))),
        row('핀',null,...PIN_COLORS.map(pc=>h('button',{class:'sw'+((s.pinColor||'black')===pc[0]?' on':''),style:`background:${pc[2]}`,title:pc[1],onclick:()=>setSetting('pinColor',pc[0])}))),
        row('핀 줄',null,seg([['1','보이기'],['0','숨기기']],s.showStrings===false?'0':'1',k=>setSetting('showStrings',k==='1')),seg([['thread','실'],['taut','팽팽'],['loose','느슨'],['dash','점선']],s.stringStyle||'thread',k=>setSetting('stringStyle',k)),seg([['s','가늘게'],['m','보통'],['l','굵게']],s.stringW||'m',k=>setSetting('stringW',k))),
        row('줄 색',null,...STRING_COLORS.map(([c,n])=>h('button',{class:'sw'+((s.stringColor||'#c8412b')===c?' on':''),style:`background:${c}`,title:n,onclick:()=>setSetting('stringColor',c)}))),
        row('내 글꼴','ttf · otf · woff',h('button',{onclick:()=>$('fontfile').click()},'＋ 글꼴 올리기'),...FONTS.map(f=>h('button',{onclick:()=>delFont(f.id)},f.name+' ✕')),
          h('input',{id:'fontfile',type:'file',accept:'.ttf,.otf,.woff,.woff2,font/*',style:'display:none',onchange:e=>{const f=e.target.files[0];e.target.value='';addFontFile(f)}})))],
    write:[
      row('말 표시','따옴표 · 괄호 속 대사',seg([['off','끄기'],['inset','음각'],['raised','양각'],['bubble','말풍선']],s.hlStyle||'bubble',k=>setSetting('hlStyle',k))),
      (s.hlStyle||'bubble')==='bubble'?row('말풍선 세기','기본은 은은하게',seg([['1','은은하게'],['2','보통'],['3','뚜렷하게']],s.bubbleLv||'1',k=>setSetting('bubbleLv',k))):null,
      row('보드에 보일 포스트잇',null,seg([['all','전체'],['unused','미사용'],['used','사용']],useMode(),k=>setSetting('useFilter',k))),
      row('새 포스트잇 크기',null,h('span',{class:'muted'},'가로'),seg([['s','소'],['m','중'],['l','대']],s.noteWk||'m',k=>setSetting('noteWk',k)),h('span',{class:'muted'},'세로'),seg([['s','소'],['m','중'],['l','대']],s.noteHk||'s',k=>setSetting('noteHk',k))),
      ...more('write',
        h('div',{class:'srow'},h('div',{class:'sl'},'카드 분류 · 색 · 단축키',h('span',{class:'muted'},'⌘ + 키로 그 분류의 포스트잇을 바로 만들어요')),

        h('div',{class:'klist'},...kinds,U2()?null:h('div',{class:'muted',style:'padding:2px 2px 4px'},'색: 고정 = 정한 한 가지 색 · 랜덤 = 만들 때마다 읽기 좋은 밝은 색 중에서 무작위 (글자가 잘 보이는 색만 써요)'),h('button',{class:'kadd2',onclick:async()=>{
        const name=((await askText('새 분류 이름'))||'').trim();if(!name)return;
        if(S.kinds.some(k=>nameKey(k.name)===nameKey(name)))return toast('이미 있는 분류예요');
        const free=HOTKEYS.find(x=>x&&!S.kinds.some(k=>k.key===x))||'';
        act(()=>S.kinds.push({id:uid(),name,color:KIND_PAL[S.kinds.length%KIND_PAL.length],icon:'●',key:free}));showSettings();
      }},'＋ 분류 추가'))))],
    data:[
      row('백업',null,h('button',{onclick:exportJson},'백업 파일 만들기'),Repo.backups?h('button',{onclick:showRestore},'자동 백업에서 복구'):null),
      ...syncRows(row),
      row('내보내기',null,h('button',{onclick:exportTimelineMd},'타임라인 .md'),h('button',{onclick:exportSheetsMd},'인물 · 설정 .md'),h('button',{onclick:exportBoardPng},'코르크보드 .png')),
      row('정리',null,h('button',{onclick:showTrash},`휴지통 (${S.trash.length})`),S.demo?h('button',{onclick:async()=>{if(await askConfirm('예시 데이터를 모두 지울까요?')){closeModal();clearDemo()}}},'예시 지우고 시작'):null),
      ...(Repo.openFolder?more('data',row('폴더',null,h('button',{onclick:()=>Repo.openFolder('data')},'저장 폴더 열기'),h('button',{onclick:()=>Repo.openFolder('backups')},'백업 폴더 열기'))):[])]};
  openModal(h('h3',{class:'mtitle'},'설정'),
    h('div',{class:'stabs'},tabs([['look','겉모습'],['write','글쓰기'],['data','데이터']],tab,k=>{UI.setTab=k;showSettings()})),
    ...T[tab],
    closeRow());
}
function showTrash(){
  openModal(mtitle(`휴지통 (${S.trash.length})`),
    h('p',{class:'muted'},'삭제한 카드와 캐릭터가 여기에 모여요. 복구하면 원래 목록으로 돌아가요.'),
    !S.trash.length?h('p',{class:'muted'},'비어 있어요.'):null,
    ...[...S.trash].reverse().map(t=>h('div',{class:'mrow'},
      h('span',{class:'l'},t.type==='char'?`캐릭터 · ${t.data.name}`:`카드 · ${(t.data.text||'(빈 카드)').slice(0,30)}`),h('span',{class:'muted'},fmtTime(t.at)),
      h('button',{onclick:()=>{act(()=>{if(t.type==='char'){if(dupName(t.data.name))return toast('같은 이름의 캐릭터가 이미 있어요');S.characters.push(t.data)}else S.cards.unshift(t.data);S.trash=S.trash.filter(x=>x!==t);autoLinkAll()});showTrash()}},'복구'),
      h('button',{onclick:async()=>{if(await askConfirm('완전히 삭제할까요? 되돌릴 수 없어요.')){S.trash=S.trash.filter(x=>x!==t);save();renderTop();showTrash()}}},'✕'))),
    closeRow(S.trash.length?h('button',{style:'color:var(--warn)',onclick:async()=>{if(await askConfirm('휴지통을 모두 비울까요?')){S.trash=[];save();renderTop();showTrash()}}},'휴지통 비우기'):null));
}
