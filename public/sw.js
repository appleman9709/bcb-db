const CACHE_NAME = 'babycare-dashboard-v2'

const getBasePath = () => {
  try {
    const scope = self.registration?.scope ?? self.location.origin
    const { pathname } = new URL(scope)
    if (!pathname || pathname === '/') {
      return '/'
    }

    return pathname.endsWith('/') ? pathname : `${pathname}/`
  } catch (error) {
    console.error('Unable to resolve service worker base path:', error)
    const fallbackPath = self.location.pathname.replace(/sw\.js$/, '')
    if (!fallbackPath) {
      return '/'
    }

    return fallbackPath.endsWith('/') ? fallbackPath : `${fallbackPath}/`
  }
}

const BASE_PATH = getBasePath()

const withBase = (path) => {
  if (!path) {
    return BASE_PATH
  }

  const normalized = path.startsWith('/') ? path.slice(1) : path
  return `${BASE_PATH}${normalized}`
}

const urlsToCache = Array.from(
  new Set([
    withBase(''),
    withBase('index.html'),
    withBase('manifest.json'),
    withBase('main.js'),
    withBase('style.css'),
    withBase('icons/icon-96x96.png'),
    withBase('icons/icon-192x192.png')
  ])
)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)).catch((error) => {
      console.error('Failed to pre-cache assets:', error)
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }

          return undefined
        })
      )
    )
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response
      }

      return fetch(request)
    })
  )
})
