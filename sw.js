/* ═══════════════════════════════════════════
   Discount Hub — Service Worker
   • Caches images, CSS, JS on first visit
   • Serves from cache on repeat visits
   • Network-first for HTML pages
   • Cache-first for images/assets
═══════════════════════════════════════════ */

const CACHE_NAME    = 'dh-cache-v1';
const IMG_CACHE     = 'dh-img-cache-v1';
const STATIC_CACHE  = 'dh-static-v1';

/* Static assets to cache on install */
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/dh.png',
  '/dhub.jpg',
  '/poster.jpg',
  '/pro.jpg',
  '/bl.jpg',
  '/jl.jpg',
  '/earrings.jpg',
];

/* ── Install: pre-cache static assets ── */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(
        PRECACHE_ASSETS.map(url => new Request(url, { cache: 'reload' }))
      ).catch(() => {/* ignore individual failures */});
    })
  );
  self.skipWaiting();
});

/* ── Activate: clean old caches ── */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(k => ![CACHE_NAME, IMG_CACHE, STATIC_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: serve smart based on request type ── */
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  /* Skip non-GET, cross-origin APIs, Firebase */
  if (request.method !== 'GET')          return;
  if (url.hostname.includes('firebaseio')) return;
  if (url.hostname.includes('googleapis')) return;
  if (url.hostname.includes('gstatic'))   return;
  if (url.pathname.startsWith('/cdn-cgi')) return;

  /* ── Images: Cache-First ── */
  if (isImage(request)) {
    e.respondWith(cacheFirst(request, IMG_CACHE));
    return;
  }

  /* ── Static assets (js/css/fonts): Cache-First ── */
  if (isStaticAsset(request)) {
    e.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  /* ── HTML pages: Network-First (always fresh content) ── */
  if (request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  /* ── Everything else: Network-First ── */
  e.respondWith(networkFirst(request, CACHE_NAME));
});

/* ── Cache-First strategy ── */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkRes = await fetch(request);
    if (networkRes && networkRes.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkRes.clone());
    }
    return networkRes;
  } catch {
    return new Response('', { status: 408 });
  }
}

/* ── Network-First strategy ── */
async function networkFirst(request, cacheName) {
  try {
    const networkRes = await fetch(request);
    if (networkRes && networkRes.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkRes.clone());
    }
    return networkRes;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

/* ── Helpers ── */
function isImage(request) {
  const url = new URL(request.url);
  return /\.(png|jpg|jpeg|gif|webp|svg|avif)(\?.*)?$/i.test(url.pathname)
      || request.destination === 'image';
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return /\.(js|css|woff2?|ttf|eot)(\?.*)?$/i.test(url.pathname);
}

/* ══════════════════════════════════════════
   PUSH NOTIFICATIONS — Background handler
══════════════════════════════════════════ */
self.addEventListener('push', (e) => {
  if (!e.data) return;

  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'Discount Hub', body: e.data.text() }; }

  const title   = data.notification?.title || data.title || 'Discount Hub 🛍️';
  const options = {
    body:    data.notification?.body  || data.body  || 'Check out latest deals!',
    icon:    data.notification?.icon  || '/dh.png',
    badge:   '/dh.png',
    image:   data.notification?.image || data.image || null,
    tag:     'dh-notification',
    renotify: true,
    data: {
      url: data.data?.url || data.click_action || '/',
    },
    actions: [
      { action: 'view', title: '🛒 View Deals' },
      { action: 'close', title: '✕ Dismiss'   },
    ],
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

/* ── Notification click ── */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  if (e.action === 'close') return;

  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const existing = wins.find(w => w.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        clients.openWindow(url);
      }
    })
  );
});
