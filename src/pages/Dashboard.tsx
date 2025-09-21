import { useEffect, useMemo, useRef, useState } from 'react'
import StatCard from '../components/StatCard'
import QuickAction from '../components/QuickAction'
import QuickActionModal from '../components/QuickActionModal'
import Card from '../components/Card'
import Button from '../components/Button'
import DebugPanel from '../components/DebugPanel'
import { dataService, Feeding, Diaper, Bath, Tip } from '../services/dataService'

type DashboardSection = 'dashboard' | 'history' | 'settings'
type QuickActionType = 'feeding' | 'diaper' | 'bath'
type ReminderType = 'feeding' | 'diaper'

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
  babyName: string
  birthDate: string
  feedingInterval: number
  diaperInterval: number
  bathInterval: number
}

interface NextEventInfo {
  nextTime: Date
  diffMinutes: number
  overdue: boolean
}

const MAX_HISTORY_EVENTS = 20

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

const calculateNextEvent = (timestamp: string | null | undefined, intervalHours: number): NextEventInfo | null => {
  if (!timestamp || !Number.isFinite(intervalHours) || intervalHours <= 0) {
    return null
  }

  const lastTime = new Date(timestamp)
  if (Number.isNaN(lastTime.getTime())) {
    return null
  }

  const nextTime = new Date(lastTime.getTime() + intervalHours * 60 * 60 * 1000)
  const diffMinutes = Math.round((nextTime.getTime() - Date.now()) / (1000 * 60))

  return {
    nextTime,
    diffMinutes,
    overdue: diffMinutes <= 0
  }
}

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
    babyName: 'Малыш',
    birthDate: '2024-01-01',
    feedingInterval: 3,
    diaperInterval: 2,
    bathInterval: 1
  })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<QuickActionType>('feeding')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(requestDefaultNotificationPermission)

  const reminderTimers = useRef<Partial<Record<ReminderType, number>>>({})
  const isNotificationSupported = typeof window !== 'undefined' && 'Notification' in window

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (activeSection === 'history') {
      fetchHistoryData()
    }
  }, [activeSection])

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
      return
    }

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
            renotify: true,
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
  }, [
    data?.lastFeeding?.timestamp,
    data?.lastDiaper?.timestamp,
    settings.feedingInterval,
    settings.diaperInterval,
    notificationPermission,
    isNotificationSupported
  ])

  const fetchData = async () => {
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
  }

  const fetchHistoryData = async () => {
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
  }

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

  const nextFeedingInfo = useMemo(
    () => calculateNextEvent(data?.lastFeeding?.timestamp, settings.feedingInterval),
    [data?.lastFeeding?.timestamp, settings.feedingInterval]
  )

  const nextDiaperInfo = useMemo(
    () => calculateNextEvent(data?.lastDiaper?.timestamp, settings.diaperInterval),
    [data?.lastDiaper?.timestamp, settings.diaperInterval]
  )

  const recentEvents = useMemo(() => {
    const events: Array<{
      type: QuickActionType | 'bath'
      label: string
      timestamp: string
      icon: string
      color: string
    }> = []

    if (data?.lastFeeding) {
      events.push({
        type: 'feeding',
        label: 'Кормление',
        timestamp: data.lastFeeding.timestamp,
        icon: '🍼',
        color: 'bg-blue-500'
      })
    }

    if (data?.lastDiaper) {
      events.push({
        type: 'diaper',
        label: 'Смена подгузника',
        timestamp: data.lastDiaper.timestamp,
        icon: '🧷',
        color: 'bg-green-500'
      })
    }

    if (data?.lastBath) {
      events.push({
        type: 'bath',
        label: 'Купание',
        timestamp: data.lastBath.timestamp,
        icon: '🛁',
        color: 'bg-yellow-500'
      })
    }

    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3)
  }, [data?.lastBath, data?.lastDiaper, data?.lastFeeding])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
            <div className="flex flex-wrap gap-2 sm:space-x-4 sm:gap-0">
              <Button
                variant={activeSection === 'dashboard' ? 'primary' : 'secondary'}
                onClick={() => setActiveSection('dashboard')}
                className="text-sm sm:text-base"
              >
                📊 <span className="hidden sm:inline">Обзор</span>
              </Button>
              <Button
                variant={activeSection === 'history' ? 'primary' : 'secondary'}
                onClick={() => setActiveSection('history')}
                className="text-sm sm:text-base"
              >
                📅 <span className="hidden sm:inline">История</span>
              </Button>
              <Button
                variant={activeSection === 'settings' ? 'primary' : 'secondary'}
                onClick={() => setActiveSection('settings')}
                className="text-sm sm:text-base"
              >
                ⚙️ <span className="hidden sm:inline">Настройки</span>
              </Button>
            </div>
          </div>
        </div>

        {activeSection === 'dashboard' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Добро пожаловать! 👶</h1>
              <p className="text-gray-300">Следите за важными событиями ухода за малышом в одном месте.</p>
            </div>

            {isNotificationSupported && notificationPermission !== 'granted' && (
              <Card className="mb-8 border-2 border-dashed border-blue-300 bg-blue-50/80 backdrop-blur">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Включите напоминания</h2>
                    <p className="text-sm text-gray-600">
                      Получайте напоминания о кормлении и смене подгузника точно в срок.
                    </p>
                  </div>
                  <Button variant="primary" onClick={requestNotificationPermission}>
                    Активировать напоминания
                  </Button>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                icon="🧷"
                color="green"
                subtitle={data?.lastDiaper ? new Date(data.lastDiaper.timestamp).toLocaleString('ru-RU') : ''}
              />
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Быстрые действия</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  icon="🧷"
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
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Последние события</h2>
              <Card>
                <div className="space-y-4">
                  {recentEvents.length > 0 ? (
                    recentEvents.map(event => (
                      <div key={`${event.type}-${event.timestamp}`} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                        <div className={`w-10 h-10 ${event.color} rounded-full flex items-center justify-center text-white`}>
                          {event.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{event.label}</p>
                          <p className="text-sm text-gray-600">{getTimeAgo(event.timestamp)}</p>
                        </div>
                        <div className="text-sm text-gray-500">{formatTime(new Date(event.timestamp))}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">🌟</div>
                      <p>Здесь появятся недавние записи</p>
                      <p className="text-sm">Используйте быстрые действия, чтобы добавить событие.</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl">
                  💡
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Совет дня</h3>
                  {data?.dailyTip ? (
                    <div>
                      <p className="text-gray-700 mb-2">{data.dailyTip.content}</p>
                      <div className="flex flex-wrap items-center justify-between text-sm text-gray-500 gap-2">
                        <span>Категория: {data.dailyTip.category}</span>
                        <span>Возраст: {data.dailyTip.age_months} мес.</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700">
                      Регулярное кормление каждые 2-3 часа помогает установить режим и поддерживать стабильный вес малыша.
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </>
        )}

        {activeSection === 'history' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">История событий 📖</h1>
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
                            return { icon: '🧷', label: 'Смена подгузника', color: 'from-green-500 to-green-600' }
                          case 'bath':
                            return { icon: '🛁', label: 'Купание', color: 'from-yellow-500 to-yellow-600' }
                          default:
                            return { icon: '✨', label: 'Событие', color: 'from-gray-500 to-gray-600' }
                        }
                      }

                      const typeInfo = getTypeInfo(item.type)

                      return (
                        <div key={`${item.type}-${item.id}-${index}`} className="flex items-center space-x-4 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md">
                          <div className="flex-shrink-0">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg shadow-lg bg-gradient-to-r ${typeInfo.color}`}>
                              {typeInfo.icon}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-medium text-gray-900">{typeInfo.label}</h3>
                              <span className="text-sm font-medium text-gray-500">{getTimeAgo(item.timestamp)}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{formatTime(new Date(item.timestamp))}</p>
                          </div>
                        </div>
                      )
                    })
                  })()
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">⏳</div>
                    <p>Загружаем историю...</p>
                  </div>
                )}
              </div>
            </Card>
          </>
        )}

        {activeSection === 'settings' && (
          <div className="settings-section">
            <div className="mb-8 animate-slide-up">
              <h1 className="text-3xl font-bold text-white mb-2 gradient-text">Настройки ⚙️</h1>
              <p className="text-gray-300 text-lg">Актуализируйте информацию, чтобы получать персональные подсказки.</p>
            </div>

            <Card className="mb-8 settings-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <span className="text-2xl mr-3">👶</span>
                Информация о малыше
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="min-w-0">
                  <label className="block text-sm font-medium settings-label mb-2">
                    Имя малыша
                  </label>
                  <input
                    type="text"
                    value={settings.babyName}
                    onChange={(e) => handleSettingChange('babyName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base settings-input"
                    placeholder="Введите имя"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium settings-label mb-2">
                    Дата рождения
                  </label>
                  <input
                    type="date"
                    value={settings.birthDate}
                    onChange={(e) => handleSettingChange('birthDate', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ios-input text-base settings-input"
                  />
                </div>
              </div>
            </Card>

            <Card className="mb-8 settings-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <span className="text-2xl mr-3">⏰</span>
                Интервалы напоминаний
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="settings-slider-container">
                  <label className="block text-sm font-medium settings-label mb-2">
                    Интервал кормления (часы)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={settings.feedingInterval}
                      onChange={(e) => handleSettingChange('feedingInterval', parseInt(e.target.value, 10))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <span className="text-lg font-semibold text-blue-600 min-w-[4rem] text-center settings-value-display bg-blue-50 px-3 py-1 rounded-full">
                      {settings.feedingInterval}ч
                    </span>
                  </div>
                </div>

                <div className="settings-slider-container">
                  <label className="block text-sm font-medium settings-label mb-2">
                    Интервал смены подгузника (часы)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={settings.diaperInterval}
                      onChange={(e) => handleSettingChange('diaperInterval', parseInt(e.target.value, 10))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <span className="text-lg font-semibold text-green-600 min-w-[4rem] text-center settings-value-display bg-green-50 px-3 py-1 rounded-full">
                      {settings.diaperInterval}ч
                    </span>
                  </div>
                </div>

                <div className="settings-slider-container md:col-span-2">
                  <label className="block text-sm font-medium settings-label mb-2">
                    Интервал купания (дни)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="7"
                      value={settings.bathInterval}
                      onChange={(e) => handleSettingChange('bathInterval', parseInt(e.target.value, 10))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <span className="text-lg font-semibold text-yellow-600 min-w-[4rem] text-center settings-value-display bg-yellow-50 px-3 py-1 rounded-full">
                      {settings.bathInterval}д
                    </span>
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
                💾 Сохранить настройки
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
      </div>
    </div>
  )
}
