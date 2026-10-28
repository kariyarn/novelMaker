/* ============ 카드 무덤: 만들고 n일(기본 7일) 동안 화 · 보관 칸에 안 넣은 카드는 저절로 무덤으로 ============
   - 타이머는 카드의 clock(시작 시각)부터. 만들 때 · 화나 보관 칸에서 빠져 돌아올 때 · 무덤에서 되살릴 때 새로 시작하고, 글을 고쳐도 그대로
   - 별(꼭 쓸 것) 붙인 카드 · 화나 보관 칸에 든 카드는 안 감
   - 무덤 3일 전부터 흐려지고 D-3 · D-2 · D-1 표시
   - 무덤(discarded)에서는 직접 되살리거나 화 · 보관 칸에 넣을 때만 나옴. 폐기도 무덤으로 바로 보내기
   - 무덤 카드는 인물 보드 · 오른쪽 목록에서 숨고, 무덤 보드(왼쪽 목록 맨 아래)와 오른쪽 목록 맨 아래 '무덤'에서만 보임 */
const DAY=864e5,GRAVE_WARN=3;
const graveDays=()=>{const v=S.settings.graveDays;return v===0?0:(+v||7)};      // 0 이면 끔
const placedCard=c=>!!(episodeOf(c.id)||shelfOf(c.id));
const graveCards=()=>S.cards.filter(c=>c.discarded);
/* 무덤까지 남은 날: 카운트다운 중(1~3)이면 그 수, 아니면 0 */
function graveLeft(c){
  const n=graveDays();if(!n||c.discarded||c.star||!c.clock||placedCard(c))return 0;
  const d=Math.ceil((c.clock+n*DAY-Date.now())/DAY);
  return d>=1&&d<=GRAVE_WARN?d:0;
}
const ddayEl=c=>{const d=graveLeft(c);return d?h('span',{class:'dday',title:`화나 보관 칸에 넣거나 별을 붙이지 않으면 ${d}일 뒤 무덤으로 가요`},'D-'+d):null};
/* 타이머 맞추기 · 기한 지난 카드를 무덤으로 (되돌리기 기록 없이 조용히 · 바뀐 게 있으면 true) — 데이터가 바뀔 때마다(commit) · 켤 때 · 가끔 */
function graveTick(){
  if(UI.noSave||!S||!S.cards)return false;
  const now=Date.now(),n=graveDays();let moved=0,changed=false;
  S.cards.forEach(c=>{
    if(placedCard(c)){      // 화 · 보관 칸에 든 동안은 타이머 없음 (무덤 카드를 넣으면 되살아남)
      if(c.clock!==undefined){delete c.clock;changed=true}
      if(c.discarded){delete c.discarded;delete c.graveAt;changed=true}
      return;
    }
    if(c.discarded)return;
    if(!c.clock){c.clock=now;changed=true;return}      // 처음 보는 카드 · 막 돌아온 카드: 지금부터
    if(n&&!c.star&&now>=c.clock+n*DAY){c.discarded=true;c.graveAt=now;moved++;changed=true}
  });
  if(changed)idxClear();
  if(moved)setTimeout(()=>toast(`${moved}장이 무덤으로 갔어요 · 왼쪽 목록 맨 아래 ‘무덤’에서 되살릴 수 있어요`),0);
  return changed;
}
function buryCards(ids){      // 무덤으로 보내기 (폐기)
  act(()=>ids.map(cardById).filter(Boolean).forEach(c=>{stamp(c);c.discarded=true;c.graveAt=Date.now();delete c.clock;detach([c.id])}));
}
function reviveCards(ids){      // 되살리기: 오른쪽 목록으로 돌아오고 타이머는 처음부터
  const cs=ids.map(cardById).filter(c=>c&&c.discarded);if(!cs.length)return;
  act(()=>cs.forEach(c=>{stamp(c);delete c.discarded;delete c.graveAt;c.clock=Date.now()}));
  toast(cs.length>1?`${cs.length}장을 되살렸어요`:'되살렸어요 · 오른쪽 목록으로 돌아갔어요',{undo:true});
}
const reviveBtn=c=>h('button',{class:'revive',title:'되살리기 — 오른쪽 목록으로 돌아오고 타이머는 처음부터',onclick:e=>{e.stopPropagation();reviveCards([c.id])}},'되살리기');
/* 켜 둔 채로 시간이 지나도: 10분마다 기한을 보고, 카운트다운 숫자가 바뀌었으면 다시 그림 (글을 쓰는 중이면 다음번에) */
let graveSig='';
setInterval(()=>{
  const a=document.activeElement;if(a&&/^(TEXTAREA|INPUT)$/.test(a.tagName)&&!a.readOnly)return;
  if(graveTick()){commit();return}
  const sig=S.cards.map(graveLeft).join('');if(sig!==graveSig){graveSig=sig;renderAll()}
},10*60*1000);
