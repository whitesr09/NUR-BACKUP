/* NUR progression renderer. Reads existing completion values; never changes tracking data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root?.document)api.mount(root);})(typeof window!=='undefined'?window:null,function(){
'use strict';
const NS='http://www.w3.org/2000/svg';
const svg=(doc,tag,attrs={})=>{const n=doc.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
const clamp=v=>Math.max(0,Math.min(100,Number.isFinite(Number(v))?Number(v):0));
function mount(win){
 const D=win.NurProData;if(!D)return;
 const doc=win.document,installed=new Map();let config=D.defaults();
 function resolve(target){return config.progress[target]||D.defaults().progress.light;}
 function reduced(){return config.motion==='reduced'||(config.motion==='system'&&!!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches);}
 function visual(host,source,target,ring,read){
  if(!host||!source)return;
  const s=resolve(target),existing=installed.get(host);
  if(s.style==='classic'){if(existing){existing.observer?.disconnect();existing.svg.remove();installed.delete(host);}host.classList.remove('nur-progress-custom');host.style.removeProperty('--nur-progress-thickness');host.style.removeProperty('--nur-progress-glow');if(source!==host)source.style.removeProperty('opacity');return;}
  let entry=existing;
  if(!entry){
   const picture=svg(doc,'svg',{viewBox:ring?'0 0 100 100':'0 0 100 100',preserveAspectRatio:ring?'xMidYMid meet':'none','aria-hidden':'true',class:'nur-pro-progress-svg'});
   const defs=svg(doc,'defs'),gradient=svg(doc,'linearGradient',{id:'nur-grad-'+(++mount.counter),x1:'0%',x2:'100%',y1:'0%',y2:'0%'});
   gradient.append(svg(doc,'stop',{offset:'0%','stop-color':'var(--nur-accent)'}),svg(doc,'stop',{offset:'100%','stop-color':'var(--nur-gold-bright)'}));defs.append(gradient);picture.append(defs);
   const track=svg(doc,'path',{class:'nur-pro-progress-track',fill:'none',pathLength:'100'}),fill=svg(doc,'path',{class:'nur-pro-progress-fill',fill:'none',pathLength:'100',stroke:'url(#'+gradient.id+')'});
   picture.append(track,fill);host.append(picture);entry={svg:picture,track,fill,source,ring,read,observer:null,percent:-1,style:null};installed.set(host,entry);
   if(source!==host){entry.observer=new MutationObserver(()=>update(entry,target));entry.observer.observe(source,{attributes:true,attributeFilter:['style','class']});}
  }
  host.classList.add('nur-progress-custom');host.style.setProperty('--nur-progress-thickness',s.thickness+'px');host.style.setProperty('--nur-progress-glow',s.glow+'px');
  if(source!==host)source.style.opacity='0';
  entry.target=target;entry.read=read;entry.ring=ring;update(entry,target);
 }
 function update(entry,target){
  const D=win.NurProData,s=resolve(target),p=clamp(entry.read());
  if(entry.style!==s.style){
   const d=entry.ring?D.ring(s.style):D.geometry(s.style,100).path;
   entry.track.setAttribute('d',d);entry.fill.setAttribute('d',d);
   const segmented=s.style==='segmented';
   entry.track.setAttribute('stroke-dasharray',segmented?'3 2':'100 0');entry.fill.setAttribute('stroke-dasharray',segmented?'3 2':'0 100');
   if(segmented){let clip=entry.svg.querySelector('.nur-pro-clip');if(!clip){clip=svg(doc,'clipPath',{id:'nur-clip-'+(++mount.counter),class:'nur-pro-clip'});clip.append(svg(doc,'rect',{x:'0',y:'0',width:'0',height:'100'}));entry.svg.querySelector('defs').append(clip);}entry.fill.setAttribute('clip-path','url(#'+clip.id+')');}
   else entry.fill.removeAttribute('clip-path');
   entry.style=s.style;
  }
  const width=entry.ring?Math.max(1.5,s.thickness/2.5):Math.max(2,s.thickness*1.4);
  entry.track.setAttribute('stroke-width',width);entry.fill.setAttribute('stroke-width',width);
  entry.fill.setAttribute('stroke-linecap',s.style==='segmented'?'butt':'round');entry.track.setAttribute('stroke-linecap',s.style==='segmented'?'butt':'round');
  if(s.style==='segmented')entry.svg.querySelector('.nur-pro-clip rect').setAttribute('width',String(p));
  else entry.fill.style.strokeDasharray=p+' '+(100-p);
  entry.svg.dataset.nurStyle=s.style;
  entry.svg.style.setProperty('--nur-pro-speed',reduced()?'0ms':Math.round(450/config.motionSpeed)+'ms');
  entry.percent=p;
 }
 mount.counter=0;
 function refresh(){
  if(!doc.querySelector('#appShell'))return;
  const progress=typeof win.progressBreakdown==='function'?win.progressBreakdown():null;
  const light=doc.querySelector('#lightOrbit');if(light)visual(light,light,'light',true,()=>progress?.pct??parseFloat(light.style.getPropertyValue('--angle'))/3.6);
  const mu=doc.querySelector('#muhasabaDonut');if(mu)visual(mu,mu,'muhasaba',true,()=>Number(doc.querySelector('#muhasabaPercent')?.textContent)||0);
  const prayer=doc.querySelector('#prayerProgressBar');if(prayer)visual(prayer.parentElement,prayer,'prayers',false,()=>Number(doc.querySelector('#prayerCount')?.textContent.split('/')[0])*20);
  doc.querySelectorAll('#taskPillars .task-pillar').forEach(node=>{const track=node.querySelector('.pillar-shell'),fill=track?.querySelector('i');if(track&&fill)visual(track,fill,'tasks',false,()=>node.classList.contains('lit')?100:0);});
  doc.querySelectorAll('#weekBars .week-arch').forEach(track=>{const fill=track.querySelector('.week-fill');if(fill)visual(track,fill,'rhythm',false,()=>parseFloat(fill.style.height)||0);});
  doc.querySelectorAll('.nur-journey-progress,.nur-goal-track').forEach(track=>{const fill=track.querySelector('i');if(fill)visual(track,fill,'light',false,()=>parseFloat(fill.style.width)||0);});
  for(const [host,entry] of installed)if(!host.isConnected){entry.observer?.disconnect();installed.delete(host);}
 }
 function configure(value){config=D.normalize(value);refresh();}
 function destroy(){for(const entry of installed.values()){entry.observer?.disconnect();entry.svg.remove();if(entry.source!==entry.svg.parentElement)entry.source.style.removeProperty('opacity');}installed.clear();}
 const api={configure,refresh,destroy,getConfig:()=>D.normalize(config)};win.NURProgress=api;return api;
 }
 return {mount};
});