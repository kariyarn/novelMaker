/* ---------- 스마트 입력: 둥근 따옴표 · 열고 닫는 괄호류 자동 닫기 · 말줄임표 (카드 글, 메모, 빠른 입력) ---------- */
(function(){
  const SEL='textarea.ktext,textarea.fval,textarea.zta,textarea.tlmemo,.widea textarea,.pquick input,textarea.nta';      // 카드 글 · 집중 모드 · 시트 칸 · 화 메모 · 아이디어 · 빠른 입력 · 포스트잇 창
  const PAIR={'“':'”','‘':'’','「':'」','『':'』','[':']','(':')','《':'》','〈':'〉'};
  const CYC=[['[',']'],['「','」'],['『','』'],['《','》']];
  const EXTRA={'"':'"',"'":"'",'＂':'＂','＇':'＇','（':'）','［':'］','｛':'｝','〈':'〉','【':'】','〔':'〕','〖':'〗','〘':'〙','‹':'›','«':'»','‚':'‘','„':'“'};      // 곧은 따옴표 · 전각 괄호 · 기타 짝
  const REV={};Object.keys(PAIR).forEach(o=>REV[PAIR[o]]=o);
  const put=(el,t,back)=>{if(!document.execCommand('insertText',false,t)){const a=el.selectionStart;el.setRangeText(t,a,el.selectionEnd,'end');el.dispatchEvent(new Event('input',{bubbles:true}))}
    if(back)el.setSelectionRange(el.selectionStart-back,el.selectionStart-back)};
  const roomAfter=n=>!n||/[\s)\]}.,!?…”’」』》〉]/.test(n);      // 뒤에 글자가 바로 붙어 있지 않을 때만 자동으로 닫음
  document.addEventListener('beforeinput',e=>{
    const el=e.target;if(!el.matches||!el.matches(SEL)||el.readOnly)return;
    if(e.inputType==='deleteContentBackward'&&!e.isComposing&&el.selectionStart===el.selectionEnd){      // 빈 따옴표 · 괄호 쌍에서 여는 글자를 지우면 닫는 글자도 함께 지움
      const v=el.value,a=el.selectionStart,pv=v[a-1],nx=v[a];
      if(pv&&nx&&(PAIR[pv]===nx||EXTRA[pv]===nx)){e.preventDefault();el.setSelectionRange(a-1,a+1);if(!document.execCommand('delete')){el.setRangeText('',a-1,a+1,'end');el.dispatchEvent(new Event('input',{bubbles:true}))}}
      return;
    }
    if(e.isComposing||e.inputType!=='insertText'||!e.data||e.data.length!==1)return;
    const v=el.value,a=el.selectionStart,b=el.selectionEnd,prev=v[a-1]||'',next=v[b]||'',ch=e.data;
    if(ch==='"'||ch==="'"){
      const dbl=ch==='"',open=dbl?'“':'‘',close=dbl?'”':'’';
      const par=v.slice(v.lastIndexOf('\n',a-1)+1,a),unclosed=par.lastIndexOf(open)>par.lastIndexOf(close);
      const opening=!prev||/[\s(\[{“‘「『—\-\/]/.test(prev)||(!/[\p{L}\p{N}]/u.test(prev)&&!unclosed);
      e.preventDefault();
      if(a===b&&next===close&&!opening){el.setSelectionRange(a+1,a+1);return}      // 이미 닫혀 있으면 넘어감
      if(opening&&roomAfter(next)){put(el,open+close,1);return}
      put(el,opening?open:close);return;
    }
    if(ch==='['&&a===b){      // 여는 괄호 바로 뒤에서 [ 를 또 누르면 [ ] → 「 」 → 『 』 → 《 》 → [ ] 순서로 바꿈
      const k=CYC.findIndex(x=>x[0]===prev);
      if(k>=0){
        e.preventDefault();const cur=CYC[k],nw=CYC[(k+1)%CYC.length];
        const nl=v.indexOf('\n',a),lim=nl<0?v.length:nl,j=v[a]===cur[1]?a:(()=>{const x=v.indexOf(cur[1],a);return x>=0&&x<lim?x:-1})();
        if(j>=0){el.setSelectionRange(a-1,j+1);put(el,nw[0]+v.slice(a,j)+nw[1])}else{el.setSelectionRange(a-1,a);put(el,nw[0])}
        el.setSelectionRange(a,a);return;
      }
    }
    if(PAIR[ch]){      // 「 『 [ ( ‘ “ 같은 여는 글자: 닫는 글자도 함께
      if(roomAfter(next)){e.preventDefault();put(el,ch+PAIR[ch],1)}
      return;
    }
    if(REV[ch]&&a===b&&next===ch){e.preventDefault();el.setSelectionRange(a+1,a+1);return}      // 닫는 글자 위에서 치면 넘어감
    if(ch==='.'&&a===b&&v.slice(a-2,a)==='..'){e.preventDefault();el.setSelectionRange(a-2,a);put(el,'…')}
  },true);
  /* 한글 입력 보완: 글자를 조합하던 중에 . 이나 " 를 치면 그 입력이 ‘조합 중’으로 들어와 위에서 건너뛰어짐
     → 입력이 끝난 뒤(조합이 끝난 뒤) 커서 바로 앞을 다시 보고, 곧은 따옴표 · 점 세 개가 남아 있으면 바꿈 */
  const fix=el=>{
    if(!el||!el.matches||!el.matches(SEL)||el.readOnly)return;
    const a=el.selectionStart;if(a!==el.selectionEnd||!a)return;
    const v=el.value,ch=v[a-1];
    if(ch==='.'&&v.slice(a-3,a)==='...'){el.setSelectionRange(a-3,a);put(el,'…');return}
    if(ch!=='"'&&ch!=="'")return;
    const dbl=ch==='"',open=dbl?'“':'‘',close=dbl?'”':'’',prev=v[a-2]||'',next=v[a]||'';
    const par=v.slice(v.lastIndexOf('\n',a-2)+1,a-1),unclosed=par.lastIndexOf(open)>par.lastIndexOf(close);
    const opening=!prev||/[\s(\[{“‘「『—\-\/]/.test(prev)||(!/[\p{L}\p{N}]/u.test(prev)&&!unclosed);
    el.setSelectionRange(a-1,a);
    if(opening&&roomAfter(next))put(el,open+close,1);else put(el,opening?open:close);
  };
  document.addEventListener('input',e=>{if(!e.isComposing)fix(e.target)},true);
  document.addEventListener('compositionend',e=>{const el=e.target;setTimeout(()=>fix(el),0)},true);
  document.addEventListener('keydown',e=>{
    const el=e.target;if(e.key!=='Enter'||e.isComposing||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||!el.matches||!el.matches('textarea.ktext,textarea.fval,textarea.zta,textarea.tlmemo,.widea textarea,textarea.nta')||el.readOnly)return;
    const v=el.value,a=el.selectionStart,nx=v[a];if(a!==el.selectionEnd||!REV[nx])return;
    const o=v.lastIndexOf(REV[nx],a-1),c=v.lastIndexOf(nx,a-1);if(o<0||c>o)return;      // 열고 닫는 글자 안에서만
    e.preventDefault();e.stopPropagation();el.setSelectionRange(a+1,a+1);put(el,'\n');      // 닫는 글자는 그대로 두고 아래 줄로
  },true);
})();
