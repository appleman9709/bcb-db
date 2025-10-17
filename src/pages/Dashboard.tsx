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
import TamagotchiPage from './TamagotchiPage'
import TetrisPage from './TetrisPage'
import GrowthChartCard, { WHO_HEIGHT_CURVES, WHO_WEIGHT_CURVES } from '../components/GrowthChartCard'
import { useAuth } from '../contexts/AuthContext'
import { dataService } from '../services/dataService'
import type { Feeding, Diaper, Bath, Activity, Tip, SleepSession, FamilyMember } from '../services/dataService'
import RecordDetailModal from '../components/RecordDetailModal'
import EventGroup from '../components/EventGroup'
import TimelineEvent from '../components/TimelineEvent'
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

type DashboardSection = 'dashboard' | 'history' | 'settings'
type QuickActionType = 'feeding' | 'diaper' | 'bath' | 'activity'
type ReminderType = 'feeding' | 'diaper'

type QuickActionResult = {}

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
  activities: Activity[]
  sleepSessions: SleepSession[]
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
  const [historyLoading, setHistoryLoading] = useState(false)
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
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'settings' | 'tamagotchi' | 'tetris'>('home')
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
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)
  
  // Tamagotchi modal state
  const [tamagotchiModalOpen, setTamagotchiModalOpen] = useState(false)
  const [tamagotchiModalAction, setTamagotchiModalAction] = useState<QuickActionType>('feeding')

  const { member, family, signOut } = useAuth()


  const pullStartYRef = useRef<number | null>(null)
  const isPullingRef = useRef(false)
  const pullDistanceRef = useRef(0)

  const updatePullDistance = useCallback((value: number) => {
    pullDistanceRef.current = value
    setPullDistance(value)
  }, [])

  const reminderTimers = useRef<Partial<Record<ReminderType, number>>>({})
  const isNotificationSupported = typeof window !== 'undefined' && 'Notification' in window

  const memberDisplayName = member?.name ?? member?.role ?? 'Участник семьи'

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => {
      window.clearInterval(intervalId)
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

  const fetchHistoryData = useCallback(async () => {
    if (!member || !family) {
      return
    }

    try {
      setHistoryLoading(true)
      const [feedings, diapers, baths, activities, sleepSessions, counts] = await Promise.all([
        dataService.getFeedings(50),
        dataService.getDiapers(50),
        dataService.getBaths(50),
        dataService.getActivities(50),
        dataService.getSleepSessions(7),
        dataService.getTotalCounts()
      ])

      setHistoryData({
        feedings,
        diapers,
        baths,
        activities,
        sleepSessions
      })

      setTotalCounts(counts)
    } catch (error) {
      console.error('Error fetching history data:', error)
    } finally {
      setHistoryLoading(false)
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

  // Функция для расчета статистики за день
  const getTodayStats = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayFeedings = historyData?.feedings?.filter(f => {
      const feedingDate = new Date(f.timestamp)
      return feedingDate >= today && feedingDate < tomorrow
    }).length || 0

    const todayDiapers = historyData?.diapers?.filter(d => {
      const diaperDate = new Date(d.timestamp)
      return diaperDate >= today && diaperDate < tomorrow
    }).length || 0

    const todayActivities = historyData?.activities?.filter(a => {
      const activityDate = new Date(a.timestamp)
      return activityDate >= today && activityDate < tomorrow && 
             !['feeding', 'diaper', 'bath'].includes(a.activity_type)
    }).length || 0

    // Расчет общего времени сна за день
    const todaySleepSessions = historyData?.sleepSessions?.filter(s => {
      const sleepDate = new Date(s.start_time)
      return sleepDate >= today && sleepDate < tomorrow
    }) || []

    const totalSleepMinutes = todaySleepSessions.reduce((total, session) => {
      if (session.end_time) {
        const start = new Date(session.start_time)
        const end = new Date(session.end_time)
        return total + Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
      }
      return total
    }, 0)

    const sleepHours = Math.floor(totalSleepMinutes / 60)
    const sleepMinutes = totalSleepMinutes % 60
    const sleepTime = sleepHours > 0 ? `${sleepHours}ч ${sleepMinutes}м` : `${sleepMinutes}м`

    return {
      feedings: todayFeedings,
      diapers: todayDiapers,
      activities: todayActivities,
      sleep: sleepTime
    }
  }

  // Функция для расчета цвета градиента на основе времени
  const getGradientColor = (timestamp: string, intervalHours: number) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.max(0, Math.floor((now.getTime() - time.getTime()) / (1000 * 60)))
    const diffInHours = diffInMinutes / 60
    
    // Новая логика градиентов:
    // 0-95% интервала: зеленый (0-0.2)
    // 95-100% интервала: желто-оранжевый (0.2-0.8)
    // >100% интервала: красный (0.8-1.0)
    const greenThreshold = intervalHours * 0.95
    const yellowThreshold = intervalHours
    
    let progress
    if (diffInHours <= greenThreshold) {
      // Зеленый диапазон - плавно от 0 до 0.2
      progress = (diffInHours / greenThreshold) * 0.2
    } else if (diffInHours <= yellowThreshold) {
      // Желто-оранжевый диапазон - от 0.2 до 0.8
      const localProgress = (diffInHours - greenThreshold) / (yellowThreshold - greenThreshold)
      progress = 0.2 + localProgress * 0.6
    } else {
      // Красный диапазон - от 0.8 до 1.0 (превышение интервала)
      const localProgress = Math.min(1, (diffInHours - yellowThreshold) / (intervalHours * 0.5)) // Ускоряем переход к красному
      progress = 0.8 + localProgress * 0.2
    }
    
    return Math.min(1, Math.max(0, progress))
  }

  const handleQuickAction = (action: QuickActionType) => {
    setModalAction(action)
    setModalOpen(true)
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
        // Если все в порядке, предлагаем выбрать действие
        // Можно открыть модальное окно с выбором или просто показать подсказку
        handleQuickAction('feeding') // По умолчанию кормление
        break
    }
  }

  const handleModalSuccess = async (result?: QuickActionResult) => {
    // Перезагружаем данные после быстрого действия и обновляем историю при необходимости
    await fetchData()
    if (activeTab === 'history') {
      await fetchHistoryData()
    }
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
        if (activeTab === 'history') {
          fetchHistoryData()
        }
        
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

  const handleHistoryToggle = () => {
    setIsHistoryExpanded(!isHistoryExpanded)
  }


  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchData(),
        activeTab === 'history' ? fetchHistoryData() : Promise.resolve()
      ])
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchData, fetchHistoryData, activeTab])

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

  // Обновляем градиенты каждую минуту для плавного изменения цвета
  useEffect(() => {
    const interval = setInterval(() => {
      // Принудительно обновляем компонент для пересчета градиентов
      setData(prevData => prevData ? { ...prevData } : null)
    }, 60000) // Каждую минуту

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (activeTab === 'history' && member && family) {
      fetchHistoryData()
    }
  }, [activeTab, member, family, fetchHistoryData])

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

      // Проверяем, что пользователь в самом верху страницы (с небольшим допуском)
      const scrollTop = getScrollTop()
      if (scrollTop > 5) {
        resetPullState()
        return
      }

      // Дополнительная проверка: не активируем pull-to-refresh в настройках, истории, тетрисе и тамагочи
      if (activeTab === 'settings' || activeTab === 'history' || activeTab === 'tetris' || activeTab === 'tamagotchi') {
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

      // Дополнительная проверка: не активируем pull-to-refresh в настройках, истории, тетрисе и тамагочи
      if (activeTab === 'settings' || activeTab === 'history' || activeTab === 'tetris' || activeTab === 'tamagotchi') {
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
      updatePullDistance(limitedDelta)
      
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
  }, [handleRefresh, updatePullDistance, activeSection, activeTab])

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

  const handleTabChange = (tab: 'home' | 'history' | 'settings' | 'tamagotchi' | 'tetris') => {
    console.log('Tab changed to:', tab) // Отладочная информация
    setActiveTab(tab)
    if (tab === 'history') {
      setActiveSection('history')
    } else if (tab === 'settings') {
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
      if (['home', 'history', 'settings', 'tamagotchi', 'tetris'].includes(tab)) {
        console.log('Dashboard: Switching to tab:', tab)
        handleTabChange(tab as 'home' | 'history' | 'settings' | 'tamagotchi' | 'tetris')
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
      
      {/* Pull-to-refresh индикатор */}
      <div 
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center transition-all duration-300 ease-out"
        style={{ 
          transform: `translateY(${Math.min(pullDistance, MAX_PULL_DISTANCE) - 60}px)`,
          opacity: pullDistance > 20 ? Math.min(1, (pullDistance - 20) / 40) : 0
        }}
      >
        <div className="bg-white rounded-3xl p-3 shadow-lg border border-gray-200">
          {isRefreshing ? (
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-3xl animate-spin"></div>
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
        <div className={`flex-1 ${activeTab === 'tetris' ? '' : 'px-4 py-2 pb-16 iphone14-dashboard pwa-content'} ${activeTab === 'settings' || activeTab === 'history' ? 'overflow-y-auto overflow-x-hidden' : ''}`}>
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

              {/* Профиль малыша */}
              <div className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100 iphone14-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center text-sm">
                    👶
      </div>
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
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center text-sm">
                    ⏰
              </div>
                  <h2 className="text-base font-semibold text-gray-900">Напоминания</h2>
                </div>
                <div className="space-y-3">
                  <div className="modern-slider-card">
                    <div className="slider-header">
                      <div className="slider-icon">🍼</div>
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
                      <div className="slider-icon">💩</div>
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
                      <div className="slider-icon">🛁</div>
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
                  <div className={`px-2 py-1 rounded-3xl text-xs font-medium ${
                    settings.wakeOnActivityEnabled 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {settings.wakeOnActivityEnabled 
                      ? '✅ Малыш будет просыпаться при записи активности' 
                      : '❌ Автоматическое пробуждение отключено'}
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
                className="border border-blue-100 rounded-3xl p-3 iphone14-card cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white h-[80px] flex flex-col justify-between"
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
                <div className="mt-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-400 transition-all duration-500"
                      style={{ width: `${currentDutyProgressDisplay}%` }}
                    />
                  </div>
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
                        className={`h-2 rounded-3xl transition-all duration-300 ${
                          data?.lastFeeding && (Date.now() - new Date(data.lastFeeding.timestamp).getTime()) >= (settings.feedingInterval * 60 * 60 * 1000)
                            ? 'bg-red-500' 
                            : 'bg-blue-400'
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
                        getGradientColor(data.lastFeeding.timestamp, settings.feedingInterval) < 0.5 
                          ? "Все хорошо" 
                          : getGradientColor(data.lastFeeding.timestamp, settings.feedingInterval) < 0.8
                          ? "Скоро пора кормить"
                          : "Пора кормить!"
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
                        className={`h-2 rounded-3xl transition-all duration-300 ${
                          data?.lastDiaper && (Date.now() - new Date(data.lastDiaper.timestamp).getTime()) >= (settings.diaperInterval * 60 * 60 * 1000)
                            ? 'bg-red-500' 
                            : 'bg-green-400'
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
                        getGradientColor(data.lastDiaper.timestamp, settings.diaperInterval) < 0.5 
                          ? "Подгузник чистый" 
                          : getGradientColor(data.lastDiaper.timestamp, settings.diaperInterval) < 0.8
                          ? "Скоро пора сменить"
                          : "Пора сменить подгузник!"
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
                        className={`h-2 rounded-3xl transition-all duration-300 ${
                          data?.lastBath && (Date.now() - new Date(data.lastBath.timestamp).getTime()) >= (settings.bathInterval * 24 * 60 * 60 * 1000)
                            ? 'bg-red-500' 
                            : 'bg-orange-400'
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
                        getGradientColor(data.lastBath.timestamp, settings.bathInterval * 24) < 0.5 
                          ? "Купание недавно" 
                          : getGradientColor(data.lastBath.timestamp, settings.bathInterval * 24) < 0.8
                          ? "Скоро пора купать"
                          : "Пора искупать малыша!"
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
              <div className="p-0.25 iphone14-card">
                <div className="flex items-center justify-center mb-0.5 px-0.125 gap-2">
                  {/* Кнопка графика роста слева */}
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
                  
                  {/* Основное изображение малыша */}
                  <img 
                    src="/icons/clock.png" 
                    alt="Часы" 
                    className="w-32 h-32 object-contain cursor-pointer transition-all duration-200 active:scale-95 hover:scale-105" 
                    onClick={handleHistoryToggle}
                  />
                  
                  {/* Кнопка графика веса справа */}
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
                </div>
                {isHistoryExpanded && (
                  <div className="mb-0.5">
                    <h2 className="text-lg font-semibold text-gray-900 mt-2 mb-2 text-center">Последние события</h2>
                  </div>
                )}
                {isHistoryExpanded && (
                  <div className="relative">
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/sleep.png" alt="Сон" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-indigo-50 border-indigo-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Сон</h3>
                            <p className="text-xs text-gray-600 mt-0.5">18:06</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">1 мин назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">😴 0ч 42м</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Петя • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/activity.png" alt="Активность" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-purple-50 border-purple-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Активность</h3>
                            <p className="text-xs text-gray-600 mt-0.5">16:41</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">1 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">🎯 Выкладывание на живот</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Петя • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/poor.png" alt="Смена подгузника" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-green-50 border-green-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Смена подгузника</h3>
                            <p className="text-xs text-gray-600 mt-0.5">16:12</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">1 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">💩 Покакал</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Петя • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/feeding.png" alt="Кормление" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-blue-50 border-blue-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Кормление</h3>
                            <p className="text-xs text-gray-600 mt-0.5">15:46</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">2 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">🍼 4.5 унций</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Надежда • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/sleep.png" alt="Сон" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-indigo-50 border-indigo-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Сон</h3>
                            <p className="text-xs text-gray-600 mt-0.5">15:41</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">2 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">😴 1ч 27м</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Петя • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/poor.png" alt="Смена подгузника" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-green-50 border-green-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Смена подгузника</h3>
                            <p className="text-xs text-gray-600 mt-0.5">15:41</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">2 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">💧 Просто</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Надежда • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/activity.png" alt="Активность" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-purple-50 border-purple-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Активность</h3>
                            <p className="text-xs text-gray-600 mt-0.5">12:42</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">5 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">🎯 Массаж</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Петя • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/activity.png" alt="Активность" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-purple-50 border-purple-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Активность</h3>
                            <p className="text-xs text-gray-600 mt-0.5">12:42</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">5 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">🎯 Танцы на руках</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Петя • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/activity.png" alt="Активность" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-purple-50 border-purple-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Активность</h3>
                            <p className="text-xs text-gray-600 mt-0.5">12:42</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">5 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">🎯 Выкладывание на живот</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Петя • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/poor.png" alt="Смена подгузника" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-green-50 border-green-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Смена подгузника</h3>
                            <p className="text-xs text-gray-600 mt-0.5">11:30</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">6 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">💧 Просто</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Петя • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/feeding.png" alt="Кормление" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-blue-50 border-blue-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Кормление</h3>
                            <p className="text-xs text-gray-600 mt-0.5">11:15</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">6 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">🍼 5 унций</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Надежда • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/poor.png" alt="Смена подгузника" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-green-50 border-green-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Смена подгузника</h3>
                            <p className="text-xs text-gray-600 mt-0.5">07:25</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">10 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">💩 Покакал</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Надежда • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/sleep.png" alt="Сон" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-indigo-50 border-indigo-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Сон</h3>
                            <p className="text-xs text-gray-600 mt-0.5">05:31</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">12 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">😴 2ч 48м</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Петя • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/feeding.png" alt="Кормление" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-blue-50 border-blue-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Кормление</h3>
                            <p className="text-xs text-gray-600 mt-0.5">05:31</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">12 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">🍼 4.5 унций</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Надежда • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/poor.png" alt="Смена подгузника" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-green-50 border-green-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Смена подгузника</h3>
                            <p className="text-xs text-gray-600 mt-0.5">05:31</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">12 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">💧 Просто</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Надежда • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/sleep.png" alt="Сон" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-indigo-50 border-indigo-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Сон</h3>
                            <p className="text-xs text-gray-600 mt-0.5">02:42</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">15 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">😴 1ч 5м</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Петя • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/sleep.png" alt="Сон" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-indigo-50 border-indigo-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Сон</h3>
                            <p className="text-xs text-gray-600 mt-0.5">01:36</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">16 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">😴 0ч 39м</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Петя • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/activity.png" alt="Активность" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-purple-50 border-purple-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Активность</h3>
                            <p className="text-xs text-gray-600 mt-0.5">01:36</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">16 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">🎯 Танцы на руках</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Петя • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/sleep.png" alt="Сон" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                      <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
                    </div>
                    <div className="flex-1 bg-indigo-50 border-indigo-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Сон</h3>
                            <p className="text-xs text-gray-600 mt-0.5">00:58</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">17 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">😴 0ч 10м</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Петя • 17.10.2025</div>
                    </div>
                  </div>
                  <div className="relative flex items-start space-x-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img src="/icons/feeding.png" alt="Кормление" className="w-9 h-9 object-contain" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 bg-blue-50 border-blue-200 border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Кормление</h3>
                            <p className="text-xs text-gray-600 mt-0.5">23:56</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">18 ч назад</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">🍼 5 унций</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">👤 Петя • 16.10.2025</div>
                    </div>
                  </div>
                </div>
                )}
              </div>

              {/* Отступ для liquid-glass-tab-bar */}
              <div className="h-20"></div>
          </div>
        )}

          {activeTab === 'history' && (
            <div className="space-y-0.125">
              <div className="text-center mb-4">
                <h1 className="text-lg font-bold text-gray-900 mb-1">📋 История событий</h1>
                <p className="text-xs text-gray-600 mb-0.5">Подробная статистика и хронология всех записей</p>
            </div>

              {/* Статистика за день */}
              <div className="p-0.25 iphone14-card">
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

              {/* Графики роста и веса */}
              <div className="space-y-0.25">
                <div className="p-0.25">
                  <GrowthChartCard
                    measurementType="height"
                    title="Рост"
                    description="Отмечайте рост малыша раз в месяц и сравнивайте показатели с рекомендованными перцентилями."
                    unit="см"
                    yAxisLabel="Рост"
                    whoCurves={WHO_HEIGHT_CURVES}
                    babyAgeMonths={calculateAgeInMonths(settings.birthDate)}
                  />
                </div>
                <div className="p-0.25">
                  <GrowthChartCard
                    measurementType="weight"
                    title="Вес"
                    description="Фиксируйте вес малыша ежемесячно и отслеживайте динамику относительно шкалы ВОЗ."
                    unit="кг"
                    yAxisLabel="Вес"
                    whoCurves={WHO_WEIGHT_CURVES}
                    babyAgeMonths={calculateAgeInMonths(settings.birthDate)}
                  />
                </div>
              </div>

              {/* Последние события */}
              <div className="p-0.25 iphone14-card">
                <div className="flex justify-center px-0.125">
                  <img src="/icons/clock.png" alt="Часы" className="w-32 h-32 object-contain" />
                </div>
                <div className="mb-0.5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2 text-center">Последние события</h2>
              </div>


              {/* Timeline container */}
                <div className="relative">
                  {historyData ? (
                    (() => {
                      const allEvents = [
                        ...(historyData.feedings || []).map(item => ({ ...item, type: 'feeding' as const })),
                        ...(historyData.diapers || []).map(item => ({ ...item, type: 'diaper' as const })),
                        ...(historyData.baths || []).map(item => ({ ...item, type: 'bath' as const })),
                        ...(historyData.activities || [])
                          .filter(item => !['feeding', 'diaper', 'bath'].includes(item.activity_type)) // Исключаем служебные записи из истории
                          .map(item => ({ ...item, type: 'activity' as const })),
                        // Для сна используем одну запись с меткой времени окончания, если она есть (иначе начала)
                        ...((historyData.sleepSessions || []).map(item => ({
                          ...item,
                          type: 'sleep' as const,
                          timestamp: item.end_time ?? item.start_time
                        })))
                      ]
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .slice(0, MAX_HISTORY_EVENTS)

                      return allEvents.map((event, index) => (
                        <TimelineEvent
                          key={`${event.type}-${event.id}-${index}`}
                          event={event}
                          isLast={index === allEvents.length - 1}
                          onClick={handleRecordClick}
                        />
                      ))
                    })()
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">⏳</div>
                      <p>Загружаем историю событий...</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Отступ для liquid-glass-tab-bar */}
              <div className="h-32"></div>
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
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
