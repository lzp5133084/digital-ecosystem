// Service Worker: 静态资源离线缓存（不缓存数据文件，保证更新实时性）
const CACHE = 'ecosystem-v1.1.0';
const STATIC = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './ecosystem-core.js',
  './manifest.webmanifest',
  './assets/favicon.svg',
  './assets/favicon-32.png',
  './assets/apple-touch-icon.png',
  './assets/cover-eco.svg',
];
const IMG_EXT = /\.(?:webp|jpg|jpeg|png|svg)$/i;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // HTML 走网络优先（保持最新）
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // 数据文件走网络优先（保证实时性）
  if (/ecosystem-(core|full)\.js$/.test(url.pathname)) {
    e.respondWith(fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request)));
    return;
  }

  // 静态资源走缓存优先
  if (IMG_EXT.test(url.pathname) || /\.(?:css|woff2?)$/.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    })));
    return;
  }
});
