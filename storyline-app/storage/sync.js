// GitHub 비공개 저장소 동기화 (Git 프로그램 없이 GitHub API 로)
//   저장소 안의 storyline/ 폴더에 작품 목록 · 앱 취향 · 작품 데이터를 올리고 받음 (자동 백업은 기기마다 따로)
//   파일마다 '마지막으로 맞춘 버전(sha)'을 기억해 두고, 어느 쪽이 바뀌었는지 보고 정함
//     한쪽만 바뀜 → 그쪽으로 맞춤
//     둘 다 바뀜   → 작품 목록은 합침 · 취향과 보기 상태는 이 기기 것 · 작품 글은 카드 단위로 합침 (storage/merge.js, 같은 글을 둘 다 고친 곳만 사용자가 고름)
//   평소에는 올리기만 자동(push) · 받기는 사용자가 누를 때만(sync). 다른 기기에서 고친 게 있는지는 check 로 확인만 함
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {atomicWrite}=require('./files');

const ROOT='storyline/';
const gitSha=t=>crypto.createHash('sha1').update(`blob ${Buffer.byteLength(t,'utf8')}\0`).update(t,'utf8').digest('hex');      // git 이 파일에 붙이는 지문과 같은 계산
const b64=t=>Buffer.from(t,'utf8').toString('base64');
const unb64=s=>Buffer.from(String(s).replace(/\s/g,''),'base64').toString('utf8');
const order=p=>p==='library.json'?0:p==='prefs.json'?1:2;      // 작품 목록을 먼저 맞춰야 새 작품의 파일을 받을 자리가 생김

class SyncError extends Error{constructor(msg,status){super(msg);this.status=status}}

function createSync({store,fetch,getConfig,statePath}){
  const readState=()=>{try{return JSON.parse(fs.readFileSync(statePath,'utf8'))}catch(e){return {}}};
  const writeState=st=>{try{atomicWrite(statePath,JSON.stringify(st,null,1))}catch(e){}};
  let running=null;

  async function api(cfg,method,p,body){
    const r=await fetch(`https://api.github.com/repos/${cfg.repo}${p}`,{method,headers:{
      Authorization:`Bearer ${cfg.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
      ...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch(e){}
    if(!r.ok){
      const msg=r.status===401?'토큰이 맞지 않아요':r.status===403?'토큰에 이 저장소 쓰기 권한이 없어요':r.status===404?'저장소를 찾을 수 없어요 (이름 · 토큰 권한 확인)':`GitHub 오류 ${r.status}${data&&data.message?': '+data.message:''}`;
      throw new SyncError(msg,r.status);
    }
    return data;
  }
  async function remoteTree(cfg){      // 저장소의 storyline/ 아래 파일 목록과 지문을 한 번에
    try{
      const t=await api(cfg,'GET',`/git/trees/${encodeURIComponent(cfg.branch)}?recursive=1`);
      const out={};for(const x of t.tree||[])if(x.type==='blob'&&x.path.startsWith(ROOT))out[x.path.slice(ROOT.length)]=x.sha;
      return {files:out,empty:false};
    }catch(e){
      if(e.status===409||e.status===404){      // 빈 저장소(409) · 아직 없는 브랜치(404): 저장소 자체가 있는지만 확인
        await api(cfg,'GET','');return {files:{},empty:e.status===409};
      }
      throw e;
    }
  }
  const getBlob=async(cfg,sha)=>unb64((await api(cfg,'GET',`/git/blobs/${sha}`)).content);
  async function put(cfg,rel,text,sha,empty){
    const body={message:`동기화${cfg.device?` (${cfg.device})`:''}: ${rel}`,content:b64(text),...(sha?{sha}:{}),...(empty?{}:{branch:cfg.branch})};
    const r=await api(cfg,'PUT',`/contents/${ROOT}${rel.split('/').map(encodeURIComponent).join('/')}`,body);
    return r.content.sha;
  }

  async function pass(cfg,st,res,trust,pushOnly){
    const {files:remote,empty}=await remoteTree(cfg);
    const base=st.files,hist=st.hist=st.hist||{};let changed=false;
    const setBase=(rel,sha)=>{base[rel]=sha;const h=(hist[rel]||[]).filter(x=>x!==sha);h.push(sha);hist[rel]=h.slice(-40)};      // 지나간 버전 지문도 기억

    const paths=[...new Set([...store.syncPaths(),...Object.keys(remote).filter(p=>p==='library.json'||p==='prefs.json')])].sort((a,b)=>order(a)-order(b));
    for(const rel of paths){
      if(rel.startsWith('works/')&&!store.syncPaths().includes(rel))continue;      // 그사이 목록에서 빠진(영구 삭제한) 작품
      const L=store.syncRead(rel),Ls=L!=null?gitSha(L):null,B=base[rel]||null;
      // GitHub 는 방금 올린 직후 잠깐 예전 목록을 줄 때가 있음: 저장소 쪽이 '이미 지나간 버전'이면 안 바뀐 걸로 봄 (안 그러면 가짜 충돌 · 사본 작품이 생김)
      //   단, 올리다 막힌 뒤(trust)엔 목록을 믿음: 누가 예전과 똑같은 내용을 새로 올린 것일 수 있음 (안 그러면 영영 못 올림)
      const R0=remote[rel]||null,Rs=!trust&&R0&&B&&R0!==B&&(hist[rel]||[]).includes(R0)?B:R0;
      if(Ls===Rs){if(Rs)setBase(rel,Rs);continue}
      const localCh=Ls!==B,remoteCh=Rs!==B;
      if(pushOnly){      // 올리기만: 다른 기기가 고친 파일은 받기 전까지 건드리지 않음 (덮어쓰면 그쪽 글이 사라짐) · 취향은 이 기기 것
        if(L==null||!localCh)continue;
        if(remoteCh&&Rs&&rel!=='prefs.json'){res.blocked.push(rel);continue}
        setBase(rel,await put(cfg,rel,L,Rs,empty));res.pushed.push(rel);continue;
      }
      if(remoteCh&&Rs&&(!localCh||Ls==null)){      // 받기
        const text=await getBlob(cfg,Rs);store.syncWrite(rel,text);setBase(rel,Rs);res.pulled.push(rel);changed=true;
        const after=store.syncRead(rel);      // 작품 목록처럼 합친 결과가 다르면 바로 올림
        if(after!=null&&gitSha(after)!==Rs){setBase(rel,await put(cfg,rel,after,Rs,empty));res.pushed.push(rel)}
        continue;
      }
      if(L==null)continue;      // 이 기기에 없는 파일: 저장소 쪽은 지우지 않음
      if(remoteCh&&Rs){      // 둘 다 바뀜
        const text=await getBlob(cfg,Rs);
        if(rel==='library.json'){store.syncWrite(rel,text);changed=true}      // 합침
        else if(/\/storyline\.json$/.test(rel)){
          let baseText=null;if(B)try{baseText=await getBlob(cfg,B)}catch(e){}      // 마지막으로 맞춘 버전: 누가 무엇을 바꿨는지 가르는 기준
          const m=store.syncConflict(rel,text,baseText);
          if(m){res.merged.push(rel);if(m.asks)res.conflicts.push({rel,name:m.name,asks:m.asks})}
          changed=true;
        }
        // 취향 · 보기 상태: 이 기기 것을 올림
        const now=store.syncRead(rel);
        setBase(rel,await put(cfg,rel,now,Rs,empty));res.pushed.push(rel);
        continue;
      }
      setBase(rel,await put(cfg,rel,L,Rs,empty));res.pushed.push(rel);changed=true;      // 올리기
    }
    return changed;
  }

  function begin(){
    const cfg=getConfig();
    if(!cfg||!cfg.repo||!cfg.token)return null;
    cfg.branch=cfg.branch||'main';
    let st=readState();
    if(st.repo!==cfg.repo||st.branch!==cfg.branch)st={repo:cfg.repo,branch:cfg.branch,files:{}};      // 저장소를 바꾸면 처음부터
    st.files=st.files||{};
    return {cfg,st};
  }
  const NOCFG={ok:false,error:'동기화 설정이 없어요',skipped:true};
  async function run(pushOnly){      // pushOnly: 올리기만 · 아니면 받기까지 (사용자가 누를 때)
    const b=begin();if(!b)return {...NOCFG};
    const {cfg,st}=b,res={ok:true,pulled:[],pushed:[],merged:[],conflicts:[],blocked:[]};
    try{
      let trust=false;
      for(let i=0;i<4;i++){      // 합치면 한 번 더 (새로 생긴 파일까지 올림)
        let again;res.blocked=[];
        try{again=await pass(cfg,st,res,trust,pushOnly)}
        catch(e){if(e.status===409||e.status===422){again=true;trust=true;continue}throw e}      // 그사이 다른 기기가 올림: 목록을 그대로 믿고 다시 비교
        if(!again||pushOnly)break;
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
      const {files:remote}=await remoteTree(cfg),hist=st.hist||{},local=new Set(store.syncPaths());
      const pending=Object.keys(remote).filter(rel=>{
        if(!/^works\/[\w-]+\/storyline\.json$/.test(rel))return false;      // 작품 글만 (보기 상태 · 취향 · 목록 순서는 알릴 거리 아님)
        const Rs=remote[rel],B=st.files[rel]||null;
        if(Rs===B||(B&&(hist[rel]||[]).includes(Rs)))return false;      // 이미 맞춘 버전 · 지나간 버전
        const L=local.has(rel)?store.syncRead(rel):null;return !(L!=null&&gitSha(L)===Rs);      // 이미 같은 글
      }).sort();
      st.checked=Date.now();writeState(st);
      if(!pending.length)return {ok:true,pending:[]};
      const sig=pending.map(r=>r+':'+remote[r]).join('|');
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
