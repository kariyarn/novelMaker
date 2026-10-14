const WORK_FIELDS=['한 줄 소개','주제','소재','장르 · 분위기','독자에게 주고 싶은 느낌','세계관 한 줄','결말 방향'];
function migrate(st){
  st.version=1;st.settings=Object.assign({theme:'auto',font:null,family:'',showUsed:false,boardBg:'',boardPat:'dot',noteWk:'m',noteHk:'s',showStrings:true,stringStyle:'thread',stringW:'m',stringColor:'#c8412b'},st.settings||{});
  if(!st.settings.hlTouched)st.settings.hlStyle='bubble';      // 기본은 말풍선 (직접 바꾼 적이 있으면 그 값을 존중)
  else if(!st.settings.hlStyle)st.settings.hlStyle='bubble';
  if(!st.settings.bubbleLv)st.settings.bubbleLv='1';
  if(!st.settings.bubbleShape)st.settings.bubbleShape='plain';      // 모든 말을 같은 모양으로 (끝맺음별 모양은 선택)
  st.links=Array.isArray(st.links)?st.links:[];st.allBoard=st.allBoard||{};
  (st.cards||[]).forEach(c=>{if(c.pin&&c.pinAngle===undefined)c.pinAngle=Math.round(Math.random()*90-45)});
  st.folders=Array.isArray(st.folders)?st.folders:[];
  if(!st.folders.some(f=>f.id==='f_setting'))st.folders.push({id:'f_setting',name:'설정',builtin:true});
  // 작품 노트: 컨셉 · 목표 · 연재 진행 · 아이디어 메모 — 카드 · 전체 보기 · 오른쪽 목록과는 섞이지 않는 따로 된 공간
  const W0=st.work&&typeof st.work==='object'?st.work:{};
  st.work=Object.assign({fields:[],goals:[],longGoal:'',total:0,ideas:[]},W0,{id:'work',name:'작품 노트'});
  if(!Array.isArray(st.work.ideas))st.work.ideas=[];
  WORK_FIELDS.forEach(l=>{if(!st.work.fields.some(f=>f.label===l))st.work.fields.push({label:l,value:''})});
  {const old=st.work.fields.find(f=>f.label==='말하고 싶은 것');      // '주제'와 겹쳐서 없앰 — 적어 둔 내용은 '주제'로 옮김
   if(old){const t=st.work.fields.find(f=>f.label==='주제'),v=(old.value||'').trim();if(v&&t)t.value=(t.value||'').trim()?t.value.replace(/\s+$/,'')+'\n'+v:v;st.work.fields=st.work.fields.filter(f=>f!==old)}}
  (st.characters||[]).forEach(c=>{if(c.folder&&!st.folders.some(f=>f.id===c.folder))delete c.folder});
  st.folders.forEach(f=>{if(f.builtin||(f.parent&&!st.folders.some(x=>x.id===f.parent&&x!==f)))delete f.parent});
  st.folders.forEach(f=>{const seen=new Set();let x=f;while(x&&x.parent){if(seen.has(x.id)){delete f.parent;break}seen.add(x.id);x=st.folders.find(y=>y.id===x.parent)}});      // 순환 방지
  if(!st.settings.useFilter)st.settings.useFilter=st.settings.showUsed?'all':'unused';
  // 장면 · 대사 통합: 예전 '대사' 분류는 '장면 · 대사'로 합침
  if((st.kinds||[]).some(k=>k.id==='line')){
    const fix=c=>{if(c&&c.kind==='line')c.kind='scene'};
    (st.cards||[]).forEach(fix);(st.trash||[]).forEach(t=>{if(t.type==='card')fix(t.data)});
    st.kinds=st.kinds.filter(k=>k.id!=='line');
    if(!st.kinds.some(k=>k.id==='scene'))st.kinds.unshift(defKinds()[0]);
  }
  const scK=(st.kinds||[]).find(k=>k.id==='scene');if(scK&&scK.name==='장면')scK.name='장면 · 대사';
  // 분류별 단축키(⌘⌥+키): 없는 분류에는 비어 있는 숫자를 차례로 배정
  (st.kinds||[]).forEach(k=>{if(k.key&&!HOTKEYS.includes(k.key))k.key=''});
  {const used=new Set((st.kinds||[]).map(k=>k.key).filter(Boolean));
   (st.kinds||[]).forEach(k=>{if(k.key===undefined){const f=HOTKEYS.find(x=>x&&!used.has(x));k.key=f||'';if(f)used.add(f)}})}
  st.kinds=st.kinds&&st.kinds.length?st.kinds:defKinds();
  const nk=defKinds();st.kinds.forEach(k=>{if(OLD_KIND_COL[k.id]&&k.color===OLD_KIND_COL[k.id])k.color=nk.find(x=>x.id===k.id).color});
  st.characters=st.characters||[];st.cards=st.cards||[];st.episodes=st.episodes&&st.episodes.length?st.episodes:Array.from({length:10},newEp);
  st.noneBoard=st.noneBoard||{};st.trash=st.trash||[];st.z=st.z||1;
  st.shelves=Array.isArray(st.shelves)?st.shelves:[];      // 보관 칸: 아직 몇 화인지 모르는 장면을 화 번호 없이 모아 두는 곳
  st.shelves.forEach(x=>{x.id=x.id||uid();x.name=x.name||'보관';x.cardIds=Array.isArray(x.cardIds)?x.cardIds:[]});
  st.characters.forEach(c=>{c.aliases=c.aliases||[];c.kind=c.kind||'char';if(c.kind==='char'){c.longGoal=c.longGoal||'';c.goals=Array.isArray(c.goals)?c.goals:[]}c.fields=c.fields||(c.kind==='setting'?[]:defFields());if(c.kind==='setting'&&c.memo===undefined)c.memo='';c.relations=c.relations||[];c.board=c.board||{};c.color=c.color||PAL[0]});
  st.characters.forEach(c=>c.relations.forEach(r=>{if(r.type&&!Array.isArray(r.types))r.types=[r.type];delete r.type}));      // 관계: 하나(type) → 여러 개(types)
  st.relTags=Array.isArray(st.relTags)?st.relTags.filter(t=>t&&t.k&&t.l):[];      // 직접 만든 관계 종류
  st.cards.forEach(c=>{c.chars=c.chars||[];c.autoChars=c.autoChars||[];c.offChars=c.offChars||[];c.stars=c.stars||0});
  return st;
}
let S,UIP={};
// 앱 전체 취향(작품을 바꿔도 그대로): 화면 · 글꼴 · 핀 · 줄 · 말 강조 · 패널 너비. 나머지는 작품마다 따로 저장
const GLOBAL_SET=['theme','font','family','hlStyle','hlTouched','pinColor','stringStyle','stringW','stringColor','showStrings','boardPat','boardBg','noteWk','noteHk','noteShape','bubbleLv','bubbleShape','pinAlways','uiStyle'];

const GLOBAL_UI=['sw','rw','rwl','rwr','tlw','tll','cl','mm','ps','pc','toured','mfs','zenOp','zenFs'];
const pick=(o,ks)=>{const r={};ks.forEach(k=>{if(o&&o[k]!==undefined)r[k]=o[k]});return r};
let LIB=null,PREFS_LAST='';
const UI={goalOpen:false,mode:'story',sel:null,qkind:'scene',pkind:'',pchar:'',pused:'unused',pq:'',tlChar:'all',range:null,focusCard:null,noSave:false};
const refreshLib=()=>{LIB=Repo.novels?Repo.novels.list():null};
const emptyState=()=>({characters:[],cards:[],episodes:[],kinds:defKinds(),noneBoard:{},trash:[],settings:{},demo:false,z:1});
function readPrefs(){try{if(Repo.prefs){const t=Repo.prefs.load();if(t)return JSON.parse(t)}}catch(e){}return null}
function initWork(opts){      // 현재 작품(저장소 기준)의 데이터를 읽어 상태를 만든다
  opts=opts||{};let st=null,noSave=false;
  try{
    const r=Repo.read(KEY);
    if(r.text)st=JSON.parse(r.text);
    else if(Repo.native&&!opts.blank&&!r.fresh)noSave=true;      // 이미 있던 작품인데 파일을 못 읽음 → 원본을 덮어쓰지 않도록 저장을 멈춤
  }catch(e){if(Repo.native&&!opts.blank)noSave=true}
  if(!st||!st.characters)st=(opts.blank||noSave)?emptyState():seed();
  S=migrate(st);
  let ui={};
  try{const t=Repo.read(UKEY).text;if(t)ui=JSON.parse(t)||{}}catch(e){}
  UIP=ui;
  const P=readPrefs();
  if(P){Object.assign(S.settings,pick(P.settings,GLOBAL_SET));Object.assign(UIP,pick(P.ui,GLOBAL_UI))}
  PREFS_LAST=P?JSON.stringify({settings:pick(S.settings,GLOBAL_SET),ui:pick(UIP,GLOBAL_UI)}):'';
  UIP.cl=UIP.cl||{};UIP.gc=UIP.gc||{};UIP.views=UIP.views||{};UIP.fo=UIP.fo||{};UIP.tg=UIP.tg||{};
  UI.noSave=noSave;
}
function resetUI(){      // 작품을 바꿀 때 보기 상태를 처음으로
  Object.assign(UI,{goalOpen:false,mode:'story',sel:null,qkind:'scene',pkind:'',pchar:'',pused:'unused',pq:'',tlChar:'all',range:null,focusCard:null,folderView:null,tlScope:null,pinFocus:null,tmpLine:null,tq:'',lq:'',tsort:null,poolLimit:60,prevSel:null});
  UI.sel=firstEntity();
}
const wr=(k,t)=>{
  if(UI.noSave)return true;      // 파일을 못 읽은 작품은 사용자가 정할 때까지 저장하지 않음
  return Repo.write(k,t);
};
function savePrefs(sync){      // 평소엔 비동기, 창을 닫거나 작품을 바꿀 때만 동기
  if(!Repo.prefs||UI.noSave)return;
  const t=JSON.stringify({settings:pick(S.settings,GLOBAL_SET),ui:pick(UIP,GLOBAL_UI)});
  if(t===PREFS_LAST)return;
  if(!sync&&Repo.prefs.saveAsync){PREFS_LAST=t;Repo.prefs.saveAsync(t).then(ok=>{if(!ok&&PREFS_LAST===t)PREFS_LAST=null}).catch(()=>{if(PREFS_LAST===t)PREFS_LAST=null});return}
  try{if(Repo.prefs.save(t))PREFS_LAST=t}catch(e){}
}
let uipT=0;
const saveUIPNow=()=>{clearTimeout(uipT);uipT=0;if(UI.noSave)return;const t=JSON.stringify(UIP);if(Repo.writeAsync)Repo.writeAsync(UKEY,t).catch(()=>{});else wr(UKEY,t);savePrefs()};
const saveUIP=()=>{if(UI.noSave)return;clearTimeout(uipT);uipT=setTimeout(saveUIPNow,300)};      // 보기 상태는 잠깐 모아서 저장
function replaceWork(data,extra){const keep=S.settings;S=migrate(data);S.settings=Object.assign({},S.settings,keep);Object.assign(S,extra)}      // 불러오기 · 복구 · 예시: 화면 취향은 그대로 두고 작품 내용만 바꿈
function firstEntity(){const c=S.characters.find(x=>x.kind!=='setting')||S.characters[0];return c?c.id:'none'}
initWork();refreshLib();
UI.sel=firstEntity();
