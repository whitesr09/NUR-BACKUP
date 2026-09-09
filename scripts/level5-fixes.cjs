const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function edit(name,changes){const file=path.join(root,name);let s=fs.readFileSync(file,'utf8');for(const [before,after] of changes){if(s.includes(after))continue;if(!s.includes(before))throw Error('Expected source segment missing in '+name+': '+before.slice(0,70));s=s.replace(before,after);}fs.writeFileSync(file,s);}
edit('tests/deen.test.cjs',[
 ["{if(name==='nur-deen-backup.js')continue;vm.runInContext(read(name),w,{filename:name});}","vm.runInContext(read(name),w,{filename:name});"],
 ['crypto:webcrypto,indexedDB,URL,console','crypto:webcrypto,indexedDB,URL,console,btoa,atob']
]);
edit('web/nur-deen-app.js',[
 ["let tab='reading'","let tab='reading'"],
 ["searchResults=[],draft=''","searchResults=[],searchDraft='',draft=''"],
 ["const q=field('Search downloaded Quran text','');","const q=field('Search downloaded Quran text',searchDraft);q.input.addEventListener('input',()=>searchDraft=q.input.value);"],
 ["const value=q.input.value.trim();run(async()=>","const value=q.input.value.trim();searchDraft=value;run(async()=>"],
 ["const timer=setTimeout(()=>controller?.abort(),45000);","const activeController=controller;const timer=setTimeout(()=>activeController.abort(),45000);"],
 ["function close(){if(dialog.open","function close(){controller?.abort();if(dialog.open"],
 ["key.value='';pass.value='';","key.input.value='';pass.input.value='';"],
 ["content.append(row(send,cancelButton(),button('Clear conversation'","send.dataset.network='true';send.disabled=busy;content.append(row(send,cancelButton(),button('Clear conversation'"],
 ["if(!table){content.append(button('Calculate timetable'","if(table&&(table.date!==(selectedDate||service.today(l.timeZone))||table.location.latitude!==l.latitude||table.location.longitude!==l.longitude))table=null;\n if(!table){content.append(button('Calculate timetable'"]
]);
console.log('Level 5 integration fixes applied.');
