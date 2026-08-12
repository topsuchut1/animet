const CACHE_NAME = 'pwa-anime-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. LOẠI BỎ CHẶN REQUEST: Không can thiệp vào các URL chuyển trang, AJAX (#PageNo, search)
  // Việc này giúp loại bỏ hoàn toàn lỗi giật khung khi bấm chuyển sang Page 2, Page 3...
  if (
    url.href.includes('PageNo') ||
    url.href.includes('updated-max') ||
    url.pathname.includes('/search') ||
    url.hostname.includes('ophim') ||
    url.hostname.includes('kkphim') ||
    url.hostname.includes('nguonc') ||
    url.hostname.includes('telegram.org') ||
    request.method !== 'GET'
  ) {
    return; // Cho phép trình duyệt xử lý tự nhiên, không qua Service Worker
  }

  // 2. Chỉ Cache STATIC ASSETS (Hình ảnh poster, CSS, Font)
  if (request.destination === 'image' || request.destination === 'style' || request.destination === 'font') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          return fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            return new Response('', { status: 408 });
          });
        });
      })
    );
  }
});
