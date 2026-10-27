/* ============ 시작: 모든 파일을 불러온 뒤 실행 ============ */
applySettings();afterWorkChange();autoFitSheet();frAutoLeft();renderAll();loadFonts();savePrefs();promptFirstName();
if(!UIP.toured&&S.demo&&!(LIB&&LIB.novels&&LIB.novels.length>1))setTimeout(()=>showTour(0),400);
if(pendingConflicts().length)setTimeout(showSyncConflicts,600);      // 다른 기기와 다르게 고친 글이 남아 있으면 고르게
