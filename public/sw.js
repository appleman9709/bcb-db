// Простой Service Worker без внешних импортов, совместимый с dev-сервером Vite

const CACHE_NAME = 'babycare-dashboard-simple-v1'
const DEFAULT_ICON = '/icons/icon-192x192.png'
const DEFAULT_BADGE = '/icons/icon-96x96.png'
const DEFAULT_SNOOZE_MS = 5 * 60 * 1000

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(() => {
      console.log('[sw] installed, cache opened')
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[sw] deleting old cache', cacheName)
            return caches.delete(cacheName)
          }
          return undefined
        })
      )
    )
  )
  self.clients.claim()
})

// Базовая стратегия: сначала сеть, при ошибке — кэш
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Только GET-запросы
  if (request.method !== 'GET') return

  event.respondWith(
    fetch(request)
      .then((response) => {
        const cloned = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned))
        return response
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached
          throw new Error('Network error and no cache')
        })
      )
  )
})

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
  console.log('[sw] push payload received')

  let payload = {}
  if (event.data) {
    try {
      payload = event.data.json()
    } catch (error) {
      console.error('[sw] failed to parse push payload:', error)
    }
  }

  const title = payload.title || 'BabyCare reminder'

  const data = (payload && payload.data && typeof payload.data === 'object' ? payload.data : {}) || {}

  const options = {
    body: payload.body || 'Stay on top of BabyCare routines together.',
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_BADGE,
    tag: payload.tag || 'babycare-reminder',
    requireInteraction: payload.requireInteraction ?? false,
    renotify: payload.renotify ?? true,
    data: {
      url: data.url || '/',
      snoozeMs: Number(data.snoozeMs) || DEFAULT_SNOOZE_MS,
      original: {
        title,
        body: payload.body || 'Stay on top of BabyCare routines together.',
        icon: payload.icon || DEFAULT_ICON,
        badge: payload.badge || DEFAULT_BADGE,
        tag: payload.tag || 'babycare-reminder',
        requireInteraction: payload.requireInteraction ?? false,
        renotify: payload.renotify ?? true,
        actions:
          Array.isArray(payload.actions) && payload.actions.length > 0
            ? payload.actions
            : [
                { action: 'open', title: 'Open' },
                { action: 'snooze', title: 'Snooze 5 min' }
              ]
      },
      ...data
    },
    actions:
      Array.isArray(payload.actions) && payload.actions.length > 0
        ? payload.actions
        : [
            { action: 'open', title: 'Open' },
            { action: 'snooze', title: 'Snooze 5 min' }
          ]
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  console.log('[sw] notification click', { action: event.action })

  const action = event.action || 'open'
  event.notification.close()

  if (action === 'snooze') {
    event.waitUntil(scheduleSnoozedNotification(event.notification))
    return
  }

  event.waitUntil(openNotificationTarget(event.notification))
})

self.addEventListener('notificationclose', (event) => {
  console.log('[sw] notification closed', {
    tag: event.notification && event.notification.tag,
    topic: event.notification && event.notification.data && event.notification.data.topic
  })
})

function openNotificationTarget(notification) {
  const urlToOpen = (notification && notification.data && notification.data.url) || '/'
  const targetUrl = new URL(urlToOpen, self.location.origin).href

  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if (client.url === targetUrl && 'focus' in client) {
        return client.focus()
      }
    }

    if (clients.openWindow) {
      return clients.openWindow(targetUrl)
    }

    return undefined
  })
}

function scheduleSnoozedNotification(notification) {
  const original = notification && notification.data && notification.data.original
  const snoozeMs = Number(notification && notification.data && notification.data.snoozeMs) || DEFAULT_SNOOZE_MS

  if (!original) {
    console.warn('[sw] snooze requested but original payload is missing')
    return Promise.resolve()
  }

  const nextData = Object.assign({}, notification.data || {}, {
    snoozed: true,
    snoozedAt: Date.now(),
    original
  })

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
          console.error('[sw] failed to show snoozed notification:', error)
          resolve()
        })
    }, snoozeMs)
  })
}
