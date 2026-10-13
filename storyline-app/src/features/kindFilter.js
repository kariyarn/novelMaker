/* 분류별 보기: 보고 싶은 분류만 (비어 있으면 전체). 설정에서 분류를 추가하면 자동으로 목록에 생김 */
function kindsOn(){const ids=(S.settings.kindFilter||[]).filter(id=>S.kinds.some(k=>k.id===id));return ids.length&&ids.length<S.kinds.length?ids:[]}
function kindOk(c){const f=kindsOn();return !f.length||f.includes(c.kind)}
function setKindFilter(ids){S.settings.kindFilter=ids.length>=S.kinds.length?[]:ids;saveNow();renderAll()}
function ensureKindVisible(kid){      // 필터에 가려질 분류의 카드를 만들면 그 분류도 함께 보이게
  const on=kindsOn();if(on.length&&!on.includes(kid)){S.settings.kindFilter=[...on,kid];saveNow();toast(`‘${kindOf(kid).name}’도 함께 보여줘요`)}
}
function quickKind(){const on=kindsOn();if(!on.length)return S.kinds.some(k=>k.id===UI.qkind)?UI.qkind:'scene';return on.length===1||!on.includes('scene')?on[0]:'scene'}
function toggleKind(id){const c2=kindsOn(),s2=new Set(c2.length?c2:S.kinds.map(x=>x.id));if(s2.has(id))s2.delete(id);else s2.add(id);setKindFilter([...s2])}
function kindFilterBtn(){
  const on=kindsOn();
  const b=h('button',{class:'menubtn'+(on.length?' on':''),'data-pop':'1',title:'보고 싶은 분류만 보기 (장면 · 메모 …)',onclick:()=>popMenu(b,()=>{
    const cur=kindsOn(),selSet=new Set(cur.length?cur:S.kinds.map(k=>k.id));
    return [{title:'보고 싶은 분류'},...S.kinds.map(k=>({label:k.name,sw:k.colorMode==='random'?RANDOM_BG:k.color,on:selSet.has(k.id),keep:true,fn:()=>{
      const c2=kindsOn(),s2=new Set(c2.length?c2:S.kinds.map(x=>x.id));if(s2.has(k.id))s2.delete(k.id);else s2.add(k.id);setKindFilter([...s2])}})),
      'sep',{label:'모두 보기',on:!cur.length,fn:()=>setKindFilter([])}]})},
    on.length?`분류 ${on.length}/${S.kinds.length}`:'분류',h('span',{class:'caret'},'▾'));
  return b;
}
const hk=k=>k?'⌘'+k:'';
