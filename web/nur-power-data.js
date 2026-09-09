/* NUR Level 3: pure, offline power-feature data engine. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NurPowerData=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const VERSION=1;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
  const date=k=>typeof k==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(k)&&!Number.isNaN(Date.parse(k+'T12:00:00'))&&new Date(k+'T12:00:00').toISOString().slice(0,10)===k;
  const text=(x,max=180)=>String(x??'').trim().slice(0,max);
  const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'n'+Date.now().toString(36)+Math.random().toString(36).slice(2);
  const weekday=k=>new Date(k+'T12:00:00').getDay();
  function schedule(value,start){
    const v=object(value)?value:{};
    const type=['daily','weekdays','once'].includes(v.type)?v.type:'daily';
    const days=Array.isArray(v.days)?[...new Set(v.days.filter(x=>Number.isInteger(x)&&x>=0&&x<=6))].sort():[];
    const startOn=date(v.startOn)?v.startOn:start;
    const endOn=date(v.endOn)&&v.endOn>=startOn?v.endOn:null;
    return {type,days:type==='weekdays'?days:[],startOn,endOn};
  }
  function occurs(item,k){
    if(!date(k)||item.archivedOn&&k>=item.archivedOn)return false;
    const s=item.schedule;if(!s||k<s.startOn||s.endOn&&k>s.endOn)return false;
    return s.type==='daily'||s.type==='once'&&k===s.startOn||s.type==='weekdays'&&s.days.includes(weekday(k));
  }
  const definition=x=>{const {done,active, ...rest}=x;return rest;};
  function normalizeTask(x,today){
    if(!object(x))throw Error('Invalid task');
    const title=text(x.title);if(!title)throw Error('A title is required');
    return {...definition(clone(x)),id:text(x.id)||uid(),title,category:text(x.category||'Personal',80),schedule:schedule(x.schedule,today),archivedOn:date(x.archivedOn)?x.archivedOn:null};
  }
  function normalizeGoal(x){
    if(!object(x))throw Error('Invalid goal');
    const title=text(x.title);if(!title)throw Error('A goal title is required');
    const target=Number(x.target),current=Number(x.current);
    if(!Number.isFinite(target)||target<=0||!Number.isFinite(current)||current<0)throw Error('Invalid goal progress');
    return {id:text(x.id)||uid(),title,unit:text(x.unit||'steps',40),target,current:Math.min(current,target),dueOn:date(x.dueOn)?x.dueOn:null,archived:!!x.archived,createdOn:date(x.createdOn)?x.createdOn:null,milestones:Array.isArray(x.milestones)?x.milestones.filter(object).map(m=>({id:text(m.id)||uid(),title:text(m.title),done:!!m.done})).filter(m=>m.title):[]};
  }
  function migrate(input,today){
    if(!date(today))throw Error('Invalid local date');
    if(!object(input)||!object(input.days))throw Error('Invalid NUR data');
    if(input.meta?.powerSchemaVersion>VERSION)throw Error('This data needs a newer NUR version');
    const s=clone(input);s.meta=object(s.meta)?s.meta:{};
    const saved=Array.isArray(s.meta.persistentTasks)?s.meta.persistentTasks:null;
    if(!saved){
      const keys=Object.keys(s.days).filter(date).filter(k=>Array.isArray(s.days[k]?.tasks)&&s.days[k].tasks.length).sort();
      s.meta.persistentTasks=keys.length?s.days[keys[keys.length-1]].tasks.map(definition):[];
    }
    s.meta.persistentTasks=s.meta.persistentTasks.map(x=>normalizeTask(x,today));
    s.meta.powerGoals=Array.isArray(s.meta.powerGoals)?s.meta.powerGoals.map(normalizeGoal):[];
    s.meta.powerSchemaVersion=VERSION;
    return s;
  }
  function reconcile(input,k){
    const s=clone(input);
    if(!date(k))throw Error('Invalid date');
    const d=object(s.days[k])?s.days[k]:{prayers:[false,false,false,false,false],tasks:[],intentions:[],notes:[],money:[]};
    d.tasks=Array.isArray(d.tasks)?d.tasks:[];
    d.inactiveTasks=Array.isArray(d.inactiveTasks)?d.inactiveTasks:[];
    const saved=new Map([...d.inactiveTasks,...d.tasks].filter(object).map(x=>[x.id,x]));
    const active=s.meta.persistentTasks.filter(x=>occurs(x,k));
    const ids=new Set(active.map(x=>x.id));
    d.tasks=active.map(x=>({...definition(x),done:!!saved.get(x.id)?.done}));
    d.inactiveTasks=[...saved.values()].filter(x=>!ids.has(x.id));
    if(!d.dailyListsV4){
      const intentions=Array.isArray(s.meta.persistentIntentions)?s.meta.persistentIntentions:[];
      const existing=new Map((Array.isArray(d.intentions)?d.intentions:[]).filter(object).map(x=>[x.id,x]));
      d.intentions=intentions.map(x=>({...definition(x),done:!!existing.get(x.id)?.done}));
      d.inactiveIntentions=Array.isArray(d.inactiveIntentions)?d.inactiveIntentions:[];
      d.inactiveIntentions.push(...[...existing.values()].filter(x=>!intentions.some(v=>v.id===x.id)));
    }
    d.dailyListsV3=true;d.dailyListsV4=true;
    s.days[k]=d;
    return s;
  }
  function addTask(input,values,today){
    const s=clone(input);const x=normalizeTask({...values,id:uid()},today);
    s.meta.persistentTasks.push(x);return reconcile(s,today);
  }
  function editTask(input,id,values,today){
    const s=clone(input),i=s.meta.persistentTasks.findIndex(x=>x.id===id);
    if(i<0)throw Error('Task not found');
    s.meta.persistentTasks[i]=normalizeTask({...s.meta.persistentTasks[i],...values,id},today);
    return reconcile(s,today);
  }
  function removeTask(input,id,today){
    const s=clone(input),i=s.meta.persistentTasks.findIndex(x=>x.id===id);
    if(i<0)throw Error('Task not found');
    s.meta.persistentTasks.splice(i,1);
    return reconcile(s,today);
  }
  function toggleTask(input,id,today){
    const s=reconcile(input,today),x=s.days[today].tasks.find(x=>x.id===id);
    if(!x)throw Error('Task is not scheduled for today');
    x.done=!x.done;return s;
  }
  function addGoal(input,values,today){const s=clone(input);s.meta.powerGoals.push(normalizeGoal({...values,id:uid(),createdOn:today}));return s;}
  function editGoal(input,id,values){
    const s=clone(input),i=s.meta.powerGoals.findIndex(x=>x.id===id);if(i<0)throw Error('Goal not found');
    s.meta.powerGoals[i]=normalizeGoal({...s.meta.powerGoals[i],...values,id});return s;
  }
  function goalProgress(g){return Math.max(0,Math.min(100,Math.round(g.current/g.target*100)));}
  function addMilestone(input,id,title){const s=clone(input),g=s.meta.powerGoals.find(x=>x.id===id);if(!g)throw Error('Goal not found');const t=text(title);if(!t)throw Error('Milestone title required');g.milestones.push({id:uid(),title:t,done:false});return s;}
  function toggleMilestone(input,id,milestoneId){const s=clone(input),g=s.meta.powerGoals.find(x=>x.id===id),m=g?.milestones.find(x=>x.id===milestoneId);if(!m)throw Error('Milestone not found');m.done=!m.done;return s;}
  function removeMilestone(input,id,milestoneId){const s=clone(input),g=s.meta.powerGoals.find(x=>x.id===id);if(!g)throw Error('Goal not found');g.milestones=g.milestones.filter(x=>x.id!==milestoneId);return s;}
  function removeGoal(input,id){const s=clone(input);s.meta.powerGoals=s.meta.powerGoals.filter(x=>x.id!==id);return s;}
  function exportData(state,appearance){return JSON.stringify({format:'nur-backup',version:1,exportedAt:new Date().toISOString(),state:clone(state),appearance:appearance||null},null,2);}
  function validateImport(raw,today){const data=typeof raw==='string'?JSON.parse(raw):raw;if(!object(data)||data.format!=='nur-backup'||data.version!==1)throw Error('Unsupported backup format');const state=migrate(data.state,today);return {state,appearance:object(data.appearance)?data.appearance:null};}
  return {VERSION,date,schedule,occurs,normalizeTask,normalizeGoal,migrate,reconcile,addTask,editTask,removeTask,toggleTask,addGoal,editGoal,removeGoal,goalProgress,addMilestone,toggleMilestone,removeMilestone,exportData,validateImport};
});