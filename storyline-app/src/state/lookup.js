/* ============ 조회 도우미 ============ */
/* 찾아보기 색인: 한 번 그리는 동안만 쓰고 버림 (데이터가 바뀌면 다시 만듦) — 카드 · 인물이 많아도 빠르게 */
let IDX=null;
const idxClear=()=>{IDX=null};
function idx(){
  if(IDX&&IDX.S===S&&IDX.nc===S.characters.length&&IDX.nk===S.cards.length&&IDX.ne===S.episodes.length)return IDX;
  const X={S,nc:S.characters.length,nk:S.cards.length,ne:S.episodes.length,ch:new Map(),cd:new Map(),ep:new Map(),sh:new Map(),ef:new WeakMap(),by:null};
  S.characters.forEach(c=>X.ch.set(c.id,c));S.cards.forEach(c=>X.cd.set(c.id,c));
  S.episodes.forEach((e,i)=>e.cardIds.forEach(id=>{if(!X.ep.has(id))X.ep.set(id,{ep:e,i})}));
  (S.shelves||[]).forEach(sh=>sh.cardIds.forEach(id=>{if(!X.sh.has(id))X.sh.set(id,sh)}));
  IDX=X;Promise.resolve().then(()=>{if(IDX===X)IDX=null});      // 다음 틱에는 새로
  return X;
}
const charById=id=>idx().ch.get(id);
const cardById=id=>idx().cd.get(id);
const kindOf=id=>S.kinds.find(k=>k.id===id)||S.kinds[0];
const eff=c=>{const X=idx(),k=c.chars.join()+'|'+c.autoChars.join(),o=X.ef.get(c);if(o&&o.k===k)return o.v;
  const v=[...new Set([...c.chars,...c.autoChars])].filter(id=>X.ch.has(id));X.ef.set(c,{k,v});return v};
const dupName=(name,exceptId)=>S.characters.find(c=>c.id!==exceptId&&nameKey(c.name)===nameKey(name));
function episodeOf(cardId){return idx().ep.get(cardId)||null}
const shelfOf=id=>idx().sh.get(id)||null;
const detach=ids=>{const set=new Set(ids);S.episodes.forEach(e=>e.cardIds=e.cardIds.filter(x=>!set.has(x)));(S.shelves||[]).forEach(x=>x.cardIds=x.cardIds.filter(y=>!set.has(y)))};      // 화와 보관 칸 어디에서든 빼기
const cardsOf=key=>{if(key==='all')return S.cards.slice();const X=idx();
  if(!X.by){X.by=new Map();X.by.set('none',[]);S.cards.forEach(c=>{const e=eff(c);if(!e.length)X.by.get('none').push(c);e.forEach(id=>{let a=X.by.get(id);if(!a)X.by.set(id,a=[]);a.push(c)})})}
  return (X.by.get(key)||[]).slice()};
// 타임라인에 이미 쓴 카드는 보드에서 기본으로 숨김 (설정/보드 위 버튼으로 보이기)
const useMode=()=>S.settings.useFilter||'unused';
const boardCards=key=>cardsOf(key).filter(c=>{
  if(!kindOk(c))return false;      // 분류 필터 · 사용 여부 모두 핀 꽂힌 카드도 똑같이 따름
  const m=useMode();
  if(m==='disc')return !!c.discarded;      // 보기 ‘폐기’: 폐기한 카드만 모아 봄
  if(c.discarded)return false;      // 폐기한 카드는 평소엔 어느 보드에도 안 나옴
  if(m==='all')return true;
  if(c.pin&&S.settings.pinAlways)return true;      // (켜 두면) 핀 꽂은 카드는 사용했어도 계속 보임
  const u=!!(episodeOf(c.id)||shelfOf(c.id));return m==='used'?u:!u});      // 보관 칸의 카드는 사용한 카드처럼: 미사용 보기에선 숨고, 사용 · 전체 보기에서 보임
const usedHidden=key=>cardsOf(key).length-boardCards(key).length;

/* 이름 자동 연결: 글 안에 인물 이름·별칭(2글자 이상)이 있으면 연결. 직접 뺀 인물은 다시 붙이지 않음 */
const terms=c=>[c.name,...c.aliases].map(x=>String(x).trim()).filter(x=>x.length>=2).map(x=>x.toLowerCase());
function autoLinkCard(card){
  const tx=card.text.toLowerCase(),prev=JSON.stringify(card.autoChars),auto=[];
  S.characters.forEach(c=>{if(card.offChars.includes(c.id)||card.chars.includes(c.id))return;if(terms(c).some(t=>tx.includes(t)))auto.push(c.id)});
  card.autoChars=auto;IDX&&(IDX.by=null);return JSON.stringify(auto)!==prev;
}
const autoLinkAll=()=>S.cards.forEach(autoLinkCard);
autoLinkAll();
