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
  const touched=r.pulled.some(mine)||r.pulled.includes('prefs.json')||(r.merged||[]).some(mine);
  if(touched){      // 이 작품을 다른 기기에서 고쳤거나 합쳤음: 다시 읽음 (그사이 여기서 쓴 게 있으면 먼저 저장 → 저장소 쪽에서 받은 글과 합쳐짐)
    if(saveT)flushWork();
    const sel=UI.sel,mode=UI.mode;initWork();resetHistory();UI.mode=mode;UI.sel=sel;fixSel();applySettings();
  }
  if(touched||r.pulled.length||(r.merged||[]).length){afterWorkChange();renderAll()}      // 받은 게 없으면 화면을 다시 그리지 않음 (쓰던 글 · 열린 칸이 닫히지 않게)
  syncBar(null);      // 받았으니 알림 띠는 닫음
  const others=r.conflicts.filter(c=>!mine(c.rel));
  if((r.merged||[]).some(mine)&&pendingConflicts().length)showSyncConflicts();
  else if(others.length)notice(`양쪽 기기에서 고친 내용을 합쳤어요. 같은 글을 양쪽에서 다르게 고친 곳은 그 작품을 열면 고를 수 있어요.\n\n${others.map(c=>`${c.name} (${c.asks}곳)`).join('\n')}`);
  else if((r.merged||[]).length)toast('양쪽 기기에서 고친 내용을 합쳤어요');
  else if(r.manual)toast(r.pulled.length?'다른 기기에서 고친 내용을 받았어요':'동기화했어요');
  else if(touched)toast('다른 기기에서 고친 내용을 받았어요');
  refreshSyncRow();
}
/* main.js 가 자동으로 올린 뒤 부름: 조용히 상태만 */
function onSyncPush(r){if(r&&!r.skipped){UI.syncLast=r;if(r.ok&&UI.syncCfg)UI.syncCfg.last=Date.now()}refreshSyncRow()}
/* main.js 가 확인한 뒤 부름: 다른 기기에서 고친 작품이 있으면 위에 알림 띠 (받기는 누를 때만) */
function onSyncCheck(r){
  if(!r||!r.ok)return;
  if(!r.pending||!r.pending.length||r.dismissed)return syncBar(null);
  syncBar(r);
}
const whenText=t=>{if(!t)return '';const d=new Date(t),n=new Date(),hm=`${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`,day=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime(),diff=Math.round((day(n)-day(d))/864e5);
  return diff===0?`오늘 ${hm}`:diff===1?`어제 ${hm}`:`${d.getMonth()+1}월 ${d.getDate()}일 ${hm}`};
function syncBar(r){
  document.querySelector('#syncbar')?.remove();if(!r)return;
  const ids=[...new Set(r.ids||[])],nm=id=>{const n=LIB&&LIB.novels.find(x=>x.id===id);return n?`‘${n.name}’`:'새 작품'};
  const what=ids.length===1?nm(ids[0]):`작품 ${ids.length}개`,when=whenText(r.at);
  const bar=h('div',{id:'syncbar',role:'status'},
    h('span',{},h('b',{},r.from||'다른 기기'),`에서 ${when?when+'에 ':''}고친 내용이 있어요 · ${what}`),
    h('button',{class:'on',onclick:()=>{bar.remove();syncNow()}},'받기'),
    h('button',{class:'quiet',title:'이 내용으로는 다시 묻지 않아요 · 설정 → 데이터 → 받기로 언제든 받을 수 있어요',onclick:()=>{bar.remove();if(Shell)Shell.sync.dismiss(r.sig)}},'나중에'));
  document.body.append(bar);
}
function refreshSyncRow(){const e=document.querySelector('.syncst');if(e)e.textContent=syncStatusText()}
function syncStatusText(){
  const c=UI.syncCfg;if(!c||!c.repo)return '꺼짐';
  const r=UI.syncLast;if(r&&!r.ok&&!r.skipped)return '실패: '+r.error;
  return `${c.repo} · 마지막 동기화 ${agoText(c.last)}`;
}
async function syncNow(){
  if(!Shell)return;
  const e=document.querySelector('.syncst');if(e)e.textContent='받는 중…';
  const r=await Shell.sync.now();UI.syncCfg=Shell.sync.getConfig();onSyncResult({...r,manual:true});
}
/* 설정 → 데이터 탭에 들어가는 줄 */
function syncRows(row){
  if(!Shell||!Shell.sync)return [];
  UI.syncCfg=Shell.sync.getConfig();
  const on=!!(UI.syncCfg&&UI.syncCfg.repo&&UI.syncCfg.hasToken);
  return [row('GitHub 동기화','고친 내용은 자동으로 올리고 · 다른 기기 내용은 알림이 오면 받아요',
    h('span',{class:'muted syncst'},syncStatusText()),
    on?h('button',{title:'다른 기기에서 고친 내용을 받아서 합쳐요',onclick:syncNow},'받기'):null,
    h('button',{onclick:showSyncSetup},on?'설정 바꾸기':'연결하기'))];
}
function showSyncSetup(){
  const c=Shell.sync.getConfig()||{};
  const inp=(ph,v,type)=>h('input',{type:type||'text',placeholder:ph,value:v||'',spellcheck:'false',autocomplete:'off',style:'width:100%'});
  const repo=inp('내아이디/저장소이름',c.repo),branch=inp('main',c.branch||'main'),dev=inp(c.host||'예: 집 맥',c.device),token=inp(c.hasToken?'(저장돼 있음 · 바꿀 때만 입력)':'github_pat_…','', 'password');
  const msg=h('p',{class:'muted'});
  const field=(label,el)=>h('label',{style:'display:block;margin:10px 0'},h('div',{style:'font-weight:600;margin-bottom:4px'},label),el);
  openModal(mtitle('GitHub 동기화'),
    h('p',{class:'muted'},'집 맥과 회사 PC가 같은 비공개 저장소로 작품을 주고받아요. 고친 내용은 몇 초 뒤 · 끌 때 자동으로 올려요. 다른 기기에서 고친 내용은 켤 때 · 5분마다 확인해서 위에 알려 주고, 받기를 눌러야 받아요.'),
    h('ol',{class:'muted',style:'padding-left:18px;line-height:1.7'},
      h('li',{},'GitHub에서 ',h('b',{},'비공개(Private)'),' 저장소를 하나 만들어요 (README 포함).'),
      h('li',{},'Settings → Developer settings → ',h('b',{},'Fine-grained tokens'),' 에서 토큰을 만들어요.'),
      h('li',{},'Repository access 는 ',h('b',{},'그 저장소만'),', Permissions 는 ',h('b',{},'Contents: Read and write'),' 하나만 주면 돼요.'),
      h('li',{},'토큰은 이 컴퓨터 안에 암호화해서 보관해요. 두 컴퓨터 모두 같은 저장소 · 토큰을 넣어 주세요.')),
    field('저장소',repo),field('브랜치',branch),field('토큰',token),field('이 기기 이름 (다른 기기 알림에 “○○에서 고친 내용”으로 나와요)',dev),msg,
    h('div',{class:'row',style:'margin-top:14px'},
      c.repo?h('button',{class:'quiet',style:'color:var(--warn)',onclick:async()=>{if(!await askConfirm('동기화를 끌까요? (이 컴퓨터의 작품은 그대로 있어요)'))return;Shell.sync.setConfig(null);closeModal();showSettings()}},'연결 끊기'):null,
      h('span',{class:'sp'}),h('button',{onclick:closeModal},'취소'),
      h('button',{class:'on',onclick:async()=>{
        const r=repo.value.trim().replace(/^https?:\/\/github\.com\//,'').replace(/\.git$/,'').replace(/\/$/,'');
        if(!/^[\w.-]+\/[\w.-]+$/.test(r)){msg.textContent='저장소는 “아이디/이름” 모양으로 적어 주세요';return}
        if(!token.value.trim()&&!c.hasToken){msg.textContent='토큰을 넣어 주세요';return}
        const ok=Shell.sync.setConfig({repo:r,branch:branch.value.trim()||'main',token:token.value.trim()||null,device:dev.value.trim()});
        if(!ok||!ok.ok){msg.textContent=(ok&&ok.error)||'저장하지 못했어요';return}
        msg.textContent='연결 확인 중…';
        const res=await Shell.sync.now();
        if(!res.ok){msg.textContent='연결하지 못했어요: '+res.error;return}
        closeModal();UI.syncCfg=Shell.sync.getConfig();onSyncResult({...res,manual:true});showSettings();
      }},'저장하고 연결')));
  setTimeout(()=>repo.focus(),30);
}

/* ---------- 같은 글을 양쪽 기기에서 다르게 고친 곳 고르기 (storage/merge.js 가 S.syncConflicts 에 남겨 둠) ---------- */
const pendingConflicts=()=>Array.isArray(S.syncConflicts)?S.syncConflicts:[];
function conflictTarget(path){      // ['cards','<id>','text'] → {obj, key}: 목록은 id(또는 label)로 찾음
  let o=S;
  for(let i=0;i<path.length-1;i++){
    const k=path[i];
    o=Array.isArray(o)?o.find(x=>x&&(String(x.id)===k||'label:'+x.label===k)):o&&o[k];
    if(!o||typeof o!=='object')return null;
  }
  return {obj:o,key:path[path.length-1]};
}
function keepBothCard(id,text){      // 다른 기기 글을 새 카드로: 원래 카드 옆에 같은 자리 · 같은 화로
  const c=S.cards.find(x=>x.id===id);if(!c)return false;
  const n=JSON.parse(JSON.stringify(c));n.id=uid();n.text=text;n.created=Date.now();S.cards.push(n);
  const near=b=>{if(b&&b[id]){S.z=(S.z||1)+1;b[n.id]={...b[id],x:b[id].x+28,y:b[id].y+28,z:S.z}}};
  S.characters.forEach(ch=>near(ch.board));near(S.allBoard);near(S.noneBoard);
  [...S.episodes,...(S.shelves||[])].forEach(e=>{const i=(e.cardIds||[]).indexOf(id);if(i>=0)e.cardIds.splice(i+1,0,n.id)});
  return true;
}
function resolveConflict(c,how){
  const t=conflictTarget(c.path);
  act(()=>{
    if(t&&how==='theirs')t.obj[t.key]=c.theirs;
    else if(t&&how==='both'){
      if(!(c.path[0]==='cards'&&c.path[2]==='text'&&keepBothCard(c.path[1],c.theirs)))t.obj[t.key]=`${c.mine}\n\n${c.theirs}`;
    }
    S.syncConflicts=pendingConflicts().filter(x=>x.id!==c.id);
    if(!S.syncConflicts.length)delete S.syncConflicts;
  });
}
function showSyncConflicts(){
  const list=pendingConflicts();if(!list.length)return closeModal();
  const c=list[0],t=conflictTarget(c.path),now=t?t.obj[t.key]:c.mine,isCard=c.path[0]==='cards';
  const box=(title,text)=>h('div',{style:'flex:1;min-width:0'},h('div',{style:'font-weight:600;margin-bottom:4px'},title),
    h('div',{style:'white-space:pre-wrap;max-height:40vh;overflow:auto;padding:10px;border-radius:8px;background:var(--acc-soft);font-size:.95em'},text||'(비어 있음)'));
  const pick=how=>{resolveConflict(c,how);showSyncConflicts()};
  openModal(mtitle('양쪽 기기에서 다르게 고친 글'),
    h('p',{class:'muted',style:'white-space:pre-line'},`${c.label}${list.length>1?` · 남은 것 ${list.length}곳`:''}\n어느 쪽을 쓸지 골라 주세요. 고르기 전까지는 이 기기 글이 들어가 있어요.`),
    h('div',{style:'display:flex;gap:12px;flex-wrap:wrap'},box('이 기기',now),box('다른 기기',c.theirs)),
    h('div',{class:'row',style:'margin-top:14px'},
      h('button',{class:'quiet',onclick:closeModal},'나중에'),h('span',{class:'sp'}),
      h('button',{onclick:()=>pick('mine')},'이 기기 것'),
      h('button',{onclick:()=>pick('theirs')},'다른 기기 것'),
      h('button',{class:'on',onclick:()=>pick('both')},isCard?'둘 다 (카드 하나 더)':'둘 다 (이어 붙이기)')));
}
