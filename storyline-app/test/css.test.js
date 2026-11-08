// CSS 정리 상태 지키기
//   (1) 화면 코드(src · index.html · note) 어디에도 없는 클래스만 쓰는 선택자 = 지운 화면의 찌꺼기
//   (2) 같은 맥락(@media 등) · 같은 선택자에서 뒤에 다시 적혀 덮이는 선언 = 읽는 사람만 헷갈리게 하는 죽은 줄
// 실패하면 그 줄을 지우면 돼요. 클래스 이름을 'k-'+kind 처럼 이어 붙여 만들면 앞부분('k-')이 코드에 있으니 살아 있는 걸로 봐요
const test=require('node:test');
const assert=require('node:assert');
const fs=require('fs'),path=require('path');
const postcss=require('postcss'),sp=require('postcss-selector-parser');

const APP=path.join(__dirname,'..');
const sheets=[...fs.readFileSync(path.join(APP,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):/\.(js|html)$/.test(e.name)?[path.join(d,e.name)]:[]);
const corpus=[...walk(path.join(APP,'src')),path.join(APP,'index.html'),...walk(path.join(APP,'note'))].map(f=>fs.readFileSync(f,'utf8')).join('\n');
const esc=t=>t.replace(/[.*+?^${}()|[\]\\-]/g,'\\$&');
const built=c=>{for(let i=1;i<c.length;i++)if(new RegExp('([\'"`\\s])'+esc(c.slice(0,i))+'([\'"]\\s*\\+|\\$\\{)').test(corpus))return true;return false};
const memo=new Map();
const used=c=>{if(!memo.has(c))memo.set(c,new RegExp('(^|[^\\w-])'+esc(c)+'($|[^\\w-])').test(corpus)||built(c));return memo.get(c)};
const ctxOf=n=>{const a=[];for(let p=n.parent;p&&p.type!=='root';p=p.parent)a.unshift(p.type==='atrule'?'@'+p.name+' '+p.params:p.selector);return a.join(' >> ')};
const inKeyframes=r=>r.parent.type==='atrule'&&/keyframes/.test(r.parent.name);
const parsed=sheets.map(f=>({f,root:postcss.parse(fs.readFileSync(path.join(APP,f),'utf8'),{from:f})}));
const selParts=sel=>{const out=[];sp(s=>s.each(x=>{const cls=[];x.walkClasses(c=>cls.push(c.value));out.push({text:String(x).trim().replace(/\s+/g,' '),cls})})).processSync(sel);return out};

test('CSS: 코드에 없는 클래스만 쓰는 선택자가 없음', ()=>{
  const bad=[];
  for(const {f,root} of parsed)root.walkRules(r=>{
    if(inKeyframes(r))return;
    for(const p of selParts(r.selector)){const miss=p.cls.filter(c=>!used(c));if(miss.length)bad.push(`${f}:${r.source.start.line} ${p.text}  (코드에 없음: .${miss.join(' .')})`)}
  });
  assert.deepEqual(bad,[]);
});

// 덮는 쪽 값이 이 Electron 에서 안 먹는 값이면 앞 줄이 대신 쓰여서 일부러 둔 것 (예외 목록)
const KEEP=new Set(['-webkit-backdrop-filter:none']);
test('CSS: 같은 선택자에서 뒤에 덮이는 선언이 없음', ()=>{
  const decls=[];
  for(const {f,root} of parsed)root.walkRules(r=>{
    if(inKeyframes(r))return;
    const key=ctxOf(r)+'|'+selParts(r.selector).map(p=>p.text).join(',');
    r.each(d=>{if(d.type==='decl')decls.push({f,d,key:key+'|'+d.prop.toLowerCase(),imp:!!d.important})});
  });
  const last=new Map(),bad=[];
  for(let i=decls.length-1;i>=0;i--){const x=decls[i],L=last.get(x.key);
    if(L&&(L.imp||!x.imp)&&!KEEP.has(L.d.prop+':'+L.d.value))bad.push(`${x.f}:${x.d.source.start.line} ${x.d.prop}:${x.d.value}  (덮음: ${L.f}:${L.d.source.start.line})`);
    if(!L||(x.imp&&!L.imp))last.set(x.key,x)}
  assert.deepEqual(bad,[]);
});
