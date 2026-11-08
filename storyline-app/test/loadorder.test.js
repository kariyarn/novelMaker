// 화면 코드 불러오는 순서 검사
// src/ 는 일반 <script> 라서 파일 맨 위에서 바로 실행되는 코드는 '앞쪽 파일'에 있는 이름만 쓸 수 있음.
// 뒤쪽 파일의 이름을 쓰면 앱이 켜질 때 바로 멈추므로, index.html · note/note.html 순서대로 읽어서 미리 잡아냄
const test=require('node:test');
const assert=require('node:assert');
const fs=require('fs'),path=require('path');
const espree=require('espree');

const APP=path.join(__dirname,'..');
const ES={ecmaVersion:'latest',sourceType:'script',loc:true};
const scriptsOf=html=>[...fs.readFileSync(html,'utf8').matchAll(/<script\s+src="([^"]+)"/g)].map(m=>path.join(path.dirname(html),m[1]));
const isFn=n=>n&&/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(n.type);
function declNames(p,out){
  if(!p)return;
  if(p.type==='Identifier')out.push(p.name);
  else if(p.type==='ObjectPattern')p.properties.forEach(q=>declNames(q.type==='RestElement'?q.argument:q.value,out));
  else if(p.type==='ArrayPattern')p.elements.forEach(e=>declNames(e,out));
  else if(p.type==='RestElement')declNames(p.argument,out);
  else if(p.type==='AssignmentPattern')declNames(p.left,out);
}
function topDecls(ast){
  const out=[];
  for(const n of ast.body){
    if(n.type==='FunctionDeclaration'||n.type==='ClassDeclaration')out.push(n.id.name);
    else if(n.type==='VariableDeclaration')n.declarations.forEach(d=>declNames(d.id,out));
  }
  return out;
}
// 함수 몸통 밖(= 파일을 읽자마자 실행되는 곳)에서 쓰는 이름
function eagerRefs(ast){
  const refs=[];
  const walk=(n,parent,key)=>{
    if(!n||typeof n.type!=='string')return;
    if(isFn(n))return;      // 함수 안은 나중에 불리니 상관없음
    if(n.type==='Identifier'){
      if(parent&&parent.type==='MemberExpression'&&key==='property'&&!parent.computed)return;
      if(parent&&(parent.type==='Property'||parent.type==='PropertyDefinition'||parent.type==='MethodDefinition')&&key==='key'&&!parent.computed)return;
      if(parent&&parent.type==='VariableDeclarator'&&key==='id')return;
      if(parent&&(parent.type==='LabeledStatement'||parent.type==='BreakStatement'||parent.type==='ContinueStatement'))return;
      refs.push({name:n.name,line:n.loc.start.line});return;
    }
    for(const k of Object.keys(n)){
      if(k==='loc'||k==='range'||k==='parent')continue;
      const v=n[k];
      if(Array.isArray(v))v.forEach(c=>walk(c,n,k));
      else if(v&&typeof v.type==='string')walk(v,n,k);
    }
  };
  ast.body.forEach(n=>walk(n,null,null));
  return refs;
}

for(const page of ['index.html','note/note.html']){
  test(`${page}: 파일 맨 위 코드가 뒤쪽 파일의 이름을 쓰지 않음`,()=>{
    const files=scriptsOf(path.join(APP,page)).map(f=>({f,ast:espree.parse(fs.readFileSync(f,'utf8'),ES)}));
    const where={};      // 이름 → 처음 선언된 파일 번호
    files.forEach(({ast},i)=>topDecls(ast).forEach(n=>{if(!(n in where))where[n]=i}));
    const bad=[];
    files.forEach(({f,ast},i)=>{
      for(const r of eagerRefs(ast))if(where[r.name]>i)bad.push(`${path.relative(APP,f)}:${r.line} 의 '${r.name}' 은(는) 뒤쪽 ${path.relative(APP,files[where[r.name]].f)} 에 있어요`);
    });
    assert.deepEqual(bad,[]);
  });
}
