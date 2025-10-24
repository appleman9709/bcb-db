const CACHE_NAME = 'babycare-dashboard-v1'
const urlsToCache = [
  '/',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/manifest.json'
]

const reminderTimers = new Map()
const reminderState = new Map()
let reminderIntervalId = null

const formatDuration = (minutes) => {
  const absMinutes = Math.max(0, Math.floor(minutes))
  const days = Math.floor(absMinutes / 1440)
  const hours = Math.floor((absMinutes % 1440) / 60)
  const mins = absMinutes % 60
  const parts = []

  if (days > 0) {
    parts.push(`${days} д`)
  }

  if (hours > 0 || days > 0) {
    parts.push(`${hours} ч`)
    parts.push(`${mins} мин`)
  } else {
    parts.push(`${mins} мин`)
  }

  return parts.join(' ')
}

const clearReminderTimer = (key) => {
  const existingTimer = reminderTimers.get(key)
  if (existingTimer) {
    clearTimeout(existingTimer)
    reminderTimers.delete(key)
  }
}

const clearAllReminders = () => {
  reminderTimers.forEach((timerId) => clearTimeout(timerId))
  reminderTimers.clear()
  reminderState.clear()
  if (reminderIntervalId) {
    clearInterval(reminderIntervalId)
    reminderIntervalId = null
  }
}

const ensureReminderInterval = () => {
  if (reminderIntervalId) {
    return
  }

  reminderIntervalId = setInterval(() => {
    reminderState.forEach((reminder) => {
      const nextTrigger = new Date(reminder.lastTimestamp).getTime() + reminder.intervalMs
      if (nextTrigger <= Date.now()) {
        scheduleReminderInternal(reminder)
      }
    })
  }, 60 * 1000)
}

const scheduleReminderInternal = (reminder) => {
  const { key, lastTimestamp, intervalMs, title, bodyPrefix } = reminder
  const lastTime = new Date(lastTimestamp)

  clearReminderTimer(key)

  if (!lastTimestamp || Number.isNaN(lastTime.getTime()) || !intervalMs || intervalMs <= 0) {
    reminderState.delete(key)
    return
  }

  reminderState.set(key, { ...reminder, lastTimestamp: lastTime.toISOString() })

  const nextTrigger = lastTime.getTime() + intervalMs
  const delay = Math.max(0, nextTrigger - Date.now())

  const timeoutId = setTimeout(async () => {
    try {
      const elapsedMinutes = Math.max(0, Math.round((Date.now() - lastTime.getTime()) / (1000 * 60)))
      const body = `${bodyPrefix} ${formatDuration(elapsedMinutes)}`
      const notificationOptions = {
        body,
        tag: `babycare-${key}-reminder`,
        badge: '/icons/icon-96x96.png',
        icon: '/icons/icon-192x192.png'
      }

      await self.registration.showNotification(title, notificationOptions)
    } catch (error) {
      console.error('Unable to show background reminder notification:', error)
    }

    const updatedReminder = {
      ...reminder,
      lastTimestamp: new Date().toISOString()
    }
    scheduleReminderInternal(updatedReminder)
  }, delay)

  reminderTimers.set(key, timeoutId)
  ensureReminderInterval()
}

const updateRemindersFromClient = ({ reminders = [], permission }) => {
  if (permission !== 'granted' || !Array.isArray(reminders) || reminders.length === 0) {
    clearAllReminders()
    return
  }

  const validReminders = reminders.filter((reminder) => {
    const intervalMs = reminder.intervalMs
    return (
      typeof reminder.key === 'string' &&
      typeof reminder.title === 'string' &&
      typeof reminder.bodyPrefix === 'string' &&
      typeof reminder.lastTimestamp === 'string' &&
      Number.isFinite(intervalMs) &&
      intervalMs > 0
    )
  })

  const keysToKeep = new Set(validReminders.map((reminder) => reminder.key))
  reminderTimers.forEach((_, key) => {
    if (!keysToKeep.has(key)) {
      clearReminderTimer(key)
      reminderState.delete(key)
    }
  })

  validReminders.forEach((reminder) => {
    scheduleReminderInternal(reminder)
  })
}

// Установка service worker
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
})

// Активация service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Перехват запросов
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response
        }
        return fetch(event.request)
      })
  )
})

self.addEventListener('message', (event) => {
  const { data } = event
  if (!data || typeof data !== 'object') {
    return
  }

  if (data.type === 'SCHEDULE_REMINDERS') {
    updateRemindersFromClient(data)
  }

  if (data.type === 'CLEAR_REMINDERS') {
    clearAllReminders()
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
      return undefined
    })
  )
})
