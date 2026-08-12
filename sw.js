const CACHE_NAME = 'pwa-anime-v3';

// Danh sách các tài nguyên tĩnh cần nạp trước (Pre-cache)
const PRECACHE_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// 1. Cài đặt & Kích hoạt Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
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

// 2. Xử lý dữ liệu (Fetch Event)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // BỎ QUA CACHE: Bỏ qua request không phải GET, API phim, và các URL phân trang (#PageNo, search)
  if (
    request.method !== 'GET' ||
    url.href.includes('PageNo') ||
    url.href.includes('updated-max') ||
    url.pathname.includes('/search') ||
    url.hostname.includes('ophim') ||
    url.hostname.includes('kkphim') ||
    url.hostname.includes('nguonc')
  ) {
    return; // Cho phép trình duyệt xử lý mạng trực tiếp, tránh lag DOM
  }

  // CHIẾN LƯỢC 1: Cache First cho Hình ảnh, Font, CSS, JS tĩnh
  if (
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          return fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => new Response('', { status: 408 }));
        });
      })
    );
    return;
  }

  // CHIẾN LƯỢC 2: Network First cho HTML (Luôn lấy dữ liệu bài viết mới nhất)
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
