/* NUR Level 1 — persistent definitions, immutable daily history. */
(() => {
  if (typeof state === 'undefined' || typeof todayKey !== 'function') return;
  const META_KEY = 'persistentListsV3';
  const FIELDS = {tasks:'persistentTasks', intentions:'persistentIntentions'};
  const validDate = k => /^\d{4}-\d{2}-\d{2}$/.test(k);
  const clone = x => JSON.parse(JSON.stringify(x));
  const definitions = field => state.meta[FIELDS[field]];
  const strip = x => { const {done, ...rest} = x; return rest; };
  const fresh = x => ({...clone(x),done:false});
  let liveDate = todayKey();
  let busy = false;
  let lastSaved = null;

  function normalize(){
    if (!state.meta || typeof state.meta !== 'object') state.meta = {};
    if (!state.days || typeof state.days !== 'object') state.days = {};
    if (!state.meta[META_KEY]){
      const legacyComplete = state.meta.persistentListsV2 === true;
      for (const field of Object.keys(FIELDS)){
        const saved = state.meta[FIELDS[field]];
        if (legacyComplete && Array.isArray(saved)){
          state.meta[FIELDS[field]] = saved.filter(x => x && typeof x === 'object').map(strip);
          continue;
        }
        const latest = Object.keys(state.days).filter(validDate).filter(k => Array.isArray(state.days[k]?.[field]) && state.days[k][field].length).sort().reverse()[0];
        state.meta[FIELDS[field]] = (latest ? state.days[latest][field] : []).filter(x => x && typeof x === 'object').map(strip);
      }
      state.meta[META_KEY] = true;
    }
    for (const field of Object.keys(FIELDS)) if (!Array.isArray(definitions(field))) state.meta[FIELDS[field]] = [];
  }

  function materialize(k){
    if (!state.days[k]) state.days[k] = emptyDay();
    const d = state.days[k];
    if (!d.dailyListsV3){
      for (const field of Object.keys(FIELDS)){
        const existing = new Map((Array.isArray(d[field]) ? d[field] : []).map(x => [x.id,x]));
        d[field] = definitions(field).map(x => existing.has(x.id) ? {...clone(x),done:!!existing.get(x.id).done} : fresh(x));
      }
      d.dailyListsV3 = true;
    }
    return d;
  }

  function saveSafely(){
    const serialized = JSON.stringify(state);
    try {
      localStorage.setItem(STORAGE,serialized);
      lastSaved = serialized;
      return true;
    } catch(error){
      console.error('NUR data could not be saved',error);
      const el = document.querySelector('#toast');
      if (el){el.textContent='Storage is full or unavailable. Your changes could not be saved.';el.classList.remove('hidden');}
      return false;
    }
  }

  normalize();
  materialize(liveDate);
  saveSafely();

  const originalReadDay = readDay;
  readDay = function(k=currentDate){
    return k === liveDate ? materialize(k) : originalReadDay(k);
  };
  const originalDay = day;
  day = function(k=currentDate){
    return k === liveDate ? materialize(k) : originalDay(k);
  };
  persist = saveSafely;

  function editList(field, operation, id, values){
    rollDay();
    if (currentDate !== liveDate){
      toast('Return to today to edit your active lists.');
      return false;
    }
    const master = definitions(field);
    const d = materialize(liveDate);
    const index = master.findIndex(x => x.id === id);
    if (operation === 'add'){
      const item = {id:uid(),title:values.title,category:values.category || (field === 'tasks' ? 'Personal' : 'Muhasaba')};
      master.push(item);
      d[field].push(fresh(item));
    } else if (operation === 'delete'){
      if (index < 0) return false;
      master.splice(index,1);
      d[field] = d[field].filter(x => x.id !== id);
    } else if (operation === 'toggle'){
      const item = d[field].find(x => x.id === id);
      if (!item) return false;
      item.done = !item.done;
    } else return false;
    saveSafely();
    return true;
  }

  /* Rebind the existing controls without changing their markup or animation classes. */
  const originalBindModal = bindModal;
  bindModal = function(type){
    originalBindModal(type);
    const field = type === 'tasks' ? 'tasks' : type === 'muhasaba' ? 'intentions' : null;
    if (!field) return;
    const form = document.querySelector(field === 'tasks' ? '#taskForm' : '#intentionForm');
    if (form) form.onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(form);
      const title = String(fd.get('title') || '').trim();
      if (!title) return;
      if (editList(field,'add',null,{title,category:String(fd.get('category') || '').trim()})) refreshModal(type);
    };
    document.querySelectorAll((field === 'tasks' ? '#taskRows' : '#intentionRows')+' [data-id]').forEach(row => {
      const toggle = row.querySelector('[data-toggle]');
      const remove = row.querySelector('[data-delete]');
      if (toggle) toggle.onclick = () => {if(editList(field,'toggle',row.dataset.id)){vibrate();refreshModal(type);}};
      if (remove) remove.onclick = () => {if(editList(field,'delete',row.dataset.id)) refreshModal(type);};
    });
  };

  /* Dashboard handlers are created during render, so rebind after each render. */
  const originalRender = render;
  render = function(){
    originalRender();
    for (const [selector,field,attribute] of [['[data-task]','tasks','task'],['[data-task-pillar]','tasks','taskPillar'],['[data-intention]','intentions','intention']]){
      document.querySelectorAll(selector).forEach(button => {
        button.onclick = () => {
          if(editList(field,'toggle',button.dataset[attribute])){
            vibrate(16);
            save(field === 'tasks' ? 'Task updated' : 'Muhasaba updated');
          }
        };
      });
    }
  };

  function rollDay(){
    if (busy) return;
    const now = todayKey();
    if (now === liveDate) return;
    busy = true;
    const wasLive = currentDate === liveDate;
    liveDate = now;
    materialize(now);
    saveSafely();
    if (wasLive){currentDate = now;render();}
    busy = false;
  }
  window.addEventListener('focus',rollDay);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden) rollDay();});
  setInterval(rollDay,30000);
  render();
})();