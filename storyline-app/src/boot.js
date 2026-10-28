/* ============ 시작: 모든 파일을 불러온 뒤 실행 ============ */
if(graveTick())save();      // 기한이 지난 카드를 무덤으로 · 타이머가 없는 카드는 오늘부터 (features/grave.js)
applySettings();afterWorkChange();autoFitSheet();frAutoLeft();renderAll();loadFonts();savePrefs();promptFirstName();
if(!UIP.toured&&S.demo&&!(LIB&&LIB.novels&&LIB.novels.length>1))setTimeout(()=>showTour(0),400);
if(pendingConflicts().length)setTimeout(showSyncConflicts,600);      // 다른 기기와 다르게 고친 글이 남아 있으면 고르게
