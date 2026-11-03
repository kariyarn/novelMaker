// GitHub 비공개 저장소 동기화 (Git 프로그램 없이 GitHub API 로)
//   저장소 안의 storyline/ 폴더에 작품 목록 · 앱 취향 · 작품 데이터를 올리고 받음 (자동 백업은 기기마다 따로)
//   파일마다 '마지막으로 맞춘 버전(sha)'을 기억해 두고, 어느 쪽이 바뀌었는지 보고 정함
//     한쪽만 바뀜 → 그쪽으로 맞춤
//     둘 다 바뀜   → 작품 목록은 합침 · 취향과 보기 상태는 이 기기 것 · 작품 글은 카드 단위로 합침 (storage/merge.js, 같은 글을 둘 다 고친 곳만 사용자가 고름)
//   평소에는 올리기만 자동(push) · 받기는 사용자가 누를 때만(sync). 다른 기기에서 고친 게 있는지는 check 로 확인만 함
//     (작품 목록만은 올릴 때도 합침: 새 작품이 다른 기기 목록에 실려야 그쪽에서 받을 수 있음)
//
// 주고받는 방식 (요청을 적게 · 한 번에)
//   1) 브랜치가 가리키는 커밋 번호만 물어봄 → 기억해 둔 것과 같으면 다른 기기가 고친 게 없음 (파일 목록도 안 받음)
//   2) 바뀌었으면 그 '커밋 번호'로 파일 목록을 받음: 커밋 번호로 받은 목록은 바뀌지 않으니 예전 목록이 올 일이 없음
//   3) 받을 파일은 한꺼번에 받고, 합치기는 이 기기 안에서 다 끝냄
//   4) 올릴 파일은 모아서 커밋 하나로: 브랜치를 옮길 때 그사이 다른 기기가 먼저 올렸으면 GitHub 가 거절 → 그때만 처음부터 다시
const fs=require('fs'),crypto=require('crypto');
const {atomicWrite}=require('./files');
const {logError}=require('./log');

const ROOT='storyline/',LIB='library.json',PREFS='prefs.json';
const gitSha=t=>crypto.createHash('sha1').update(`blob ${Buffer.byteLength(t,'utf8')}\0`).update(t,'utf8').digest('hex');      // git 이 파일에 붙이는 지문과 같은 계산
const b64=t=>Buffer.from(t,'utf8').toString('base64');
const unb64=s=>Buffer.from(String(s).replace(/\s/g,''),'base64').toString('utf8');
const order=p=>p===LIB?0:p===PREFS?1:2;
const isWork=rel=>/\/storyline\.json$/.test(rel);
async function pmap(list,fn,n=6){      // 동시에 n 개씩
  let i=0;await Promise.all(Array.from({length:Math.min(n,list.length)},async()=>{while(i<list.length)await fn(list[i++])}));
}

class SyncError extends Error{constructor(msg,status){super(msg);this.status=status}}

function createSync({store,fetch,getConfig,statePath,wait=ms=>new Promise(r=>setTimeout(r,ms))}){
  const readState=()=>{try{return JSON.parse(fs.readFileSync(statePath,'utf8'))}catch(e){return {}}};
  const writeState=st=>{try{atomicWrite(statePath,JSON.stringify(st,null,1))}catch(e){logError('동기화 상태 저장',e)}};
  let running=null;

  async function api(cfg,method,p,body){
    const r=await fetch(`https://api.github.com/repos/${cfg.repo}${p}`,{method,cache:'no-store',headers:{      // no-store: GitHub 응답은 60초 재사용 표시가 붙어 와서, 그대로 두면 예전 목록을 다시 씀
      Authorization:`Bearer ${cfg.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
      ...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch(e){}
    if(!r.ok){
      const msg=r.status===401?'토큰이 맞지 않아요':r.status===403?'토큰에 이 저장소 쓰기 권한이 없어요':r.status===404?'저장소를 찾을 수 없어요 (이름 · 토큰 권한 확인)':`GitHub 오류 ${r.status}${data&&data.message?': '+data.message:''}`;
      throw new SyncError(msg,r.status);
    }
    return data;
  }
  const refPath=cfg=>`/git/refs/heads/${cfg.branch.split('/').map(encodeURIComponent).join('/')}`;

  /* 저장소 쪽 상태: 커밋 번호 · 파일 목록(지문). 커밋이 안 바뀌었으면 기억해 둔 목록을 그대로 씀 */
  async function remote(cfg,st){
    let ref;
    try{ref=await api(cfg,'GET',refPath(cfg).replace('/git/refs/','/git/ref/'))}
    catch(e){
      if(e.status===409||e.status===404){      // 빈 저장소(409) · 아직 없는 브랜치(404): 저장소 자체가 있는지만 확인
        await api(cfg,'GET','');return {head:null,treeSha:null,files:{},empty:e.status===409};
      }
      throw e;
    }
    let head=ref.object.sha;
    if(st.head&&head!==st.head&&(st.seen||[]).includes(head))head=st.head;      // 이미 지나온 커밋을 가리키면(늦게 반영된 응답) 안 바뀐 걸로
    if(head===st.head&&st.remote&&st.treeSha)return {head,treeSha:st.treeSha,files:{...st.remote}};
    const t=await api(cfg,'GET',`/git/trees/${head}?recursive=1`);
    const files={};for(const x of t.tree||[])if(x.type==='blob'&&x.path.startsWith(ROOT))files[x.path.slice(ROOT.length)]=x.sha;
    return {head,treeSha:t.sha,files};
  }
  function remember(st,R){      // 맞춘 커밋을 기억 (seen: 지나온 커밋들 — 브랜치가 잠깐 이 중 하나를 가리켜도 예전 걸로 되돌리지 않게)
    st.head=R.head;st.treeSha=R.treeSha;st.remote=R.files;
    if(R.head)st.seen=[...(st.seen||[]).filter(x=>x!==R.head),R.head].slice(-50);
  }
  /* 모은 파일을 커밋 하나로 올림. 그사이 다른 기기가 먼저 올렸으면 422 (처음부터 다시) */
  async function commit(cfg,R,out){
    const rels=Object.keys(out).sort((a,b)=>order(a)-order(b));
    const message=`동기화${cfg.device?` (${cfg.device})`:''}: ${rels.length===1?rels[0]:`${rels[0]} 외 ${rels.length-1}개`}`;
    const tree=await api(cfg,'POST','/git/trees',{...(R.treeSha?{base_tree:R.treeSha}:{}),tree:rels.map(rel=>({path:ROOT+rel,mode:'100644',type:'blob',content:out[rel]}))});
    const c=await api(cfg,'POST','/git/commits',{message,tree:tree.sha,parents:R.head?[R.head]:[]});
    if(R.head)await api(cfg,'PATCH',refPath(cfg),{sha:c.sha,force:false});
    else await api(cfg,'POST','/git/refs',{ref:`refs/heads/${cfg.branch}`,sha:c.sha});
    const files={...R.files};for(const rel of rels)files[rel]=gitSha(out[rel]);
    return {head:c.sha,treeSha:tree.sha,files,rels};
  }
  /* 빈 저장소엔 커밋 API 가 안 됨: 작품 목록 하나만 예전 방식으로 올려 첫 커밋을 만듦 */
  async function seed(cfg){
    const text=store.syncRead(LIB);
    await api(cfg,'PUT',`/contents/${ROOT}${LIB}`,{message:`동기화${cfg.device?` (${cfg.device})`:''}: ${LIB}`,content:b64(text)});
  }

  /* 한 바퀴: 이 기기에서 받기 · 합치기를 끝내고, 올릴 파일을 모아서 돌려줌 */
  async function pass(cfg,st,R,res,pushOnly,cache){
    const remoteF=R.files,base=st.files,out={};
    const blob=async sha=>{if(!cache.has(sha))cache.set(sha,unb64((await api(cfg,'GET',`/git/blobs/${sha}`)).content));return cache.get(sha)};
    const look=rel=>{const L=store.syncRead(rel),Ls=L!=null?gitSha(L):null,Rs=remoteF[rel]||null,B=base[rel]||null;return {rel,L,Ls,Rs,B,localCh:Ls!==B,remoteCh:Rs!==B}};
    async function step(d){
      const {rel,L,Ls,Rs,localCh,remoteCh}=d;
      if(Ls===Rs){if(Rs)base[rel]=Rs;return}
      if(pushOnly){      // 올리기만: 다른 기기가 고친 파일은 받기 전까지 건드리지 않음 (덮어쓰면 그쪽 글이 사라짐) · 취향은 이 기기 것
        if(L==null||!localCh)return;
        if(remoteCh&&Rs&&rel===LIB){store.syncWrite(rel,await blob(Rs));base[rel]=Rs;out[rel]=store.syncRead(rel);return}      // 작품 목록은 합쳐도 잃는 게 없음: 막으면 새 작품이 다른 기기에 영영 안 보임
        if(remoteCh&&Rs&&rel!==PREFS){res.blocked.push(rel);return}
        out[rel]=L;return;
      }
      if(remoteCh&&Rs&&(!localCh||L==null)){      // 받기
        store.syncWrite(rel,await blob(Rs));base[rel]=Rs;res.pulled.push(rel);
        const after=store.syncRead(rel);if(after!=null&&gitSha(after)!==Rs)out[rel]=after;      // 작품 목록처럼 합친 결과가 다르면 올림
        return;
      }
      if(L==null)return;      // 이 기기에 없는 파일: 저장소 쪽은 지우지 않음
      if(remoteCh&&Rs){      // 둘 다 바뀜
        const text=await blob(Rs);
        if(rel===LIB)store.syncWrite(rel,text);      // 합침
        else if(isWork(rel)){
          let baseText=null;if(d.B)try{baseText=await blob(d.B)}catch(e){logError('동기화: 지난 버전 받기',e)}      // 마지막으로 맞춘 버전: 누가 무엇을 바꿨는지 가르는 기준
          const m=store.syncConflict(rel,text,baseText);
          if(m){res.merged.push(rel);if(m.asks)res.conflicts.push({rel,name:m.name,asks:m.asks})}
        }
        base[rel]=Rs;out[rel]=store.syncRead(rel);      // 취향 · 보기 상태: 이 기기 것을 올림
        return;
      }
      out[rel]=L;      // 올리기
    }
    // 작품 목록 · 취향 먼저: 목록을 맞춰야 새 작품의 파일을 받을 자리가 생김
    for(const rel of [LIB,PREFS])await step(look(rel));
    const libBefore=store.syncRead(LIB);
    // 작품 파일: 필요한 것을 한꺼번에 받아 두고 차례로 맞춤
    const ds=store.syncPaths().filter(rel=>rel.startsWith('works/')).map(look);
    if(!pushOnly){
      const need=new Set();
      for(const d of ds)if(d.Ls!==d.Rs&&d.remoteCh&&d.Rs){need.add(d.Rs);if(d.localCh&&d.L!=null&&d.B&&isWork(d.rel))need.add(d.B)}
      await pmap([...need],async sha=>{try{await blob(sha)}catch(e){if(!cache.has(sha))logError('동기화: 미리 받기',e)}});
    }
    for(const d of ds)await step(d);
    if(!pushOnly){      // 합치는 동안 작품 목록이 또 바뀌었으면(수정 시각 등) 같이 올림
      const lt=store.syncRead(LIB);if(lt!=null&&lt!==libBefore)out[LIB]=lt;
    }
    return out;
  }

  function begin(){
    const cfg=getConfig();
    if(!cfg||!cfg.repo||!cfg.token)return null;
    cfg.branch=cfg.branch||'main';
    let st=readState();
    if(st.repo!==cfg.repo||st.branch!==cfg.branch)st={repo:cfg.repo,branch:cfg.branch,files:{}};      // 저장소를 바꾸면 처음부터
    st.files=st.files||{};delete st.hist;      // hist: 예전 방식의 흔적
    return {cfg,st};
  }
  const NOCFG={ok:false,error:'동기화 설정이 없어요',skipped:true};
  async function run(pushOnly){      // pushOnly: 올리기만 · 아니면 받기까지 (사용자가 누를 때)
    const b=begin();if(!b)return {...NOCFG};
    const {cfg,st}=b,res={ok:true,pulled:[],pushed:[],merged:[],conflicts:[],blocked:[]},cache=new Map();
    try{
      for(let i=0;;i++){
        const R=await remote(cfg,st);
        if(R.empty){if(i>2)throw new SyncError('빈 저장소에 처음 올리지 못했어요');await seed(cfg);continue}
        res.blocked=[];
        const out=await pass(cfg,st,R,res,pushOnly,cache);
        if(!Object.keys(out).length){remember(st,R);break}
        try{
          const N=await commit(cfg,R,out);
          remember(st,R);remember(st,N);for(const rel of N.rels)st.files[rel]=N.files[rel];res.pushed.push(...N.rels);break;
        }catch(e){
          if((e.status===409||e.status===422)&&i<4){await wait(300*(i+1));continue}      // 그사이 다른 기기가 올림: 처음부터 다시 (받은 · 합친 건 그대로 남아 있음)
          throw e;
        }
      }
      st.last=Date.now();writeState(st);
    }catch(e){writeState(st);return {...res,ok:false,error:e.message||String(e)}}
    return res;
  }
  /* 다른 기기에서 고친 작품 글이 있는지 확인만 (받지 않음): 어느 기기에서 · 언제 */
  async function check(){
    const b=begin();if(!b)return {...NOCFG};
    const {cfg,st}=b;
    try{
      const R=await remote(cfg,st),local=new Set(store.syncPaths());
      if(R.empty)return {ok:true,pending:[]};
      const pending=Object.keys(R.files).filter(rel=>{
        if(!/^works\/[\w-]+\/storyline\.json$/.test(rel))return false;      // 작품 글만 (보기 상태 · 취향 · 목록 순서는 알릴 거리 아님)
        const Rs=R.files[rel];if(Rs===(st.files[rel]||null))return false;      // 이미 맞춘 버전
        const L=local.has(rel)?store.syncRead(rel):null;return !(L!=null&&gitSha(L)===Rs);      // 이미 같은 글
      }).sort();
      remember(st,R);      // 저장소 목록을 기억해 둠: 그대로면 다음 확인은 요청 하나로 (맞춘 버전은 따로라 받기 전엔 계속 알림)
      st.checked=Date.now();writeState(st);
      if(!pending.length)return {ok:true,pending:[]};
      const sig=pending.map(r=>r+':'+R.files[r]).join('|');
      let at=null,from=null;
      try{const cs=await api(cfg,'GET',`/commits?sha=${encodeURIComponent(cfg.branch)}&path=${encodeURIComponent(ROOT+pending[0])}&per_page=1`);
        const c=Array.isArray(cs)&&cs[0]&&cs[0].commit;if(c){at=Date.parse(c.author&&c.author.date||c.committer&&c.committer.date)||null;const m=/^동기화 \((.+?)\):/.exec(c.message||'');from=m?m[1]:null}}catch(e){}
      const ids=pending.map(r=>r.split('/')[1]);
      return {ok:true,pending,ids,sig,at,from,dismissed:st.dismissed===sig};
    }catch(e){return {ok:false,error:e.message||String(e)}}
  }
  const dismiss=sig=>{const st=readState();st.dismissed=sig;writeState(st)};      // '나중에': 같은 내용으로는 다시 묻지 않음
  // 동시에 두 번 돌지 않게: 차례로
  let chain=Promise.resolve();
  const serial=fn=>{const p=chain.then(fn,fn);chain=p.catch(()=>{});return p};
  const now=()=>running||(running=serial(()=>run(false)).finally(()=>{running=null}));
  const push=()=>serial(()=>run(true));
  const checkNow=()=>serial(check);
  const lastSync=()=>readState().last||0;
  return {sync:now,push,check:checkNow,dismiss,lastSync};
}
module.exports={createSync,gitSha};
