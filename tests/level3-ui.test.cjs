const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'web',name),'utf8');
const localKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const shift=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
function setup(){
  const dom=new JSDOM(read('index.html'),{url:'https://nur.test/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  const errors=[];
  w.addEventListener('error',e=>{errors.push(e.error||e.message);e.preventDefault();});
  w.requestAnimationFrame=()=>0;w.setInterval=()=>0;w.scrollTo=()=>{};w.confirm=()=>true;
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
  const now=new Date(),today=localKey(now),yesterday=localKey(shift(now,-1));
  const seed={meta:{startedOn:yesterday,persistentListsV3:true,persistentTasks:[{id:'study',title:'Study',category:'College'}],persistentIntentions:[{id:'reflect',title:'Reflect'}]},days:{[yesterday]:{prayers:[true,false,false,false,false],tasks:[{id:'study',title:'Study',category:'College',done:true}],intentions:[{id:'reflect',title:'Reflect',done:true}],notes:[{id:'note',title:'Saved note',body:'Keep this'}],money:[{id:'money',title:'Food',amount:20,type:'expense'}]}}};
  w.localStorage.setItem('nur-data-v1',JSON.stringify(seed));
  w.localStorage.setItem('nur-first-run-date',yesterday);
  for(const name of ['app.js','v2-persistent-items.js','nur-power-data.js','nur-level3.js','v2-motion.js','nur-experience.js'])w.eval(read(name));
  const state=()=>w.NURPowerUI.getState();
  const click=(selector,text)=>{const nodes=[...w.document.querySelectorAll(selector)];const n=text?nodes.find(x=>x.textContent.trim()===text):nodes[0];assert.ok(n,`Missing control: ${selector} ${text||''}`);n.click();return n;};
  const submit=form=>form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  return {dom,w,state,click,submit,today,yesterday,errors};
}
function close(ctx){ctx.dom.window.close();}

test('Level 3 assets are wired without changing the original dashboard identity',()=>{
 const html=read('index.html');
 for(const asset of ['nur-power-data.js','nur-level3.js','nur-level3.css'])assert.ok(html.includes(asset),asset);
 for(const id of ['lightOrbit','prayerList','taskPreview','muhasabaDonut','weekBars'])assert.ok(html.includes(`id="${id}"`));
 assert.ok(!html.includes('material3'));
});

test('migration preserves existing history and exposes the new custom workspace',()=>{
 const c=setup();try{
  assert.equal(c.state().days[c.yesterday].tasks[0].done,true);
  assert.equal(c.state().days[c.yesterday].notes[0].body,'Keep this');
  assert.equal(c.state().days[c.yesterday].money[0].amount,20);
  assert.equal(c.state().days[c.today].tasks[0].done,false);
  assert.ok(c.w.document.querySelector('#nurGoalsPanel'));
  c.click('.tasks-panel [data-open="tasks"]');
  assert.ok(c.w.document.querySelector('#nurPowerDialog').open);
  assert.ok(c.w.document.querySelector('#nurPowerDialog').textContent.includes('Study'));
  assert.deepEqual(c.errors,[]);
 }finally{close(c);}
});

test('recurrence editor creates, edits, and deletes definitions without erasing history',()=>{
 const c=setup();try{
  c.w.NURPowerUI.open('tasks');
  c.click('.nur-power-primary','+ New responsibility');
  let form=c.w.document.querySelector('.nur-power-form');
  form.elements.title.value='Weekly revision';form.elements.category.value='Study';
  form.elements.repeat.value='weekdays';form.elements.repeat.dispatchEvent(new c.w.Event('change'));
  const tomorrow=shift(new Date(),1),weekday=tomorrow.getDay();
  form.querySelector(`[name=weekday][value="${weekday}"]`).checked=true;
  form.elements.startOn.value=c.today;c.submit(form);
  let s=c.state(),task=s.meta.persistentTasks.find(x=>x.title==='Weekly revision');
  assert.ok(task);assert.equal(task.schedule.type,'weekdays');assert.deepEqual(task.schedule.days,[weekday]);
  assert.equal(s.days[c.today].tasks.some(x=>x.id===task.id),false);
  c.click('.nur-power-row .nur-power-small','Edit');
  form=c.w.document.querySelector('.nur-power-form');
  form.elements.title.value='Updated study';form.elements.repeat.value='daily';
  form.elements.repeat.dispatchEvent(new c.w.Event('change'));c.submit(form);
  s=c.state();assert.equal(s.days[c.today].tasks.some(x=>x.id===task.id),true);
  assert.equal(s.days[c.yesterday].tasks[0].title,'Study');
  c.click('.nur-power-row .nur-power-small','Edit');
  c.click('.nur-power-danger','Delete');
  s=c.state();assert.equal(s.meta.persistentTasks.some(x=>x.id===task.id),false);
  assert.equal(s.days[c.yesterday].tasks[0].done,true);
  assert.deepEqual(c.errors,[]);
 }finally{close(c);}
});

test('goals have editable progress, independent milestones, archive and deletion',()=>{
 const c=setup();try{
  c.w.NURPowerUI.open('goals');c.click('.nur-power-primary','+ New goal');
  let form=c.w.document.querySelector('.nur-power-form');
  form.elements.title.value='Read ten pages';form.elements.target.value='10';form.elements.current.value='2';form.elements.unit.value='pages';
  c.submit(form);
  let s=c.state();assert.equal(s.meta.powerGoals.length,1);const id=s.meta.powerGoals[0].id;
  assert.equal(s.meta.powerGoals[0].current,2);
  c.click('.nur-goal-card .nur-power-small','Open goal');
  let add=c.w.document.querySelector('.nur-power-form-line');add.querySelector('input').value='First chapter';c.submit(add);
  s=c.state();assert.equal(s.meta.powerGoals[0].milestones.length,1);
  assert.equal(s.meta.powerGoals[0].current,2,'Adding a milestone must not reset numeric progress');
  c.click('.nur-power-milestone input');
  s=c.state();assert.equal(s.meta.powerGoals[0].milestones[0].done,true);
  c.click('.nur-power-actions .nur-power-small','Archive goal');
  assert.equal(c.state().meta.powerGoals[0].archived,true);
  assert.ok(!c.w.document.querySelector('#nurGoalsPreview').textContent.includes('Read ten pages'));
  c.click('.nur-power-danger','Delete goal');
  assert.equal(c.state().meta.powerGoals.length,0);
  assert.equal(c.state().days[c.yesterday].notes.length,1);
  assert.deepEqual(c.errors,[]);
 }finally{close(c);}
});

test('failed storage writes do not commit a new power-feature transaction',()=>{
 const c=setup();try{
  const before=JSON.stringify(c.state());
  const original=c.w.Storage.prototype.setItem;
  c.w.Storage.prototype.setItem=function(k,v){if(k==='nur-data-v1')throw Error('quota');return original.call(this,k,v);};
  c.w.NURPowerUI.open('goals');c.click('.nur-power-primary','+ New goal');
  const form=c.w.document.querySelector('.nur-power-form');form.elements.title.value='Cannot save';form.elements.target.value='5';form.elements.current.value='0';c.submit(form);
  assert.equal(JSON.stringify(c.state()),before);
  assert.ok(c.w.document.querySelector('#nurPowerNotice').textContent.includes('Unable to save'));
  c.w.Storage.prototype.setItem=original;
 }finally{close(c);}
});
