/* ============ 집중 모드 (젠): 포스트잇 한 장을 가운데에 크게, 연속으로 브레인스토밍 ============ */
let ZEN=null;
const zenCards=()=>ZEN.ids.map(cardById).filter(Boolean);
function zenOpen(startId){
  if(ZEN)return;
  if(!onBoard()||UI.folderView)return toast('집중 모드는 코르크보드에서 쓸 수 있어요');
  if(UI.mode==='all')return toast('전체 보기에서는 쓸 수 없어요 — 인물 보드에서 열어 주세요');
  const key=UI.sel;if(!(key==='none'||charById(key)))return;
  let list=boardCards(key).filter(c=>!c.discarded).slice().sort((a,b)=>(a.created||0)-(b.created||0)).filter(c=>!c.zc||zUnit(c.id)[0]===c);      // 이어 쓴 카드들은 한 덩어리로
  ZEN={key,ids:list.map(c=>c.id),i:0,seen:[],made:new Set(),timer:null};
  closePop();document.querySelectorAll('.kcard.editing .ktext').forEach(t=>t.blur());
  const el=h('div',{id:'zen',role:'dialog','aria-modal':'true'});document.body.append(el);ZEN.el=el;zenVars();ZEN.tm=setInterval(zenTick,1000);
  if(startId&&ZEN.ids.includes(startId))ZEN.i=ZEN.ids.indexOf(startId);
  else if(SELCARD&&ZEN.ids.includes(SELCARD))ZEN.i=ZEN.ids.indexOf(SELCARD);
  else ZEN.i=Math.max(0,ZEN.ids.length-1);
  if(!ZEN.ids.length)zenNew();else zenDraw();
}
/* 이어 쓰기: 한 포스트잇(편집창)에서 구분선(---)을 넣고 계속 쓰면, 구분선마다 카드가 따로 만들어져 핀이 꽂히고 줄로 이어져요 */
const zUnit=id=>{const c=cardById(id);if(!c)return [];if(!c.zc)return [c];return S.cards.filter(x=>x.zc===c.zc).sort((a,b)=>(a.zo||0)-(b.zo||0))};
function zRemove(c){S.cards=S.cards.filter(x=>x!==c);S.episodes.forEach(e=>e.cardIds=e.cardIds.filter(x=>x!==c.id));delete boardMap(ZEN.key)[c.id];S.links=(S.links||[]).filter(l=>l.a!==c.id&&l.b!==c.id)}
function zChain(M){      // 순서대로 핀을 꽂고 이웃끼리 줄로 이음 (한 장만 남으면 이어쓰기 표시를 풀음)
  const zid=(M[0]&&M[0].zc)||uid();S.links=(S.links||[]).filter(l=>l.zc!==zid);
  if(M.length<2){const c=M[0];if(c&&c.zc){delete c.zc;delete c.zo;if(c.autoPin){c.pin=false;delete c.pinAngle;delete c.autoPin}}return}
  M.forEach((c,i)=>{c.zc=zid;c.zo=i;if(!c.pin){c.pin=true;c.pinAngle=Math.round(Math.random()*90-45);c.autoPin=true}});
  for(let i=1;i<M.length;i++)S.links.push({id:uid(),a:M[i-1].id,b:M[i].id,zc:zid});
}
function zPlaceNear(n,prev){const B=boardMap(ZEN.key),pp=B[prev.id];if(!pp)return;B[n.id]={x:pp.x+24,y:pp.y+(pp.h||CH)+30,w:pp.w,h:Math.max(CH,noteMinH()),mh:noteMinH(),r:+(Math.random()*8-4).toFixed(1),z:++S.z}}
function zenSync(rid,text){      // 편집창의 글을 구분선 기준으로 카드들에 나눠 담음
  const U=zUnit(rid);if(!U.length)return;const parts=zenParts(text);
  if(!parts&&U.length===1){U[0].text=text;return}
  const P=parts||[text],M=U.slice();
  for(let k=0;k<P.length;k++){
    if(k<M.length)M[k].text=P[k];
    else{const prev=M[k-1],n=zenCreate(P[k],prev.kind,prev.chars);zPlaceNear(n,prev);M.push(n)}
  }
  while(M.length>P.length)zRemove(M.pop());      // 구분선을 지우면 뒤 카드는 앞 카드에 합쳐짐
  zChain(M);idxClear();
}
function zenTidy(rid){      // 떠날 때 빈 카드 정리 (휴지통에도 안 보냄). 덩어리 전체가 비면 true
  if(!ZEN)return false;const U=zUnit(rid);if(!U.length)return false;
  const keep=U.filter(c=>(c.text||'').trim()),gone=U.filter(c=>!(c.text||'').trim()),at=ZEN.ids.indexOf(rid);
  gone.forEach(zRemove);
  if(!keep.length){if(at>=0)ZEN.ids.splice(at,1);idxClear();save();return true}
  if(keep[0].id!==rid&&at>=0)ZEN.ids[at]=keep[0].id;
  if(gone.length||keep.length>1||keep[0].zc){zChain(keep);idxClear();save()}
  return false;
}
function zenSwitch(tid,dir){      // 지금 카드를 떠나 다른 카드로
  if(!ZEN)return;const cur=ZEN.ids[ZEN.i];zenTidy(cur);
  ZEN.i=Math.max(0,ZEN.ids.indexOf(tid));ZEN.dir=dir;zenDraw();
}
function zenGo(i){if(!ZEN||i<0||i>=ZEN.ids.length)return;zenSwitch(ZEN.ids[i],i>ZEN.i?1:-1)}
function zenCreate(text,kid,srcChars){      // 집중 모드에서 새 카드 한 장을 만듦 (보드 위 자리까지)
  const key=ZEN.key;
  {const on=kindsOn();if(on.length&&!on.includes(kid)){S.settings.kindFilter=[...on,kid];saveNow()}}
  const card=newCard(kid,text||'');card.chars=srcChars?[...srcChars]:(key!=='none'?[key]:[]);S.cards.unshift(card);
  const v=getView(key),{W,H}=viewSize(),w=noteW(),hh=Math.max(CH,noteMinH()),R=rectsOf(key,card.id),ccx=(W/2-v.x)/v.k,ccy=(H/2-v.y)/v.k;let best=[ccx-w/2,ccy-hh/2],bs=Infinity;
  for(let i=0;i<16;i++){const px=ccx+(Math.random()-.5)*(W/v.k)*.5-w/2,py=ccy+(Math.random()-.5)*(H/v.k)*.5-hh/2;let ov=0;R.forEach(r=>{ov+=Math.max(0,Math.min(px+w,r.x+r.w)-Math.max(px,r.x))*Math.max(0,Math.min(py+hh,r.y+r.h)-Math.max(py,r.y))});if(ov<bs){bs=ov;best=[px,py]}}
  boardMap(key)[card.id]={x:Math.round(best[0]),y:Math.round(best[1]),w,h:hh,mh:noteMinH(),r:+(Math.random()*10-5).toFixed(1),z:++S.z};
  ZEN.made.add(card.id);if(text)autoLinkCard(card);idxClear();return card;
}
function zenNew(){
  if(!ZEN)return;const key=ZEN.key;
  const curU=zUnit(ZEN.ids[ZEN.i]);if(curU.length&&curU.every(c=>!(c.text||'').trim())){toast('빈 카드가 이미 있어요 — 먼저 적어 주세요');const t=ZEN.el.querySelector('.zta');if(t)t.focus();return}
  zenTidy(ZEN.ids[ZEN.i]);
  const ent=charById(key),kid=(S.kinds.find(k=>k.id===((ent&&ent.kind!=='setting')?'scene':'memo'))||S.kinds[0]).id;
  snap();const card=zenCreate('',kid);save();ZEN.ids.push(card.id);ZEN.i=ZEN.ids.length-1;ZEN.dir=1;zenDraw();
}
