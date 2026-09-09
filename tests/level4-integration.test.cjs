const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'web',name),'utf8');
const scripts=html=>[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)].map(x=>x[1]);
const styles=html=>[...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/g)].map(x=>x[1]);
const date=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

test('every referenced application asset exists and dependencies load in order',()=>{
 const html=read('index.html'),list=scripts(html);
 for(const file of [...list,...styles(html)])assert.ok(fs.existsSync(path.join(root,'web',file)),file);
 for(const file of ['nur-focus-data.js','nur-focus.js','nur-pro-data.js','nur-pro-assets.js','nur-progress.js','nur-pro.js'])assert.ok(list.includes(file),file);
 assert.ok(list.indexOf('nur-experience.js')<list.indexOf('nur-pro.js'));
 assert.ok(list.indexOf('nur-focus-data.js')<list.indexOf('nur-focus.js'));
 assert.ok(list.indexOf('nur-pro-data.js')<list.indexOf('nur-progress.js'));
 assert.ok(list.indexOf('nur-pro-assets.js')<list.indexOf('nur-pro.js'));
 assert.ok(styles(html).includes('nur-level4.css'));
 assert.ok(!html.includes('material3'));
});

test('complete application mounts Focus and Pro without changing historical records',()=>{
 const dom=new JSDOM(read('index.html'),{url:'https://nur.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,errors=[];
 try{
  w.addEventListener('error',e=>{errors.push(e.error||e.message);e.preventDefault();});
  w.requestAnimationFrame=()=>0;w.setInterval=()=>0;w.scrollTo=()=>{};w.confirm=()=>true;
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
  const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
  const old=date(yesterday);
  const seed={meta:{startedOn:old,persistentListsV3:true,persistentTasks:[{id:'study',title:'Study',category:'College'}],persistentIntentions:[{id:'reflect',title:'Reflect'}]},days:{[old]:{prayers:[true,false,false,false,false],tasks:[{id:'study',title:'Study',category:'College',done:true}],intentions:[{id:'reflect',title:'Reflect',done:true}],notes:[{id:'note',title:'Saved note',body:'Keep this'}],money:[{id:'money',title:'Food',amount:20,type:'expense'}]}}};
  w.localStorage.setItem('nur-data-v1',JSON.stringify(seed));w.localStorage.setItem('nur-first-run-date',old);
  const context=dom.getInternalVMContext();
  for(const file of scripts(read('index.html')))vm.runInContext(read(file),context,{filename:file});
  assert.ok(w.document.querySelector('#nurFocusPanel'));
  assert.ok(w.document.querySelector('#nurProStudio'));
  assert.ok(w.document.querySelector('#nurGoalsPanel'));
  assert.equal(typeof w.NURFocusUI.open,'function');
  assert.equal(typeof w.NURPro.open,'function');
  const before=JSON.parse(w.localStorage.getItem('nur-data-v1'));
  w.NURPro.open('appearance');
  assert.ok(w.document.querySelector('#nurProStudio').open);
  w.NURPro.set({theme:'amoled',density:'compact'});
  assert.equal(w.document.documentElement.dataset.nurProAmoled,'true');
  w.NURPro.open('progress');
  assert.ok(w.document.querySelector('[data-nur-preview="light"]'));
  w.NURPro.loadPreset('study');
  assert.ok(w.document.querySelector('#nurFocusPanel'));
  w.NURFocusUI.open();
  assert.ok(w.document.querySelector('#nurFocusDialog').open);
  w.NURFocusUI.configure(15);
  assert.equal(w.NURFocusUI.getState().durationSeconds,900);
  const after=JSON.parse(w.localStorage.getItem('nur-data-v1'));
  assert.deepEqual(after.days[old],before.days[old]);
  assert.equal(after.meta.startedOn,before.meta.startedOn);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});

test('offline shell contains all application assets and excludes private paths',()=>{
 const html=read('index.html'),sw=read('sw.js');
 const match=sw.match(/const CORE=\[([\s\S]*?)\];/);assert.ok(match);
 const core=[...match[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
 for(const file of [...scripts(html),...styles(html),'manifest.webmanifest','icon.svg'])assert.ok(core.includes('./'+file),file);
 for(const file of core){if(file==='./')continue;assert.ok(fs.existsSync(path.join(root,'web',file)),file);}
 assert.ok(sw.includes('STATIC.has(url.pathname)'));
 assert.ok(sw.includes('url.search'));
 assert.ok(!core.some(x=>/backup|private|\.json$/.test(x)&&!x.endsWith('manifest.webmanifest')));
});
