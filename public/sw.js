const CACHE_NAME = 'babycare-dashboard-v1';
const urlsToCache = [
  '/',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/manifest.json'
];

// Хранилище напоминаний
let reminders = new Map();

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

// Обработка сообщений от основного приложения
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SCHEDULE_REMINDER') {
    const { key, timestamp, intervalHours, title, bodyPrefix } = event.data;
    console.log('Scheduling reminder:', { key, timestamp, intervalHours, title, bodyPrefix });
    scheduleReminder(key, timestamp, intervalHours, title, bodyPrefix);
  } else if (event.data && event.data.type === 'CANCEL_REMINDER') {
    const { key } = event.data;
    console.log('Cancelling reminder:', key);
    cancelReminder(key);
  } else if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    console.log('Test notification requested');
    showTestNotification();
  }
});

// Планирование напоминания
function scheduleReminder(key, timestamp, intervalHours, title, bodyPrefix) {
  if (!timestamp || !Number.isFinite(intervalHours) || intervalHours <= 0) {
    cancelReminder(key);
    return;
  }

  const lastTime = new Date(timestamp);
  if (Number.isNaN(lastTime.getTime())) {
    return;
  }

  const nextTime = new Date(lastTime.getTime() + intervalHours * 60 * 60 * 1000);
  const delayMs = Math.max(0, nextTime.getTime() - Date.now());

  // Отменяем предыдущее напоминание если есть
  cancelReminder(key);

  const timeoutId = setTimeout(async () => {
    try {
      const elapsedMinutes = Math.round((Date.now() - lastTime.getTime()) / (1000 * 60));
      const body = `${bodyPrefix} ${formatDuration(Math.max(elapsedMinutes, 0))}`;
      
      const options = {
        body,
        tag: `babycare-${key}-reminder`,
        badge: '/icons/icon-96x96.png',
        icon: '/icons/icon-192x192.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: [
          {
            action: 'open',
            title: 'Открыть приложение',
            icon: '/icons/icon-72x72.png'
          },
          {
            action: 'dismiss',
            title: 'Отложить',
            icon: '/icons/icon-72x72.png'
          }
        ],
        data: {
          reminderType: key,
          timestamp: Date.now()
        }
      };

      await self.registration.showNotification(title, options);
      
      // Планируем следующее напоминание
      const newTimestamp = new Date().toISOString();
      scheduleReminder(key, newTimestamp, intervalHours, title, bodyPrefix);
    } catch (error) {
      console.error('Unable to show reminder notification:', error);
    }
  }, delayMs);

  reminders.set(key, timeoutId);
}

// Отмена напоминания
function cancelReminder(key) {
  const timeoutId = reminders.get(key);
  if (timeoutId) {
    clearTimeout(timeoutId);
    reminders.delete(key);
  }
}

// Тестовое уведомление
async function showTestNotification() {
  console.log('showTestNotification called');
  try {
    const options = {
      body: 'Это тестовое уведомление для проверки работы PWA',
      tag: 'test-notification',
      badge: '/icons/icon-96x96.png',
      icon: '/icons/icon-192x192.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Открыть приложение',
          icon: '/icons/icon-72x72.png'
        },
        {
          action: 'dismiss',
          title: 'Закрыть',
          icon: '/icons/icon-72x72.png'
        }
      ]
    };

    console.log('Showing test notification with options:', options);
    await self.registration.showNotification('Тест уведомлений', options);
    console.log('Test notification shown successfully');
  } catch (error) {
    console.error('Unable to show test notification:', error);
  }
}

// Background Sync функция
async function doBackgroundSync() {
  console.log('Background sync triggered');
  // Здесь можно добавить логику для синхронизации данных
  // когда устройство вернется в онлайн
}

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Если приложение уже открыто, фокусируемся на нем
        for (const client of clientList) {
          if (client.url === self.location.origin && 'focus' in client) {
            return client.focus();
          }
        }
        // Если приложение не открыто, открываем новое окно
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  } else if (event.action === 'dismiss') {
    // Просто закрываем уведомление
    console.log('Notification dismissed');
  }
});

// Форматирование времени
function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} мин`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} ч`;
  }
  return `${hours} ч ${remainingMinutes} мин`;
}
