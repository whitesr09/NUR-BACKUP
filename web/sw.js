/* NUR offline shell. Data stays in local storage; only static resources are cached. */
const CACHE = 'nur-v2-experience-1';
const PREFIX = 'nur-v2-';
const CORE = [
  './','./index.html','./styles.css','./v2-refine.css','./v2-header-fix.css',
  './loading.css','./v2-rhythm-fix.css','./v2-daily-light.css','./nur-experience.css',
  './app.js','./v2-persistent-items.js','./v2-motion.js','./nur-experience.js',
  './manifest.webmanifest','./icon.svg','./assets/loading-bg.jpg',
  './assets/daily-light-bg.jpg'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;
  const url = new URL(request.url);
  if(url.origin !== self.location.origin || !['http:','https:'].includes(url.protocol)) return;
  if(request.mode === 'navigate'){
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match('./index.html')) || Response.error();
    }));
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if(cached) return cached;
    try{
      const response = await fetch(request);
      if(response.ok && response.type === 'basic') await cache.put(request,response.clone());
      return response;
    }catch(error){
      return Response.error();
    }
  })());
});
