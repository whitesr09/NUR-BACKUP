/* NUR Vault — a local, explicit backup and restore workflow. */
(function(){
'use strict';
const V=window.NurVault,P=window.NurPowerData;
if(!V||!P||!window.NURPowerUI||document.querySelector('#nurVault'))return;
const doc=document,el=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(text,cls,fn)=>{const n=el('button',cls,text);n.type='button';n.addEventListener('click',fn);return n;};
const dialog=el('dialog','nur-power-dialog nur-vault-dialog');dialog.id='nurVault';dialog.setAttribute('aria-labelledby','nurVaultTitle');
const shell=el('div','nur-power-shell');const head=el('header','nur-power-head');const title=el('div');title.append(el('span','eyebrow','NUR · PRIVATE ARCHIVE'),el('h2','','Backup & restore'));title.querySelector('h2').id='nurVaultTitle';
let previousFocus=null,pending=null,busy=false;
const closeButton=button('×','nur-power-close',close);closeButton.setAttribute('aria-label','Close vault');head.append(title,closeButton);
const content=el('div','nur-power-content');const notice=el('p','nur-power-notice');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');shell.append(head,content,notice);dialog.append(shell);doc.body.append(dialog);
const say=message=>{notice.textContent=message;};
function close(){if(busy)return;if(typeof dialog.close==='function'&&dialog.open)dialog.close();else dialog.removeAttribute('open');if(previousFocus?.isConnected)previousFocus.focus();previousFocus=null;}
function open(){if(dialog.open)return;previousFocus=doc.activeElement;draw();if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');closeButton.focus();}
dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
function row(label,value){const n=el('div','nur-vault-row');n.append(el('span','',label),el('strong','',String(value)));return n;}
function createFile(raw){return new File([raw],'NUR-backup-'+V.localDate()+'.json',{type:'application/json'});}
async function exportFile(){
 if(busy)return;busy=true;say('Preparing your private backup…');
 try{
  const raw=V.makeBackup(window.NURPowerUI.getState(),window.NURAppearance?.get?.()||null);
  const file=createFile(raw);const cap=window.Capacitor;
  if(cap?.isNativePlatform?.()){
   if(cap.isPluginAvailable&&(!cap.isPluginAvailable('Filesystem')||!cap.isPluginAvailable('Share')))throw Error('Native file saving is unavailable in this build.');
   const filesystem=cap.Plugins?.Filesystem||cap.registerPlugin?.('Filesystem');
   const share=cap.Plugins?.Share||cap.registerPlugin?.('Share');
   if(!filesystem||!share)throw Error('Native file saving is unavailable in this build.');
   const bytes=new TextEncoder().encode(raw);let binary='';for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);
   const saved=await filesystem.writeFile({path:file.name,data:btoa(binary),directory:'CACHE'});
   await share.share({title:'NUR backup',text:'Keep this backup private.',url:saved.uri,dialogTitle:'Save or share NUR backup'});
  }else if(navigator.share&&navigator.canShare?.({files:[file]})){
   await navigator.share({files:[file],title:'NUR backup'});
  }else{
   const url=URL.createObjectURL(file);const a=el('a');a.href=url;a.download=file.name;doc.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  say('Backup prepared. Keep the JSON file somewhere safe.');
 }catch(error){say(error?.message||'Backup could not be saved. Your data is unchanged.');}
 finally{busy=false;}
}
function finishRestore(prepared){
 if(busy)return;
 if(!window.confirm('Replace the current NUR data with this backup? A recovery copy of the current data will be kept on this device.'))return;
 busy=true;
 try{V.restore(localStorage,prepared);say('Restore saved. Reloading NUR…');window.location.reload();}
 catch(error){say(error.message||'Restore failed. Your data was not replaced.');busy=false;}
}
function draw(){
 pending=null;content.replaceChildren();say('');
 content.append(el('p','nur-power-help','Your prayers, responsibilities, reflections, goals, notes, money entries and appearance settings can be saved in one private JSON file. Nothing is uploaded to a server.'));
 const actions=el('div','nur-power-actions');actions.append(button('Export backup','nur-power-primary',exportFile));content.append(actions);
 content.append(el('p','nur-vault-warning','Backups are not encrypted. Keep them private and do not share them with anyone you do not trust.'));
 const importSection=el('section','nur-vault-section');importSection.append(el('h3','','Restore from a file'),el('p','nur-power-help','Choose a NUR JSON backup. Review its contents before replacing your current data.'));
 const input=el('input','nur-power-input');input.type='file';input.accept='.json,application/json';input.setAttribute('aria-label','Choose NUR backup file');importSection.append(input);
 const preview=el('div','nur-vault-preview');importSection.append(preview);content.append(importSection);
 input.addEventListener('change',async()=>{
  pending=null;preview.replaceChildren();const file=input.files?.[0];if(!file)return;
  if(file.size>V.MAX_BYTES){say('The backup is larger than 16 MB.');return;}
  say('Checking the selected backup…');
  try{
   const raw=await file.text();const prepared=V.inspect(raw,P,V.localDate());
   pending=prepared;const s=prepared.summary;
   preview.append(el('h3','','Backup preview'),row('Tracking since',s.startedOn||'Unknown'),row('Recorded days',s.days),row('Amanah',s.tasks),row('Muhasaba',s.intentions),row('Goals',s.goals),row('Notes',s.notes),row('Money entries',s.money));
   preview.append(el('p','nur-vault-warning','Restoring replaces your current data. It does not merge records.'));
   preview.append(button('Replace with this backup','nur-power-danger',()=>{if(pending)finishRestore(pending);}));say('Backup validated. Review the details before restoring.');
  }catch(error){say(error.message||'This file is not a valid NUR backup.');}
 });
 let saved=null;try{saved=V.recovery(localStorage);}catch(error){content.append(el('p','nur-vault-warning','The previous recovery copy could not be read. Export a fresh backup before restoring.'));}
 if(saved){const recovery=el('section','nur-vault-section');recovery.append(el('h3','','Previous recovery copy'),el('p','nur-power-help','A local copy of the data from before your last restore is available.'));
 recovery.append(button('Restore previous data','nur-power-small',()=>{
  if(!window.confirm('Replace current data with the previous recovery copy?'))return;
  try{V.restoreRecovery(localStorage);say('Previous data restored. Reloading NUR…');window.location.reload();}catch(error){say(error.message);}
 }));content.append(recovery);}
}
const launch=button('Backup & restore','nur-tool-button nur-vault-launch',open);launch.id='nurVaultLaunch';
const tools=doc.querySelector('.nur-experience-tools');if(tools)tools.append(launch);else doc.querySelector('.dashboard-frame')?.append(launch);
window.NURVaultUI={open,close};
})();