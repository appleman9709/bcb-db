import { precacheAndRoute } from 'workbox-precaching';

// Precache and route all assets
precacheAndRoute(self.__WB_MANIFEST);

const CACHE_NAME = 'babycare-dashboard-v1';

// Установка service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing');
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
  console.log('Service Worker: Activated');
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

// Push notification listener
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received', event);
  
  let notificationData = {
    title: 'BabyCare Dashboard',
    body: 'У вас новое уведомление',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: 'babycare-notification',
    requireInteraction: false,
    data: {}
  };

  try {
    if (event.data) {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        data: data.data || {}
      };
    }
  } catch (error) {
    console.error('Error parsing push notification data:', error);
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Открыть'
        },
        {
          action: 'close',
          title: 'Закрыть'
        }
      ]
    })
  );
});

// Notification click listener
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        // Check if there's already a window/tab open with the target URL
        const urlToOpen = self.location.origin + '/';
        
        for (let i = 0; i < clients.length; i++) {
          const client = clients[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If not found, open a new window/tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
    );
  } else if (event.action === 'close') {
    // Just close the notification, do nothing
    return;
  } else {
    // Default behavior - open the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (clients.length > 0) {
          return clients[0].focus();
        } else if (self.clients.openWindow) {
          return self.clients.openWindow(self.location.origin + '/');
        }
      })
    );
  }
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