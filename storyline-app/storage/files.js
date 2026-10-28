// 파일 다루기 도구: 원자적 쓰기, (압축) 읽기, 폴더 훑기 — 저장소의 다른 모듈이 함께 씀
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const {logError}=require('./log');

const valid=t=>{try{const o=JSON.parse(t);return o&&typeof o==='object'?o:null}catch(e){return null}};
const okState=o=>o&&Array.isArray(o.characters)&&Array.isArray(o.cards);

function atomicWrite(file,data){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const tmp=file+'.tmp-'+process.pid;
  const fd=fs.openSync(tmp,'w');
  try{fs.writeSync(fd,data);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
  fs.renameSync(tmp,file);
}
const stamp=d=>{const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`};
const readText=p=>{const b=fs.readFileSync(p);return (p.endsWith('.gz')?zlib.gunzipSync(b):b).toString('utf8')};
const readJson=(p,pred)=>{try{const o=valid(readText(p));return o&&(!pred||pred(o))?o:null}catch(e){return null}};
const scan=(dir,re)=>{const out=[];try{for(const n of fs.readdirSync(dir))if(re.test(n)){const p=path.join(dir,n);try{out.push({p,m:fs.statSync(p).mtimeMs})}catch(e){}}}catch(e){}return out};
const rm=p=>{try{fs.rmSync(p,{recursive:true,force:true})}catch(e){logError('지우기 '+p,e)}};

module.exports={valid,okState,atomicWrite,stamp,readText,readJson,scan,rm};
