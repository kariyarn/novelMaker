// GitHub 비공개 저장소 동기화 (Git 프로그램 없이 GitHub API 로)
//   저장소 안의 storyline/ 폴더에 작품 목록 · 앱 취향 · 작품 데이터를 올리고 받음 (자동 백업은 기기마다 따로)
//   파일마다 '마지막으로 맞춘 버전(sha)'을 기억해 두고, 어느 쪽이 바뀌었는지 보고 정함
//     한쪽만 바뀜 → 그쪽으로 맞춤
//     둘 다 바뀜   → 작품 목록은 합침 · 취향과 보기 상태는 이 기기 것 · 작품 글은 이 기기 것을 두고 다른 기기 것은 사본 작품으로 남김 (지우는 것 없음)
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
    const body={message:`동기화: ${rel}`,content:b64(text),...(sha?{sha}:{}),...(empty?{}:{branch:cfg.branch})};
    const r=await api(cfg,'PUT',`/contents/${ROOT}${rel.split('/').map(encodeURIComponent).join('/')}`,body);
    return r.content.sha;
  }

  async function pass(cfg,st,res){
    const {files:remote,empty}=await remoteTree(cfg);
    const base=st.files;let changed=false;
    const paths=[...new Set([...store.syncPaths(),...Object.keys(remote).filter(p=>p==='library.json'||p==='prefs.json')])].sort((a,b)=>order(a)-order(b));
    for(const rel of paths){
      if(rel.startsWith('works/')&&!store.syncPaths().includes(rel))continue;      // 그사이 목록에서 빠진(영구 삭제한) 작품
      const L=store.syncRead(rel),Ls=L!=null?gitSha(L):null,Rs=remote[rel]||null,B=base[rel]||null;
      if(Ls===Rs){if(Rs)base[rel]=Rs;continue}
      const localCh=Ls!==B,remoteCh=Rs!==B;
      if(remoteCh&&Rs&&(!localCh||Ls==null)){      // 받기
        const text=await getBlob(cfg,Rs);store.syncWrite(rel,text);base[rel]=Rs;res.pulled.push(rel);changed=true;
        const after=store.syncRead(rel);      // 작품 목록처럼 합친 결과가 다르면 바로 올림
        if(after!=null&&gitSha(after)!==Rs){base[rel]=await put(cfg,rel,after,Rs,empty);res.pushed.push(rel)}
        continue;
      }
      if(L==null)continue;      // 이 기기에 없는 파일: 저장소 쪽은 지우지 않음
      if(remoteCh&&Rs){      // 둘 다 바뀜
        const text=await getBlob(cfg,Rs);
        if(rel==='library.json'){store.syncWrite(rel,text);changed=true}      // 합침
        else if(/\/storyline\.json$/.test(rel)){const name=store.syncConflict(rel,text);if(name)res.conflicts.push(name);changed=true}
        // 취향 · 보기 상태: 이 기기 것을 올림
        const now=store.syncRead(rel);
        base[rel]=await put(cfg,rel,now,Rs,empty);res.pushed.push(rel);
        continue;
      }
      base[rel]=await put(cfg,rel,L,Rs,empty);res.pushed.push(rel);changed=true;      // 올리기
    }
    return changed;
  }

  async function run(){
    const cfg=getConfig();
    if(!cfg||!cfg.repo||!cfg.token)return {ok:false,error:'동기화 설정이 없어요',skipped:true};
    cfg.branch=cfg.branch||'main';
    let st=readState();
    if(st.repo!==cfg.repo||st.branch!==cfg.branch)st={repo:cfg.repo,branch:cfg.branch,files:{}};      // 저장소를 바꾸면 처음부터
    st.files=st.files||{};
    const res={ok:true,pulled:[],pushed:[],conflicts:[]};
    try{
      for(let i=0;i<4;i++){      // 합치거나 사본을 만들면 한 번 더 (새로 생긴 파일까지 올림)
        let again;
        try{again=await pass(cfg,st,res)}
        catch(e){if(e.status===409||e.status===422){again=true;continue}throw e}      // 그사이 다른 기기가 올림: 다시 비교
        if(!again)break;
      }
      st.last=Date.now();writeState(st);
    }catch(e){writeState(st);return {...res,ok:false,error:e.message||String(e)}}
    return res;
  }
  // 동시에 두 번 돌지 않게
  const now=()=>running||(running=run().finally(()=>{running=null}));
  const lastSync=()=>readState().last||0;
  return {sync:now,lastSync};
}
module.exports={createSync,gitSha};
