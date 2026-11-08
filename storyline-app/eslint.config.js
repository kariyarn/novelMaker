// 코드 검사 (npm run lint)
// 화면 코드(src/)는 모듈이 아닌 일반 <script> 라서 파일끼리 전역 이름을 나눠 씀.
// 그래서 index.html · note/note.html 에 적힌 파일들을 읽어 맨 위에 선언된 이름을 모아 전역으로 알려 줌
// → 오타 난 이름 · 지워진 함수를 부르는 곳(no-undef)을 잡을 수 있음. 새 파일을 index.html 에 넣으면 저절로 따라옴
const fs=require('fs'),path=require('path');
const espree=require('espree');
const globals=require('globals');
const js=require('@eslint/js');

const ES={ecmaVersion:'latest',sourceType:'script'};
function scriptsOf(html){      // html 이 불러오는 .js 파일 (앱 폴더 기준 경로)
  const dir=path.dirname(html);
  return [...fs.readFileSync(html,'utf8').matchAll(/<script\s+src="([^"]+)"/g)].map(m=>path.relative(__dirname,path.join(dir,m[1])).split(path.sep).join('/'));
}
function namesOf(pattern,out){      // const {a,b:[c]}=… 같은 모양에서 이름만
  if(!pattern)return;
  if(pattern.type==='Identifier')out.push(pattern.name);
  else if(pattern.type==='ObjectPattern')pattern.properties.forEach(p=>namesOf(p.type==='RestElement'?p.argument:p.value,out));
  else if(pattern.type==='ArrayPattern')pattern.elements.forEach(e=>namesOf(e,out));
  else if(pattern.type==='RestElement')namesOf(pattern.argument,out);
  else if(pattern.type==='AssignmentPattern')namesOf(pattern.left,out);
}
function topNames(files){      // 파일들 맨 위에 선언된 이름 → {이름: 'writable'}
  const g={};
  for(const f of files){
    let ast;try{ast=espree.parse(fs.readFileSync(path.join(__dirname,f),'utf8'),ES)}catch(e){continue}      // 문법 오류는 lint 가 따로 알려 줌
    for(const n of ast.body){
      const out=[];
      if(n.type==='FunctionDeclaration'||n.type==='ClassDeclaration')out.push(n.id.name);
      else if(n.type==='VariableDeclaration')n.declarations.forEach(d=>namesOf(d.id,out));
      out.forEach(x=>{g[x]='writable'});
    }
  }
  return g;
}
const mainFiles=scriptsOf(path.join(__dirname,'index.html'));
const noteFiles=scriptsOf(path.join(__dirname,'note','note.html'));

const shared={
  'no-unused-vars':['warn',{vars:'local',args:'none',caughtErrors:'none'}],      // 맨 위 이름은 다른 파일이 쓰니까 안 따짐
  'no-empty':['error',{allowEmptyCatch:true}],
  'no-redeclare':['error',{builtinGlobals:false}],
  'no-cond-assign':['error','except-parens'],
  'no-control-regex':'off',
  'no-misleading-character-class':'off',
  'no-useless-escape':'off',
  'no-prototype-builtins':'off',
};

module.exports=[
  {ignores:['node_modules/**','dist/**','sync/**']},
  js.configs.recommended,
  {rules:shared},
  {      // 큰 창 화면 코드
    files:mainFiles,
    languageOptions:{...ES,globals:{...globals.browser,...topNames(mainFiles),nativeStore:'readonly',appShell:'readonly'}},
  },
  {      // 포스트잇 창 화면 코드
    files:noteFiles,
    languageOptions:{...ES,globals:{...globals.browser,...topNames(noteFiles),noteApi:'readonly'}},
  },
  {      // Electron 메인 · 저장소 · 도구 · 테스트 (Node)
    files:['*.js','storage/**/*.js','tools/**/*.js','test/**/*.js','note/preload.js'],
    ignores:mainFiles,
    languageOptions:{ecmaVersion:'latest',sourceType:'commonjs',globals:{...globals.node}},
  },
  {      // E2E: Node 에서 돌지만 win.evaluate(() => …) 안은 화면에서 돌아서 화면 이름도 씀
    files:['e2e/**/*.js'],
    languageOptions:{ecmaVersion:'latest',sourceType:'commonjs',globals:{...globals.node,...globals.browser,...topNames(mainFiles)}},
  },
];
