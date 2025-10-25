import { precacheAndRoute } from 'workbox-precaching';

// Precache and route all assets
precacheAndRoute(self.__WB_MANIFEST);

const CACHE_NAME = 'babycare-dashboard-v1';

// Установка service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Активация service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Возвращаем кэшированную версию или загружаем из сети
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Background Sync для надежности
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Background Sync функция
async function doBackgroundSync() {
  console.log('Background sync triggered');
  // Здесь можно добавить логику для синхронизации данных
  // когда устройство вернется в онлайн
}