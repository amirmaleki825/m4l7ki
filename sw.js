// ── m4l7ki Service Worker ──
// کش کردن فایل‌های اصلی برای کار آفلاین

const CACHE_NAME = 'm4l7ki-v1';
const CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap'
];

// نصب: کش کردن فایل‌های اصلی
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_URLS).catch(() => {
        // اگه بعضی فایل‌ها (مثل فونت) لود نشدن، مشکلی نیست
        return cache.addAll(['./', './index.html']);
      });
    })
  );
  self.skipWaiting();
});

// فعال‌سازی: حذف کش‌های قدیمی
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// fetch: استراتژی هوشمند
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // برای API های قیمت (نوبیتکس، والکس و...): همیشه از شبکه، اگه نشد از کش رد شو (نه از کش بخون)
  if (url.includes('nobitex.ir') || url.includes('wallex.ir') || url.includes('bitpin.ir') || url.includes('open-meteo.com') || url.includes('geocoding-api')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // برای فایل‌های اصلی سایت: اول کش، بعد شبکه (Cache First)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // کش کردن نسخه جدید
        if (response.ok && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // اگه آفلاین بود و در کش نبود، صفحه اصلی رو برگردون
        return caches.match('./index.html');
      });
    })
  );
});
