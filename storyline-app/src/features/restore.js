/* ---------- 1) 자동 백업에서 복구 ---------- */
function showRestore(){
  if(!NS||!NS.backups)return toast('앱에서만 쓸 수 있어요');
  const list=NS.backups()||[];
  openModal(mtitle(`자동 백업에서 복구 · ${workName()}`),
    h('p',{class:'muted'},'작업 중에 자동으로 쌓인 백업이에요. 복구하기 직전의 현재 상태도 백업으로 한 번 더 남겨 두고, ↶(되돌리기)로도 되돌릴 수 있어요.'),
    !list.length?h('p',{class:'muted'},'아직 자동 백업이 없어요. 글을 고치면 10분마다 하나씩 쌓여요.'):null,
    ...list.map((b,i)=>h('div',{class:'mrow'},
      h('span',{class:'l'},h('b',{},fmtFull(b.mtime)),i===0?h('span',{class:'placed',style:'margin-left:8px'},'가장 최근'):null,
        h('div',{class:'muted'},b.ok?`캐릭터·설정 ${b.chars} · 카드 ${b.cards} · ${b.eps}화 · ${Math.max(1,Math.round(b.size/1024))}KB`:'읽을 수 없는 백업')),
      h('button',{disabled:!b.ok,onclick:()=>restoreBackup(b)},'이 시점으로 복구'))),
    closeRow(h('button',{onclick:()=>NS.openDir('backups')},'백업 폴더 열기')));
}
async function restoreBackup(b){
  if(!await askConfirm(`${fmtFull(b.mtime)} 백업으로 복구할까요?\n(지금 상태는 백업으로 따로 남겨 둬요)`))return;
  const text=NS.readBackup(b.name);let d;
  try{d=JSON.parse(text);if(!d.characters||!d.cards)throw 0}catch(e){return notice('백업 파일을 읽을 수 없어요')}
  try{NS.forceBackup(JSON.stringify(S))}catch(e){}
  snap();const keep=S.settings;S=migrate(d);S.settings=Object.assign({},S.settings,keep);S.demo=false;autoLinkAll();fixSel();
  UI.noSave=false;saveNow();closeModal();renderAll();toast('백업으로 복구했어요');
}
