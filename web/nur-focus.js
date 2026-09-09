/* NUR Focus Chamber — an offline, explicit session workflow. */
(function(){
'use strict';
const F=window.NurFocusData;
if(!F||typeof state==='undefined'||document.querySelector('#nurFocusPanel'))return;
const doc=document,el=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(text,cls,fn)=>{const n=el('button',cls,text);n.type='button';n.addEventListener('click',fn);return n;};
const id=()=>window.crypto?.randomUUID?.()||'f'+Date.now().toString(36)+Math.random().toString(36).slice(2);
const clone=x=>JSON.parse(JSON.stringify(x));
let error='',previousFocus=null,lastReady=null,wake=null,ticker=null;
const get=()=>F.validate(state.meta.nurFocus||F.empty());
const prefs=()=>({...{quiet:false,sound:false,keepAwake:false},...state.meta.nurFocusPreferences});
function write(operation,message){
 try{
  const next=clone(state);next.meta=next.meta||{};operation(next);localStorage.setItem(STORAGE,JSON.stringify(next));state=next;error='';if(message)error=message;
  render();return true;
 }catch(e){error=e.message||'Unable to save focus data.';paint();return false;}
}
function updateFocus(fn,message){return write(s=>{s.meta.nurFocus=fn(F.validate(s.meta.nurFocus||F.empty()));},message);}
function updatePrefs(patch){return write(s=>{s.meta.nurFocusPreferences={...prefs(),...patch};},'Focus preferences saved.');}
function vibrateFocus(){if(prefs().quiet||window.NURAppearance?.get?.().motion==='reduced')return;if(window.NURPro?.get?.().haptics===false)return;try{navigator.vibrate?.(18);}catch{}}
async function manageWake(){
 const should=get().clock?.phase==='running'&&prefs().keepAwake&&!doc.hidden;
 if(!should){if(wake){try{await wake.release();}catch{}wake=null;}return;}
 if(wake||!navigator.wakeLock?.request)return;
 try{wake=await navigator.wakeLock.request('screen');wake.addEventListener?.('release',()=>{wake=null;});}catch{}
}
function playReady(){if(prefs().quiet||!prefs().sound)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=660;g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.08,c.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.3);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.31);o.onended=()=>c.close();}catch{}}
function notifyReady(){const s=get(),v=F.view(s,Date.now());if(v.phase==='ready'&&lastReady!==s.clock.startedAt){lastReady=s.clock.startedAt;playReady();}if(v.phase!=='ready')lastReady=null;}
const frame=doc.querySelector('.dashboard-frame'),footer=frame.querySelector('.frame-foot');
const card=el('article','panel nur-focus-panel');card.id='nurFocusPanel';card.innerHTML='<div class="panel-head"><div><span class="eyebrow">QUIET PRODUCTIVITY</span><h2>Focus Chamber</h2></div><span class="nur-focus-badge">FOCUS</span></div><div class="nur-focus-preview"><div><strong id="nurFocusPreviewTime">25:00</strong><small id="nurFocusPreviewState">Ready when you are</small></div><button type="button" class="nur-power-primary" id="nurFocusLaunch">Open chamber ↗</button></div><p class="nur-power-help" id="nurFocusPreviewSummary"></p>';
frame.insertBefore(card,footer);
const dialog=el('dialog','nur-power-dialog nur-focus-dialog');dialog.id='nurFocusDialog';dialog.setAttribute('aria-labelledby','nurFocusTitle');
const shell=el('div','nur-power-shell');
const head=el('header','nur-power-head');const title=el('div');title.append(el('span','eyebrow','NUR · FOCUS CHAMBER'),el('h2','','One thing at a time'));title.querySelector('h2').id='nurFocusTitle';head.append(title,button('×','nur-power-close',close));head.querySelector('button').setAttribute('aria-label','Close Focus Chamber');
const content=el('div','nur-power-content');const notice=el('p','nur-power-notice');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');shell.append(head,content,notice);dialog.append(shell);doc.body.append(dialog);
const live=el('div','nur-focus-clock');live.setAttribute('role','timer');live.setAttribute('aria-label','Focus time remaining');live.innerHTML='<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="nur-focus-track"/><circle cx="60" cy="60" r="52" class="nur-focus-ring" pathLength="100"/></svg><div class="nur-focus-clock-copy"><strong id="nurFocusTime">25:00</strong><span id="nurFocusPhase">Ready</span></div>';
const settings=el('div','nur-focus-settings');
const presets=el('div','nur-focus-presets');
for(const minutes of [15,25,45,60]){const b=button(minutes+' min','nur-power-small',()=>{updateFocus(s=>F.configure(s,minutes*60),'Duration saved.');});b.dataset.minutes=String(minutes);presets.append(b);}
const duration=el('input','nur-power-input');duration.type='number';duration.min='1';duration.max='180';duration.step='1';duration.value='25';duration.setAttribute('aria-label','Custom duration in minutes');
const custom=button('Set duration','nur-power-small',()=>{const n=Number(duration.value);if(!Number.isInteger(n)||n<1||n>180){error='Choose 1–180 whole minutes.';paint();return;}updateFocus(s=>F.configure(s,n*60),'Custom duration saved.');});
const durationRow=el('div','nur-power-form-line');durationRow.append(duration,custom);
const taskLabel=el('label','nur-power-field');taskLabel.append(el('span','','Link an Amanah (optional)'));const task=el('select','nur-power-input');task.id='nurFocusTask';taskLabel.append(task);
const label=el('label','nur-power-field');label.append(el('span','','Session name'));const name=el('input','nur-power-input');name.maxLength=180;name.placeholder='Study, reading or personal work';label.append(name);
settings.append(presets,durationRow,taskLabel,label);
const actions=el('div','nur-focus-actions');
const primary=button('Start focus','nur-power-primary',()=>{
 const s=get(),phase=F.view(s,Date.now()).phase,now=Date.now();
 if(phase==='idle')updateFocus(v=>F.start(v,now,{label:name.value,taskId:task.value||null}),'Focus started.');
 else if(phase==='running')updateFocus(v=>F.pause(v,now),'Focus paused.');
 else if(phase==='paused')updateFocus(v=>F.resume(v,now),'Focus resumed.');
 else if(phase==='ready'){if(updateFocus(v=>F.finish(v,now,id()),'Session recorded.'))vibrateFocus();}
 manageWake();
});
const stop=button('Discard session','nur-power-small',()=>{if(window.confirm('Discard this active timer? Recorded sessions will remain untouched.')){updateFocus(F.stop,'Timer discarded.');manageWake();}});
actions.append(primary,stop);
const options=el('div','nur-focus-options');
function checkbox(text,key){const l=el('label','nur-focus-option'),i=el('input');i.type='checkbox';i.addEventListener('change',()=>{updatePrefs({[key]:i.checked});manageWake();});l.append(i,el('span','',text));options.append(l);return i;}
const quiet=checkbox('Quiet mode','quiet'),sound=checkbox('Completion sound','sound'),awake=checkbox('Keep screen awake during focus','keepAwake');
const history=el('section','nur-focus-history');history.innerHTML='<div class="nur-focus-history-head"><h3>Session history</h3><span id="nurFocusTodaySummary"></span></div><div id="nurFocusHistoryRows"></div>';
content.append(live,settings,actions,options,history);
const format=ms=>{const n=Math.ceil(Math.max(0,ms)/1000);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
function paint(){
 let s,v;try{s=get();v=F.view(s,Date.now());}catch(e){notice.textContent=e.message;return;}
 const active=!!s.clock,p=prefs();
 card.querySelector('#nurFocusPreviewTime').textContent=format(v.remainingMs);
 card.querySelector('#nurFocusPreviewState').textContent={idle:'Ready when you are',running:'Session in progress',paused:'Paused',ready:'Ready to record'}[v.phase];
 const summary=F.summary(s,F.localDate(Date.now()));card.querySelector('#nurFocusPreviewSummary').textContent=summary.count+' completed session'+(summary.count===1?'':'s')+' · '+summary.minutes+' minutes today';
 live.querySelector('.nur-focus-ring').style.strokeDasharray=v.progress*100+' 100';live.querySelector('#nurFocusTime').textContent=format(v.remainingMs);live.querySelector('#nurFocusPhase').textContent={idle:'Ready',running:'Stay with your intention',paused:'Paused',ready:'Session complete'}[v.phase];
 primary.textContent={idle:'Start focus',running:'Pause',paused:'Resume',ready:'Record completed session'}[v.phase];stop.hidden=!active;settings.hidden=active;
 presets.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',String(s.durationSeconds===Number(b.dataset.minutes)*60));});
 if(doc.activeElement!==duration)duration.value=String(s.durationSeconds/60);
 quiet.checked=p.quiet;sound.checked=p.sound;awake.checked=p.keepAwake;
 notice.textContent=error;
 history.querySelector('#nurFocusTodaySummary').textContent=summary.minutes+' min today';
 const rows=history.querySelector('#nurFocusHistoryRows');rows.replaceChildren();
 if(!s.sessions.length)rows.append(el('p','nur-power-empty','No completed sessions yet. Your history begins with your first recorded session.'));
 s.sessions.slice(-20).reverse().forEach(x=>{const row=el('div','nur-focus-history-row');row.append(el('strong','',x.label),el('small','',x.date+' · '+Math.round(x.durationSeconds/60)+' min'));rows.append(row);});
}
function refreshTasks(){const previous=task.value;task.replaceChildren();const o=el('option','', 'No linked task');o.value='';task.append(o);for(const x of readDay(todayKey()).tasks||[]){const option=el('option','',x.title);option.value=x.id;task.append(option);}task.value=previous||'';}
function open(){previousFocus=doc.activeElement;refreshTasks();paint();if(!dialog.open){if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');}head.querySelector('button').focus();}
function close(){if(dialog.open&&dialog.close)dialog.close();else dialog.removeAttribute('open');previousFocus?.focus?.();previousFocus=null;}
card.querySelector('#nurFocusLaunch').onclick=open;dialog.addEventListener('click',e=>{if(e.target===dialog)close();});dialog.addEventListener('close',()=>{previousFocus?.focus?.();previousFocus=null;});
const oldRender=window.render;if(typeof oldRender==='function')window.render=function nurFocusRender(){const result=oldRender.apply(this,arguments);paint();return result;};
function tick(){notifyReady();paint();}
ticker=window.setInterval(()=>{if(!doc.hidden)tick();},1000);
doc.addEventListener('visibilitychange',()=>{if(doc.hidden)manageWake();else{tick();manageWake();}});
window.addEventListener('focus',()=>{tick();manageWake();});window.addEventListener('pagehide',()=>{if(wake){wake.release?.();wake=null;}});
window.NURFocusUI={open,close,paint,getState:()=>clone(get()),configure:minutes=>updateFocus(s=>F.configure(s,minutes*60)),start:(values={})=>updateFocus(s=>F.start(s,Date.now(),values)),stop:()=>updateFocus(F.stop)};
paint();
})();