const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function edit(name,changes){const file=path.join(root,name);let s=fs.readFileSync(file,'utf8');for(const [before,after] of changes){if(s.includes(before))s=s.replace(before,after);else if(!s.includes(after))throw Error('Missing expected source in '+name+': '+before.slice(0,70));}fs.writeFileSync(file,s);}
edit('tests/deen.test.cjs',[
 ["{if(name==='nur-deen-backup.js')continue;vm.runInContext(read(name),w,{filename:name});}","vm.runInContext(read(name),w,{filename:name});"],
 ["fetch:async()=>({ok:true,text:async()=>JSON.stringify({code:200,data:fixture(1,7)})})", "fetch:async(url)=>url.includes('quran-uthmani.json')?{ok:false,status:404}:{ok:true,text:async()=>JSON.stringify({code:200,data:fixture(1,7)})}"]
]);
edit('tests/level4-integration.test.cjs',[
 ["const w=dom.window,errors=[];","const w=dom.window,errors=[];w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;"],
 ["/backup|private|\\.json$/", "/nur-data-v1|nur-ai-private-v1|\\/private\\/|\\/backups\\/|NUR-backup-/"]
]);
edit('web/sw.js',[["'./manifest.webmanifest','./icon.svg','./assets/loading-bg.jpg'", "'./manifest.webmanifest','./icon.svg','./assets/quran-uthmani.json','./assets/loading-bg.jpg'"]]);
console.log('Level 5 regression and offline-asset fixes applied.');
