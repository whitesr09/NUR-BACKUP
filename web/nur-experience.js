/* NUR Level 2 — custom appearance and dashboard experience. No framework. */
(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) api.mount(root);
})(typeof window !== 'undefined' ? window : null, function(){
  'use strict';
  const KEY = 'nur-appearance-v1';
  const sections = [
    {id:'light',label:'Daily Light',symbol:'✦',selector:'.light-panel'},
    {id:'prayers',label:'Salah',symbol:'☾',selector:'.prayers-panel'},
    {id:'tasks',label:'Amanah',symbol:'✓',selector:'.tasks-panel'},
    {id:'muhasaba',label:'Muhasaba',symbol:'◇',selector:'.muhasaba-panel'},
    {id:'rhythm',label:'Rhythm',symbol:'▥',selector:'.rhythm-panel'},
    {id:'archive',label:'Archive',symbol:'▤',selector:'.archive-panel'}
  ];
  const ids = sections.map(x=>x.id);
  const palettes = {
    midnight:{name:'Gold & Midnight',dark:true,bg:'#030a17',surface:'#071527',card:'#0b1b30',text:'#f4f0e7',muted:'#a2afc1',line:'#32445c',accent:'#e6ad42',accentInk:'#211604',track:'#23334a',soft:'#e6ad4220'},
    ivory:{name:'Ivory & Gold',dark:false,bg:'#f5f0e6',surface:'#fffaf1',card:'#fffdf8',text:'#302b25',muted:'#665e52',line:'#d4c6b2',accent:'#926319',accentInk:'#fffaf1',track:'#e0d5c4',soft:'#92631918'},
    emerald:{name:'Emerald Night',dark:true,bg:'#041411',surface:'#0b211d',card:'#103029',text:'#e9f3ec',muted:'#a0bcb0',line:'#31584b',accent:'#8ed3ae',accentInk:'#082019',track:'#254438',soft:'#8ed3ae1d'},
    ocean:{name:'Ocean & Silver',dark:true,bg:'#07111f',surface:'#0c2036',card:'#112b45',text:'#edf4fa',muted:'#a5bed0',line:'#36536b',accent:'#9dcee9',accentInk:'#082034',track:'#2a415b',soft:'#9dcee91d'},
    monochrome:{name:'Obsidian',dark:true,bg:'#090a0d',surface:'#15171b',card:'#1d2025',text:'#f0f0ed',muted:'#b1b3b7',line:'#40434a',accent:'#d6d8dc',accentInk:'#18191c',track:'#34363c',soft:'#d6d8dc1b'}
  };
  const defaults = ()=>({version:1,theme:'midnight',motion:'system',density:'comfortable',fontScale:1,background:'artwork',order:ids.slice(),hidden:[]});
  const choice = (v,allowed,fallback)=>allowed.includes(v)?v:fallback;
  function normalize(value){
    const d=defaults();
    if(!value || typeof value!=='object' || Array.isArray(value))return d;
    const order=Array.isArray(value.order)?value.order.filter((x,i,a)=>ids.includes(x)&&a.indexOf(x)===i):[];
    return {
      version:1,
      theme:choice(value.theme,['system',...Object.keys(palettes)],d.theme),
      motion:choice(value.motion,['system','full','reduced'],d.motion),
      density:choice(value.density,['comfortable','compact','spacious'],d.density),
      fontScale:typeof value.fontScale==='number'&&Number.isFinite(value.fontScale)?Math.min(1.25,Math.max(0.9,Math.round(value.fontScale*20)/20)):1,
      background:choice(value.background,['artwork','quiet'],d.background),
      order:[...order,...ids.filter(x=>!order.includes(x))],
      hidden:Array.isArray(value.hidden)?ids.filter(x=>x!=='light'&&value.hidden.includes(x)):[]
    };
  }
  function move(order,id,direction){
    const result=order.slice(),i=result.indexOf(id),j=i+direction;
    if(i<0||j<0||j>=result.length)return result;
    [result[i],result[j]]=[result[j],result[i]];return result;
  }
  function resolveTheme(settings,systemDark){
    return palettes[settings.theme==='system'?(systemDark?'midnight':'ivory'):settings.theme]||palettes.midnight;
  }
  function mount(win){
    const doc=win.document, html=doc.documentElement;
    const shell=doc.querySelector('#appShell'),frame=doc.querySelector('.dashboard-frame');
    if(!shell||!frame||doc.querySelector('#nurExperienceBar'))return;
    const media=win.matchMedia?win.matchMedia('(prefers-color-scheme: dark)'):null;
    const reduced=win.matchMedia?win.matchMedia('(prefers-reduced-motion: reduce)'):null;
    let settings=defaults(),savedFocus=null;
    try{settings=normalize(JSON.parse(win.localStorage.getItem(KEY)||'null'));}catch{settings=defaults();}
    const el=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const button=(text,cls,fn)=>{const n=el('button',cls,text);n.type='button';if(fn)n.addEventListener('click',fn);return n;};
    const setText=(node,value)=>{if(node)node.textContent=value;};
    const status=el('p','nur-studio-status');status.id='nurStudioStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const announce=message=>setText(status,message);
    const main=el('div','nur-sections');main.id='nurDashboardSections';
    const nodes=new Map();
    for(const section of sections){const node=frame.querySelector(section.selector);if(node){node.id='nur-section-'+section.id;node.dataset.nurSection=section.id;nodes.set(section.id,node);main.appendChild(node);}}
    const footer=frame.querySelector('.frame-foot');
    if(footer)frame.insertBefore(main,footer);else frame.appendChild(main);
    const header=frame.querySelector('.hero-head');
    const bar=el('div','nur-experience-bar');bar.id='nurExperienceBar';
    const intro=el('div','nur-experience-heading');
    intro.append(el('span','nur-overline','YOUR DAILY JOURNEY'),el('strong','nur-experience-title','A day, with intention'));
    const tools=el('div','nur-experience-tools');
    const studioButton=button('✧  Appearance','nur-tool-button',()=>openStudio());studioButton.setAttribute('aria-haspopup','dialog');
    const customizeButton=button('Customize','nur-tool-button nur-tool-subtle',()=>openStudio('layout'));
    tools.append(studioButton,customizeButton);bar.append(intro,tools);
    header.insertAdjacentElement('afterend',bar);
    const journey=el('section','nur-journey');journey.id='nurJourney';journey.setAttribute('aria-label','Daily journey');
    const journeyTop=el('div','nur-journey-top');journeyTop.append(el('span','nur-overline','TODAY AT A GLANCE'),el('span','nur-journey-date'));
    const journeyText=el('h2','nur-journey-message','Begin with one sincere action.');
    const journeyMeta=el('p','nur-journey-meta','Your next step will appear here.');
    const journeyProgress=el('div','nur-journey-progress');journeyProgress.setAttribute('role','progressbar');journeyProgress.setAttribute('aria-label','Daily completion');journeyProgress.setAttribute('aria-valuemin','0');journeyProgress.setAttribute('aria-valuemax','100');
    journeyProgress.append(el('i','nur-journey-fill'));
    const journeyAction=button('Open Salah  ↗','nur-journey-action');
    journey.append(journeyTop,journeyText,journeyMeta,journeyProgress,journeyAction);
    bar.insertAdjacentElement('afterend',journey);
    const nav=el('nav','nur-section-nav');nav.setAttribute('aria-label','Dashboard sections');nav.id='nurSectionNav';journey.insertAdjacentElement('afterend',nav);
    const modal=el('dialog','nur-studio');modal.id='nurStudio';modal.setAttribute('aria-labelledby','nurStudioTitle');
    const panel=el('div','nur-studio-panel');
    const top=el('div','nur-studio-head');const head=el('div');head.append(el('span','nur-overline','PERSONALIZE YOUR NUR'),el('h2','', 'Appearance Studio'));head.querySelector('h2').id='nurStudioTitle';
    const closeButton=button('×','nur-studio-close',()=>closeStudio());closeButton.setAttribute('aria-label','Close Appearance Studio');top.append(head,closeButton);
    const tabs=el('div','nur-studio-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Appearance settings');
    const content=el('div','nur-studio-content');
    const actions=el('div','nur-studio-actions');
    const reset=button('Restore defaults','nur-tool-button nur-tool-subtle',()=>{commit(defaults(),'Appearance restored to defaults.');drawStudio();});
    const done=button('Done','nur-primary-button',()=>closeStudio());actions.append(reset,done);
    panel.append(top,tabs,content,status,actions);modal.append(panel);doc.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)closeStudio();});
    modal.addEventListener('close',()=>{savedFocus?.focus?.();savedFocus=null;});
    let currentTab='themes';
    function motionOff(){return settings.motion==='reduced'||(settings.motion==='system'&&!!reduced?.matches);}
    function apply(){
      const p=resolveTheme(settings,!!media?.matches);
      html.dataset.nurTheme=settings.theme;
      html.dataset.nurDensity=settings.density;
      html.dataset.nurBackground=settings.background;
      html.dataset.nurMotion=motionOff()?'reduced':'full';
      html.dataset.nurLight=p.dark?'false':'true';
      html.style.colorScheme=p.dark?'dark':'light';
      for(const [name,value] of Object.entries(p))if(typeof value==='string'&&name!=='name')html.style.setProperty('--nur-'+name.replace(/[A-Z]/g,x=>'-'+x.toLowerCase()),value);
      html.style.setProperty('--nur-font-scale',String(settings.fontScale));
      const themeMeta=doc.querySelector('meta[name="theme-color"]');if(themeMeta)themeMeta.content=p.bg;
      for(const id of settings.order){const node=nodes.get(id);if(node)main.appendChild(node);}
      for(const [id,node] of nodes)node.hidden=settings.hidden.includes(id);
      drawNavigation();
    }
    function commit(patch,message){
      const next=normalize(patch);
      try{win.localStorage.setItem(KEY,JSON.stringify(next));}catch(error){announce('Unable to save appearance settings. Your previous settings are unchanged.');return false;}
      settings=next;apply();announce(message||'Appearance saved.');return true;
    }
    function update(patch,message){return commit({...settings,...patch},message);}
    function drawNavigation(){
      nav.replaceChildren();
      for(const section of sections){
        if(settings.hidden.includes(section.id))continue;
        const b=button(section.symbol+'  '+section.label,'nur-nav-item',()=>navigate(section.id));b.dataset.nurTarget=section.id;
        nav.appendChild(b);
      }
      const more=button('⋯  More','nur-nav-item nur-nav-more',()=>openStudio('layout'));more.setAttribute('aria-label','Customize dashboard sections');nav.appendChild(more);
    }
    function navigate(id){
      const node=nodes.get(id);if(!node)return;
      if(settings.hidden.includes(id)){if(!update({hidden:settings.hidden.filter(x=>x!==id)},'Section restored.'))return;}
      for(const b of nav.querySelectorAll('[data-nur-target]'))b.setAttribute('aria-current',b.dataset.nurTarget===id?'location':'false');
      node.scrollIntoView({behavior:motionOff()?'instant':'smooth',block:'start'});
      if(id==='light')win.scrollTo?.({top:0,behavior:motionOff()?'instant':'smooth'});
    }
    function drawJourney(){
      if(typeof win.progressBreakdown!=='function'||typeof win.readDay!=='function')return;
      const d=win.readDay(),pb=win.progressBreakdown();
      const prayers=Array.isArray(d.prayers)?d.prayers:[];
      const nextPrayer=prayers.findIndex((v,i)=>i<5&&!v);
      const tasks=(d.tasks||[]).filter(x=>!x.done),intentions=(d.intentions||[]).filter(x=>!x.done);
      let title,detail,target,label;
      if(nextPrayer>=0){title='A moment for '+['Fajr','Dhuhr','Asr','Maghrib','Isha'][nextPrayer];detail='Continue your daily prayer journey.';target='prayers';label='Open Salah';}
      else if(tasks.length){title=tasks[0].title;detail=tasks.length+' responsibility'+(tasks.length===1?'':'ies')+' remaining.';target='tasks';label='Open Amanah';}
      else if(intentions.length){title=intentions[0].title;detail='Take a moment for self-accounting.';target='muhasaba';label='Open Muhasaba';}
      else{title='Your daily journey is complete';detail='Return to your reflections whenever you wish.';target='light';label='View Daily Light';}
      setText(journeyText,title);setText(journeyMeta,detail);
      setText(journey.querySelector('.nur-journey-date'),typeof win.prettyDate==='function'?win.prettyDate():new Date().toLocaleDateString());
      journeyProgress.setAttribute('aria-valuenow',String(pb.pct));journeyProgress.querySelector('i').style.width=pb.pct+'%';
      journeyAction.textContent=label+'  ↗';journeyAction.onclick=()=>navigate(target);
    }
    function sectionLayout(){
      const list=el('div','nur-layout-list');
      settings.order.forEach((id,index)=>{
        const section=sections.find(x=>x.id===id);if(!section)return;
        const row=el('div','nur-layout-row');
        const info=el('div','nur-layout-info');info.append(el('span','nur-layout-symbol',section.symbol),el('span','',section.label));
        const controls=el('div','nur-layout-controls');
        const up=button('↑','nur-mini-button',()=>{if(update({order:move(settings.order,id,-1)},'Section moved.'))drawStudio();});up.disabled=index===0;up.setAttribute('aria-label','Move '+section.label+' up');
        const down=button('↓','nur-mini-button',()=>{if(update({order:move(settings.order,id,1)},'Section moved.'))drawStudio();});down.disabled=index===settings.order.length-1;down.setAttribute('aria-label','Move '+section.label+' down');
        const toggle=el('input');toggle.type='checkbox';toggle.checked=!settings.hidden.includes(id);toggle.disabled=id==='light';toggle.setAttribute('aria-label','Show '+section.label);
        toggle.addEventListener('change',()=>{const hidden=toggle.checked?settings.hidden.filter(x=>x!==id):[...settings.hidden,id];if(update({hidden},'Dashboard visibility saved.'))drawStudio();});
        controls.append(up,down,toggle);row.append(info,controls);list.appendChild(row);
      });
      const showAll=button('Show all sections','nur-tool-button',()=>{if(update({hidden:[]},'All sections are visible.'))drawStudio();});
      return [el('p','nur-setting-help','Reorder cards with the arrows. Hidden sections remain available here and can be restored at any time.'),list,showAll];
    }
    function settingSelect(title,description,key,choices){
      const block=el('label','nur-setting');const caption=el('span','nur-setting-caption');caption.append(el('strong','',title),el('small','',description));
      const select=el('select','nur-select');select.name=key;
      for(const [value,label] of choices){const option=el('option','',label);option.value=value;select.appendChild(option);}
      select.value=settings[key];select.addEventListener('change',()=>{if(update({[key]:select.value},title+' saved.'))drawStudio();});
      block.append(caption,select);return block;
    }
    function drawStudio(){
      tabs.replaceChildren();content.replaceChildren();
      for(const [id,title] of [['themes','Themes'],['motion','Motion & type'],['layout','Dashboard']]){
        const b=button(title,'nur-studio-tab',()=>{currentTab=id;drawStudio();});b.setAttribute('role','tab');b.setAttribute('aria-selected',String(currentTab===id));b.tabIndex=currentTab===id?0:-1;tabs.append(b);
      }
      if(currentTab==='themes'){
        content.append(el('p','nur-setting-help','A signature look for every mood. The Arabic NUR identity and golden Daily Light are always preserved.'));
        const grid=el('div','nur-theme-grid');
        for(const [id,p] of Object.entries(palettes)){
          const b=button('','nur-theme-choice',()=>{if(update({theme:id},p.name+' selected.'))drawStudio();});
          b.setAttribute('aria-pressed',String(settings.theme===id));b.style.setProperty('--swatch-bg',p.bg);b.style.setProperty('--swatch-surface',p.surface);b.style.setProperty('--swatch-accent',p.accent);
          const sample=el('span','nur-theme-sample');sample.append(el('span','nur-theme-sun','✦'),el('span','nur-theme-sample-line'),el('span','nur-theme-sample-line short'));
          b.append(sample,el('strong','',p.name),el('small','',p.dark?'Dark palette':'Light palette'));grid.append(b);
        }
        content.append(grid);
        const system=button('Follow device appearance','nur-setting-choice',()=>{if(update({theme:'system'},'System appearance selected.'))drawStudio();});system.setAttribute('aria-pressed',String(settings.theme==='system'));content.append(system);
        content.append(settingSelect('Background','Keep the architectural artwork or choose a quieter surface.','background',[['artwork','Original artwork'],['quiet','Quiet gradient']]));
      }else if(currentTab==='motion'){
        content.append(settingSelect('Motion','Control transitions and completion feedback.','motion',[['system','Follow device'],['full','Expressive'],['reduced','Reduced']]));
        content.append(settingSelect('Card spacing','Choose how much breathing room the dashboard has.','density',[['compact','Compact'],['comfortable','Comfortable'],['spacious','Spacious']]));
        const block=el('label','nur-setting');const cap=el('span','nur-setting-caption');cap.append(el('strong','','Text size'),el('small','','Scale interface text without changing Arabic calligraphy.'));
        const range=el('input','nur-range');range.type='range';range.min='.9';range.max='1.25';range.step='.05';range.value=String(settings.fontScale);
        const value=el('span','nur-range-value',Math.round(settings.fontScale*100)+'%');range.addEventListener('input',()=>setText(value,Math.round(Number(range.value)*100)+'%'));
        range.addEventListener('change',()=>update({fontScale:Number(range.value)},'Text size saved.'));block.append(cap,range,value);content.append(block);
      }else content.append(...sectionLayout());
    }
    function openStudio(tab){
      currentTab=tab||'themes';drawStudio();setText(status,'');savedFocus=doc.activeElement;
      if(typeof modal.showModal==='function')modal.showModal();else modal.setAttribute('open','');
      closeButton.focus();
    }
    function closeStudio(){if(typeof modal.close==='function'&&modal.open)modal.close();else{modal.removeAttribute('open');savedFocus?.focus?.();savedFocus=null;}}
    if(media){const onChange=()=>{if(settings.theme==='system')apply();};if(media.addEventListener)media.addEventListener('change',onChange);else media.addListener?.(onChange);}
    if(reduced){const onChange=()=>{if(settings.motion==='system')apply();};if(reduced.addEventListener)reduced.addEventListener('change',onChange);else reduced.addListener?.(onChange);}
    win.addEventListener('storage',e=>{if(e.key!==KEY)return;try{settings=normalize(JSON.parse(e.newValue||'null'));apply();drawStudio();}catch{}});
    const baseRender=win.render;
    if(typeof baseRender==='function')win.render=function nurExperienceRender(){const result=baseRender.apply(this,arguments);drawJourney();return result;};
    apply();drawJourney();
    win.NURAppearance={get:()=>normalize(settings),update,open:openStudio,navigate};
  }
  return {KEY,sections,palettes,defaults,normalize,move,resolveTheme,mount};
});
