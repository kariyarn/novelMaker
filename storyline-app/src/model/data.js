/* ============ 데이터 ============ */
const KEY='storyline_v1',UKEY='storyline_ui_v1';
const PAL=['#ff6b6b','#ff9f43','#34c759','#32ade6','#5e5ce6','#af52de','#a2845e'];
// 카드 분류 색: 포스트잇 파스텔
const KIND_PAL=['#d7c4ff','#bfe3ff','#ffd6a8','#ffc2d8','#d9d9de'];
const OLD_KIND_COL={scene:'#4f7cff',line:'#e08a00',memo:'#2e9e6b'};
// 보드 배경: [키, 이름, 색, 어두운 색인지]
const BOARDS=[['','테마 기본',null,false],['paper','미색','#efede8',false],['cork','코르크','#e2c99a',false],['mint','민트','#d9eadf',false],['sky','하늘','#d9e7f4',false],['lav','라벤더','#e4def2',false],['pink','핑크','#f3dfe6',false],['white','흰색','#ffffff',false],['slate','슬레이트','#2b2f36',true],['ink','먹색','#131315',true]];
const HOTKEYS=['','1','2','3','4','5','6','7','8','9','0','B','D','E','G','J','K','L','O','P','T','U'];      // ⌘+키 (⌘A/C/V/X/Z/S/N/F/R/W/Q/M/H 등 기본 단축키와 겹치는 글자는 뺌)
const NOTE_W={s:230,m:300,l:400},NOTE_MINH={s:0,m:190,l:290};
const defKinds=()=>[{id:'scene',name:'장면 · 대사',color:'#fff1a6',icon:'▣',key:'1'},{id:'memo',name:'메모',color:'#b9ecd2',icon:'✎',key:'2'}];
function defFields(){
  const f=(group,label,hint)=>({id:uid(),group,label,hint,value:''});
  return [
    f('아비투스 · 세 자본','경제 자본','돈과 재산 — 어느 계층에서 자랐나'),
    f('아비투스 · 세 자본','사회 자본','인맥과 네트워크'),
    f('아비투스 · 세 자본','문화 자본','물려받은 취향, 생활 습관, 말씨'),
    f('아비투스 · 여섯 질문','말씨','어떤 말을 쓰는가'),
    f('아비투스 · 여섯 질문','취향','어떤 취향인가'),
    f('아비투스 · 여섯 질문','매너 · 문화','어떤 매너와 문화에 익숙한가'),
    f('아비투스 · 여섯 질문','상황별 반응','어떤 상황에서 어떤 반응을 하는가'),
    f('아비투스 · 여섯 질문','분노 포인트','무엇을 싫어하고 분노하는가'),
    f('아비투스 · 여섯 질문','감동 포인트','무엇에 감동하는가'),
    f('히스토리','출생 환경','가정, 지역, 경제 수준'),
    f('히스토리','유년기','가족이 만든 아비투스'),
    f('히스토리','청소년기','가치관이 굳어진 계기, 중요한 인간관계'),
    f('히스토리','작품 직전 상태','1화 시작 시점의 상태'),
    f('결함 · 트라우마','핵심 결함','핵심 결핍 — 주제와 연결'),
    f('결함 · 트라우마','트라우마','아비투스 형성 과정에서 생긴 상처')];
}
const newSetting=(name,color)=>({id:uid(),kind:'setting',name,aliases:[],summary:'',memo:'',role:'',color:color||'#8a8f98',fields:[],relations:[],board:{},folder:'f_setting'});
const newChar=(name,color)=>({id:uid(),kind:'char',name,aliases:[],summary:'',role:'',longGoal:'',goals:[],color:color||PAL[0],fields:defFields(),relations:[],board:{}});
// 포스트잇 색: 글자(#1d1d1f)가 잘 읽히는 밝은 색만 모아 둔 팔레트 (랜덤은 여기서만 고름)
const CARD_PALETTE=['#fff1a6','#ffc9d6','#b9ecd2','#bfe3ff','#d7c4ff','#ffd6a8','#e6f5a8','#c8f0f2','#f7c9ee','#ffe3b0','#cfe0ff','#ffd0c2'];
let lastRandCol=null;
const randomCardColor=()=>{let c;do{c=CARD_PALETTE[Math.floor(Math.random()*CARD_PALETTE.length)]}while(c===lastRandCol);lastRandCol=c;return c};
const RANDOM_BG='conic-gradient(#fff1a6,#ffc9d6,#d7c4ff,#bfe3ff,#b9ecd2,#fff1a6)';
const newCard=(kind,text)=>{
  const c={id:uid(),kind,text:text||'',chars:[],autoChars:[],offChars:[],created:Date.now()};c.clock=c.created;      // clock: 무덤 타이머 시작 (features/grave.js)
  const ks=(typeof S==='object'&&S&&S.kinds)||[],k=ks.find(x=>x.id===kind);
  if(k&&k.colorMode==='random')c.color=randomCardColor();
  return c;
};
const cardColor=c=>c.color||kindOf(c.kind).color;
const stamp=c=>{c.updated=Date.now()};      // 수정일 (글 · 분류 · 인물 연결 · 별을 고칠 때)
const newEp=()=>({id:uid(),title:'',memo:'',cardIds:[]});

function seed(){
  const a=newChar('이도윤',PAL[3]),b=newChar('서하린',PAL[5]);
  a.role='주인공';a.aliases=['도윤'];a.summary='반지하에서 자란 배달 라이더. 말수가 적고 계산이 빠르다.';
  b.role='상대역';b.aliases=['하린'];b.summary='그룹 상속녀. 모두가 돈 얘기부터 꺼내서 사람을 믿지 못한다.';
  const fv=(c,label,v)=>{const f=c.fields.find(x=>x.label===label);if(f)f.value=v};
  fv(a,'경제 자본','반지하 월세, 부모의 빚. 돈이 곧 선택지의 개수라는 걸 일찍 배웠다.');
  fv(a,'말씨','짧고 건조하다. 사과보다 조건을 먼저 묻는다.');
  fv(a,'분노 포인트','동정하는 눈빛, 값을 깎아 주는 척하는 친절');
  fv(a,'핵심 결함','받는 것을 빚으로만 계산한다');
  fv(b,'경제 자본','돈 걱정을 해 본 적이 없다. 다만 돈 얘기 아닌 대화도 해 본 적이 없다.');
  fv(b,'말씨','정제된 존댓말. 속마음은 질문으로만 나온다.');
  fv(b,'감동 포인트','대가 없이 건네는 사소한 것');
  fv(b,'핵심 결함','사람보다 조건을 먼저 보도록 길러졌다');
  a.relations=[{id:uid(),to:b.id,note:'차 사고로 만난 뒤 서로의 방식이 거슬린다',stage:'충돌'}];
  b.relations=[{id:uid(),to:a.id,note:'사과 없는 사람이 처음이라 궁금하다',stage:'충돌'}];
  const T=[
    ['scene','새벽 배달 중 이도윤이 서하린의 차를 긁는다. 사과보다 먼저 보험부터 묻는 그를 서하린이 흥미롭게 바라본다.',3],
    ['line','"저는 사과를 드릴 수 있고, 돈은 없습니다. 둘 중 하나만 고르세요." — 도윤',3],
    ['line','"왜 죄송하다고 안 하죠? 다들 그러던데." — 하린',2],
    ['scene','서하린이 이도윤의 반지하 방문 앞에 서 있다. 비가 새는 천장 아래 양동이 소리.',2],
    ['memo','도윤은 식당에서 포크 순서를 몰라 당황하지만 끝까지 태연한 척한다.',1],
    ['line','"배고픈 사람한테 코스요리는 고문이에요." — 도윤',2],
    ['scene','하린의 아버지가 도윤에게 봉투를 내민다. 도윤은 받지 않고 봉투의 두께만 본다.',3],
    ['memo','하린은 사람들이 돈이 아닌 자신을 봐 주길 바라지만 정작 먼저 돈 얘기를 한다.',1],
    ['scene','도윤이 처음으로 하린 앞에서 웃는다. 하린은 그 웃음에 계산이 없다는 걸 알아차린다.',3],
    ['memo','아비투스가 부딪히는 순간 찾기: 같은 물건(우산, 도시락)을 두 사람이 서로 다르게 쓰는 장면',0]];
  const cards=T.map(([k,t,s])=>{const c=newCard(k,t);if(s>=3)c.star=true;return c});
  const eps=Array.from({length:12},newEp);
  eps[0].title='새벽의 접촉사고';eps[1].title='반지하';eps[2].title='봉투';
  eps[0].memo='둘의 아비투스가 처음 충돌';
  eps[0].cardIds=[cards[0].id,cards[1].id,cards[2].id];eps[1].cardIds=[cards[3].id];eps[2].cardIds=[cards[6].id];
  return {version:1,characters:[a,b],cards,episodes:eps,kinds:defKinds(),noneBoard:{},trash:[],settings:{theme:'auto',font:null,family:'',showUsed:false,boardBg:''},demo:true,z:1};
}
