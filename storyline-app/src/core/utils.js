/* ============ 기본 도구 ============ */
const $=id=>document.getElementById(id);
/* 맥이 아니면(Windows) 화면에 보이는 단축키 표기를 바꿈: ⌘N → Ctrl+N, ⌥ → Alt, ⇧ → Shift */
const IS_MAC=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent);
const KEYNAME={'⌘':'Ctrl','⌥':'Alt','⇧':'Shift','⌫':'Backspace'};
const keyText=s=>IS_MAC||typeof s!=='string'?s:s.replace(/[⌘⌥⇧⌫]/g,(g,i)=>KEYNAME[g]+(/[^\s+]/.test(s[i+1]||' ')&&g!=='⌫'?'+':''));
const modKey=e=>IS_MAC?e.metaKey:e.ctrlKey;      // 맥 ⌘ · Windows Ctrl
const uid=()=>Math.random().toString(36).slice(2,10);
/* 선 아이콘 (이모지 대신 통일된 모양) */
const ICONS={copy:'<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9"/>',zen:'<rect x="5" y="4.5" width="14" height="15" rx="2.5"/><path d="M8.5 9.5h7M8.5 13h5"/><path d="M2.5 8v8M21.5 8v8" opacity=".55"/>',noteplus:'<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5M12 11.5v5M9.5 14h5"/>',folderplus:'<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M12 10.8v5M9.5 13.3h5"/>',xcol:'<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M9.5 5v14"/>',list:'<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>',people:'<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.8-3.4 3.2-5 6-5s5.2 1.6 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14c2.2.2 3.8 1.6 4.5 4"/>',sheet:'<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M9 8h6M9 12h6M9 16h4"/>',cards:'<rect x="3.5" y="6" width="11" height="13" rx="2"/><path d="M8 4h10.5a2 2 0 0 1 2 2v11"/>',filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',plusc:'<path d="M12 6v12M6 12h12"/>',eye:'<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',grid:'<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',brush:'<path d="M14.5 4.5l5 5-8 8H6.5v-5z"/><path d="M12.5 6.5l5 5"/>',chevL:'<path d="M15 6l-6 6 6 6"/>',chevR:'<path d="M9 6l6 6-6 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
  more:'<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>',
  table:'<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M9.5 4.5v15"/>',
  graph:'<circle cx="6" cy="7" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="12" cy="18" r="2.6"/><path d="M8.5 6.8l7-.6M7.3 9.3l3.5 6.4M16.8 8.4l-3.6 7.3"/>',
  close:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',expand:'<path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5"/>',shrink:'<path d="M4 14h6v6M20 10h-6V4M10 14l-6.5 6.5M14 10l6.5-6.5"/>',
  pin:'<path d="M9.5 3.5h5l-.8 5.2 3.3 3.3H7l3.3-3.3z"/><path d="M12 12v8.5"/>',
  book:'<path d="M4.5 5.5A1.5 1.5 0 0 1 6 4h5.5v15.5H6a1.5 1.5 0 0 0-1.5 1.5z"/><path d="M19.5 5.5A1.5 1.5 0 0 0 18 4h-5.5v15.5H18a1.5 1.5 0 0 1 1.5 1.5z"/>',
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".9" fill="currentColor"/>',
  folder:'<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  alert:'<path d="M12 4.5l8.5 15h-17z"/><path d="M12 10v4.5"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',chevD:'<path d="M6 9l6 6 6-6"/>',
  play:'<path d="M8 5.5v13l10.5-6.5z"/>',pause:'<path d="M9 5.5v13M15 5.5v13"/>',
  sliders:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',origin:'<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>'};
const GLYPH={'‹':'chevL','›':'chevR','＋':'plus','−':'minus','⋯':'more','▦':'table','⛓':'graph','✕':'close','⤢':'expand','⤡':'shrink','📌':'pin','⌖':'origin'};
function icon(n){const s=document.createElement('span');s.className='ic';s.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICONS[n]+'</svg>';return s}
function h(t,a={},...c){
  const e=document.createElement(t);
  for(const k in a){const v=a[k];
    if(k==='class')e.className=v;
    else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);
    else if(k==='draggable')e.draggable=!!v;      // draggable="" 는 '끌 수 없음'으로 처리되므로 프로퍼티로 설정
    else if(v===true)e.setAttribute(k,'');
    else if(v!==false&&v!=null)e.setAttribute(k,(k==='title'||k==='placeholder'||k==='aria-label')?keyText(v):v)}
  if(t==='button'){      // 접근성: 아이콘 버튼도 화면 읽기에 이름이 나오게 + 기호 하나짜리 버튼은 선 아이콘으로
    if(a.title&&!a['aria-label'])e.setAttribute('aria-label',keyText(String(a.title).split('\n')[0]));
    const cc=c.flat().filter(x=>x!=null&&x!==false);
    if(cc.length===1&&typeof cc[0]==='string'&&GLYPH[cc[0]]&&/(^|\s)(cbtn|ico|pinx|x|ic-ok)(\s|$)/.test(a.class||'')){e.append(icon(GLYPH[cc[0]]));e.classList.add('hasic');return e}
  }else if(a.onclick&&(t==='span'||t==='div')&&/(^|\s)(chip|ep|epg|fold|tlgbar|tlgstrip|ent)(\s|$)/.test(a.class||'')){e.setAttribute('role','button');e.tabIndex=0}      // 키보드로도 누를 수 있게
  for(const x of c.flat())if(x!=null&&x!==false)e.append(x.nodeType?x:document.createTextNode(keyText(x)));
  return e;
}
function sel(opts,val,onch,cls){
  const s=h('select',{class:cls||'',onchange:e=>onch(e.target.value)});
  for(const [v,l] of opts)s.append(h('option',{value:v,selected:v===val},l));
  return s;
}
const segOld=(items,val,fn)=>h('span',{class:'seg'},...items.map(([k,l])=>h('button',{class:val===k?'on':'',onclick:()=>fn(k)},l)));
/* 새 디자인: 화면을 바꾸는 탭은 밑줄 탭, 고르는 버튼이 3개 이상 나란히면 드롭다운 하나로 */
const U2=()=>!!(S&&S.settings&&S.settings.uiStyle==='new');
const seg=(items,val,fn)=>{
  if(!U2()||items.length<3)return segOld(items,val,fn);
  const i=Math.max(0,items.findIndex(([k])=>k===val));
  const s=h('select',{class:'seg2',onchange:e=>fn(items[+e.target.value][0])});
  items.forEach(([k,l],j)=>s.append(h('option',{value:j,selected:j===i},l)));
  return s;
};
const tabs=(items,val,fn)=>{const t=segOld(items,val,fn);t.classList.add('tabs');return t};
const EM=(e,ic)=>{if(!U2())return e;const i=icon(ic);i.classList.add('em');return i};      // 새 디자인에서는 이모지 대신 선 아이콘
function iconBtn(title,onclick,path){
  const b=h('button',{class:'ico',title,'aria-label':title,onclick});
  b.innerHTML=`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  return b;
}
const nameKey=t=>String(t||'').replace(/\s+/g,'').toLowerCase();
const p2=n=>String(n).padStart(2,'0');
const fmtTime=t=>{const d=new Date(t);return `${d.getMonth()+1}/${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}`};
function toast(t,o){const e=$('toast');e.textContent=keyText(t);e.classList.toggle('act',!!(o&&o.undo));if(o&&o.undo)e.append(h('button',{class:'tundo',onclick:()=>{e.classList.remove('on','act');undo()}},'되돌리기'));e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on','act'),o&&o.undo?5000:1800)}
