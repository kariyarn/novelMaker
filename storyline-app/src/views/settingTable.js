/* ---------- 설정 표: 폴더 안의 항목을 사전처럼 한눈에 (이름 · 한 줄 정의 · 별칭 · 카드 수) ---------- */
const isEmptyEntry=c=>c.kind==='setting'&&!(c.summary||'').trim()&&!(c.memo||'').trim()&&!(c.aliases||[]).length&&!cardsOf(c.id).length;
const scopeIds=fid=>{const out=[fid];let grow=true;while(grow){grow=false;S.folders.forEach(f=>{const pr=parentOf(f);if(pr&&out.includes(pr)&&!out.includes(f.id)){out.push(f.id);grow=true}})}return out};
const parseEntry=l=>{const t=String(l).trim();if(!t)return null;const m=t.match(/^(.+?)\s*(?:[:：]|\s[-—–]\s|\t)\s*(.+)$/);return m?{name:m[1].trim(),def:m[2].trim()}:{name:t,def:''}};
function openFolderTable(fid){
  UI.mode='story';if(UI.sel==='all')UI.sel=firstEntity();
  const sel0=charById(UI.sel),guess=sel0?folderOf(sel0):null;
  UI.folderView=fid||guess||'f_setting';UI.tq='';renderAll();
}
function createEntries(lines,fid){      // "이름 : 한 줄 정의" 형식, 한 줄에 하나. 이미 있는 이름은 건너뜀
  let added=0,skipped=0;
  act(()=>{lines.forEach(l=>{const e=parseEntry(l);if(!e||!e.name)return;if(dupName(e.name)){skipped++;return}
    const c=newSetting(e.name);c.summary=e.def;c.folder=fid;S.characters.push(c);added++});autoLinkAll()});
  return {added,skipped};
}
function trashEntity(c){S.trash.push({id:uid(),type:'char',data:c,at:Date.now()});S.characters=S.characters.filter(x=>x!==c);if(UI.sel===c.id)UI.sel=firstEntity()}
async function cleanEmpty(ids){
  const list=S.characters.filter(c=>ids.includes(folderOf(c))&&isEmptyEntry(c));if(!list.length)return;
  if(!await askConfirm(`빈 항목 ${list.length}개를 휴지통으로 보낼까요?\n(정의·메모·별칭·카드가 모두 없는 항목이에요. 휴지통에서 복구할 수 있어요)`))return;
  act(()=>{list.forEach(trashEntity)});toast(`빈 항목 ${list.length}개를 정리했어요`,{undo:true});
}
function showBulkAdd(fid){
  const ta=h('textarea',{rows:10,style:'width:100%;resize:vertical',placeholder:'한 줄에 하나씩\n예)\n반지하 : 월세 40만 원, 곰팡이 냄새\n한강 둔치\n세진그룹 - 하린의 집안 회사'});
  const fs=sel(S.folders.map(f=>[f.id,folderPath(f)]),fid,v=>{fid=v});
  openModal(mtitle('설정을 여러 개 한꺼번에 추가'),
    h('p',{class:'muted'},'한 줄에 하나씩 붙여 넣으세요. “이름 : 한 줄 정의”처럼 쓰면 정의까지 같이 들어가요. 이미 있는 이름은 건너뛰어요.'),
    ta,h('div',{class:'row',style:'margin-top:10px'},h('span',{class:'muted'},'넣을 폴더'),fs),
    h('div',{class:'row',style:'margin-top:14px'},h('span',{class:'sp'}),h('button',{onclick:closeModal},'취소'),
      h('button',{class:'on',onclick:()=>{const r=createEntries(ta.value.split('\n'),fid);closeModal();toast(`${r.added}개 추가${r.skipped?` · ${r.skipped}개는 이미 있어서 건너뜀`:''}`)}},'추가')));
  setTimeout(()=>ta.focus(),30);
}
function selectInTable(id){      // 표에서는 시트 없이 행 표시만 (입력칸의 포커스가 안 풀리게 다시 그리지 않음)
  if(UI.sel===id)return;
  UI.sel=id;
  document.querySelectorAll('.ftab tr.trow').forEach(r=>r.classList.toggle('act',r.dataset.tid===id));
}
function renderFolderTable(m){
  const fid=UI.folderView,f=folderById(fid);
  if(!f){UI.folderView=null;return renderBoard(m)}
  const ids=scopeIds(fid),subs=ids.length>1;UI.tcol=UI.tcol||{};
  let list=S.characters.filter(c=>ids.includes(folderOf(c)));
  const total=list.length,emptyN=list.filter(isEmptyEntry).length,q=nameKey(UI.tq||'');
  if(q)list=list.filter(c=>nameKey([c.name,c.summary,(c.aliases||[]).join(' '),c.memo].join(' ')).includes(q));
  const st=UI.tsort,fp=c=>folderPath(folderById(folderOf(c))||f);
  if(st){const val=c=>st.key==='cards'?cardsOf(c.id).length:(st.key==='def'?(c.summary||''):c.name);
    list=[...list].sort((a,b)=>{const x=val(a),y=val(b);return (typeof x==='number'?x-y:String(x).localeCompare(String(y),'ko'))*st.dir})}
  const find=h('input',{class:'lfind',style:'width:150px',placeholder:'이름 · 정의 찾기',value:UI.tq||'',oninput:e=>{UI.tq=e.target.value;clearTimeout(renderFolderTable.t);renderFolderTable.t=setTimeout(()=>{const pos=e.target.selectionStart;renderMid();const i=document.querySelector('#mid .lfind');if(i){i.focus();i.setSelectionRange(pos,pos)}},180)}});
  m.append(h('div',{class:'mbar'},h('b',{},f.icon?f.icon+' ':EM('📁 ','folder'),f.name),h('span',{class:'muted'},`${total}개${subs?' · 하위 폴더 포함':''}`),h('span',{class:'sp'}),find,
    h('button',{onclick:()=>showBulkAdd(fid)},'＋ 여러 개 추가'),
    emptyN?h('button',{class:'quiet',title:'정의 · 메모 · 별칭 · 카드가 모두 없는 항목을 한 번에 정리',onclick:()=>cleanEmpty(ids)},`빈 항목 ${emptyN}개 정리`):null,
    h('button',{class:'quiet',onclick:()=>{UI.folderView=null;renderAll()}},'보드로 ›')));
  const sortTh=(label,key)=>h('th',{class:'sortable',onclick:()=>{UI.tsort=(st&&st.key===key)?(st.dir===1?{key,dir:-1}:null):{key,dir:1};renderMid()}},label,st&&st.key===key?(st.dir===1?' ▲':' ▼'):'');
  const rename=(c,e)=>{const v=e.target.value.trim(),d=v&&dupName(v,c.id);if(!v||d){e.target.value=c.name;return toast(!v?'이름은 비워둘 수 없어요':`'${d.name}'은(는) 이미 있는 이름이에요`)}act(()=>{c.name=v;autoLinkAll()})};
  const memoRow=c=>h('tr',{class:'mrow'},h('td',{colspan:6},h('textarea',{class:'fval autofit',rows:2,placeholder:'메모 (세계관 · 규칙 · 자유롭게)',style:'resize:none;overflow:hidden;width:100%;box-sizing:border-box',oninput:e=>{edit(()=>c.memo=e.target.value);fitOne(e.target)}},c.memo||'')));
  const rowsOut=()=>{
    const mk=c=>UI.tmemo===c.id?[row(c),memoRow(c)]:[row(c)];
    if(!subs)return list.flatMap(mk);
    const order=[],walk=(id,d)=>{order.push([id,d]);S.folders.filter(x=>parentOf(x)===id).forEach(x=>walk(x.id,d+1))};walk(fid,0);
    const out=[];
    order.forEach(([id,d])=>{
      const fo=folderById(id),items=list.filter(c=>folderOf(c)===id);if(!items.length&&(q||id===fid))return;
      const col=!!UI.tcol[id];
      out.push(h('tr',{class:'grp'+(d?'':' top')},h('td',{colspan:6,style:`padding-left:${8+d*16}px`},
        h('div',{class:'grow',onclick:()=>{UI.tcol[id]=!col;renderMid()}},h('span',{class:'car'},col?'▸':'▾'),h('span',{},fo.icon?fo.icon+' ':EM('📁 ','folder'),d?fo.name:fo.name+' (바로 아래)'),h('small',{},items.length+'개'),h('span',{class:'sp'}),
          h('button',{class:'quiet gadd',title:'이 폴더에 새 항목 추가',onclick:async e=>{e.stopPropagation();const nm=((await askText('새 항목 이름 (이름 : 한 줄 정의 도 돼요)'))||'').trim();if(nm){const r=createEntries([nm],id);if(r.skipped)toast('이미 있는 이름이에요')}}},'＋')))));
      if(!col)items.forEach(c=>out.push(...mk(c)));
    });
    return out;
  };
  const row=c=>{
    const emp=isEmptyEntry(c),n=cardsOf(c.id).length;
    const ic=h('span',{class:'eic','data-pop':'1',title:'아이콘 바꾸기'},c.icon||h('i',{class:'dot'+(c.kind==='setting'?' sq':''),style:`background:${c.color}`}));
    ic.addEventListener('click',e=>{e.stopPropagation();pickIcon(ic,c.icon,v=>setEntIcon(c,v))});
    const mb=h('button',{class:'cbtn emenu','data-pop':'1',title:'보드 열기 · 폴더 이동 · 삭제',onclick:e=>{e.stopPropagation();popMenu(mb,[
      {label:'보드 열기 (이 항목의 카드 모음)',fn:()=>setSel(c.id)},{label:'아이콘 바꾸기…',fn:()=>setTimeout(()=>pickIcon(ic,c.icon,v=>setEntIcon(c,v)),30)},'sep',{title:'폴더로 이동'},
      ...folderChoices(x=>folderOf(c)===x.id,x=>act(()=>{c.folder=x.id})),'sep',{label:'휴지통으로',fn:async()=>{if(await askConfirm(`'${c.name}' ${c.kind==='setting'?'설정 노트':'캐릭터'}를 휴지통으로 보낼까요? (카드는 남고, 휴지통에서 복구할 수 있어요)`,{ok:'휴지통으로',danger:true}))act(()=>trashEntity(c))}}])}},'⋯');
    const tr=h('tr',{class:'trow'+(UI.sel===c.id?' act':'')+(emp?' emp':''),'data-tid':c.id,ondblclick:e=>{if(!e.target.closest('input,button'))setSel(c.id)}},
      h('td',{class:'tn'},h('div',{class:'tnin'},ic,h('input',{class:'tin nm',value:c.name,onchange:e=>rename(c,e)}),emp?h('span',{class:'etag'},'빈 항목'):null)),
      h('td',{},h('input',{class:'tin',value:c.summary||'',placeholder:'한 줄 정의',oninput:e=>edit(()=>c.summary=e.target.value)})),
      h('td',{},h('input',{class:'tin',value:(c.aliases||[]).join(', '),placeholder:'별칭',title:'쉼표로 구분 · 글에 나오면 카드가 자동으로 연결돼요',onchange:e=>act(()=>{c.aliases=e.target.value.split(/[,，]/).map(x=>x.trim()).filter(Boolean);autoLinkAll()})})),
      h('td',{class:'tc',title:n?'눌러서 이 항목의 카드 보기':'',onclick:n?()=>setSel(c.id):null},n||''),
      h('td',{class:'tm'+(UI.tmemo===c.id?' open':''),title:'메모 보기 · 쓰기',onclick:e=>{e.stopPropagation();UI.tmemo=UI.tmemo===c.id?null:c.id;renderMid()}},c.memo&&c.memo.trim()?'●':'＋'),
      h('td',{class:'ta'},mb));
    tr.addEventListener('focusin',()=>selectInTable(c.id));tr.addEventListener('click',e=>{if(!e.target.closest('input,button,.eic,.tc'))selectInTable(c.id)});
    return tr;
  };
  const addIn=h('input',{placeholder:'새 항목 이름을 쓰고 Enter  (이름 : 한 줄 정의  도 돼요)',onkeydown:e=>{
    if(e.key!=='Enter'||e.isComposing)return;const v=addIn.value.trim();if(!v)return;
    const r=createEntries([v],fid);if(r.skipped)toast('이미 있는 이름이에요');
    setTimeout(()=>{const i=document.querySelector('.tadd input');if(i)i.focus()},30)}});
  const cols=['<col style="width:26%">','<col>','<col style="width:20%">','<col style="width:54px">','<col style="width:42px">','<col style="width:36px">'].join('');
  const tbl=h('table',{class:'ftab'},h('thead',{},h('tr',{},sortTh('이름','name'),sortTh('한 줄 정의','def'),h('th',{},'별칭'),sortTh('카드','cards'),h('th',{title:'메모가 있는 항목'},'메모'),h('th',{}))),
    h('tbody',{},...rowsOut(),!list.length?h('tr',{},h('td',{colspan:6,class:'sempty'},q?'일치하는 항목이 없어요.':'아직 항목이 없어요. 아래에 이름을 쓰고 Enter를 누르거나, 위의 “여러 개 추가”를 써 보세요.')):null),
    h('tbody',{},h('tr',{class:'tadd'},h('td',{colspan:6},addIn))));
  tbl.insertAdjacentHTML('afterbegin','<colgroup>'+cols+'</colgroup>');
  m.append(h('div',{class:'ftabwrap'},tbl,h('div',{class:'muted',style:'padding:10px 4px'},'메모 칸(●/＋)을 누르면 그 아래에서 메모를 써요 · 두 번 누르면(또는 ⋯ → 보드 열기) 그 항목의 카드 보드로 가요 · 같은 이름은 하나만 만들어져요')));
}

/* 설정 노트: 아비투스 없이 간단히 */
const workProgText=w=>{const n=S.episodes.length,t=+w.total||0;return t?`${n}/${t}화`:(n?`${n}화`:'')};
function renderWorkSheet(p,c){
  const n=S.episodes.length,t=+c.total||0,pct=t?Math.min(100,Math.round(n/t*100)):0;
  p.append(h('div',{class:'shead'},
    h('div',{class:'nm',style:'font-weight:700;font-size:1.5em;padding:6px 0'},EM('📖 ','book'),'작품 노트'),
    h('div',{class:'muted',style:'margin-bottom:6px'},'소설 전체의 컨셉과 목표를 모아두는 곳이에요. 여기 적은 건 카드 목록 · 전체 보기와 섞이지 않아요.')));
  p.append(h('div',{class:'sgrp wprog'},
    h('div',{class:'gh'},'연재 진행'),
    h('div',{class:'row',style:'align-items:center;gap:8px'},
      h('span',{},`${n}화 작성`),h('span',{class:'muted'},'/ 목표'),
      h('input',{class:'ghost',type:'number',min:0,style:'width:70px',value:t||'',placeholder:'예: 50',onchange:e=>act(()=>{c.total=Math.max(0,parseInt(e.target.value)||0)})}),h('span',{class:'muted'},'화'),
      t?h('span',{class:'muted',style:'margin-left:auto'},pct+'%'):null),
    t?h('div',{class:'wbar'},h('i',{style:`width:${pct}%`})):null));
  p.append(goalSection(c));
  const open=UIP.gc['work:컨셉']!==false;
  const box=h('div',{class:'sgrp'},h('div',{class:'gh',style:'cursor:pointer;user-select:none',onclick:()=>{UIP.gc['work:컨셉']=!open;saveUIP();renderSheet();fitAll($('sheet'))}},(open?'▾ ':'▸ ')+'컨셉'));
  const ord=l=>{const i=WORK_FIELDS.indexOf(l);return i<0?99:i};      // 항목 순서는 항상 정해진 순서로 (나중에 추가된 항목도 제자리에)
  if(open)c.fields.slice().sort((a,b)=>ord(a.label)-ord(b.label)).forEach(f=>box.append(h('label',{class:'fl'},f.label),
    h('textarea',{class:'ghost box autofit',rows:1,style:'resize:none;overflow:hidden;width:100%;box-sizing:border-box;display:block',oninput:e=>{edit(()=>f.value=e.target.value);fitOne(e.target)}},f.value)));
  p.append(box);
}

registerMidView({id:'table',order:20,match:()=>UI.mode==='story'&&!!UI.folderView,appClass:()=>'m-table',render:renderFolderTable});      // 구상 · 폴더 표
