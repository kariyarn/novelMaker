/* ---------- 포스트잇 창(작은 창)과 주고받기: main.js 가 note/ 창의 요청을 받아 이 함수들을 부름 ---------- */
const noteBridge={
  kinds(){return S.kinds.map(k=>({id:k.id,name:k.name,color:k.color}))},
  defaultKind(){return (S.kinds.find(k=>k.id==='scene')||S.kinds[0]).id},
  // 최근에 만든 카드부터 (지난 포스트잇 넘겨보기용)
  list(n){return [...S.cards].sort((a,b)=>(b.created||0)-(a.created||0)).slice(0,n||100).map(c=>({id:c.id,text:c.text||'',kind:c.kind,color:cardColor(c)}))},
  add(text,kind){
    const kid=S.kinds.some(k=>k.id===kind)?kind:noteBridge.defaultKind();let c;
    act(()=>{c=newCard(kid,text);autoLinkCard(c);S.cards.unshift(c)});
    return {id:c.id,color:cardColor(c)};
  },
  update(id,text,kind){
    const c=cardById(id);if(!c)return null;
    if(c.text!==text||(kind&&c.kind!==kind))edit(()=>{c.text=text;if(kind&&S.kinds.some(k=>k.id===kind))c.kind=kind;autoLinkCard(c)});
    clearTimeout(noteBridge.rt);noteBridge.rt=setTimeout(()=>renderAll(),700);      // 큰 창은 숨어 있어도 잠시 뒤 맞춰 둠
    return {id:c.id,color:cardColor(c)};
  },
  workName(){return workName()},
  // 작품 고르기: 보관함에 안 넣은 작품들 (최근에 고친 것부터) · 지금 작품
  works(){refreshLib();if(!LIB)return {current:null,list:[]};return {current:LIB.current,list:LIB.novels.filter(n=>!n.archived).sort((a,b)=>(b.updated||0)-(a.updated||0)).map(n=>({id:n.id,name:n.name}))}},
  openWork(id){if(!LIB||id===LIB.current)return true;switchNovel(id);return LIB.current===id},
};
