/* ============ 백업 / 불러오기 ============ */
function dl(name,text,type){const a=h('a',{href:URL.createObjectURL(new Blob([text],{type})),download:name});document.body.append(a);a.click();a.remove()}
function exportJson(){dl(fileBase()+'-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(S,null,1),'application/json');toast('백업 파일을 만들었어요')}
