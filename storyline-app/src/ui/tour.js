/* 처음 실행할 때 둘러보기 (도움말에서 다시 볼 수 있음) */
function showTour(step){
  step=step||0;
  const S0=[
    ['✍️','캐릭터 스토리라인','인물을 중심으로 쓰고 싶은 장면을 모으고, 화별로 배치해 이야기를 짜는 앱이에요.\n모든 내용은 작품마다 자동으로 저장되고, 백업도 알아서 남아요.'],
    ['🧑‍🤝‍🧑','구상 — 인물과 코르크보드','왼쪽에서 인물 · 설정을 고르면 가운데에 인물 시트(목표 · 칸 묶음)와 그 인물의 코르크보드가 열려요.\n빈 곳을 더블클릭하거나 ⌘N으로 포스트잇을 붙이고, 핀을 꽂아 고정하거나 줄로 이을 수 있어요.'],
    ['🗂️','오른쪽 목록 → 타임라인','쓰고 싶은 장면 · 대사를 오른쪽에 한 줄씩 적어 두세요.\n타임라인에서 카드를 화로 끌어다 놓으면 배치되고, 등장표로 인물이 언제 얼마나 나오는지 한눈에 봐요.'],
    ['🕸️','관계망 · 검색 · 입력 도우미','위쪽 “관계망”에서 어떤 인물 · 설정이 함께 자주 나오는지 한눈에 봐요 (포스트잇이 쌓이면 자동으로 달라져요). ⌘F로 작품 전체를 찾아요.\n따옴표는 “ ”로, ...는 …로 바뀌고, [ 를 거듭 누르면 「 」 『 』 《 》로 바뀌어요.']];
  const last=step>=S0.length;
  const dots=h('div',{class:'tdots'},...[...S0,0].map((_,i)=>h('i',{class:i===step?'on':''})));
  const fin=()=>{UIP.toured=true;saveUIP();closeModal()};
  if(!last){const [ic,t,body]=S0[step];
    openModal(h('div',{class:'tour'},h('div',{class:'tic'},ic),h('h2',{},t),h('p',{},body),dots,
      h('div',{class:'row',style:'margin-top:18px'},h('button',{class:'quiet',onclick:fin},'건너뛰기'),h('span',{class:'sp'}),step?h('button',{onclick:()=>showTour(step-1)},'이전'):null,h('button',{class:'on',onclick:()=>showTour(step+1)},'다음'))));
  }else{
    openModal(h('div',{class:'tour'},h('div',{class:'tic'},'🚀'),h('h2',{},'어떻게 시작할까요?'),h('p',{},'장르 예시로 먼저 만져 보거나, 빈 작품으로 바로 시작하세요.\n예시는 언제든 작품 이름 옆 “예시” 표시를 눌러 지울 수 있어요.'),
      h('div',{class:'tgen'},...GENRES.map(([id,ic,n,d])=>h('button',{onclick:async()=>{if(await loadExample(id))fin()}},h('span',{class:'gi'},ic),h('b',{},n),h('small',{},d)))),
      dots,
      h('div',{class:'row',style:'margin-top:18px'},h('button',{onclick:()=>showTour(step-1)},'이전'),h('span',{class:'sp'}),
        h('button',{class:'on',onclick:()=>{if(S.demo)clearDemo();fin()}},S.demo?'빈 작품으로 시작':'지금 작품으로 계속'))));
  }
}
