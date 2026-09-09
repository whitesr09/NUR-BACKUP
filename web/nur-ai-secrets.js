/* NUR AI: memory-only key by default; optional passphrase-encrypted local vault. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NurAISecrets=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const DB='nur-ai-private-v1',STORE='secrets',ID='gemini',ITERATIONS=250000;
function createStore(env={}){
 const crypto=env.crypto||globalThis.crypto,dbFactory=env.indexedDB||globalThis.indexedDB;
 let key='';
 function open(){return new Promise((resolve,reject)=>{if(!dbFactory)return reject(Error('Private storage is unavailable.'));const r=dbFactory.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Private storage is unavailable.'));});}
 async function record(mode,action){const db=await open();return new Promise((resolve,reject)=>{let result;const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);const request=action(store);request.onsuccess=()=>{result=request.result;};request.onerror=()=>reject(Error('Private storage failed.'));tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(Error('Private storage failed.'));};tx.onabort=()=>{db.close();reject(Error('Private storage failed.'));};});}
 const get=()=>record('readonly',s=>s.get(ID)),put=x=>record('readwrite',s=>s.put(x,ID)),remove=()=>record('readwrite',s=>s.delete(ID));
 const enc=new TextEncoder(),dec=new TextDecoder();
 function b64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);}
 function unb64(value){return Uint8Array.from(atob(value),x=>x.charCodeAt(0));}
 async function derive(password,salt){const base=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
 function validate(value){const v=String(value||'').trim();if(!v||v.length>512||/\s/.test(v))throw Error('Enter a valid API key.');return v;}
 function setSession(value){key=validate(value);return true;}
 async function save(value,password){const v=validate(value);if(typeof password!=='string'||password.length<10)throw Error('Use a passphrase of at least 10 characters.');if(!crypto?.subtle||!crypto.getRandomValues)throw Error('Encrypted storage is not supported.');const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));const derived=await derive(password,salt);const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},derived,enc.encode(v));await put({version:1,salt:b64(salt),iv:b64(iv),cipher:b64(new Uint8Array(cipher))});key=v;return true;}
 async function unlock(password){const r=await get();if(!r)throw Error('No saved API key was found.');if(r.version!==1)throw Error('Unsupported key format.');try{const derived=await derive(password,unb64(r.salt));const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(r.iv)},derived,unb64(r.cipher));setSession(dec.decode(plain));return true;}catch{throw Error('Unable to unlock the key. Check your passphrase.');}}
 async function clear(){key='';await remove();return true;}
 function lock(){key='';}
 async function use(fn){if(!key)throw Error('Enter or unlock your Gemini API key first.');return fn(key);}
 return {setSession,save,unlock,clear,lock,use,hasKey:()=>!!key,hasSaved:async()=>!!await get(),isEncryptedSupported:()=>!!crypto?.subtle};
}
return {createStore,DB,STORE,ITERATIONS};
});