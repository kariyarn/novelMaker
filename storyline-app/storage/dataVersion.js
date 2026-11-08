// 작품 데이터 모양의 버전 (앱 화면 · 메인 프로세스가 같이 씀: index.html 이 <script> 로, storage/ 가 require 로)
// 옛 앱이 읽으면 잘못 다루거나 지울 수 있게 데이터 모양을 바꿀 때 1 올리고, src/state/state.js 의 MIGRATIONS 에 그 단계를 더함
//   이 앱보다 높은 버전의 작품은: 읽기만 (저장 · 동기화 받기 · 합치기 안 함) → 앱을 업데이트하라고 알림
//   버전 1: 이 표시가 생기기 전의 모든 데이터 · 버전 2: 표시가 생긴 첫 버전 (모양은 1과 같음)
const DATA_VERSION=2;
const dataVersionOf=d=>{const v=d&&typeof d==='object'?+d.version:NaN;return Number.isInteger(v)&&v>0?v:1};      // 표시가 없으면 1
const tooNewData=d=>dataVersionOf(d)>DATA_VERSION;      // 이 앱보다 새 앱이 만든 데이터
/* global module */
if(typeof module!=='undefined')module.exports={DATA_VERSION,dataVersionOf,tooNewData};
