const CACHE_NAME = 'pwa-anime-v1';
const STATIC_ASSETS = [
  '/',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// 1. Cài đặt Cache nền ban đầu
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. Dọn dẹp cache cũ không gây khựng giao diện
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Xử lý Request - Chống giật bằng chiến lược phù hợp từng loại file
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Không cache các Request từ API phim (OPhim, KKPhim, NguồnC...) hoặc Telegram SDK để tránh lag dữ liệu
  if (
    url.hostname.includes('ophim') || 
    url.hostname.includes('kkphim') || 
    url.hostname.includes('nguonc') || 
    url.hostname.includes('telegram.org') ||
    request.method !== 'GET'
  ) {
    return;
  }

  // Chiến lược 1: Cache First cho Ảnh (Poster, Thumbnail) -> Hiển thị ngay lập tức, chống nhảy khung hình (CLS)
  if (request.destination === 'image') {
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
            // Trả về ảnh rỗng nếu mất mạng để giao diện không bị vỡ
            return new Response('', { status: 408 });
          });
        });
      })
    );
    return;
  }

  // Chiến lược 2: Stale-While-Revalidate cho CSS/JS/Font -> Hiện nhanh từ cache, cập nhật ngầm bên dưới
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
