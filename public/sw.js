const CACHE_NAME = 'babycare-dashboard-v1'
const urlsToCache = [
  '/',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/manifest.json',
  '/icons/icon-96x96.png',
  '/icons/icon-192x192.png'
]

// Установка service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache')
        return cache.addAll(urlsToCache)
      })
  )
})

// Активация service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Перехват запросов
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Возвращаем кэшированную версию или загружаем из сети
        if (response) {
          return response
        }
        return fetch(event.request)
      }
    )
  )
})

const DEFAULT_NOTIFICATION_TITLE = 'BabyCare'
const DEFAULT_NOTIFICATION_OPTIONS = {
  body: 'У вас новое напоминание',
  icon: '/icons/icon-192x192.png',
  badge: '/icons/icon-96x96.png',
  data: {
    url: '/',
  },
}

const parsePushData = (event) => {
  if (!event.data) {
    return {}
  }

  try {
    const json = event.data.json()
    return json && typeof json === 'object' ? json : { body: String(json) }
  } catch (error) {
    try {
      return { body: event.data.text() }
    } catch (textError) {
      console.error('Failed to read push payload', error)
      return {}
    }
  }
}

const normalizeOptions = (rawOptions) => {
  if (!rawOptions || typeof rawOptions !== 'object') {
    return {}
  }

  return rawOptions
}

self.addEventListener('push', (event) => {
  const payload = parsePushData(event)
  const title = payload.title || DEFAULT_NOTIFICATION_TITLE
  const extraOptions = normalizeOptions(payload.options)
  const options = {
    ...DEFAULT_NOTIFICATION_OPTIONS,
    ...extraOptions,
  }

  if (payload.body && !extraOptions.body) {
    options.body = payload.body
  }

  if (payload.icon && !extraOptions.icon) {
    options.icon = payload.icon
  }

  if (payload.badge && !extraOptions.badge) {
    options.badge = payload.badge
  }

  if (payload.tag) {
    options.tag = payload.tag
  }

  options.data = {
    ...DEFAULT_NOTIFICATION_OPTIONS.data,
    ...options.data,
    ...(payload.data || {}),
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification?.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const isSameOrigin = client.url.startsWith(self.location.origin)
        if (isSameOrigin) {
          if ('navigate' in client && targetUrl && client.url !== targetUrl) {
            return client.navigate(targetUrl).then(() => client.focus())
          }

          if ('focus' in client) {
            return client.focus()
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
      return undefined
    })
  )
})
