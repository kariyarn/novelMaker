// 앱 코드 묶음 만들기 (CI 에서 릴리스에 함께 올림): dist/app-code.json.gz
// 설치본에 들어가는 파일과 같은 것들을 {version, minElectron, files:{상대 경로: base64}} 로 묶어 gzip — 앱의 updater.js 가 받아서 풂
// 사용: node tools/pack-code.js   (package.json 의 version 이 1.0.<빌드 번호> 로 바뀌어 있어야 함)
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const root=path.join(__dirname,'..');
const pkg=require(path.join(root,'package.json'));
const LIST=['main.js','updater.js','store.js','preload.js','index.html','package.json','storage','styles','src','note','build/icon.png'];      // launcher.js 는 설치본 것만 씀
const files={};
const add=rel=>{const p=path.join(root,rel);if(!fs.existsSync(p))throw new Error('없는 파일: '+rel);
  if(fs.statSync(p).isDirectory()){for(const n of fs.readdirSync(p))add(path.posix.join(rel,n));return}
  files[rel]=fs.readFileSync(p).toString('base64')};
LIST.forEach(add);
let ev;try{ev=require(path.join(root,'node_modules','electron','package.json')).version}catch(e){ev=String(pkg.devDependencies.electron).replace(/^\D*/,'')}
const out={version:pkg.version,minElectron:+ev.split('.')[0],files};
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
const gz=zlib.gzipSync(Buffer.from(JSON.stringify(out)),{level:9});
fs.writeFileSync(path.join(root,'dist','app-code.json.gz'),gz);
console.log(`app-code.json.gz: ${pkg.version} · Electron ${out.minElectron}+ · 파일 ${Object.keys(files).length}개 · ${(gz.length/1024).toFixed(0)}KB`);
