// A Bit Curious - offline support.
// HTML and scripts: network first (so a deploy is picked up immediately),
// falling back to cache when offline. Fonts and images: cache first.
const CACHE = 'abc-v1';
const SHELL = ['/', '/app.js', '/js/engage.js', '/js/demos.js', '/manifest.webmanifest',
  '/fonts/inter-latin-400-normal.woff2', '/fonts/inter-latin-500-normal.woff2',
  '/fonts/syne-latin-700-normal.woff2', '/fonts/syne-latin-800-normal.woff2',
  '/fonts/space-mono-latin-400-normal.woff2', '/fonts/space-mono-latin-700-normal.woff2'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(SHELL.map(function(u){ return c.add(u).catch(function(){}); }));
  }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e){
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return; // live APIs are never cached
  const isStatic = /\.(woff2|png|svg|webmanifest)$/.test(url.pathname);
  if(isStatic){
    e.respondWith(caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){
        const copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); return res;
      });
    }));
    return;
  }
  e.respondWith(fetch(req).then(function(res){
    if(res.ok){ const copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
    return res;
  }).catch(function(){
    return caches.match(req).then(function(hit){ return hit || caches.match('/'); });
  }));
});
