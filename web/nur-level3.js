/* NUR Level 3 — custom offline power-feature interface. */
(function () {
  'use strict';
  const P = window.NurPowerData;
  if (!P || typeof state === 'undefined' || !document.querySelector('.dashboard-frame')) return;
  const clone = x => JSON.parse(JSON.stringify(x));
  const $ = s => document.querySelector(s);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  const button = (label, cls, fn) => { const n = el('button', cls, label); n.type = 'button'; if (fn) n.addEventListener('click', fn); return n; };
  const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  let liveKey = todayKey(), activeView = 'tasks', selectedId = null, previousFocus = null, initialized = false, rolling = false;
  let noticeTimer;
  const notify = message => { const n = $('#nurPowerNotice'); if (n) n.textContent = message; if (typeof toast === 'function') toast(message); };
  const ensureWritable = () => { if (currentDate !== todayKey()) throw Error('Return to today before editing your active lists.'); };
  function write(next, message, repaint = true) {
    const serialized = JSON.stringify(next);
    try { localStorage.setItem(STORAGE, serialized); }
    catch (error) { notify('Unable to save. Your previous data is unchanged.'); return false; }
    state = next;
    if (repaint) render();
    if (message) notify(message);
    return true;
  }
  function change(operation, message) {
    try { roll(); ensureWritable(); const next = operation(state, todayKey()); return write(next, message); }
    catch (error) { notify(error.message || 'Unable to save this change.'); return false; }
  }
  function roll() {
    if (rolling) return;
    const now = todayKey();
    if (now === liveKey) return;
    rolling = true;
    try {
      const next = P.reconcile(state, now);
      const wasToday = currentDate === liveKey;
      if (write(next, null, false)) {
        liveKey = now;
        if (wasToday) currentDate = now;
      }
    } catch (error) { notify('The new day could not be initialized.'); }
    finally { rolling = false; }
  }
  function initialize() {
    if (initialized) return;
    try {
      const next = P.migrate(state, liveKey);
      if (state.meta.powerSchemaVersion !== P.VERSION) {
        const backup = 'nur-before-power-v1';
        if (!localStorage.getItem(backup)) localStorage.setItem(backup, JSON.stringify(state));
      }
      if (!write(P.reconcile(next, liveKey), null, false)) return;
      initialized = true;
    } catch (error) { notify('Power features could not be initialized: ' + error.message); }
  }
  initialize();
  if (!initialized) return;

  /* The existing V2 renderer and Muhasaba editor remain in place. These
     handlers supersede only task actions, so there is one task data owner. */
  const oldReadDay = readDay;
  readDay = function(k = currentDate) { if (k === liveKey && !rolling) roll(); return oldReadDay(k); };
  const oldRender = render;
  render = function nurPowerRender() {
    roll();
    const result = oldRender.apply(this, arguments);
    bindDashboard();
    drawGoals();
    return result;
  };
  function bindDashboard() {
    for (const [selector, attribute] of [['[data-task]','task'],['[data-task-pillar]','taskPillar']]) {
      document.querySelectorAll(selector).forEach(n => {
        n.onclick = () => { if (change((s,k) => P.toggleTask(s,n.dataset[attribute],k),'Amanah updated')) vibrate(16); };
      });
    }
  }
  const oldOpenModal = openModal;
  openModal = function(type) { if (type === 'tasks') { open('tasks'); return; } return oldOpenModal.apply(this, arguments); };

  /* Build the Goals card before Appearance Studio gathers the dashboard. */
  const frame = $('.dashboard-frame');
  const goals = el('article','panel nur-goals-panel');
  goals.id = 'nurGoalsPanel';
  goals.innerHTML = '<div class="panel-head"><div><span class="eyebrow">LONG-TERM GROWTH</span><h2>Goals & milestones</h2></div></div><div id="nurGoalsPreview"></div>';
  const manageGoals = button('Manage goals ↗','link-btn',() => open('goals'));
  goals.querySelector('.panel-head').appendChild(manageGoals);
  frame.insertBefore(goals,frame.querySelector('.frame-foot'));

  const dialog = el('dialog','nur-power-dialog');
  dialog.id = 'nurPowerDialog';
  dialog.setAttribute('aria-labelledby','nurPowerTitle');
  const shell = el('div','nur-power-shell');
  const head = el('header','nur-power-head');
  const heading = el('div'); heading.append(el('span','eyebrow','NUR · INTENTIONAL LIVING'),el('h2','', 'Amanah'));
  heading.querySelector('h2').id = 'nurPowerTitle';
  head.append(heading,button('×','nur-power-close',close));
  head.querySelector('button').setAttribute('aria-label','Close');
  const tabs = el('nav','nur-power-tabs'); tabs.setAttribute('aria-label','Power feature sections');
  const content = el('div','nur-power-content');
  const notice = el('p','nur-power-notice'); notice.id = 'nurPowerNotice'; notice.setAttribute('role','status'); notice.setAttribute('aria-live','polite');
  shell.append(head,tabs,content,notice); dialog.append(shell); document.body.appendChild(dialog);
  dialog.addEventListener('click',e => { if (e.target === dialog) close(); });
  dialog.addEventListener('close',() => { if (previousFocus?.isConnected) previousFocus.focus(); previousFocus = null; });
  function open(view = 'tasks', id = null) {
    if (!initialized) return;
    activeView = view; selectedId = id; previousFocus = document.activeElement;
    draw();
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open','');
    head.querySelector('button').focus();
  }
  function close() {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else { dialog.removeAttribute('open'); if (previousFocus?.isConnected) previousFocus.focus(); previousFocus = null; }
  }
  function field(label,name,value='',type='text',extra='') {
    const wrap = el('label','nur-power-field');
    const span = el('span','',label); const input = el('input','nur-power-input');
    input.name=name; input.type=type; input.value=String(value??'');
    if (extra) input.setAttribute('placeholder',extra);
    wrap.append(span,input); return wrap;
  }
  function select(label,name,options,value) {
    const wrap=el('label','nur-power-field');wrap.appendChild(el('span','',label));
    const s=el('select','nur-power-input');s.name=name;
    options.forEach(([v,l])=>{const o=el('option','',l);o.value=v;s.append(o);});s.value=value;wrap.append(s);return wrap;
  }
  function scheduleText(s) {
    if (!s) return 'Every day';
    if (s.type === 'once') return 'Once · ' + s.startOn;
    if (s.type === 'weekdays') return s.days.map(i=>['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]).join(', ') || 'No weekdays selected';
    return 'Every day';
  }
  function confirmRemove(message, action) {
    if (window.confirm(message)) action();
  }
  function draw() {
    tabs.replaceChildren(); content.replaceChildren(); notice.textContent='';
    for (const [id,label] of [['tasks','Amanah'],['goals','Goals']]) {
      const b=button(label,'nur-power-tab',()=>{activeView=id;selectedId=null;draw();});
      b.setAttribute('aria-current',String(activeView===id));tabs.append(b);
    }
    $('#nurPowerTitle').textContent=activeView==='tasks'?'Amanah':'Goals & milestones';
    if (activeView==='tasks') drawTasks(); else drawGoalEditor();
  }
  function drawTasks() {
    const definitions=state.meta.persistentTasks||[];
    const today=readDay(todayKey());
    const summary=el('p','nur-power-help','Your responsibilities stay saved. Only the checkboxes reset on their scheduled days.');content.append(summary);
    const add=button('+ New responsibility','nur-power-primary',()=>{selectedId='new';draw();});content.append(add);
    if (selectedId==='new'||definitions.some(x=>x.id===selectedId)) {
      content.append(taskForm(definitions.find(x=>x.id===selectedId)));
      return;
    }
    const list=el('div','nur-power-list');
    if(!definitions.length)list.append(el('p','nur-power-empty','No responsibilities yet. Add one to begin.'));
    definitions.forEach(x=>{
      const row=el('div','nur-power-row');const detail=el('div','nur-power-row-copy');
      detail.append(el('strong','',x.title),el('small','',x.category+' · '+scheduleText(x.schedule)));
      const active=today.tasks.find(t=>t.id===x.id);
      if(active){const check=el('input');check.type='checkbox';check.checked=!!active.done;check.setAttribute('aria-label','Complete '+x.title);
        check.addEventListener('change',()=>{if(change((s,k)=>P.toggleTask(s,x.id,k),'Amanah updated'))draw();});row.append(check);}
      else row.append(el('span','nur-power-not-due','Not due'));
      const edit=button('Edit','nur-power-small',()=>{selectedId=x.id;draw();});
      row.append(detail,edit);list.append(row);
    });content.append(list);
  }
  function taskForm(item) {
    const form=el('form','nur-power-form');
    const s=item?.schedule||P.schedule({},todayKey());
    form.append(el('h3','',item?'Edit responsibility':'New responsibility'));
    const title=field('Responsibility','title',item?.title||'');title.querySelector('input').required=true;title.querySelector('input').maxLength=180;
    form.append(title,field('Category','category',item?.category||'Personal'));
    const type=select('Repeat','repeat',[['daily','Every day'],['weekdays','Selected weekdays'],['once','One time']],s.type);
    const days=el('fieldset','nur-power-days');days.append(el('legend','','Repeat on'));
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((name,i)=>{
      const label=el('label','nur-power-day');const c=el('input');c.type='checkbox';c.name='weekday';c.value=String(i);c.checked=s.days.includes(i);label.append(c,el('span','',name));days.append(label);
    });
    const end=field('End date (optional)','endOn',s.endOn||'','date');
    const start=field('Start date','startOn',s.startOn||todayKey(),'date');start.querySelector('input').required=true;
    const show=()=>{days.hidden=type.querySelector('select').value!=='weekdays';end.hidden=type.querySelector('select').value==='once';};
    type.querySelector('select').addEventListener('change',show);
    form.append(type,days,start,end);show();
    const actions=el('div','nur-power-actions');
    const submit=el('button','nur-power-primary',item?'Save changes':'Add responsibility');submit.type='submit';
    actions.append(submit,button('Cancel','nur-power-small',()=>{selectedId=null;draw();}));
    if(item)actions.append(button('Delete','nur-power-danger',()=>confirmRemove('Delete this responsibility? Its past history will remain.',()=>{if(change((s,k)=>P.removeTask(s,item.id,k),'Responsibility removed')){selectedId=null;draw();}})));
    form.append(actions);
    form.addEventListener('submit',e=>{
      e.preventDefault();const fd=new FormData(form);const repeat=String(fd.get('repeat'));
      const selected=fd.getAll('weekday').map(Number);
      const startOn=String(fd.get('startOn')||'');const endOn=repeat==='once'?null:String(fd.get('endOn')||'')||null;
      if(!P.date(startOn)||endOn&&!P.date(endOn)||endOn&&endOn<startOn){notify('Enter a valid date range.');return;}
      if(repeat==='weekdays'&&!selected.length){notify('Select at least one weekday.');return;}
      const values={title:String(fd.get('title')||''),category:String(fd.get('category')||''),schedule:{type:repeat,days:selected,startOn,endOn}};
      const ok=change((s,k)=>item?P.editTask(s,item.id,values,k):P.addTask(s,values,k),item?'Responsibility saved':'Responsibility added');
      if(ok){selectedId=null;draw();}
    });
    return form;
  }
  function drawGoals() {
    const mount=$('#nurGoalsPreview');if(!mount)return;mount.replaceChildren();
    const goals=(state.meta.powerGoals||[]).filter(g=>!g.archived);
    if(!goals.length){mount.append(el('p','nur-power-empty','Set a meaningful goal and move forward one step at a time.'));return;}
    goals.slice(0,3).forEach(g=>{
      const row=el('div','nur-goal-preview');row.append(el('strong','',g.title));
      const line=el('div','nur-goal-track');const fill=el('i');fill.style.width=P.goalProgress(g)+'%';line.append(fill);
      row.append(line,el('small','',g.current+' / '+g.target+' '+g.unit+' · '+P.goalProgress(g)+'%'));
      row.append(button('View milestones ↗','link-btn',()=>open('goals',g.id)));mount.append(row);
    });
  }
  function drawGoalEditor() {
    const goals=state.meta.powerGoals||[];
    const current=goals.find(g=>g.id===selectedId);
    if(selectedId==='new'||current){content.append(goalForm(current));return;}
    content.append(el('p','nur-power-help','Build long-term consistency with measurable targets and small milestones. Goals do not reset at midnight.'));
    content.append(button('+ New goal','nur-power-primary',()=>{selectedId='new';draw();}));
    const list=el('div','nur-power-list');
    if(!goals.length)list.append(el('p','nur-power-empty','No goals yet. Choose something meaningful to work toward.'));
    goals.forEach(g=>{
      const row=el('div','nur-goal-card');
      const top=el('div','nur-power-goal-head');top.append(el('strong','',g.title),el('span','',P.goalProgress(g)+'%'));row.append(top);
      const track=el('div','nur-goal-track');const fill=el('i');fill.style.width=P.goalProgress(g)+'%';track.append(fill);row.append(track);
      row.append(el('small','',g.current+' / '+g.target+' '+g.unit+(g.dueOn?' · Due '+g.dueOn:'')+(g.archived?' · Archived':'')));
      row.append(button('Open goal','nur-power-small',()=>{selectedId=g.id;draw();}));list.append(row);
    });content.append(list);
  }
  function goalForm(item) {
    const form=el('form','nur-power-form');form.append(el('h3','',item?'Goal details':'Create a goal'));
    const title=field('Goal','title',item?.title||'');title.querySelector('input').required=true;
    const target=field('Target','target',item?.target||1,'number');target.querySelector('input').min='0.000001';target.querySelector('input').step='any';target.querySelector('input').required=true;
    const current=field('Current progress','current',item?.current||0,'number');current.querySelector('input').min='0';current.querySelector('input').step='any';current.querySelector('input').required=true;
    form.append(title,field('Unit','unit',item?.unit||'steps'),target,current,field('Target date (optional)','dueOn',item?.dueOn||'','date'));
    const actions=el('div','nur-power-actions');const submit=el('button','nur-power-primary',item?'Save goal':'Create goal');submit.type='submit';actions.append(submit,button('Back','nur-power-small',()=>{selectedId=null;draw();}));form.append(actions);
    form.addEventListener('submit',e=>{
      e.preventDefault();const fd=new FormData(form);const target=Number(fd.get('target')),current=Number(fd.get('current'));const dueOn=String(fd.get('dueOn')||'')||null;
      if(!Number.isFinite(target)||target<=0||!Number.isFinite(current)||current<0||dueOn&&!P.date(dueOn)){notify('Enter valid goal progress and dates.');return;}
      const values={title:String(fd.get('title')||''),unit:String(fd.get('unit')||''),target,current,dueOn};
      const ok=change((s,k)=>item?P.editGoal(s,item.id,values):P.addGoal(s,values,k),item?'Goal saved':'Goal created');
      if(ok){selectedId=item?.id||null;draw();}
    });
    if(item){
      const milestones=el('div','nur-power-milestones');milestones.append(el('h3','','Milestones'));
      item.milestones.forEach(m=>{
        const row=el('div','nur-power-row');const label=el('label','nur-power-milestone');const c=el('input');c.type='checkbox';c.checked=m.done;c.addEventListener('change',()=>{if(change(s=>P.toggleMilestone(s,item.id,m.id),'Milestone updated'))draw();});
        label.append(c,el('span','',m.title));row.append(label,button('×','nur-power-small',()=>confirmRemove('Remove this milestone?',()=>{if(change(s=>P.removeMilestone(s,item.id,m.id),'Milestone removed'))draw();})));milestones.append(row);
      });
      const add=el('form','nur-power-form-line');const input=el('input','nur-power-input');input.placeholder='Add a milestone';input.required=true;input.maxLength=180;const submit=el('button','nur-power-small','Add');submit.type='submit';add.append(input,submit);
      add.addEventListener('submit',e=>{e.preventDefault();const title=input.value.trim();if(change(s=>P.addMilestone(s,item.id,title),'Milestone added'))draw();});milestones.append(add);form.append(milestones);
      const danger=el('div','nur-power-actions');danger.append(button(item.archived?'Restore goal':'Archive goal','nur-power-small',()=>{if(change(s=>P.editGoal(s,item.id,{archived:!item.archived}),'Goal updated'))draw();}));
      danger.append(button('Delete goal','nur-power-danger',()=>confirmRemove('Permanently delete this goal and its milestones?',()=>{if(change(s=>P.removeGoal(s,item.id),'Goal deleted')){selectedId=null;draw();}})));form.append(danger);
    }
    return form;
  }
  window.NURPowerUI={open,close,draw,drawGoals,getState:()=>clone(state)};
  window.addEventListener('focus',()=>{roll();if(dialog.open)draw();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){roll();if(dialog.open)draw();}});
  setInterval(roll,30000);
  render();
})();