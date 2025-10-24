import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import StatCard from '../components/StatCard'
import QuickAction from '../components/QuickAction'
import QuickActionModal from '../components/QuickActionModal'
import Card from '../components/Card'
import Button from '../components/Button'
import LoadingScreen from '../components/LoadingScreen'
import DebugPanel from '../components/DebugPanel'
import BabyIllustration from '../components/BabyIllustration'
import ActivityCard from '../components/ActivityCard'
import BottomNavigation from '../components/BottomNavigation'
import BackgroundElements from '../components/BackgroundElements'
import CategoryPreloader from '../components/CategoryPreloader'
import TamagotchiPage from './TamagotchiPage'
import TetrisPage from './TetrisPage'
import GrowthChartCard, { WHO_HEIGHT_CURVES, WHO_WEIGHT_CURVES } from '../components/GrowthChartCard'
import { useAuth } from '../contexts/AuthContext'
import { dataService } from '../services/dataService'
import type { Feeding, Diaper, Bath, Activity, Tip, SleepSession, FamilyMember } from '../services/dataService'
import RecordDetailModal from '../components/RecordDetailModal'
import EventGroup from '../components/EventGroup'
import DutyScheduleModal from '../components/DutyScheduleModal'
import {
  DEFAULT_BLOCK_DURATION,
  DEFAULT_START_OFFSET,
  buildDefaultSchedule,
  buildDisplayName,
  findAssignmentByBlockId,
  getDutyBlocks,
  loadDutyScheduleHybrid,
  saveDutyScheduleHybrid,
  type DutySchedule
} from '../services/dutyScheduleService'
import { initGradientTimer, getStatusMessage, calculateGradientProgress } from '../lib/gradientUtils'
import { getServiceWorkerScope } from '../lib/pwaUtils'

type DashboardSection = 'dashboard' | 'settings'
type QuickActionType = 'feeding' | 'diaper' | 'bath' | 'activity'
type ReminderType = 'feeding' | 'diaper'

type QuickActionResult = {}

interface DashboardData {
  lastFeeding: Feeding | null
  lastDiaper: Diaper | null
  lastBath: Bath | null
  dailyTip: Tip | null
}


interface TotalCounts {
  feedings: number
  diapers: number
  baths: number
  activities: number
}

interface SettingsState {
  birthDate: string
  feedingInterval: number
  diaperInterval: number
  bathInterval: number
  wakeOnActivityEnabled: boolean
}

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

const getTypeInfo = (type: string, item: any) => {
  switch (type) {
    case 'feeding':
      return { 
        icon: <img src="/icons/feeding.png" alt="Кормление" className="w-9 h-9 object-contain" />, 
        label: 'Кормление', 
        color: 'bg-blue-100 text-blue-600',
        bgColor: 'bg-blue-50',
        description: '',
        extraInfo: item.ounces ? `🍼 ${item.ounces} унций` : null
      }
    case 'diaper':
      return { 
        icon: <img src="/icons/poor.png" alt="Смена подгузника" className="w-9 h-9 object-contain" />, 
        label: 'Смена подгузника', 
        color: 'bg-green-100 text-green-600',
        bgColor: 'bg-green-50',
        description: '',
        extraInfo: item.diaper_type === 'Покакал' ? '💩 Покакал' : '💧 Просто'
      }
    case 'bath':
      return { 
        icon: <img src="/icons/bath.png" alt="Купание" className="w-9 h-9 object-contain" />, 
        label: 'Купание', 
        color: 'bg-yellow-100 text-yellow-600',
        bgColor: 'bg-yellow-50',
        description: '',
        extraInfo: item.bath_mood === 'Беспокоился' ? '😢 Беспокоился' : '😊 Спокойно'
      }
    case 'activity':
      // Определяем иконку и стили в зависимости от типа активности
      const getActivityInfo = (activityType: string) => {
        switch (activityType) {
          case 'Прогулка':
            return {
              icon: '/icons/walking.png',
              label: 'Прогулка',
              color: 'bg-green-100 text-green-600',
              bgColor: 'bg-green-50',
              extraInfo: '🚶 Прогулка'
            }
          case 'Выкладывание на живот':
            return {
              icon: '/icons/belly.png',
              label: 'Выкладывание на живот',
              color: 'bg-blue-100 text-blue-600',
              bgColor: 'bg-blue-50',
              extraInfo: '🤱 Выкладывание на живот'
            }
          case 'Массаж':
            return {
              icon: '/icons/massage.png',
              label: 'Массаж',
              color: 'bg-purple-100 text-purple-600',
              bgColor: 'bg-purple-50',
              extraInfo: '💆 Массаж'
            }
          case 'Танцы на руках':
            return {
              icon: '/icons/dance.png',
              label: 'Танцы на руках',
              color: 'bg-orange-100 text-orange-600',
              bgColor: 'bg-orange-50',
              extraInfo: '💃 Танцы на руках'
            }
          default:
            return {
              icon: '/icons/activity.png',
              label: 'Активность',
              color: 'bg-gray-100 text-gray-600',
              bgColor: 'bg-gray-50',
              extraInfo: item.activity_type ? `🎯 ${item.activity_type}` : null
            }
        }
      }
      
      const activityInfo = getActivityInfo(item.activity_type)
      return {
        icon: <img src={activityInfo.icon} alt={activityInfo.label} className="w-9 h-9 object-contain" />,
        label: activityInfo.label,
        color: activityInfo.color,
        bgColor: activityInfo.bgColor,
        description: '',
        extraInfo: activityInfo.extraInfo
      }
    case 'sleep':
      // Берем duration_minutes из БД, а если его нет, считаем по start_time/end_time
      const hasEnded = Boolean(item.end_time)
      const computedDuration = (() => {
        if (typeof item?.duration_minutes === 'number' && item.duration_minutes > 0) return item.duration_minutes as number
        if (hasEnded && item.start_time && item.end_time) {
          const start = new Date(item.start_time).getTime()
          const end = new Date(item.end_time).getTime()
          if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
            return Math.max(1, Math.floor((end - start) / (1000 * 60)))
          }
        }
        return undefined
      })()
      if (hasEnded) {
        const durationText = typeof computedDuration === 'number' ? formatDuration(computedDuration) : null
        return {
          icon: <img src="/icons/sleep.png" alt="Сон" className="w-9 h-9 object-contain" />,
          label: 'Сон',
          color: 'bg-indigo-100 text-indigo-600',
          bgColor: 'bg-indigo-50',
          description: '',
          extraInfo: durationText ? `😴 ${durationText}` : null
        }
      }
      return { 
        icon: <img src="/icons/sleep.png" alt="Сон" className="w-9 h-9 object-contain" />, 
        label: 'Сон начат', 
        color: 'bg-indigo-100 text-indigo-600',
        bgColor: 'bg-indigo-50',
        description: '',
        extraInfo: '😴 В процессе'
      }
    default:
      return { 
        icon: <img src="/icons/activity.png" alt="Событие" className="w-9 h-9 object-contain" />, 
        label: 'Событие', 
        color: 'bg-gray-100 text-gray-600',
        bgColor: 'bg-gray-50',
        description: '',
        extraInfo: null
      }
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
  const [totalCounts, setTotalCounts] = useState<TotalCounts | null>(null)
  const [settings, setSettings] = useState<SettingsState>({
    birthDate: '2024-01-01',
    feedingInterval: 3,
    diaperInterval: 2,
    bathInterval: 1,
    wakeOnActivityEnabled: true
  })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<QuickActionType>('feeding')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(requestDefaultNotificationPermission)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'settings' | 'tamagotchi' | 'tetris'>('home')
  const [recordDetailModalOpen, setRecordDetailModalOpen] = useState(false)
  const [growthChartModalOpen, setGrowthChartModalOpen] = useState(false)
  const [growthChartType, setGrowthChartType] = useState<'height' | 'weight'>('height')
  const [selectedRecord, setSelectedRecord] = useState<{
    type: 'feeding' | 'diaper' | 'bath' | 'activity' | 'sleep'
    id: number
    timestamp: string
    author_name: string
    author_role: string
    activity_type?: string
    ounces?: number
    diaper_type?: string
    bath_mood?: string
    start_time?: string
    end_time?: string
    duration_minutes?: number
  } | null>(null)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [dutySchedule, setDutySchedule] = useState<DutySchedule | null>(null)
  const [dutyModalOpen, setDutyModalOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [currentDutyMemberFromDB, setCurrentDutyMemberFromDB] = useState<FamilyMember | null>(null)
  
  // Tamagotchi modal state
  const [tamagotchiModalOpen, setTamagotchiModalOpen] = useState(false)
  const [tamagotchiModalAction, setTamagotchiModalAction] = useState<QuickActionType>('feeding')
  
  // Состояние для недавних событий
  const [recentEventsExpanded, setRecentEventsExpanded] = useState(false)
  const recentEventsExpandedRef = useRef(false)
  
  // Состояние для пользовательского изображения малыша
  const [customBabyImage, setCustomBabyImage] = useState<string | null>(null)
  const [recentEvents, setRecentEvents] = useState<any[]>([])
  const [recentEventsLoading, setRecentEventsLoading] = useState(false)

  const { member, family, signOut } = useAuth()


  const pullStartYRef = useRef<number | null>(null)
  const isPullingRef = useRef(false)
  const pullDistanceRef = useRef(0)
  const pullIndicatorRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastThresholdStateRef = useRef<'below' | 'above' | 'unknown'>('unknown')

  // Оптимизированная функция обновления pull distance
  const updatePullDistance = useCallback((value: number) => {
    pullDistanceRef.current = value
    
    // Прямое обновление DOM стилей для лучшей производительности
    if (pullIndicatorRef.current) {
      const clampedValue = Math.min(value, MAX_PULL_DISTANCE)
      pullIndicatorRef.current.style.transform = `translateY(${clampedValue - 60}px)`
      pullIndicatorRef.current.style.opacity = value > 20 ? Math.min(1, (value - 20) / 40).toString() : '0'
    }
    
    // Обновляем состояние только при пересечении порогов для редкого режима
    const currentThresholdState = value >= PULL_REFRESH_THRESHOLD ? 'above' : 'below'
    if (lastThresholdStateRef.current !== currentThresholdState) {
      lastThresholdStateRef.current = currentThresholdState
      setPullDistance(value)
    }
  }, [])

  const reminderTimers = useRef<Partial<Record<ReminderType, number>>>({})
  const isNotificationSupported = typeof window !== 'undefined' && 'Notification' in window
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const serviceWorkerScope = useMemo(() => {
    if (typeof window === 'undefined') {
      return '/'
    }

    return getServiceWorkerScope()
  }, [])

  const memberDisplayName = member?.name ?? member?.role ?? 'Участник семьи'

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setServiceWorkerRegistration(null)
      return
    }

    let isMounted = true

    const resolveRegistration = async () => {
      try {
        const registration = await navigator.serviceWorker.ready
        if (isMounted) {
          setServiceWorkerRegistration(registration)
        }
      } catch (error) {
        console.error('Error waiting for service worker readiness:', error)
        try {
          const registration = await navigator.serviceWorker.getRegistration(serviceWorkerScope)
          if (registration && isMounted) {
            setServiceWorkerRegistration(registration)
          }
        } catch (getRegistrationError) {
          console.error('Error getting existing service worker registration:', getRegistrationError)
        }
      }
    }

    resolveRegistration()

    return () => {
      isMounted = false
    }
  }, [serviceWorkerScope])

  // Синхронизируем ref с состоянием recentEventsExpanded
  useEffect(() => {
    recentEventsExpandedRef.current = recentEventsExpanded
  }, [recentEventsExpanded])

  // Загружаем пользовательское изображение малыша из localStorage
  useEffect(() => {
    const savedImage = localStorage.getItem('customBabyImage')
    if (savedImage) {
      setCustomBabyImage(savedImage)
    }
  }, [])

  // Загружаем текущего дежурного из БД

  useEffect(() => {
    const loadCurrentDutyMember = async () => {
      if (!family?.id) {
        setCurrentDutyMemberFromDB(null)
        return
      }

      try {
        const currentDuty = await dataService.getCurrentDutyMember()
        setCurrentDutyMemberFromDB(currentDuty)
      } catch (error) {
        console.error('Error loading current duty member from database', error)
        setCurrentDutyMemberFromDB(null)
      }
    }

    loadCurrentDutyMember()

    // Обновляем каждые 5 минут
    const intervalId = setInterval(loadCurrentDutyMember, 5 * 60 * 1000)

    return () => clearInterval(intervalId)
  }, [family?.id])

  useEffect(() => {
    if (!family?.id) {
      setFamilyMembers([])
      setDutySchedule(null)
      return
    }

    let isActive = true

    const loadFamilyData = async () => {
      try {
        const membersList = await dataService.getFamilyMembers()
        if (!isActive) {
          return
        }
        setFamilyMembers(membersList)
        
        // Загружаем график дежурств с синхронизацией БД
        const schedule = await loadDutyScheduleHybrid(family.id, membersList)
        if (!isActive) {
          return
        }
        setDutySchedule(schedule)
      } catch (error) {
        console.error('Unable to load family members for duty schedule', error)
        if (!isActive) {
          return
        }
        setFamilyMembers([])
        const fallback = buildDefaultSchedule([], DEFAULT_BLOCK_DURATION, DEFAULT_START_OFFSET)
        setDutySchedule(fallback)
      }
    }

    loadFamilyData()

    return () => {
      isActive = false
    }
  }, [family?.id])

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
          bathInterval: settingsFromDb.bath_reminder_period ?? prev.bathInterval,
          wakeOnActivityEnabled: settingsFromDb.wake_on_activity_enabled ?? prev.wakeOnActivityEnabled
        }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [member, family])

  const handleDutyScheduleChange = useCallback(async (nextSchedule: DutySchedule) => {
    setDutySchedule(nextSchedule)

    if (family?.id) {
      try {
        // Сохраняем с синхронизацией БД
        const success = await saveDutyScheduleHybrid(family.id, nextSchedule)
        if (!success) {
          console.warn('Failed to save duty schedule to both database and localStorage')
        }
      } catch (error) {
        console.error('Error saving duty schedule:', error)
      }
    }
  }, [family?.id])

  const currentBlockDuration = dutySchedule?.blockDurationHours ?? DEFAULT_BLOCK_DURATION
  const currentStartOffset = dutySchedule?.startHourOffset ?? DEFAULT_START_OFFSET

  const dutyBlocks = useMemo(
    () => getDutyBlocks(currentBlockDuration, currentStartOffset),
    [currentBlockDuration, currentStartOffset]
  )

  const dutyRuntime = useMemo(() => {
    if (dutyBlocks.length === 0) {
      return { block: null, blockId: '', index: 0, progress: 0 }
    }

    const hourFraction = currentTime.getHours() + currentTime.getMinutes() / 60
    let diff = hourFraction - currentStartOffset
    diff = ((diff % 24) + 24) % 24

    const blockCount = dutyBlocks.length
    const blockIndex = Math.floor(diff / currentBlockDuration) % blockCount
    const block = dutyBlocks[blockIndex] ?? null
    const timeIntoBlock = diff - blockIndex * currentBlockDuration
    const progress = Math.min(100, Math.max(0, (timeIntoBlock / currentBlockDuration) * 100))

    return { block, blockId: block?.id ?? '', index: blockIndex, progress }
  }, [currentBlockDuration, currentStartOffset, currentTime, dutyBlocks])

  const currentDutyBlock = dutyRuntime.block
  const currentDutyBlockId = dutyRuntime.blockId

  const currentDutyAssignment = useMemo(() => {
    if (!dutySchedule || !currentDutyBlockId) {
      return null
    }

    return findAssignmentByBlockId(dutySchedule, currentDutyBlockId) ?? null
  }, [dutySchedule, currentDutyBlockId])

  const currentDutyMember = useMemo(() => {
    if (!currentDutyAssignment?.parentId) {
      return undefined
    }

    return familyMembers.find(member => String(member.user_id) === currentDutyAssignment.parentId)
  }, [familyMembers, currentDutyAssignment])

  const nextDutyInfo = useMemo(() => {
    if (dutyBlocks.length === 0) {
      return null
    }

    const nextIndex = (dutyRuntime.index + 1) % dutyBlocks.length
    const nextBlock = dutyBlocks[nextIndex]
    if (!nextBlock) {
      return null
    }

    if (!dutySchedule) {
      return { block: nextBlock, member: undefined }
    }

    const nextAssignment = findAssignmentByBlockId(dutySchedule, nextBlock.id)
    const member = nextAssignment?.parentId
      ? familyMembers.find(item => String(item.user_id) === nextAssignment.parentId)
      : undefined

    return { block: nextBlock, member }
  }, [dutyBlocks, dutyRuntime.index, dutySchedule, familyMembers])

  const dutyScheduleUpdatedAt = useMemo(() => {
    return dutySchedule?.updatedAt ? new Date(dutySchedule.updatedAt) : null
  }, [dutySchedule])

  const currentDutyName = useMemo(() => {
    // Приоритет: данные из БД, затем локальные данные
    if (currentDutyMemberFromDB) {
      return buildDisplayName(currentDutyMemberFromDB)
    }
    return buildDisplayName(currentDutyMember)
  }, [currentDutyMemberFromDB, currentDutyMember])
  const nextDutyName = useMemo(() => buildDisplayName(nextDutyInfo?.member), [nextDutyInfo])

  const currentDutyProgressDisplay = useMemo(() => {
    if (!dutyRuntime.block) {
      return 0
    }

    return Math.min(100, Math.max(4, dutyRuntime.progress))
  }, [dutyRuntime.block, dutyRuntime.progress])

  const dutyScheduleForModal = useMemo<DutySchedule>(() => {
    if (dutySchedule) {
      return dutySchedule
    }

    return buildDefaultSchedule(familyMembers, currentBlockDuration, currentStartOffset)
  }, [dutySchedule, familyMembers, currentBlockDuration, currentStartOffset])


  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.max(0, Math.floor((now.getTime() - time.getTime()) / (1000 * 60)))

    if (diffInMinutes === 0) {
      return 'только что'
    }

    return `${formatDuration(diffInMinutes)} назад`
  }

  // Функция для расчета статистики за день
  const getTodayStats = () => {
    // Упрощенная версия без истории событий
    return {
      feedings: 0,
      diapers: 0,
      activities: 0,
      sleep: '0м'
    }
  }

  const handleQuickAction = (action: QuickActionType) => {
    setModalAction(action)
    setModalOpen(true)
  }

  // Функция для загрузки пользовательского изображения малыша
  const handleImageUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const imageDataUrl = event.target?.result as string
          setCustomBabyImage(imageDataUrl)
          localStorage.setItem('customBabyImage', imageDataUrl)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  // Функция для сброса пользовательского изображения
  const handleImageReset = () => {
    setCustomBabyImage(null)
    localStorage.removeItem('customBabyImage')
  }

  // Функция для определения действия при клике на изображение малыша
  const handleBabyImageClick = () => {
    const babyState = getBabyImageState()
    
    switch (babyState) {
      case 'hungry':
        handleQuickAction('feeding')
        break
      case 'diaper':
        handleQuickAction('diaper')
        break
      case 'bath':
        handleQuickAction('bath')
        break
      default:
        // Если все в порядке (normal), предлагаем загрузить изображение или сбросить его
        if (customBabyImage) {
          // Если есть пользовательское изображение, предлагаем сбросить его
          if (confirm('Сбросить пользовательское изображение малыша?')) {
            handleImageReset()
          }
        } else {
          // Если нет пользовательского изображения, предлагаем загрузить его
          handleImageUpload()
        }
        break
    }
  }

  const handleModalSuccess = async (result?: QuickActionResult) => {
    // Перезагружаем данные после быстрого действия и обновляем историю при необходимости
    await fetchData()
    setModalOpen(false)
  }

  // Tamagotchi modal handlers
  const handleTamagotchiModalOpen = (action: QuickActionType) => {
    setTamagotchiModalAction(action)
    setTamagotchiModalOpen(true)
  }

  const handleTamagotchiModalSuccess = async (result?: QuickActionResult) => {
    // Перезагружаем данные после быстрого действия
    await fetchData()
    setTamagotchiModalOpen(false)
  }

  // Функция для загрузки недавних событий
  const fetchRecentEvents = useCallback(async () => {
    if (!member || !family) {
      return
    }

    try {
      setRecentEventsLoading(true)
      const [feedings, diapers, baths, activities, sleepSessions] = await Promise.all([
        dataService.getFeedings(10),
        dataService.getDiapers(10),
        dataService.getBaths(10),
        dataService.getActivities(10),
        dataService.getSleepSessions(10)
      ])

      // Фильтруем активности: оставляем только реальные активности малыша
      const realActivities = activities.filter(activity => {
        const realActivityTypes = ['Прогулка', 'Выкладывание на живот', 'Массаж', 'Танцы на руках']
        return realActivityTypes.includes(activity.activity_type)
      })

      // Объединяем все события в один массив
      const allEvents = [
        ...feedings.map(f => ({ ...f, type: 'feeding' })),
        ...diapers.map(d => ({ ...d, type: 'diaper' })),
        ...baths.map(b => ({ ...b, type: 'bath' })),
        ...realActivities.map(a => ({ ...a, type: 'activity' })),
        ...sleepSessions.map(s => ({ ...s, type: 'sleep', timestamp: s.start_time }))
      ]

      // Сортируем по времени (новые сначала) и берем последние 20 событий
      const sortedEvents = allEvents
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20)

      setRecentEvents(sortedEvents)
    } catch (error) {
      console.error('Error fetching recent events:', error)
      setRecentEvents([])
    } finally {
      setRecentEventsLoading(false)
    }
  }, [member, family])

  // Обработчик клика по изображению часов для раскрытия недавних событий
  const handleRecentEventsClick = useCallback(async () => {
    if (!recentEventsExpandedRef.current) {
      await fetchRecentEvents()
      // Добавляем плавную прокрутку вниз для мобильной версии при открытии модального окна
      setTimeout(() => {
        console.log('Попытка прокрутки, ширина экрана:', window.innerWidth)
        // Проверяем, что это мобильное устройство (ширина экрана меньше 768px)
        if (window.innerWidth < 768) {
          console.log('Мобильное устройство, выполняем плавную прокрутку')
          // Пробуем найти элемент с событиями и прокрутить к нему
          const eventsElement = document.querySelector('[data-recent-events]')
          if (eventsElement) {
            console.log('Найден элемент событий, прокручиваем к нему плавно')
            eventsElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            })
          } else {
            console.log('Элемент событий не найден, используем плавную прокрутку')
            // Если элемент не найден, используем более плавную прокрутку
            const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop
            const targetScrollTop = currentScrollTop + 80
            
            // Создаем плавную анимацию прокрутки
            const startTime = performance.now()
            const duration = 500 // Оптимальное время анимации для небольшой прокрутки
            
            const animateScroll = (currentTime: number) => {
              const elapsed = currentTime - startTime
              const progress = Math.min(elapsed / duration, 1)
              
              // Используем easing функцию для более плавной анимации
              const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
              const easedProgress = easeInOutCubic(progress)
              
              const newScrollTop = currentScrollTop + (targetScrollTop - currentScrollTop) * easedProgress
              window.scrollTo(0, newScrollTop)
              
              if (progress < 1) {
                requestAnimationFrame(animateScroll)
              }
            }
            
            requestAnimationFrame(animateScroll)
          }
        } else {
          console.log('Десктопное устройство, прокрутка не нужна')
        }
      }, 200) // Оптимальная задержка для синхронизации
    }
    setRecentEventsExpanded(prev => !prev)
  }, [fetchRecentEvents])

  const handleDeleteRecord = async (type: 'feeding' | 'diaper' | 'bath' | 'activity' | 'sleep', id: number) => {
    if (!member || !family) {
      return
    }

    try {
      let success = false
      switch (type) {
        case 'feeding':
          success = await dataService.deleteFeeding(id)
          break
        case 'diaper':
          success = await dataService.deleteDiaper(id)
          break
        case 'bath':
          success = await dataService.deleteBath(id)
          break
        case 'activity':
          success = await dataService.deleteActivity(id)
          break
        case 'sleep':
          success = await dataService.deleteSleepSession(id)
          break
      }

      if (success) {
        // Обновляем данные
        fetchData()
        
        // Вибрация при успешном удалении
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 50, 50])
        }
      } else {
        console.error('Failed to delete record')
      }
    } catch (error) {
      console.error('Error deleting record:', error)
    }
  }

  const handleRecordClick = (record: any) => {
    setSelectedRecord({
      type: record.type,
      id: record.id,
      timestamp: record.timestamp,
      author_name: record.author_name,
      author_role: record.author_role,
      activity_type: record.activity_type,
      ounces: record.ounces,
      diaper_type: record.diaper_type,
      bath_mood: record.bath_mood
    })
    setRecordDetailModalOpen(true)
  }

  const handleRecordDelete = async () => {
    if (!selectedRecord) return
    
    await handleDeleteRecord(selectedRecord.type, selectedRecord.id)
    setRecordDetailModalOpen(false)
    setSelectedRecord(null)
  }

  const handleRecordModalClose = () => {
    setRecordDetailModalOpen(false)
    setSelectedRecord(null)
  }



  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchData(),
        Promise.resolve()
      ])
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchData, activeTab])

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
        baby_age_months: calculateAgeInMonths(settings.birthDate),
        wake_on_activity_enabled: settings.wakeOnActivityEnabled
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

  // Функция для определения состояния малыша на основе времени последних действий
  const getBabyImageState = () => {
    if (!data) return 'normal'

    const now = Date.now()
    
    // Проверяем кормление
    const feedingOverdue = data.lastFeeding && 
      (now - new Date(data.lastFeeding.timestamp).getTime()) > (settings.feedingInterval * 60 * 60 * 1000)
    
    // Проверяем подгузник
    const diaperOverdue = data.lastDiaper && 
      (now - new Date(data.lastDiaper.timestamp).getTime()) > (settings.diaperInterval * 60 * 60 * 1000)
    
    // Проверяем купание
    const bathOverdue = data.lastBath && 
      (now - new Date(data.lastBath.timestamp).getTime()) > (settings.bathInterval * 24 * 60 * 60 * 1000)

    // Приоритет: кормление > подгузник > купание
    if (feedingOverdue) return 'hungry'
    if (diaperOverdue) return 'diaper'
    if (bathOverdue) return 'bath'
    
    return 'normal'
  }

  useEffect(() => {
    if (!member || !family) {
      return
    }

    fetchData()
  }, [member, family, fetchData])

  // Инициализируем таймер градиентов (заменяет старый проблемный таймер)
  useEffect(() => {
    if (!data) return

    const cleanup = initGradientTimer(
      data.lastFeeding?.timestamp || null,
      data.lastDiaper?.timestamp || null,
      data.lastBath?.timestamp || null,
      settings.feedingInterval,
      settings.diaperInterval,
      settings.bathInterval
    )

    return cleanup
  }, [data?.lastFeeding?.timestamp, data?.lastDiaper?.timestamp, data?.lastBath?.timestamp, settings.feedingInterval, settings.diaperInterval, settings.bathInterval])

  useEffect(() => {
  }, [activeTab, member, family])

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
      // Отменяем текущий animation frame если он есть
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      
      updatePullDistance(0)
      pullStartYRef.current = null
      isPullingRef.current = false
      lastThresholdStateRef.current = 'unknown'
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        return
      }

      // Проверяем, что пользователь в самом верху страницы (с небольшим допуском)
      const scrollTop = getScrollTop()
      if (scrollTop > 5) {
        resetPullState()
        return
      }

      // Дополнительная проверка: не активируем pull-to-refresh в настройках, истории, тетрисе, тамагочи и когда открыт таймлайн
      if (activeTab === 'settings' || activeTab === 'tetris' || activeTab === 'tamagotchi' || recentEventsExpanded) {
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

      // Дополнительная проверка: не активируем pull-to-refresh в настройках, истории, тетрисе, тамагочи и когда открыт таймлайн
      if (activeTab === 'settings' || activeTab === 'tetris' || activeTab === 'tamagotchi' || recentEventsExpanded) {
        resetPullState()
        return
      }

      const currentY = event.touches[0]?.clientY ?? pullStartYRef.current
      const delta = currentY - pullStartYRef.current

      if (delta <= 0) {
        resetPullState()
        return
      }

      event.preventDefault()
      
      // Применяем резиновый эффект для более естественного ощущения
      const rubberBandDelta = delta < PULL_REFRESH_THRESHOLD 
        ? delta 
        : PULL_REFRESH_THRESHOLD + (delta - PULL_REFRESH_THRESHOLD) * 0.3
      
      const limitedDelta = Math.min(rubberBandDelta, MAX_PULL_DISTANCE)
      
      // Используем requestAnimationFrame для плавного обновления
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      animationFrameRef.current = requestAnimationFrame(() => {
        updatePullDistance(limitedDelta)
        animationFrameRef.current = null
      })
      
      // Тактильная обратная связь при достижении порога
      if (delta >= PULL_REFRESH_THRESHOLD && pullDistanceRef.current < PULL_REFRESH_THRESHOLD) {
        if ('vibrate' in navigator) {
          navigator.vibrate(30)
        }
      }
    }

    const handleTouchEnd = () => {
      if (pullDistanceRef.current >= PULL_REFRESH_THRESHOLD) {
        // Тактильная обратная связь при достижении порога
        if ('vibrate' in navigator) {
          navigator.vibrate(50)
        }
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
  }, [handleRefresh, updatePullDistance, activeSection, activeTab, recentEventsExpanded])

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
          let registration = serviceWorkerRegistration

          if (!registration && 'serviceWorker' in navigator) {
            try {
              registration = await navigator.serviceWorker.ready
            } catch (readyError) {
              console.error('Service worker not ready, attempting to get existing registration:', readyError)
              registration = await navigator.serviceWorker.getRegistration()
            }
          }

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

    return () => {
      Object.values(reminderTimers.current).forEach(timerId => {
        if (typeof timerId === 'number') {
          window.clearTimeout(timerId)
        }
      })
      reminderTimers.current = {}
    }
  }, [
    data?.lastFeeding?.timestamp,
    data?.lastDiaper?.timestamp,
    settings.feedingInterval,
    settings.diaperInterval,
    notificationPermission,
    isNotificationSupported,
    serviceWorkerRegistration
  ])

  const handleTabChange = (tab: 'home' | 'settings' | 'tamagotchi' | 'tetris') => {
    console.log('Tab changed to:', tab) // Отладочная информация
    setActiveTab(tab)
    if (tab === 'settings') {
      setActiveSection('settings')
    } else if (tab === 'tamagotchi') {
      setActiveSection('dashboard') // Используем dashboard для тамагочи
    } else if (tab === 'tetris') {
      setActiveSection('dashboard') // Используем dashboard для тетриса
    } else {
      setActiveSection('dashboard')
    }
  }

  // Обработчик сообщений от игры Tetris
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TETRIS_BACK') {
        setActiveTab('home')
      }
    }

    const handleTetrisNavigation = (event: CustomEvent) => {
      const tab = event.detail.tab
      console.log('Dashboard: Received tetris-navigation event for tab:', tab)
      if (['home', 'settings', 'tamagotchi', 'tetris'].includes(tab)) {
        console.log('Dashboard: Switching to tab:', tab)
        handleTabChange(tab as 'home' | 'settings' | 'tamagotchi' | 'tetris')
      }
    }

    window.addEventListener('message', handleMessage)
    window.addEventListener('tetris-navigation', handleTetrisNavigation as EventListener)
    
    return () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('tetris-navigation', handleTetrisNavigation as EventListener)
    }
  }, [handleTabChange])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="h-screen h-dvh bg-gradient-to-br from-blue-50 to-blue-100 relative overflow-hidden pwa-container">
      <BackgroundElements />
      
      {/* Предзагрузка изображений для действий */}
      <CategoryPreloader category="actions" priority="high" delay={500} />
      
      {/* Pull-to-refresh индикатор */}
      <div 
        ref={pullIndicatorRef}
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center transition-all duration-300 ease-out"
        style={{ 
          transform: `translateY(${Math.min(pullDistance, MAX_PULL_DISTANCE) - 60}px)`,
          opacity: pullDistance > 20 ? Math.min(1, (pullDistance - 20) / 40) : 0
        }}
      >
        <div className="bg-white rounded-3xl p-3 shadow-lg border border-gray-200">
          {isRefreshing ? (
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-3xl animate-spin animation-priority-high"></div>
          ) : (
            <div className={`w-6 h-6 flex items-center justify-center transition-transform duration-200 ${
              pullDistance >= PULL_REFRESH_THRESHOLD ? 'rotate-180' : ''
            }`}>
              <svg 
                className="w-5 h-5 text-blue-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </div>
          )}
        </div>
        <div className="ml-2 text-sm text-gray-600 font-medium">
          {isRefreshing ? 'Обновляем...' : pullDistance >= PULL_REFRESH_THRESHOLD ? 'Отпустите для обновления' : 'Потяните для обновления'}
        </div>
      </div>
      
      <div className="relative z-10 flex flex-col h-full">
        <div className={`flex-1 ${activeTab === 'tetris' ? '' : 'px-4 py-2 pb-16 iphone14-dashboard pwa-content'} ${activeTab === 'settings' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-y-auto overflow-x-hidden'}`}>
          {activeTab === 'tamagotchi' ? (
            <TamagotchiPage 
              onModalOpen={handleTamagotchiModalOpen}
            />
          ) : activeTab === 'tetris' ? (
            <TetrisPage />
          ) : activeTab === 'settings' ? (
            <div className="space-y-3">

              <div className="text-center">
                <h1 className="text-lg font-bold text-gray-900 mb-1">⚙️ Настройки</h1>
                <p className="text-xs text-gray-600">Персонализируйте приложение под вашего малыша</p>
        </div>

              {/* Совет дня */}
              {data?.dailyTip && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-2.5 shadow-sm border border-blue-100 iphone14-tip">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 flex items-center justify-center iphone14-tip-icon">
                      <img src="/icons/sovet.png" alt="Совет" className="w-10 h-10 object-contain" />
                </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Совет дня</h3>
                      <p className="text-xs text-gray-700 mb-1">{data.dailyTip.content}</p>
                      <div className="flex flex-wrap gap-1 text-xs text-gray-500">
                        <span className="bg-white px-1.5 py-0.5 rounded-3xl">📂 {data.dailyTip.category}</span>
                        <span className="bg-white px-1.5 py-0.5 rounded-3xl">👶 {data.dailyTip.age_months} мес.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Статистика за день */}
              <div className="">
                <h2 className="text-lg font-semibold text-gray-900 mt-2 mb-2 text-center">Статистика за день</h2>
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="text-center p-3 bg-blue-50 rounded-3xl">
                    <div className="text-xs font-bold text-blue-500 mb-0.5">{getTodayStats().feedings}</div>
                    <div className="text-xs text-gray-600 mb-0.5">Кормлений</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-3xl">
                    <div className="text-xs font-bold text-green-500 mb-0.5">{getTodayStats().diapers}</div>
                    <div className="text-xs text-gray-600 mb-0.5">Подгузников</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-3xl">
                    <div className="text-xs font-bold text-purple-500 mb-0.5">{getTodayStats().activities}</div>
                    <div className="text-xs text-gray-600 mb-0.5">Активностей</div>
                  </div>
                  <div className="text-center p-3 bg-indigo-50 rounded-3xl">
                    <div className="text-xs font-bold text-indigo-500 mb-0.5">{getTodayStats().sleep}</div>
                    <div className="text-xs text-gray-600 mb-0.5">Сон</div>
                  </div>
                </div>
              </div>

              {/* Профиль малыша */}
              <div className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100 iphone14-card">
                <div className="text-center mb-2">
                  <h2 className="text-base font-semibold text-gray-900">Профиль малыша</h2>
                </div>
                <div className="space-y-2">
                  <div className="date-input-container">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      📅 Дата рождения
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={settings.birthDate}
                        onChange={(event) => handleSettingChange('birthDate', event.target.value)}
                        className="w-full text-center"
                        // iOS специфичные атрибуты
                        inputMode="numeric"
                        autoComplete="bday"
                        placeholder=""
                        // Улучшенная доступность
                        aria-label="Дата рождения малыша"
                        aria-describedby="birth-date-description"
                      />
                      {/* Декоративный элемент для лучшего UX */}
                      <div className="focus-ring"></div>
                    </div>
                    <div id="birth-date-description" className="age-description">
                      <span className="age-indicator"></span>
                      <span>Возраст: <span className="age-value">{calculateAgeInMonths(settings.birthDate)} месяцев</span></span>
                    </div>
              </div>
            </div>
          </div>

              {/* Напоминания */}
              <div className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100 iphone14-card">
                <div className="text-center mb-2">
                  <h2 className="text-base font-semibold text-gray-900">Напоминания</h2>
                </div>
                <div className="space-y-3">
                  <div className="modern-slider-card">
                    <div className="slider-header">
                      <div>🍼</div>
                      <div className="slider-info">
                        <h3 className="slider-title">Интервал кормления</h3>
                        <p className="slider-description">Рекомендуется кормить каждые 2-3 часа для новорожденных</p>
                      </div>
                      <div className="slider-value-badge">
                        <span className="value-number">{settings.feedingInterval}</span>
                        <span className="value-unit">ч</span>
                      </div>
                    </div>
                    
                    <div className="slider-wrapper">
                      <div className="slider-track-container">
                        <div className="slider-track">
                          <div 
                            className="slider-progress feeding-progress"
                            style={{ width: `${((settings.feedingInterval - 1) / 5) * 100}%` }}
                          ></div>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="6"
                          value={settings.feedingInterval}
                          onChange={(event) => handleSettingChange('feedingInterval', parseInt(event.target.value, 10))}
                          className="modern-slider feeding-slider"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modern-slider-card">
                    <div className="slider-header">
                      <div>💩</div>
                      <div className="slider-info">
                        <h3 className="slider-title">Интервал смены подгузника</h3>
                        <p className="slider-description">Меняйте подгузник каждые 2-4 часа или по необходимости</p>
                      </div>
                      <div className="slider-value-badge">
                        <span className="value-number">{settings.diaperInterval}</span>
                        <span className="value-unit">ч</span>
                      </div>
                    </div>
                    
                    <div className="slider-wrapper">
                      <div className="slider-track-container">
                        <div className="slider-track">
                          <div 
                            className="slider-progress diaper-progress"
                            style={{ width: `${((settings.diaperInterval - 1) / 5) * 100}%` }}
                          ></div>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="6"
                          value={settings.diaperInterval}
                          onChange={(event) => handleSettingChange('diaperInterval', parseInt(event.target.value, 10))}
                          className="modern-slider diaper-slider"
                        />
                      </div>
                      </div>
                    </div>
                  </div>
                  <div className="modern-slider-card">
                    <div className="slider-header">
                      <div>🛁</div>
                      <div className="slider-info">
                        <h3 className="slider-title">Период купания</h3>
                        <p className="slider-description">Купайте малыша 2-3 раза в неделю или ежедневно</p>
                      </div>
                      <div className="slider-value-badge">
                        <span className="value-number">{settings.bathInterval}</span>
                        <span className="value-unit">д</span>
                      </div>
                    </div>
                    
                    <div className="slider-wrapper">
                      <div className="slider-track-container">
                        <div className="slider-track">
                          <div 
                            className="slider-progress bath-progress"
                            style={{ width: `${((settings.bathInterval - 1) / 6) * 100}%` }}
                          ></div>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="7"
                          value={settings.bathInterval}
                          onChange={(event) => handleSettingChange('bathInterval', parseInt(event.target.value, 10))}
                          className="modern-slider bath-slider"
                        />
                      </div>
                    </div>
                  </div>
                </div>


              {/* Пробуждение после активности */}
              <div className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100 iphone14-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center text-sm">
                    🌅
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">Пробуждение после активности</h2>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900">Автоматическое пробуждение</p>
                      <p className="text-xs text-gray-500">Малыш будет просыпаться при записи любой активности</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        id="wakeOnActivity"
                        checked={settings.wakeOnActivityEnabled}
                        onChange={(event) => handleSettingChange('wakeOnActivityEnabled', event.target.checked)}
                        className="sr-only"
                      />
                      <label
                        htmlFor="wakeOnActivity"
                        className={`toggle-switch ${settings.wakeOnActivityEnabled ? 'active' : ''}`}
                      >
                        <div className="toggle-thumb"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Уведомления */}
              {isNotificationSupported && (
                <div className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100 iphone14-card">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 flex items-center justify-center text-sm">
                      🔔
                    </div>
                    <h2 className="text-base font-semibold text-gray-900">Уведомления</h2>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-900">Push-уведомления</p>
                        <p className="text-xs text-gray-500">Получайте напоминания о кормлении и смене подгузника</p>
                      </div>
                      <div className={`px-2 py-0.5 rounded-3xl text-xs font-medium ${
                        notificationPermission === 'granted' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {notificationPermission === 'granted' ? 'Включено' : 'Отключено'}
                      </div>
                    </div>
                    {notificationPermission !== 'granted' && (
                      <button
                        onClick={requestNotificationPermission}
                        className="w-full bg-blue-500 text-white font-medium py-1.5 px-3 rounded-3xl hover:bg-blue-600 transition-colors text-xs"
                      >
                        Включить уведомления
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Информация о семье */}
              <div className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100 iphone14-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center text-sm">
                    👥
              </div>
                  <h2 className="text-base font-semibold text-gray-900">Информация о семье</h2>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded-3xl">
                    <div>
                      <p className="text-xs font-medium text-gray-900">Семья</p>
                      <p className="text-xs text-gray-500">Название вашей семьи</p>
                    </div>
                    <span className="text-xs font-medium text-gray-700">{family?.name ?? 'Family'}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded-3xl">
                    <div>
                      <p className="text-xs font-medium text-gray-900">Ваше имя</p>
                      <p className="text-xs text-gray-500">Как вас называть в приложении</p>
                    </div>
                    <span className="text-xs font-medium text-gray-700">{memberDisplayName}</span>
                  </div>
                  <button
                    onClick={signOut}
                    className="w-full mt-2 px-3 py-1.5 bg-red-500 text-white rounded-3xl hover:bg-red-600 transition-colors font-medium text-xs"
                  >
                    🚪 Выйти из аккаунта
                  </button>
                </div>
              </div>

              {/* Сохранение */}
              <button
                onClick={handleSaveSettings}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2 px-4 rounded-3xl shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-sm"
              >
                💾 Сохранить все изменения
              </button>
              
              {/* Отступ после кнопки сохранения - достаточный для liquid-glass-tab-bar */}
              <div className="h-32"></div>
            </div>
          ) : activeTab === 'home' && (
            <div className="space-y-2">
              {/* Дежурство */}
              <div
                className=""
                role="button"
                tabIndex={0}
                onClick={() => setDutyModalOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setDutyModalOpen(true)
                  }
                }}
              >
                <div className="text-center space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-500">Сейчас на подхвате</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {currentDutyName || 'Добавьте расписание'}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {currentDutyBlock
                      ? `Смена ${currentDutyBlock.label}`
                      : 'Расскажите приложению, кто помогает семье и когда'}
                  </p>
                </div>
                {familyMembers.length === 0 && (
                  <p className="mt-1 text-[9px] text-gray-500 text-center">
                    Добавьте родных и друзей, чтобы распределять заботу по очереди.
                  </p>
                )}
              </div>

              {/* Иллюстрация младенца */}
              <div className="text-center">
                <BabyIllustration 
                  className="mb-3" 
                  state={getBabyImageState()} 
                  onClick={handleBabyImageClick}
                  customImage={customBabyImage}
                  dutyProgress={currentDutyProgressDisplay}
                />
              </div>

              {/* Карточки активности */}
              <div className="space-y-1.5">
                <button
                    onClick={() => handleQuickAction('feeding')}
                  className="w-full bg-white rounded-3xl p-2.5 shadow-sm border border-gray-100 flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 iphone14-quick-action"
                >
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/icons/feeding.png" alt="Кормление" className="w-10 h-10 object-contain" />
                </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="font-semibold text-gray-900 text-sm">Кормление</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {data?.lastFeeding ? `${formatTime(new Date(data.lastFeeding.timestamp))}` : "Еще не кормили"}
                    </p>
                    <div className="mt-2 w-full bg-gray-200 rounded-3xl h-2">
                      <div 
                        className={`h-2 rounded-3xl transition-all duration-300 progress-bar-animated ${
                          data?.lastFeeding && (Date.now() - new Date(data.lastFeeding.timestamp).getTime()) >= (settings.feedingInterval * 60 * 60 * 1000)
                            ? 'bg-red-500' 
                            : 'gradient-feeding-progress'
                        }`}
                        style={{ 
                          width: `${Math.min(100, Math.max(0, data?.lastFeeding 
                            ? Math.min(100, ((Date.now() - new Date(data.lastFeeding.timestamp).getTime()) / (settings.feedingInterval * 60 * 60 * 1000)) * 100)
                            : 0))}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {data?.lastFeeding ? (
                        getStatusMessage(calculateGradientProgress(data.lastFeeding.timestamp, settings.feedingInterval), 'feeding')
                      ) : "Запишите первое кормление"}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-700">
                      {data?.lastFeeding ? formatDuration(Math.floor((Date.now() - new Date(data.lastFeeding.timestamp).getTime()) / (1000 * 60))) + ' назад' : "Нет данных"}
                    </span>
                    <div className="text-xs text-blue-600 mt-0.5">Нажмите для записи</div>
                  </div>
                </button>

                <button
                    onClick={() => handleQuickAction('diaper')}
                  className="w-full bg-white rounded-3xl p-2.5 shadow-sm border border-gray-100 flex items-center gap-2 hover:bg-green-50 hover:border-green-200 transition-all duration-200 iphone14-quick-action"
                >
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/icons/poor.png" alt="Смена подгузника" className="w-10 h-10 object-contain" />
                </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="font-semibold text-gray-900 text-sm">Подгузник</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {data?.lastDiaper ? `${formatTime(new Date(data.lastDiaper.timestamp))}` : "Еще не меняли"}
                    </p>
                    <div className="mt-2 w-full bg-gray-200 rounded-3xl h-2">
                      <div 
                        className={`h-2 rounded-3xl transition-all duration-300 progress-bar-animated ${
                          data?.lastDiaper && (Date.now() - new Date(data.lastDiaper.timestamp).getTime()) >= (settings.diaperInterval * 60 * 60 * 1000)
                            ? 'bg-red-500' 
                            : 'gradient-diaper-progress'
                        }`}
                        style={{ 
                          width: `${Math.min(100, Math.max(0, data?.lastDiaper 
                            ? Math.min(100, ((Date.now() - new Date(data.lastDiaper.timestamp).getTime()) / (settings.diaperInterval * 60 * 60 * 1000)) * 100)
                            : 0))}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {data?.lastDiaper ? (
                        getStatusMessage(calculateGradientProgress(data.lastDiaper.timestamp, settings.diaperInterval), 'diaper')
                      ) : "Запишите первую смену"}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-700">
                      {data?.lastDiaper ? formatDuration(Math.floor((Date.now() - new Date(data.lastDiaper.timestamp).getTime()) / (1000 * 60))) + ' назад' : "Нет данных"}
                    </span>
                    <div className="text-xs text-green-600 mt-0.5">Нажмите для записи</div>
                  </div>
                </button>

                <button
                    onClick={() => handleQuickAction('bath')}
                  className="w-full bg-white rounded-3xl p-2.5 shadow-sm border border-gray-100 flex items-center gap-2 hover:bg-yellow-50 hover:border-yellow-200 transition-all duration-200 iphone14-quick-action"
                >
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/icons/bath.png" alt="Купание" className="w-10 h-10 object-contain" />
                </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="font-semibold text-gray-900 text-sm">Купание</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {data?.lastBath ? `${formatTime(new Date(data.lastBath.timestamp))}` : "Еще не купали"}
                    </p>
                    <div className="mt-2 w-full bg-gray-200 rounded-3xl h-2">
                      <div 
                        className={`h-2 rounded-3xl transition-all duration-300 progress-bar-animated ${
                          data?.lastBath && (Date.now() - new Date(data.lastBath.timestamp).getTime()) >= (settings.bathInterval * 24 * 60 * 60 * 1000)
                            ? 'bg-red-500' 
                            : 'gradient-bath-progress'
                        }`}
                        style={{ 
                          width: `${Math.min(100, Math.max(0, data?.lastBath 
                            ? Math.min(100, ((Date.now() - new Date(data.lastBath.timestamp).getTime()) / (settings.bathInterval * 24 * 60 * 60 * 1000)) * 100)
                            : 0))}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {data?.lastBath ? (
                        getStatusMessage(calculateGradientProgress(data.lastBath.timestamp, settings.bathInterval * 24), 'bath')
                      ) : "Запишите первое купание"}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-700">
                      {data?.lastBath ? formatDuration(Math.floor((Date.now() - new Date(data.lastBath.timestamp).getTime()) / (1000 * 60))) + ' назад' : "Нет данных"}
                    </span>
                    <div className="text-xs text-orange-600 mt-0.5">Нажмите для записи</div>
                  </div>
                </button>
              </div>


              {/* Блок истории событий */}
              <div className="">
                <div className="flex items-center justify-center mb-0.5 px-0.125 gap-2">
                  {/* Кнопка графика веса слева */}
                  <button
                    onClick={() => {
                      setGrowthChartType('weight')
                      setGrowthChartModalOpen(true)
                    }}
                    className="w-16 h-16 flex items-center justify-center transition-all duration-200 active:scale-95 hover:scale-105"
                    title="График веса"
                  >
                    <img src="/icons/wight.png" alt="График веса" className="w-16 h-16 object-contain cursor-pointer transition-all duration-200 active:scale-95 hover:scale-105" />
                  </button>
                  
                  {/* Основное изображение малыша */}
                  <img 
                    src="/icons/clock.png" 
                    alt="Часы" 
                    className="w-32 h-32 object-contain transition-all duration-200 active:scale-95 hover:scale-105 cursor-pointer" 
                    onClick={handleRecentEventsClick}
                  />
                  
                  {/* Кнопка графика роста справа */}
                  <button
                    onClick={() => {
                      setGrowthChartType('height')
                      setGrowthChartModalOpen(true)
                    }}
                    className="w-16 h-16 flex items-center justify-center transition-all duration-200 active:scale-95 hover:scale-105"
                    title="График роста"
                  >
                    <img src="/icons/height.png" alt="График роста" className="w-16 h-16 object-contain cursor-pointer transition-all duration-200 active:scale-95 hover:scale-105" />
                  </button>
                </div>
                
                {/* Таймлайн недавних событий */}
                {recentEventsExpanded && (
                  <div className="mt-4" data-recent-events>
                    <div className="text-center mb-3">
                      <h3 className="text-lg font-bold text-gray-900">
                        Недавние события
                      </h3>
                    </div>
                    
                    {recentEventsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin animation-priority-high"></div>
                        <span className="ml-2 text-gray-600 text-sm">Загружаем события...</span>
                      </div>
                    ) : recentEvents.length === 0 ? (
                      <div className="text-center py-4">
                        <div className="text-2xl mb-2">📅</div>
                        <p className="text-gray-600 text-sm">Пока нет записанных событий</p>
                        <p className="text-xs text-gray-500 mt-1">Начните записывать кормления, смены подгузников и другие активности</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="space-y-0">
                          {recentEvents.map((event, index) => {
                            const typeInfo = getTypeInfo(event.type, event)
                            const eventDate = new Date(event.timestamp)
                            const timeAgo = getTimeAgo(event.timestamp)
                            const isLast = index === recentEvents.length - 1
                            
                            return (
                              <div 
                                key={`${event.type}-${event.id}-${index}`} 
                                className="relative flex items-start space-x-3 pb-4 cursor-pointer"
                                onClick={() => handleRecordClick(event)}
                              >
                                {/* Контейнер для иконки и линии */}
                                <div className="flex flex-col items-center">
                                  {/* Иконка события */}
                                  <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                                    <div className="w-9 h-9 flex items-center justify-center">
                                      {typeInfo.icon}
                                    </div>
                                  </div>
                                  {/* Линия снизу (кроме последнего элемента) */}
                                  {!isLast && (
                                    <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                                  )}
                                </div>
                                
                                {/* Карточка события */}
                                <div className={`flex-1 min-w-0 p-3 rounded-2xl ${typeInfo.bgColor} border border-gray-100 shadow-sm`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-sm font-semibold text-gray-900">{typeInfo.label}</h4>
                                    <span className="text-xs text-gray-500">{timeAgo}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm text-gray-600">{formatTime(eventDate)}</span>
                                    {typeInfo.extraInfo && (
                                      <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">
                                        {typeInfo.extraInfo}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="text-xs text-gray-500">
                                    👤 {event.author_name || 'Неизвестно'} • {eventDate.toLocaleDateString('ru-RU')}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

          </div>
        )}


            </div>

        {activeTab !== 'tetris' && <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />}
              </div>

        <DutyScheduleModal
          isOpen={dutyModalOpen}
          onClose={() => setDutyModalOpen(false)}
          members={familyMembers}
          schedule={dutyScheduleForModal}
          onScheduleChange={handleDutyScheduleChange}
        />


        <QuickActionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          actionType={modalAction}
          onSuccess={handleModalSuccess}
        />

        {/* Tamagotchi QuickActionModal */}
        <QuickActionModal
          isOpen={tamagotchiModalOpen}
          onClose={() => setTamagotchiModalOpen(false)}
          actionType={tamagotchiModalAction}
          onSuccess={handleTamagotchiModalSuccess}
        />


        {/* Модальное окно деталей записи */}
        <RecordDetailModal
          isOpen={recordDetailModalOpen}
          onClose={handleRecordModalClose}
          onDelete={handleRecordDelete}
          record={selectedRecord}
        />

        {/* Модальное окно графика роста и веса */}
        {growthChartModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-bounce-in">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">
                    {growthChartType === 'height' ? 'График роста малыша' : 'График веса малыша'}
                  </h2>
                  <button
                    onClick={() => setGrowthChartModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-3">
                {growthChartType === 'height' ? (
                  <GrowthChartCard
                    measurementType="height"
                    title="Рост малыша"
                    unit="см"
                    description="Отслеживайте рост малыша и сравнивайте с нормативами ВОЗ"
                    whoCurves={WHO_HEIGHT_CURVES}
                    yAxisLabel="Рост"
                    valuePrecision={1}
                    babyAgeMonths={data ? Math.floor((Date.now() - new Date(settings.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)) : 0}
                    compact={true}
                  />
                ) : (
                  <GrowthChartCard
                    measurementType="weight"
                    title="Вес малыша"
                    unit="кг"
                    description="Отслеживайте вес малыша и сравнивайте с нормативами ВОЗ"
                    whoCurves={WHO_WEIGHT_CURVES}
                    yAxisLabel="Вес"
                    valuePrecision={2}
                    babyAgeMonths={data ? Math.floor((Date.now() - new Date(settings.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)) : 0}
                    compact={true}
                  />
                )}
              </div>
            </div>
          </div>
        )}


        {process.env.NODE_ENV === 'development' && <DebugPanel />}
      </div>

  )
}
