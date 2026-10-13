/* ---------- GitHub 동기화: 설정 화면 · 동기화 전후 처리 (실제 주고받기는 main.js → storage/sync.js) ---------- */
const Shell=window.appShell||null;      // 앱(Electron)에만 있음: 동기화 · 포스트잇 창
const agoText=t=>{if(!t)return '아직 안 함';const m=Math.round((Date.now()-t)/60000);return m<1?'방금':m<60?`${m}분 전`:m<1440?`${Math.round(m/60)}시간 전`:fmtFull(t)};

/* main.js 가 동기화 직전에 부름: 쓰고 있던 걸 바로 파일에 씀 */
function flushForSync(){flushWork();return true}
/* main.js 가 동기화 뒤에 부름 */
function onSyncResult(r){
  UI.syncLast=r;
  if(!r||!r.ok){if(r&&!r.skipped&&r.manual)notice('동기화하지 못했어요: '+r.error);refreshSyncRow();return}
  const cur=LIB&&LIB.current,mine=p=>cur&&p.startsWith(`works/${cur}/`);
  const touched=r.pulled.some(mine)||r.pulled.includes('prefs.json');
  if(touched&&!saveT){      // 이 작품을 다른 기기에서 고쳤음: 다시 읽음 (그사이 여기서 쓴 게 있으면 다음 동기화 때 사본으로 남김)
    const sel=UI.sel,mode=UI.mode;initWork();resetHistory();UI.mode=mode;UI.sel=sel;fixSel();applySettings();
  }
  afterWorkChange();renderAll();
  if(r.conflicts.length)notice(`양쪽 기기에서 같은 작품을 고쳐서, 다른 기기 쪽 내용을 사본 작품으로 남겼어요.\n\n${r.conflicts.join('\n')}\n\n작품 목록에서 열어 보고 필요한 부분만 옮겨 주세요.`);
  else if(r.manual)toast(r.pulled.length?'다른 기기에서 고친 내용을 받았어요':'동기화했어요');
  else if(touched)toast('다른 기기에서 고친 내용을 받았어요');
  refreshSyncRow();
}
function refreshSyncRow(){const e=document.querySelector('.syncst');if(e)e.textContent=syncStatusText()}
function syncStatusText(){
  const c=UI.syncCfg;if(!c||!c.repo)return '꺼짐';
  const r=UI.syncLast;if(r&&!r.ok&&!r.skipped)return '실패: '+r.error;
  return `${c.repo} · 마지막 동기화 ${agoText(c.last)}`;
}
async function syncNow(){
  if(!Shell)return;
  const e=document.querySelector('.syncst');if(e)e.textContent='동기화 중…';
  const r=await Shell.sync.now();UI.syncCfg=Shell.sync.getConfig();onSyncResult({...r,manual:true});
}
/* 설정 → 데이터 탭에 들어가는 줄 */
function syncRows(row){
  if(!Shell||!Shell.sync)return [];
  UI.syncCfg=Shell.sync.getConfig();
  const on=!!(UI.syncCfg&&UI.syncCfg.repo&&UI.syncCfg.hasToken);
  return [row('GitHub 동기화','집 · 회사 컴퓨터를 비공개 저장소로 맞춤',
    h('span',{class:'muted syncst'},syncStatusText()),
    on?h('button',{onclick:syncNow},'지금 동기화'):null,
    h('button',{onclick:showSyncSetup},on?'설정 바꾸기':'연결하기'))];
}
function showSyncSetup(){
  const c=Shell.sync.getConfig()||{};
  const inp=(ph,v,type)=>h('input',{type:type||'text',placeholder:ph,value:v||'',spellcheck:'false',autocomplete:'off',style:'width:100%'});
  const repo=inp('내아이디/저장소이름',c.repo),branch=inp('main',c.branch||'main'),token=inp(c.hasToken?'(저장돼 있음 · 바꿀 때만 입력)':'github_pat_…','', 'password');
  const msg=h('p',{class:'muted'});
  const field=(label,el)=>h('label',{style:'display:block;margin:10px 0'},h('div',{style:'font-weight:600;margin-bottom:4px'},label),el);
  openModal(mtitle('GitHub 동기화'),
    h('p',{class:'muted'},'집 맥과 회사 PC가 같은 비공개 저장소로 작품을 주고받아요. 앱을 켤 때 · 5분마다 · 고친 뒤 잠시 후 · 끌 때 자동으로 맞춰요.'),
    h('ol',{class:'muted',style:'padding-left:18px;line-height:1.7'},
      h('li',{},'GitHub에서 ',h('b',{},'비공개(Private)'),' 저장소를 하나 만들어요 (README 포함).'),
      h('li',{},'Settings → Developer settings → ',h('b',{},'Fine-grained tokens'),' 에서 토큰을 만들어요.'),
      h('li',{},'Repository access 는 ',h('b',{},'그 저장소만'),', Permissions 는 ',h('b',{},'Contents: Read and write'),' 하나만 주면 돼요.'),
      h('li',{},'토큰은 이 컴퓨터 안에 암호화해서 보관해요. 두 컴퓨터 모두 같은 저장소 · 토큰을 넣어 주세요.')),
    field('저장소',repo),field('브랜치',branch),field('토큰',token),msg,
    h('div',{class:'row',style:'margin-top:14px'},
      c.repo?h('button',{class:'quiet',style:'color:var(--warn)',onclick:async()=>{if(!await askConfirm('동기화를 끌까요? (이 컴퓨터의 작품은 그대로 있어요)'))return;Shell.sync.setConfig(null);closeModal();showSettings()}},'연결 끊기'):null,
      h('span',{class:'sp'}),h('button',{onclick:closeModal},'취소'),
      h('button',{class:'on',onclick:async()=>{
        const r=repo.value.trim().replace(/^https?:\/\/github\.com\//,'').replace(/\.git$/,'').replace(/\/$/,'');
        if(!/^[\w.-]+\/[\w.-]+$/.test(r)){msg.textContent='저장소는 “아이디/이름” 모양으로 적어 주세요';return}
        if(!token.value.trim()&&!c.hasToken){msg.textContent='토큰을 넣어 주세요';return}
        const ok=Shell.sync.setConfig({repo:r,branch:branch.value.trim()||'main',token:token.value.trim()||null});
        if(!ok||!ok.ok){msg.textContent=(ok&&ok.error)||'저장하지 못했어요';return}
        msg.textContent='연결 확인 중…';
        const res=await Shell.sync.now();
        if(!res.ok){msg.textContent='연결하지 못했어요: '+res.error;return}
        closeModal();UI.syncCfg=Shell.sync.getConfig();onSyncResult({...res,manual:true});showSettings();
      }},'저장하고 연결')));
  setTimeout(()=>repo.focus(),30);
}
