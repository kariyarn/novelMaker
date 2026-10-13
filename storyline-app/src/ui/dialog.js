/* 앱 안의 대화상자: 시스템 alert / confirm / prompt 대신 (앱 디자인과 맞추고 Esc · Enter 지원) */
function appDialog({msg,input,def,ok='확인',cancel='취소',danger=false}){return new Promise(res=>{
  const o=document.createElement('div');o.className='dlg';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');
  const b=document.createElement('div');b.className='dlgbox';
  const t=document.createElement('div');t.className='dlgmsg';t.textContent=keyText(msg);b.append(t);
  let i=null;if(input){i=document.createElement('input');i.className='dlgin';if(def)i.value=def;b.append(i)}
  const r=document.createElement('div');r.className='dlgrow';
  const prev=document.activeElement;
  const done=v=>{o.remove();document.removeEventListener('keydown',key,true);if(prev&&prev.focus&&document.contains(prev))try{prev.focus()}catch(e){}res(v)};
  const c=document.createElement('button');c.textContent=cancel;c.onclick=()=>done(input?null:false);
  const k=document.createElement('button');k.textContent=ok;k.className=danger?'on danger':'on';k.onclick=()=>done(input?i.value:true);
  if(cancel)r.append(c);r.append(k);b.append(r);o.append(b);
  o.addEventListener('mousedown',e=>{if(e.target===o)done(input?null:(cancel?false:true))});
  const key=e=>{if(e.isComposing)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done(input?null:(cancel?false:true))}
    else if(e.key==='Enter'&&(!input||document.activeElement===i)){e.preventDefault();e.stopPropagation();k.click()}
    else if(e.key==='Tab'){const f=[...b.querySelectorAll('button,input')],x=f.indexOf(document.activeElement);e.preventDefault();f[(x+(e.shiftKey?f.length-1:1))%f.length].focus()}};      // 포커스가 대화상자 밖으로 나가지 않게
  document.addEventListener('keydown',key,true);
  document.body.append(o);if(i){i.focus();if(def)i.select()}else k.focus();
})}
const askText=(msg,def)=>appDialog({msg,input:true,def});
const askConfirm=(msg,o={})=>appDialog({msg,ok:o.ok||'확인',danger:!!o.danger});
const notice=msg=>appDialog({msg,cancel:'',ok:'확인'});
