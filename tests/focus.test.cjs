const {test}=require('node:test');
const assert=require('node:assert/strict');
const F=require('../web/nur-focus-data.js');
const T=Date.parse('2026-09-09T10:00:00Z');

test('focus defaults and duration validation do not mutate input',()=>{
 const s=F.empty(),before=JSON.stringify(s);
 assert.equal(s.durationSeconds,1500);
 assert.equal(F.configure(s,2700).durationSeconds,2700);
 assert.equal(JSON.stringify(s),before);
 assert.throws(()=>F.configure(s,0));
 assert.throws(()=>F.configure(s,10801));
 assert.throws(()=>F.configure(s,1.5));
 assert.deepEqual(F.view(s,T).phase,'idle');
});

test('pause, reload and resume use elapsed wall time without creating false history',()=>{
 let s=F.start(F.empty(),T,{label:'Study',taskId:'study'});
 assert.equal(F.view(s,T+600000).remainingMs,900000);
 s=F.pause(s,T+600000);
 const persisted=JSON.parse(JSON.stringify(s));
 assert.equal(F.view(persisted,T+3600000).remainingMs,900000);
 s=F.resume(persisted,T+3600000);
 assert.equal(F.view(s,T+4500000).phase,'ready');
 assert.equal(s.sessions.length,0);
 assert.throws(()=>F.configure(s,3000));
 s=F.finish(s,T+4500000,'session-1');
 assert.equal(s.sessions.length,1);
 assert.equal(s.sessions[0].durationSeconds,1500);
 assert.equal(s.sessions[0].taskId,'study');
 assert.equal(s.clock,null);
 assert.throws(()=>F.finish(s,T+4500000,'session-2'));
});

test('a timer that expires while the app is closed waits for explicit completion',()=>{
 const s=F.start(F.configure(F.empty(),60),T);
 const restored=F.validate(JSON.parse(JSON.stringify(s)));
 assert.equal(F.view(restored,T+120000).phase,'ready');
 assert.equal(restored.sessions.length,0);
 assert.throws(()=>F.finish(restored,T+30000,'too-early'));
 const done=F.finish(restored,T+120000,'finished');
 assert.equal(done.sessions.length,1);
 assert.equal(restored.sessions.length,0);
});

test('stopping discards only the active clock and preserves recorded sessions',()=>{
 let s=F.start(F.configure(F.empty(),60),T);
 s=F.finish(s,T+60000,'first');
 const old=JSON.stringify(s.sessions);
 s=F.start(s,T+120000);
 s=F.stop(s);
 assert.equal(s.clock,null);
 assert.equal(JSON.stringify(s.sessions),old);
 assert.throws(()=>F.finish(s,T+200000,'discarded'));
});

test('history preserves its original local date across timezone changes',()=>{
 const s=F.empty();
 s.sessions.push({id:'travel',startedAt:T,endedAt:T+60000,date:'2026-09-10',durationSeconds:60,label:'Travel',taskId:null});
 assert.equal(F.validate(s).sessions[0].date,'2026-09-10');
 assert.deepEqual(F.summary(s,'2026-09-10'),{count:1,minutes:1});
 assert.deepEqual(F.summary(s,'2026-09-09'),{count:0,minutes:0});
});

test('unknown versions, malformed records and duplicate IDs are rejected safely',()=>{
 assert.throws(()=>F.validate({version:2,durationSeconds:1500,clock:null,sessions:[]}));
 assert.throws(()=>F.validate({...F.empty(),sessions:[null]}));
 const s=F.empty();
 const item={id:'same',startedAt:T,endedAt:T+60000,date:'2026-09-09',durationSeconds:60,label:'Focus',taskId:null};
 s.sessions=[item,{...item}];
 assert.throws(()=>F.validate(s));
 s.sessions=[{...item,date:'2026-02-31'}];
 assert.throws(()=>F.validate(s));
 assert.throws(()=>F.start(F.empty(),NaN));
 assert.throws(()=>F.resume(F.pause(F.start(F.empty(),T),T+1000),T-1));
});

test('completed focus history is independent of existing NUR prayer and task records',()=>{
 const nur={meta:{startedOn:'2026-09-08',persistentTasks:[{id:'study',title:'Study'}]},days:{'2026-09-08':{prayers:[true,false,false,false,false],tasks:[{id:'study',done:true}],notes:[{id:'n',body:'Keep'}],money:[{id:'m',amount:20}]}}};
 const before=JSON.stringify(nur);
 let focus=F.start(F.configure(F.empty(),60),T,{taskId:'study'});
 focus=F.finish(focus,T+60000,'one');
 nur.meta.nurFocus=focus;
 assert.equal(JSON.stringify({...nur,meta:{...nur.meta,nurFocus:undefined}}).includes('"nurFocus"'),false);
 assert.equal(nur.days['2026-09-08'].tasks[0].done,true);
 assert.equal(nur.days['2026-09-08'].notes[0].body,'Keep');
 assert.equal(nur.days['2026-09-08'].money[0].amount,20);
 assert.equal(JSON.stringify(nur).includes('"one"'),true);
 assert.equal(JSON.stringify(nur).startsWith(before.slice(0,10)),true);
});
