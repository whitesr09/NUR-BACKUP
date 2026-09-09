/* NUR Focus — pure, offline session state. No framework or background service. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NurFocusData=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const VERSION=1,MAX_HISTORY=5000;
const clone=x=>JSON.parse(JSON.stringify(x));
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=(x,max=180)=>String(x??'').trim().slice(0,max);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const validTime=x=>finite(x)&&x>=0&&x<=8640000000000000;
const localDate=ms=>{const d=new Date(ms);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const empty=()=>({version:VERSION,durationSeconds:1500,clock:null,sessions:[]});
function validate(input){
 if(input===undefined||input===null)return empty();
 if(!object(input)||input.version!==VERSION)throw Error('Unsupported NUR Focus data version.');
 if(!Number.isInteger(input.durationSeconds)||input.durationSeconds<60||input.durationSeconds>10800)throw Error('Invalid focus duration.');
 if(!Array.isArray(input.sessions)||input.sessions.length>MAX_HISTORY)throw Error('Invalid focus history.');
 const ids=new Set();
 const sessions=input.sessions.map(s=>{
  if(!object(s)||!text(s.id)||ids.has(s.id)||!validTime(s.startedAt)||!validTime(s.endedAt)||s.endedAt<s.startedAt||!Number.isInteger(s.durationSeconds)||s.durationSeconds<60||s.durationSeconds>10800||!text(s.date)||s.date!==localDate(s.endedAt))throw Error('Invalid focus session.');
  ids.add(s.id);
  return {id:text(s.id,100),startedAt:s.startedAt,endedAt:s.endedAt,date:s.date,durationSeconds:s.durationSeconds,label:text(s.label),taskId:text(s.taskId,100)||null};
 });
 let clock=null;
 if(input.clock!==null&&input.clock!==undefined){
  const c=input.clock;
  if(!object(c)||!['running','paused'].includes(c.phase)||!Number.isInteger(c.durationSeconds)||c.durationSeconds<60||c.durationSeconds>10800||!finite(c.accumulatedMs)||c.accumulatedMs<0||c.accumulatedMs>c.durationSeconds*1000||!validTime(c.startedAt)||!validTime(c.resumedAt)||c.resumedAt<c.startedAt)throw Error('Invalid focus clock.');
  clock={phase:c.phase,durationSeconds:c.durationSeconds,accumulatedMs:c.accumulatedMs,startedAt:c.startedAt,resumedAt:c.resumedAt,label:text(c.label),taskId:text(c.taskId,100)||null};
 }
 return {version:VERSION,durationSeconds:input.durationSeconds,clock,sessions};
}
function elapsed(clock,now){
 if(!clock)return 0;
 if(!validTime(now))throw Error('Invalid clock time.');
 return Math.min(clock.durationSeconds*1000,clock.accumulatedMs+(clock.phase==='running'?Math.max(0,now-clock.resumedAt):0));
}
function view(input,now){
 const s=validate(input),c=s.clock,ms=elapsed(c,now);
 return {phase:!c?'idle':ms>=c.durationSeconds*1000?'ready':c.phase,elapsedMs:ms,remainingMs:c?Math.max(0,c.durationSeconds*1000-ms):s.durationSeconds*1000,progress:c?ms/(c.durationSeconds*1000):0};
}
function configure(input,seconds){
 const s=validate(input);
 if(s.clock)throw Error('Stop the current session before changing duration.');
 if(!Number.isInteger(seconds)||seconds<60||seconds>10800)throw Error('Choose a duration between 1 and 180 minutes.');
 s.durationSeconds=seconds;return s;
}
function start(input,now,values={}){
 const s=validate(input);
 if(s.clock)throw Error('A focus session is already active.');
 if(!validTime(now))throw Error('Invalid clock time.');
 s.clock={phase:'running',durationSeconds:s.durationSeconds,accumulatedMs:0,startedAt:now,resumedAt:now,label:text(values.label)||'Focus session',taskId:text(values.taskId,100)||null};return s;
}
function pause(input,now){
 const s=validate(input),c=s.clock;
 if(!c||c.phase!=='running')throw Error('No running session to pause.');
 c.accumulatedMs=elapsed(c,now);c.phase='paused';return s;
}
function resume(input,now){
 const s=validate(input),c=s.clock;
 if(!c||c.phase!=='paused'||elapsed(c,now)>=c.durationSeconds*1000)throw Error('This session cannot be resumed.');
 if(now<c.resumedAt)throw Error('Device time moved backwards.');
 c.resumedAt=now;c.phase='running';return s;
}
function stop(input){const s=validate(input);s.clock=null;return s;}
function finish(input,now,id){
 const s=validate(input),c=s.clock;
 if(!c||elapsed(c,now)<c.durationSeconds*1000)throw Error('Complete the timer before recording a session.');
 const sessionId=text(id,100);
 if(!sessionId||s.sessions.some(x=>x.id===sessionId)||s.sessions.length>=MAX_HISTORY)throw Error('Invalid or duplicate session ID.');
 s.sessions.push({id:sessionId,startedAt:c.startedAt,endedAt:now,date:localDate(now),durationSeconds:c.durationSeconds,label:c.label,taskId:c.taskId});s.clock=null;return s;
}
function summary(input,date){
 const s=validate(input),items=s.sessions.filter(x=>x.date===date);
 return {count:items.length,minutes:Math.round(items.reduce((n,x)=>n+x.durationSeconds,0)/60)};
}
return {VERSION,MAX_HISTORY,empty,validate,elapsed,view,configure,start,pause,resume,stop,finish,summary,localDate};
});