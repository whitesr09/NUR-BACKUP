const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'web',name),'utf8');
function setup(options={}){
 const dom=new JSDOM(read('index.html'),{url:'https://nur.test/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;
 w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.requestAnimationFrame=()=>0;w.setInterval=()=>0;w.scrollTo=()=>{};w.confirm=()=>false;
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
 const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);const k=`${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
 const seed={meta:{startedOn:k,persistentListsV3:true,persistentTasks:[{id:'study',title:'Study'}],persistentIntentions:[{id:'reflect',title:'Reflect'}]},days:{[k]:{prayers:[true,false,false,false,false],tasks:[{id:'study',title:'Study',done:true}],intentions:[{id:'reflect',title:'Reflect',done:true}],notes:[{id:'n',title:'Private',body:'Keep this'}],money:[{id:'m',title:'Food',amount:20,type:'expense'}]}}};
 w.localStorage.setItem('nur-data-v1',JSON.stringify(seed));if(options.badRecovery)w.localStorage.setItem('nur-vault-recovery-v1','{bad');
 const calls=[];if(options.native){const plugins={Filesystem:{writeFile:async args=>{calls.push({type:'write',args});return {uri:'file:///cache/NUR-backup.json'};}},Share:{share:async args=>{calls.push({type:'share',args});return {};}}};w.Capacitor={isNativePlatform:()=>true,isPluginAvailable:()=>true,registerPlugin:name=>plugins[name]};}
 const context=dom.getInternalVMContext();for(const name of ['app.js','v2-persistent-items.js','nur-power-data.js','nur-level3.js','v2-motion.js','nur-experience.js','nur-vault.js','nur-vault-ui.js'])vm.runInContext(read(name),context,{filename:name});
 const click=(selector,text)=>{const nodes=[...w.document.querySelectorAll(selector)];const n=text?nodes.find(x=>x.textContent.trim()===text):nodes[0];assert.ok(n,selector+' '+(text||''));n.click();return n;};
 return {dom,w,calls,click,seed};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('vault mounts in the existing custom interface and safely handles corrupted recovery metadata',()=>{const c=setup({badRecovery:true});try{c.click('#nurVaultLaunch');assert.ok(c.w.document.querySelector('#nurVault').open);assert.ok(c.w.document.querySelector('#nurVault').textContent.includes('Export backup'));assert.ok(c.w.document.querySelector('#nurVault').textContent.includes('could not be read'));assert.ok(!c.w.document.querySelector('#nurVault').textContent.includes('Material 3'));}finally{c.dom.window.close();}});
test('native export writes a UTF-8 JSON backup and opens Android sharing',async()=>{const c=setup({native:true});try{c.click('#nurVaultLaunch');c.click('#nurVault .nur-power-primary','Export backup');await tick();await tick();assert.equal(c.calls.length,2);assert.equal(c.calls[0].args.directory,'CACHE');const raw=Buffer.from(c.calls[0].args.data,'base64').toString('utf8');const backup=JSON.parse(raw);assert.equal(backup.format,'nur-backup');assert.equal(backup.state.days[Object.keys(c.seed.days)[0]].notes[0].body,'Keep this');assert.equal(c.calls[1].args.url,'file:///cache/NUR-backup.json');}finally{c.dom.window.close();}});
test('import previews the data without replacing anything before confirmation',async()=>{const c=setup();try{c.click('#nurVaultLaunch');const before=c.w.localStorage.getItem('nur-data-v1');const raw=c.w.NurVault.makeBackup(c.w.NURPowerUI.getState(),null);const input=c.w.document.querySelector('#nurVault input[type=file]');Object.defineProperty(input,'files',{configurable:true,value:[{size:raw.length,text:async()=>raw}]});input.dispatchEvent(new c.w.Event('change'));await tick();const preview=c.w.document.querySelector('.nur-vault-preview');assert.ok(preview.textContent.includes('Recorded days'));assert.ok(preview.textContent.includes('Money entries'));assert.equal(c.w.localStorage.getItem('nur-data-v1'),before);c.click('.nur-vault-preview .nur-power-danger');assert.equal(c.w.localStorage.getItem('nur-data-v1'),before);}finally{c.dom.window.close();}});
