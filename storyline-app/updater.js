// 앱 코드 자동 업데이트: GitHub 릴리스에 함께 올라간 앱 코드 묶음(app-code.json.gz)을 받아 두면, 다음에 켤 때 launcher.js 가 새 코드로 켬
// 설치 파일(100MB 넘음)을 다시 받지 않아도 됨. Electron 자체를 올려야 하는 버전만 설치 파일을 새로 받으라고 안내
const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto');
const REPO='kariyarn/novelMaker',ASSET='app-code.json.gz';
const RELEASES=`https://github.com/${REPO}/releases/latest`;
const buildOf=v=>{const m=/^\d+\.\d+\.(\d+)$/.exec(String(v||''));return m?+m[1]:0};      // 1.0.<빌드 번호>
const tagBuild=t=>{const m=/^build-(\d+)$/.exec(String(t||''));return m?+m[1]:0};
const safeRel=p=>typeof p==='string'&&p&&!path.isAbsolute(p)&&!p.split(/[\\/]/).some(s=>s===''||s==='.'||s==='..');

// 묶음 읽기: {version, minElectron, files:{상대 경로: base64}} 를 gzip 한 것. 꼭 있어야 하는 파일이 없으면 null
function readBundle(buf){
  let o;try{o=JSON.parse(zlib.gunzipSync(buf).toString('utf8'))}catch(e){return null}
  if(!o||!buildOf(o.version)||!o.files||typeof o.files!=='object')return null;
  const names=Object.keys(o.files);
  if(!names.every(safeRel)||!['main.js','index.html','preload.js','package.json'].every(n=>names.includes(n)))return null;
  return o;
}
// 묶음을 폴더에 풀기: 임시 폴더에 다 쓴 뒤 이름을 바꿈 (반쯤 쓴 폴더가 남지 않게)
function writeBundle(root,name,o){
  const fin=path.join(root,name),tmp=fin+'.tmp';
  fs.rmSync(tmp,{recursive:true,force:true});
  for(const [rel,b64] of Object.entries(o.files)){const p=path.join(tmp,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,Buffer.from(b64,'base64'))}
  fs.rmSync(fin,{recursive:true,force:true});fs.renameSync(tmp,fin);
  return fin;
}

function createUpdater({fetch,dir,bundled,running,electron,keep}){      // keep: 지금 켜져 있는 새 코드 폴더 (지우면 안 됨)
  const CUR=path.join(dir,'current.json');
  const readCur=()=>{try{return JSON.parse(fs.readFileSync(CUR,'utf8'))}catch(e){return null}};
  const st={checking:false,last:0,latest:null,ready:null,needInstaller:false,error:null};
  const info=()=>({bundled,running,latest:st.latest,ready:st.ready,needInstaller:st.needInstaller,error:st.error,last:st.last,checking:st.checking,releases:RELEASES,dev:!buildOf(bundled)});
  let pending=null;
  function check(){      // 확인 중에 또 부르면 같은 결과를 기다림
    if(!buildOf(bundled))return Promise.resolve({...info(),error:'개발용으로 켠 앱이라 업데이트를 확인하지 않아요'});      // npm start 등: 버전 번호가 없음
    if(!pending){st.checking=true;st.error=null;pending=run().finally(()=>{st.checking=false;pending=null})}
    return pending.then(info);
  }
  async function run(){
    try{
      const r=await fetch(`https://api.github.com/repos/${REPO}/releases/latest`,{headers:{Accept:'application/vnd.github+json','User-Agent':'storyline-app'}});
      if(!r.ok)throw new Error('릴리스 정보를 받지 못했어요 ('+r.status+')');
      const rel=await r.json(),n=tagBuild(rel.tag_name);st.last=Date.now();
      if(!n)throw new Error('릴리스 이름을 알아볼 수 없어요');
      st.latest=n;
      if(n<=buildOf(running)){st.needInstaller=false;return}      // 이미 최신
      const cur=readCur();
      if(cur&&buildOf(cur.version)===n){
        if((cur.tries||0)>=3){st.error='새 버전을 켜지 못해서 설치본으로 쓰고 있어요';return}      // 망가진 버전은 다시 받지 않음
        st.ready=n;return;
      }
      const a=(rel.assets||[]).find(x=>x.name===ASSET);
      if(!a){st.needInstaller=true;return}      // 코드 묶음이 없는 릴리스: 설치 파일로
      const res=await fetch(a.browser_download_url,{headers:{'User-Agent':'storyline-app'}});
      if(!res.ok)throw new Error('새 버전을 받지 못했어요 ('+res.status+')');
      const buf=Buffer.from(await res.arrayBuffer());
      if(a.digest&&/^sha256:/.test(a.digest)&&crypto.createHash('sha256').update(buf).digest('hex')!==a.digest.slice(7))throw new Error('받은 파일이 손상됐어요');
      const o=readBundle(buf);
      if(!o||buildOf(o.version)!==n)throw new Error('받은 파일을 읽을 수 없어요');
      if(o.minElectron&&+String(electron).split('.')[0]<o.minElectron){st.needInstaller=true;return}      // Electron 을 올려야 하는 버전
      fs.mkdirSync(dir,{recursive:true});
      const name='v'+n;writeBundle(dir,name,o);
      const t=CUR+'.tmp';fs.writeFileSync(t,JSON.stringify({version:o.version,dir:name,minElectron:o.minElectron||0,tries:0,at:Date.now()}));fs.renameSync(t,CUR);
      for(const d of fs.readdirSync(dir))if(/^v\d+(\.tmp)?$/.test(d)&&d!==name&&path.join(dir,d)!==keep)fs.rmSync(path.join(dir,d),{recursive:true,force:true});      // 지난 버전 정리 (지금 켜져 있는 것만 남김)
      st.ready=n;st.needInstaller=false;
      return;
    }catch(e){st.error=String(e&&e.message||e)}
  }
  return {check,info};
}
module.exports={createUpdater,readBundle,buildOf};
