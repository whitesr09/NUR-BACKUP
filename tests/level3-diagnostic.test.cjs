const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
test('diagnose Level 3 browser initialization',()=>{
 const w=new JSDOM(fs.readFileSync(path.join(root,'web/index.html'),'utf8'),{url:'https://nur.test/',runScripts:'outside-only'}).window;
 const errors=[];w.addEventListener('error',e=>{errors.push(String(e.error?.stack||e.message));e.preventDefault();});
 w.requestAnimationFrame=()=>0;w.setInterval=()=>0;w.scrollTo=()=>{};w.confirm=()=>true;
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 const today=new Date().toISOString().slice(0,10);
 const seed={meta:{startedOn:today,persistentListsV3:true,persistentTasks:[],persistentIntentions:[]},days:{}};
 w.localStorage.setItem('nur-data-v1',JSON.stringify(seed));
 for(const name of ['app.js','v2-persistent-items.js','nur-power-data.js','nur-level3.js']){
  try{w.eval(fs.readFileSync(path.join(root,'web',name),'utf8'));}catch(e){errors.push(name+': '+e.stack);}
  console.log(name,JSON.stringify({state:w.eval('typeof state'),engine:!!w.NurPowerData,ui:!!w.NURPowerUI,toast:w.document.querySelector('#toast')?.textContent}));
 }
 console.log('Browser errors:',JSON.stringify(errors));
 w.close();
});
