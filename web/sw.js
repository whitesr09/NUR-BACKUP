/* NUR offline shell. Only explicitly listed public application assets are cached. */
const CACHE='nur-shell-level5-1';
const PREFIXES=['nur-v2-','nur-shell-'];
const CORE=[
 './','./index.html','./styles.css','./v2-refine.css','./v2-header-fix.css',
 './loading.css','./v2-rhythm-fix.css','./v2-daily-light.css','./nur-experience.css',
 './nur-level3.css','./nur-vault.css','./nur-level4.css','./nur-deen.css',
 './app.js','./v2-persistent-items.js','./nur-power-data.js','./nur-level3.js',
 './v2-motion.js','./nur-experience.js','./nur-vault.js','./nur-vault-ui.js',
 './nur-focus-data.js','./nur-focus.js','./nur-pro-data.js','./nur-pro-assets.js',
 './nur-progress.js','./nur-pro.js','./vendor/adhan.js','./nur-deen-core.js',
 './nur-deen-content.js','./nur-deen-harden.js','./nur-ai-secrets.js',
 './nur-deen-store.js','./nur-deen-backup.js','./nur-deen-app.js',
 './manifest.webmanifest','./icon.svg','./assets/quran-uthmani.json','./assets/loading-bg.jpg','./assets/daily-light-bg.jpg'
];
const STATIC=new Set(CORE.map(path=>new URL(path,self.registration.scope).pathname));
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key!==CACHE&&PREFIXES.some(prefix=>key.startsWith(prefix))).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||!['http:','https:'].includes(url.protocol))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(async()=>{
   const cache=await caches.open(CACHE);
   return (await cache.match('./index.html'))||Response.error();
  }));
  return;
 }
 // Never cache arbitrary URLs, API requests, private exports, user files or query parameters.
 if(!STATIC.has(url.pathname)||url.search)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(request);
  if(cached)return cached;
  try{
   const response=await fetch(request);
   if(response.ok&&response.type==='basic')await cache.put(request,response.clone());
   return response;
  }catch{return Response.error();}
 })());
});
