import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

const CACHE_NAME = 'babycare-dashboard-v1';
const DEFAULT_ICON = '/icons/icon-192x192.png';
const DEFAULT_BADGE = '/icons/icon-96x96.png';
const DEFAULT_SNOOZE_MS = 5 * 60 * 1000;

self.addEventListener('push', handlePush);
self.addEventListener('notificationclick', handleNotificationClick);
self.addEventListener('notificationclose', handleNotificationClose);
self.addEventListener('install', handleInstall);
self.addEventListener('activate', handleActivate);
self.addEventListener('fetch', handleFetch);
self.addEventListener('sync', handleSync);
self.addEventListener('periodicsync', handlePeriodicSync);

function handlePush(event) {
  console.log('[sw] push payload received');

  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (error) {
      console.error('[sw] failed to parse push payload:', error);
    }
  }

  const title = payload.title || 'BabyCare reminder';
  const options = buildNotificationOptions(title, payload);

  event.waitUntil(self.registration.showNotification(title, options));
}

function buildNotificationOptions(title, payload = {}) {
  const baseData = payload.data && typeof payload.data === 'object' ? payload.data : {};
  const actions =
    Array.isArray(payload.actions) && payload.actions.length > 0
      ? payload.actions
      : [
          { action: 'open', title: 'Open' },
          { action: 'snooze', title: 'Snooze 5 min' }
        ];

  const options = {
    body: payload.body || 'Stay on top of BabyCare routines together.',
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_BADGE,
    tag: payload.tag || 'babycare-reminder',
    requireInteraction: payload.requireInteraction ?? false,
    renotify: payload.renotify ?? true,
    data: {
      url: baseData.url || '/',
      snoozeMs: Number(baseData.snoozeMs) || DEFAULT_SNOOZE_MS,
      ...baseData
    },
    actions
  };

  const original = {
    title,
    body: options.body,
    icon: options.icon,
    badge: options.badge,
    tag: options.tag,
    requireInteraction: options.requireInteraction,
    renotify: options.renotify,
    actions: options.actions
  };

  options.data.original = original;

  return options;
}

function handleNotificationClick(event) {
  console.log('[sw] notification click', { action: event.action });

  const action = event.action || 'open';
  event.notification.close();

  if (action === 'snooze') {
    event.waitUntil(scheduleSnoozedNotification(event.notification));
    return;
  }

  event.waitUntil(openNotificationTarget(event.notification));
}

function handleNotificationClose(event) {
  console.log('[sw] notification closed', {
    tag: event.notification?.tag,
    topic: event.notification?.data?.topic
  });
}

function openNotificationTarget(notification) {
  const urlToOpen = notification?.data?.url || '/';
  const targetUrl = new URL(urlToOpen, self.location.origin).href;

  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if (client.url === targetUrl && 'focus' in client) {
        return client.focus();
      }
    }

    if (clients.openWindow) {
      return clients.openWindow(targetUrl);
    }

    return undefined;
  });
}

function scheduleSnoozedNotification(notification) {
  const original = notification?.data?.original;
  const snoozeMs = Number(notification?.data?.snoozeMs) || DEFAULT_SNOOZE_MS;

  if (!original) {
    console.warn('[sw] snooze requested but original payload is missing');
    return Promise.resolve();
  }

  const nextData = Object.assign({}, notification.data, {
    snoozed: true,
    snoozedAt: Date.now(),
    original
  });

  return new Promise((resolve) => {
    setTimeout(() => {
      self.registration
        .showNotification(original.title, {
          body: original.body,
          icon: original.icon,
          badge: original.badge,
          tag: original.tag,
          requireInteraction: original.requireInteraction,
          renotify: true,
          actions: original.actions,
          data: nextData
        })
        .then(resolve)
        .catch((error) => {
          console.error('[sw] failed to show snoozed notification:', error);
          resolve();
        });
    }, snoozeMs);
  });
}

function handleInstall(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(() => {
      console.log('[sw] cache opened during install');
    })
  );
  self.skipWaiting();
}

function handleActivate(event) {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[sw] deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
          return undefined;
        })
      )
    )
  );
  self.clients.claim();
}

function handleFetch(event) {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
}

function handleSync(event) {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
}

async function doBackgroundSync() {
  console.log('[sw] background sync placeholder');
  // Extend with offline-aware data sync when ready.
}

/**
 * Обработчик периодической синхронизации для обработки напоминаний
 */
async function handlePeriodicSync(event) {
  console.log('[sw] periodic sync triggered:', event.tag);
  
  if (event.tag === 'process-reminders') {
    event.waitUntil(processRemindersInBackground());
  }
}

/**
 * Обрабатывает напоминания в фоне через Service Worker
 */
async function processRemindersInBackground() {
  try {
    const apiUrl = '/api/push/process-reminders';
    
    console.log('[sw] Processing reminders in background...');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      cache: 'no-cache'
    });

    if (!response.ok) {
      console.error('[sw] Failed to process reminders:', response.status);
      return;
    }

    const result = await response.json();
    
    if (result.success && result.processed > 0) {
      console.log(`[sw] Processed ${result.processed} reminders: ${result.sent} sent, ${result.failed} failed`);
    } else {
      console.log('[sw] No reminders to process');
    }
  } catch (error) {
    console.error('[sw] Error processing reminders in background:', error);
  }
}
