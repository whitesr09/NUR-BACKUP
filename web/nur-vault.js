/* NUR Level 3: offline backup validation, recovery, and storage transactions. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NurVault=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const KEYS={data:'nur-data-v1',start:'nur-first-run-date',appearance:'nur-appearance-v1',recovery:'nur-vault-recovery-v1'};
const MAX_BYTES=16*1024*1024;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const clone=x=>JSON.parse(JSON.stringify(x));
const validDate=k=>typeof k==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(k)&&!Number.isNaN(Date.parse(k+'T12:00:00'))&&new Date(k+'T12:00:00').toISOString().slice(0,10)===k;
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function validateState(input){
  if(!object(input)||!object(input.days)||!object(input.meta))throw Error('Invalid NUR data structure.');
  if(input.meta.powerSchemaVersion!==undefined&&(!Number.isInteger(input.meta.powerSchemaVersion)||input.meta.powerSchemaVersion>1||input.meta.powerSchemaVersion<0))throw Error('This backup requires a different NUR data version.');
  if(input.meta.startedOn!==undefined&&!validDate(input.meta.startedOn))throw Error('Invalid tracking start date.');
  for(const field of ['persistentTasks','persistentIntentions','powerGoals'])if(input.meta[field]!==undefined&&!Array.isArray(input.meta[field]))throw Error('Invalid '+field+' data.');
  for(const [k,d] of Object.entries(input.days)){
    if(!validDate(k)||!object(d))throw Error('Invalid daily record.');
    if(d.prayers!==undefined&&(!Array.isArray(d.prayers)||d.prayers.length!==5||d.prayers.some(x=>typeof x!=='boolean')))throw Error('Invalid prayer record.');
    for(const field of ['tasks','intentions','notes','money','inactiveTasks','inactiveIntentions']){
      if(d[field]!==undefined&&(!Array.isArray(d[field])||d[field].some(x=>!object(x))))throw Error('Invalid '+field+' record.');
    }
    for(const entry of d.money||[])if(!Number.isFinite(Number(entry.amount))||Number(entry.amount)<0)throw Error('Invalid money amount.');
  }
  return clone(input);
}
function makeBackup(state,appearance,now=new Date().toISOString()){
  return JSON.stringify({format:'nur-backup',version:1,exportedAt:now,state:validateState(state),appearance:appearance||null},null,2);
}
function inspect(raw,engine,today=localDate(),appearanceAPI){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_BYTES)throw Error('The backup is empty or larger than 16 MB.');
  const doc=JSON.parse(raw);
  if(!object(doc)||doc.format!=='nur-backup'||doc.version!==1)throw Error('Unsupported NUR backup format.');
  const original=validateState(doc.state);
  const migrated=engine.migrate(original,today);
  const appearance=object(doc.appearance)?(appearanceAPI?appearanceAPI.normalize(doc.appearance):clone(doc.appearance)):null;
  const days=Object.keys(original.days).sort();
  return {state:migrated,appearance,summary:{exportedAt:doc.exportedAt||null,startedOn:original.meta.startedOn||null,days:days.length,firstDay:days[0]||null,lastDay:days.at(-1)||null,tasks:(migrated.meta.persistentTasks||[]).length,intentions:(migrated.meta.persistentIntentions||[]).length,goals:(migrated.meta.powerGoals||[]).length,notes:days.reduce((n,k)=>n+(original.days[k].notes||[]).length,0),money:days.reduce((n,k)=>n+(original.days[k].money||[]).length,0)}};
}
function snapshot(storage){const values={};for(const k of [KEYS.data,KEYS.start,KEYS.appearance])values[k]=storage.getItem(k);return values;}
function apply(storage,values){for(const [k,v] of Object.entries(values)){if(v===null||v===undefined)storage.removeItem(k);else storage.setItem(k,v);}}
function restore(storage,prepared){
  if(!object(prepared)||!object(prepared.state))throw Error('Validate a backup before restoring.');
  const before=snapshot(storage);
  const recovery=JSON.stringify({format:'nur-recovery',version:1,savedAt:new Date().toISOString(),values:before});
  const next={...before,[KEYS.data]:JSON.stringify(prepared.state),[KEYS.start]:prepared.state.meta.startedOn||localDate()};
  if(prepared.appearance!==null&&prepared.appearance!==undefined)next[KEYS.appearance]=JSON.stringify(prepared.appearance);
  storage.setItem(KEYS.recovery,recovery);
  try{apply(storage,next);}catch(error){
    try{apply(storage,before);}catch(rollbackError){throw Error('Restore failed and automatic rollback was incomplete. Your recovery copy is still saved.');}
    throw Error('Restore failed. Your previous data has been restored.');
  }
  return true;
}
function recovery(storage){const raw=storage.getItem(KEYS.recovery);if(!raw)return null;const doc=JSON.parse(raw);if(!object(doc)||doc.format!=='nur-recovery'||doc.version!==1||!object(doc.values))throw Error('Invalid recovery copy.');return doc;}
function restoreRecovery(storage){const doc=recovery(storage);if(!doc)throw Error('No recovery copy is available.');const before=snapshot(storage);try{apply(storage,doc.values);}catch(error){try{apply(storage,before);}catch{}throw Error('Could not restore the recovery copy.');}return true;}
return {KEYS,MAX_BYTES,validDate,localDate,validateState,makeBackup,inspect,snapshot,restore,recovery,restoreRecovery};
});