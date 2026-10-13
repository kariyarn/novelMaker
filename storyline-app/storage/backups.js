// 자동 백업(압축): 10분에 한 번, 최근 40개 + 90일 안의 하루 첫 백업을 남김
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const {valid,okState,atomicWrite,stamp,readText}=require('./files');
const {BK,bdirOf}=require('./layout');

function createBackups(dirs,now=Date.now){
  const lastBackup={};
  function backup(id,text){
    const t0=now();
    if(t0-(lastBackup[id]||0)<10*60*1000)return;
    lastBackup[id]=t0;
    const bd=bdirOf(dirs,id);
    try{
      atomicWrite(path.join(bd,'storyline-'+stamp(new Date())+'.json.gz'),zlib.gzipSync(Buffer.from(text,'utf8')));
      const files=fs.readdirSync(bd).filter(n=>BK.test(n)).sort().reverse();
      const keepDay=new Set();
      files.forEach((n,i)=>{
        const day=n.slice(10,18);
        const recent=i<40;                       // 최근 40개는 전부
        const firstOfDay=!keepDay.has(day);keepDay.add(day);
        const age=(t0-fs.statSync(path.join(bd,n)).mtimeMs)/864e5;
        if(!recent&&!(firstOfDay&&age<90))try{fs.unlinkSync(path.join(bd,n))}catch(e){}
      });
    }catch(e){}
  }
  function list(id){
    const bd=bdirOf(dirs,id);let names=[];try{names=fs.readdirSync(bd).filter(n=>BK.test(n))}catch(e){}
    return names.sort().reverse().map(n=>{
      const pth=path.join(bd,n);let st;try{st=fs.statSync(pth)}catch(e){return null}
      let ch=0,cd=0,ep=0,ok=false;
      try{const o=JSON.parse(readText(pth));ch=(o.characters||[]).length;cd=(o.cards||[]).length;ep=(o.episodes||[]).length;ok=Array.isArray(o.characters)&&Array.isArray(o.cards)}catch(e){}
      return {name:n,mtime:st.mtimeMs,size:st.size,chars:ch,cards:cd,eps:ep,ok};
    }).filter(Boolean);
  }
  function read(id,name){if(!BK.test(String(name)))return null;try{return readText(path.join(bdirOf(dirs,id),name))}catch(e){return null}}
  function force(id,text){const o=valid(text);if(!okState(o))return false;lastBackup[id]=0;backup(id,text);return true}
  const dir=id=>{const d=bdirOf(dirs,id);try{fs.mkdirSync(d,{recursive:true})}catch(e){}return d};
  return {backup,list,read,force,dir};
}
module.exports={createBackups};
