import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import StatCard from '../components/StatCard'
import QuickAction from '../components/QuickAction'
import QuickActionModal from '../components/QuickActionModal'
import Card from '../components/Card'
import Button from '../components/Button'
import LoadingScreen from '../components/LoadingScreen'
import DebugPanel from '../components/DebugPanel'
import { useAuth } from '../contexts/AuthContext'
import { dataService, Feeding, Diaper, Bath, Tip } from '../services/dataService'

type DashboardSection = 'dashboard' | 'history' | 'settings'
type QuickActionType = 'feeding' | 'diaper' | 'bath'
type ReminderType = 'feeding' | 'diaper'

type ServiceWorkerReminderPayload = {
  key: ReminderType
  lastTimestamp: string
  intervalMs: number
  title: string
  bodyPrefix: string
}

interface DashboardData {
  lastFeeding: Feeding | null
  lastDiaper: Diaper | null
  lastBath: Bath | null
  dailyTip: Tip | null
}

interface HistoryData {
  feedings: Feeding[]
  diapers: Diaper[]
  baths: Bath[]
}

interface SettingsState {
  birthDate: string
  feedingInterval: number
  diaperInterval: number
  bathInterval: number
}

const MAX_HISTORY_EVENTS = 20
const PULL_REFRESH_THRESHOLD = 90
const MAX_PULL_DISTANCE = 140

const formatDuration = (minutes: number) => {
  const absMinutes = Math.abs(minutes)
  const days = Math.floor(absMinutes / 1440)
  const hours = Math.floor((absMinutes % 1440) / 60)
  const mins = absMinutes % 60
  const parts: string[] = []

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

const formatTime = (date: Date) =>
  date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

const requestDefaultNotificationPermission = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default' as NotificationPermission
  }

  return Notification.permission
}

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<DashboardSection>('dashboard')
  const [data, setData] = useState<DashboardData | null>(null)
  const [historyData, setHistoryData] = useState<HistoryData | null>(null)
  const [settings, setSettings] = useState<SettingsState>({
    birthDate: '2024-01-01',
    feedingInterval: 3,
    diaperInterval: 2,
    bathInterval: 1
  })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<QuickActionType>('feeding')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(requestDefaultNotificationPermission)
  const [pullDistance, setPullDistance] = useState(0)

  const pullStartYRef = useRef<number | null>(null)
  const isPullingRef = useRef(false)
  const pullDistanceRef = useRef(0)

  const updatePullDistance = useCallback((value: number) => {
    pullDistanceRef.current = value
    setPullDistance(value)
  }, [])

  const reminderTimers = useRef<Partial<Record<ReminderType, number>>>({})
  const isNotificationSupported = typeof window !== 'undefined' && 'Notification' in window

  const { member, family, signOut } = useAuth()
  const memberDisplayName = member?.name ?? member?.role ?? 'Участник семьи'

  const fetchData = useCallback(async () => {
    if (!member || !family) {
      return
    }

    try {
      setLoading(true)
      const [lastFeeding, lastDiaper, lastBath, settingsFromDb] = await Promise.all([
        dataService.getLastFeeding(),
        dataService.getLastDiaper(),
        dataService.getLastBath(),
        dataService.getSettings()
      ])

      const babyAgeMonths = settingsFromDb?.baby_age_months || 0
      const dailyTip = await dataService.getRandomTip(babyAgeMonths)

      setData({
        lastFeeding,
        lastDiaper,
        lastBath,
        dailyTip
      })

      if (settingsFromDb) {
        setSettings(prev => ({
          ...prev,
          birthDate: settingsFromDb.baby_birth_date || settingsFromDb.birth_date || prev.birthDate,
          feedingInterval: settingsFromDb.feed_interval ?? prev.feedingInterval,
          diaperInterval: settingsFromDb.diaper_interval ?? prev.diaperInterval,
          bathInterval: settingsFromDb.bath_reminder_period ?? prev.bathInterval
        }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [member, family])

  const fetchHistoryData = useCallback(async () => {
    if (!member || !family) {
      return
    }

    try {
      const [feedings, diapers, baths] = await Promise.all([
        dataService.getFeedings(50),
        dataService.getDiapers(50),
        dataService.getBaths(50)
      ])

      setHistoryData({
        feedings,
        diapers,
        baths
      })
    } catch (error) {
      console.error('Error fetching history data:', error)
    }
  }, [member, family])

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.max(0, Math.floor((now.getTime() - time.getTime()) / (1000 * 60)))

    if (diffInMinutes === 0) {
      return 'только что'
    }

    return `${formatDuration(diffInMinutes)} назад`
  }

  const handleQuickAction = (action: QuickActionType) => {
    setModalAction(action)
    setModalOpen(true)
  }

  const handleModalSuccess = () => {
    fetchData()
    setModalOpen(false)
  }

  const handleRefresh = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }, [])

  const handleSettingChange = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const calculateAgeInMonths = (birthDate: string) => {
    const birth = new Date(birthDate)
    const now = new Date()
    const diffInMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    return Math.max(0, diffInMonths)
  }

  const handleSaveSettings = async () => {
    if (!member || !family) {
      return
    }

    try {
      const updatedSettings = await dataService.updateSettings({
        feed_interval: settings.feedingInterval,
        diaper_interval: settings.diaperInterval,
        bath_reminder_period: settings.bathInterval,
        baby_birth_date: settings.birthDate,
        baby_age_months: calculateAgeInMonths(settings.birthDate)
      })

      if (updatedSettings) {
        fetchData()
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  const requestNotificationPermission = async () => {
    if (!isNotificationSupported) {
      return
    }

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    } catch (error) {
      console.error('Error requesting notification permission:', error)
    }
  }

  const syncRemindersWithServiceWorker = useCallback(
    async (reminders: ServiceWorkerReminderPayload[]) => {
      if (!('serviceWorker' in navigator)) {
        return
      }

      try {
        const registration = await navigator.serviceWorker.ready
        const worker = registration.active ?? registration.waiting ?? registration.installing

        worker?.postMessage({
          type: 'SCHEDULE_REMINDERS',
          reminders,
          permission: notificationPermission
        })
      } catch (error) {
        console.error('Failed to sync reminders with service worker:', error)
      }
    },
    [notificationPermission]
  )

  const latestActivityTimestamp = useMemo(() => {
    const timestamps = [
      data?.lastFeeding?.timestamp,
      data?.lastDiaper?.timestamp,
      data?.lastBath?.timestamp
    ].filter(Boolean) as string[]

    if (timestamps.length === 0) {
      return null
    }

    const validDates = timestamps
      .map(item => new Date(item))
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())

    return validDates[0] ?? null
  }, [data?.lastBath?.timestamp, data?.lastDiaper?.timestamp, data?.lastFeeding?.timestamp])

  const greetingName = memberDisplayName?.split(' ')[0] || memberDisplayName || 'родитель'

  useEffect(() => {
    if (!member || !family) {
      return
    }

    fetchData()
  }, [member, family, fetchData])

  useEffect(() => {
    if (activeSection === 'history' && member && family) {
      fetchHistoryData()
    }
  }, [activeSection, member, family, fetchHistoryData])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const getScrollTop = () => {
      if (typeof document === 'undefined') {
        return 0
      }

      const scrollingElement = document.scrollingElement || document.documentElement
      if (scrollingElement) {
        return scrollingElement.scrollTop
      }

      return window.scrollY || 0
    }

    const resetPullState = () => {
      updatePullDistance(0)
      pullStartYRef.current = null
      isPullingRef.current = false
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        return
      }

      if (getScrollTop() > 0) {
        resetPullState()
        return
      }

      pullStartYRef.current = event.touches[0]?.clientY ?? null
      isPullingRef.current = pullStartYRef.current !== null
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (!isPullingRef.current || pullStartYRef.current === null) {
        return
      }

      const currentY = event.touches[0]?.clientY ?? pullStartYRef.current
      const delta = currentY - pullStartYRef.current

      if (delta <= 0) {
        resetPullState()
        return
      }

      event.preventDefault()
      const limitedDelta = Math.min(delta, MAX_PULL_DISTANCE)
      updatePullDistance(limitedDelta)
    }

    const handleTouchEnd = () => {
      if (pullDistanceRef.current >= PULL_REFRESH_THRESHOLD) {
        resetPullState()
        handleRefresh()
        return
      }

      resetPullState()
    }

    const handleTouchCancel = () => {
      resetPullState()
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('touchcancel', handleTouchCancel)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [handleRefresh, updatePullDistance])

  useEffect(() => {
    if (!isNotificationSupported) {
      return
    }

    setNotificationPermission(requestDefaultNotificationPermission())
  }, [isNotificationSupported])

  useEffect(() => {
    return () => {
      Object.values(reminderTimers.current).forEach(timerId => {
        if (typeof timerId === 'number') {
          window.clearTimeout(timerId)
        }
      })
    }
  }, [])

  useEffect(() => {
    if (!isNotificationSupported || notificationPermission !== 'granted') {
      Object.values(reminderTimers.current).forEach(timerId => {
        if (typeof timerId === 'number') {
          window.clearTimeout(timerId)
        }
      })
      reminderTimers.current = {}
      syncRemindersWithServiceWorker([])
      return
    }

    const remindersForWorker: ServiceWorkerReminderPayload[] = []

    const scheduleReminder = (
      key: ReminderType,
      lastTimestamp: string | undefined,
      intervalHours: number,
      title: string,
      bodyPrefix: string
    ) => {
      if (!lastTimestamp || !Number.isFinite(intervalHours) || intervalHours <= 0) {
        if (reminderTimers.current[key]) {
          window.clearTimeout(reminderTimers.current[key]!)
          delete reminderTimers.current[key]
        }
        return
      }

      const lastTime = new Date(lastTimestamp)
      if (Number.isNaN(lastTime.getTime())) {
        return
      }

      const nextTime = new Date(lastTime.getTime() + intervalHours * 60 * 60 * 1000)
      const delayMs = Math.max(0, nextTime.getTime() - Date.now())

      if (reminderTimers.current[key]) {
        window.clearTimeout(reminderTimers.current[key]!)
      }

      reminderTimers.current[key] = window.setTimeout(async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration()
          const elapsedMinutes = Math.round((Date.now() - lastTime.getTime()) / (1000 * 60))
          const body = `${bodyPrefix} ${formatDuration(Math.max(elapsedMinutes, 0))}`
          const notificationOptions: NotificationOptions = {
            body,
            tag: `babycare-${key}-reminder`,
            badge: '/icons/icon-96x96.png',
            icon: '/icons/icon-192x192.png'
          }

          if (registration) {
            await registration.showNotification(title, notificationOptions)
          } else if ('Notification' in window) {
            new Notification(title, notificationOptions)
          }
        } catch (error) {
          console.error('Unable to show reminder notification:', error)
        } finally {
          const newTimestamp = new Date().toISOString()
          scheduleReminder(key, newTimestamp, intervalHours, title, bodyPrefix)
        }
      }, delayMs)

      remindersForWorker.push({
        key,
        lastTimestamp: lastTime.toISOString(),
        intervalMs: intervalHours * 60 * 60 * 1000,
        title,
        bodyPrefix
      })
    }

    scheduleReminder(
      'feeding',
      data?.lastFeeding?.timestamp,
      settings.feedingInterval,
      'Пора покормить малыша',
      'С момента последнего кормления прошло'
    )

    scheduleReminder(
      'diaper',
      data?.lastDiaper?.timestamp,
      settings.diaperInterval,
      'Пора сменить подгузник',
      'С момента последней смены прошло'
    )

    if (remindersForWorker.length > 0) {
      syncRemindersWithServiceWorker(remindersForWorker)
    } else {
      syncRemindersWithServiceWorker([])
    }
  }, [
    data?.lastFeeding?.timestamp,
    data?.lastDiaper?.timestamp,
    settings.feedingInterval,
    settings.diaperInterval,
    notificationPermission,
    isNotificationSupported,
    syncRemindersWithServiceWorker
  ])

  useEffect(() => {
    return () => {
      syncRemindersWithServiceWorker([])
    }
  }, [syncRemindersWithServiceWorker])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6">
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center transition-all duration-200"
        style={{
          opacity: pullDistance > 0 ? 1 : 0,
          transform: `translateY(${Math.min(pullDistance, MAX_PULL_DISTANCE) / 2}px)`
        }}
      >
        <div className="flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-slate-900/60 backdrop-blur">
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-80"
          >
            <path d="M12 5v14" />
            <path d="m5 12 7 7 7-7" />
          </svg>
          <span>
            {pullDistance >= PULL_REFRESH_THRESHOLD
              ? 'Отпустите, чтобы обновить'
              : 'Потяните вниз, чтобы обновить'}
          </span>
        </div>
      </div>
      <div className="max-w-7xl mx-auto space-y-10">
        <Card variant="glass">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button
                variant={activeSection === 'dashboard' ? 'primary' : 'secondary'}
                onClick={() => setActiveSection('dashboard')}
                className="min-h-[44px] sm:min-h-[48px] sm:px-5 sm:py-3 text-sm sm:text-base font-semibold shadow-sm"
              >
                <span className="mobile-emoji sm:text-base">📊</span> <span className="hidden sm:inline ml-2">Главная</span>
              </Button>
              <Button
                variant={activeSection === 'history' ? 'primary' : 'secondary'}
                onClick={() => setActiveSection('history')}
                className="min-h-[44px] sm:min-h-[48px] sm:px-5 sm:py-3 text-sm sm:text-base font-semibold shadow-sm"
              >
                <span className="mobile-emoji sm:text-base">🕒</span> <span className="hidden sm:inline ml-2">История</span>
              </Button>
              <Button
                variant={activeSection === 'settings' ? 'primary' : 'secondary'}
                onClick={() => setActiveSection('settings')}
                className="min-h-[44px] sm:min-h-[48px] sm:px-5 sm:py-3 text-sm sm:text-base font-semibold shadow-sm"
              >
                <span className="mobile-emoji sm:text-base">⚙️</span> <span className="hidden sm:inline ml-2">Настройки</span>
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <Button
                variant="primary"
                size="lg"
                onClick={handleRefresh}
                className="w-full sm:w-auto min-h-[56px] sm:min-h-[60px] sm:px-8 text-base sm:text-lg font-semibold shadow-xl flex items-center justify-center gap-3"
              >
                <span className="mobile-emoji text-lg sm:text-xl">🔄</span>
                <span className="sm:ml-1">Обновить данные</span>
              </Button>
              <div className="text-xs text-white/70 text-center sm:text-right">
                {latestActivityTimestamp ? (
                  <>Последнее обновление {formatTime(latestActivityTimestamp)}</>
                ) : (
                  'Данные ещё не загружены'
                )}
              </div>
            </div>
          </div>
        </Card>

        {activeSection === 'dashboard' && (
          <div className="space-y-8">
            <Card className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950/60 to-slate-900 text-white shadow-[0_28px_120px_-60px_rgba(79,70,229,0.65)]">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.55),rgba(129,140,248,0))] blur-3xl opacity-90" />
                <div className="absolute -bottom-24 -right-12 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.45),rgba(236,72,153,0))] blur-3xl opacity-75" />
                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_55%)] mix-blend-screen opacity-80" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.15),rgba(255,255,255,0))]" />
              </div>
              <div className="relative z-10 space-y-6">
                <div className="space-y-4">
                  <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
                    Режим малыша
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
                    Привет, {greetingName}! 👋
                  </h1>
                </div>
              </div>
            </Card>

            {isNotificationSupported && notificationPermission !== 'granted' && (
              <Card className="grid items-start gap-4 border border-indigo-500/30 bg-slate-900/70 backdrop-blur sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-white">Включите напоминания</h2>
                  <p className="text-sm text-gray-300">
                    Получайте уведомления о кормлении и смене подгузника точно в срок, даже когда приложение закрыто.
                  </p>
                </div>
                <Button variant="primary" onClick={requestNotificationPermission} className="w-full sm:w-auto">
                  Активировать напоминания
                </Button>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <StatCard
                title="Последнее кормление"
                value={data?.lastFeeding ? getTimeAgo(data.lastFeeding.timestamp) : 'Нет данных'}
                icon="🍼"
                color="blue"
                subtitle={data?.lastFeeding ? new Date(data.lastFeeding.timestamp).toLocaleString('ru-RU') : ''}
              />
              <StatCard
                title="Последняя смена подгузника"
                value={data?.lastDiaper ? getTimeAgo(data.lastDiaper.timestamp) : 'Нет данных'}
                icon="💩"
                color="green"
                subtitle={data?.lastDiaper ? new Date(data.lastDiaper.timestamp).toLocaleString('ru-RU') : ''}
              />
            </div>

            <Card variant="glass" className="space-y-5">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-white">Быстрые действия</h2>
                <p className="text-sm text-white/70">Отмечайте важные события по мере их случения — это займёт секунды.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                <QuickAction
                  title="Кормление"
                  description="Записать время кормления"
                  icon="🍼"
                  onClick={() => handleQuickAction('feeding')}
                  variant="primary"
                />
                <QuickAction
                  title="Смена подгузника"
                  description="Отметить смену подгузника"
                  icon="💩"
                  onClick={() => handleQuickAction('diaper')}
                  variant="success"
                />
                <QuickAction
                  title="Купание"
                  description="Записать время купания"
                  icon="🛁"
                  onClick={() => handleQuickAction('bath')}
                  variant="warning"
                />
              </div>
            </Card>

            <Card className="relative overflow-hidden border border-indigo-500/30 bg-slate-900/70 backdrop-blur">
              <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500" />
              <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                  💡
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-lg font-semibold text-white">Совет дня</h3>
                  {data?.dailyTip ? (
                    <div className="space-y-3">
                      <p className="text-gray-300">{data.dailyTip.content}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                        <span>Категория: {data.dailyTip.category}</span>
                        <span>Возраст: {data.dailyTip.age_months} мес.</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-300">
                      Рекомендуется кормить малыша каждые 2-3 часа, регулярно менять подгузник и купать ежедневно.
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeSection === 'history' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">История событий</h1>
              <p className="text-gray-300">Просматривайте все записи по кормлению, подгузникам и купаниям.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">{historyData?.feedings.length || 0}</div>
                <div className="text-sm text-gray-600">Кормления</div>
              </Card>
              <Card className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">{historyData?.diapers.length || 0}</div>
                <div className="text-sm text-gray-600">Смены подгузника</div>
              </Card>
              <Card className="text-center">
                <div className="text-2xl font-bold text-yellow-600 mb-1">{historyData?.baths.length || 0}</div>
                <div className="text-sm text-gray-600">Купания</div>
              </Card>
            </div>

            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Хронология записей</h2>
              </div>

              <div className="space-y-4">
                {historyData ? (
                  (() => {
                    const allEvents = [
                      ...(historyData.feedings || []).map(item => ({ ...item, type: 'feeding' as const })),
                      ...(historyData.diapers || []).map(item => ({ ...item, type: 'diaper' as const })),
                      ...(historyData.baths || []).map(item => ({ ...item, type: 'bath' as const }))
                    ]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, MAX_HISTORY_EVENTS)

                    return allEvents.map((item, index) => {
                      const getTypeInfo = (type: typeof item.type) => {
                        switch (type) {
                          case 'feeding':
                            return { icon: '🍼', label: 'Кормление', color: 'from-blue-500 to-blue-600' }
                          case 'diaper':
                            return { icon: '💩', label: 'Смена подгузника', color: 'from-green-500 to-green-600' }
                          case 'bath':
                            return { icon: '🛁', label: 'Купание', color: 'from-yellow-500 to-yellow-600' }
                          default:
                            return { icon: '⭐', label: 'Событие', color: 'from-gray-500 to-gray-600' }
                        }
                      }

                      const typeInfo = getTypeInfo(item.type)

                      return (
                        <div key={`${item.type}-${item.id}-${index}`} className="flex items-center space-x-4 p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 transition-all duration-200 hover:shadow-md hover:bg-gray-800/70">
                          <div className="flex-shrink-0">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg shadow-lg bg-gradient-to-r ${typeInfo.color}`}>
                              {typeInfo.icon}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-medium text-gray-100">{typeInfo.label}</h3>
                              <span className="text-sm font-medium text-gray-400">{getTimeAgo(item.timestamp)}</span>
                            </div>
                            <p className="text-sm text-gray-300 mt-1">{formatTime(new Date(item.timestamp))}</p>
                          </div>
                        </div>
                      )
                    })
                  })()
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">⏳</div>
                    <p>Загружаем историю...</p>
                  </div>
                )}
              </div>
            </Card>
          </>
        )}

        
        {activeSection === 'settings' && (
          <div className="settings-section space-y-8">
            <div className="animate-slide-up space-y-3">
              <h1 className="text-3xl font-bold text-white gradient-text">Настройки</h1>
              <p className="max-w-2xl text-lg text-gray-300">Обновите данные малыша и настройте напоминания, чтобы всегда быть в курсе его режима.</p>
            </div>

            <Card className="settings-card animate-slide-up">
              <div className="settings-heading">
                <div className="settings-heading-icon bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-indigo-500/20 text-blue-100">👶</div>
                <span className="settings-heading-label">Профиль малыша</span>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="settings-label">Дата рождения</label>
                  <input
                    type="date"
                    value={settings.birthDate}
                    onChange={(event) => handleSettingChange('birthDate', event.target.value)}
                    className="settings-input w-full ios-input"
                  />
                </div>
              </div>
            </Card>

            <Card className="settings-card animate-slide-up">
              <div className="settings-heading">
                <div className="settings-heading-icon bg-gradient-to-br from-emerald-500/30 via-teal-500/30 to-green-400/20 text-emerald-100">⏰</div>
                <span className="settings-heading-label">Напоминания</span>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="settings-slider-container">
                  <label className="settings-label">Интервал кормления (часы)</label>
                  <div className="mt-3 flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={settings.feedingInterval}
                      onChange={(event) => handleSettingChange('feedingInterval', parseInt(event.target.value, 10))}
                      className="slider flex-1 appearance-none rounded-full bg-white/20"
                    />
                    <span className="settings-value-display text-blue-600">{settings.feedingInterval}ч</span>
                  </div>
                </div>

                <div className="settings-slider-container">
                  <label className="settings-label">Интервал смены подгузника (часы)</label>
                  <div className="mt-3 flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={settings.diaperInterval}
                      onChange={(event) => handleSettingChange('diaperInterval', parseInt(event.target.value, 10))}
                      className="slider flex-1 appearance-none rounded-full bg-white/20"
                    />
                    <span className="settings-value-display text-emerald-600">{settings.diaperInterval}ч</span>
                  </div>
                </div>

                <div className="settings-slider-container md:col-span-2">
                  <label className="settings-label">Период купания (дни)</label>
                  <div className="mt-3 flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="7"
                      value={settings.bathInterval}
                      onChange={(event) => handleSettingChange('bathInterval', parseInt(event.target.value, 10))}
                      className="slider flex-1 appearance-none rounded-full bg-white/20"
                    />
                    <span className="settings-value-display text-amber-600">{settings.bathInterval}д</span>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex justify-end animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Button
                variant="primary"
                size="lg"
                onClick={handleSaveSettings}
                className="settings-save-button"
              >
                💾 Сохранить изменения
              </Button>
            </div>
          </div>
        )}

        <QuickActionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          actionType={modalAction}
          onSuccess={handleModalSuccess}
        />

        {process.env.NODE_ENV === 'development' && <DebugPanel />}

        {/* Family/User Info Block - Moved to bottom */}
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 rounded-2xl bg-white/5 px-4 py-3 text-white/80">
            <div className="text-left">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Family</p>
              <p className="text-sm font-semibold text-white">{family?.name ?? 'Family'}</p>
            </div>
            <div className="hidden sm:block h-6 w-px bg-white/10" />
            <div className="mt-3 sm:mt-0 text-left">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">You</p>
              <p className="text-sm font-medium text-white truncate max-w-[10rem]">{memberDisplayName}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={signOut}
              className="mt-3 sm:mt-0 sm:ml-2 whitespace-nowrap"
            >
              Выйти
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
