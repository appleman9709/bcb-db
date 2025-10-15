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
import { useAuth } from '../contexts/AuthContext'
import { dataService } from '../services/dataService'
import type { Feeding, Diaper, Bath, Activity, Tip, SleepSession, FamilyMember } from '../services/dataService'
import { achievementService, NewAchievement } from '../services/achievementService'
import AchievementHistoryChecker from '../components/AchievementHistoryChecker'
import { AchievementModal } from '../components/AchievementModal'
import { AchievementNotification } from '../components/AchievementNotification'
import RecordDetailModal from '../components/RecordDetailModal'
import HistoryFilters from '../components/HistoryFilters'
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
  sleepMonitoringEnabled: boolean
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
    sleepMonitoringEnabled: true,
    wakeOnActivityEnabled: true
  })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<QuickActionType>('feeding')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(requestDefaultNotificationPermission)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'settings' | 'tamagotchi' | 'tetris'>('home')
  const [achievementModalOpen, setAchievementModalOpen] = useState(false)
  const [newAchievements, setNewAchievements] = useState<NewAchievement[]>([])
  const [showAchievementNotification, setShowAchievementNotification] = useState(false)
  const [recordDetailModalOpen, setRecordDetailModalOpen] = useState(false)
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
  const [historyFilter, setHistoryFilter] = useState<string>('all')
  const [groupByDate, setGroupByDate] = useState<boolean>(true)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [dutySchedule, setDutySchedule] = useState<DutySchedule | null>(null)
  const [dutyModalOpen, setDutyModalOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [currentDutyMemberFromDB, setCurrentDutyMemberFromDB] = useState<FamilyMember | null>(null)

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
          sleepMonitoringEnabled: settingsFromDb.sleep_monitoring_enabled ?? prev.sleepMonitoringEnabled,
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

  const handleModalSuccess = async () => {
    // Обновляем данные и дожидаемся, чтобы последние значения (в т.ч. ounces) были в состоянии
    await fetchData()
    if (activeTab === 'history') {
      await fetchHistoryData()
    }
    setModalOpen(false)
    
    // Проверяем достижения после успешного действия на основе свежих данных
    await checkAchievements()
  }

  const handleDeleteRecord = async (type: 'feeding' | 'diaper' | 'bath' | 'activity' | 'sleep', id: number) => {
    if (!member || !family) return

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

  const checkAchievements = async () => {
    if (!member || !family) return
    
    try {
      // Подготавливаем данные активности для проверки достижений
      let activityData = {}
      
      if (modalAction === 'feeding' && data?.lastFeeding) {
        activityData = {
          ounces: data.lastFeeding.ounces,
          timestamp: data.lastFeeding.timestamp
        }
      } else if (modalAction === 'diaper' && data?.lastDiaper) {
        activityData = {
          diaper_type: data.lastDiaper.diaper_type,
          timestamp: data.lastDiaper.timestamp
        }
      } else if (modalAction === 'bath' && data?.lastBath) {
        activityData = {
          bath_mood: data.lastBath.bath_mood,
          timestamp: data.lastBath.timestamp
        }
      }
      
      const achievements = await achievementService.checkAndAwardAchievements(
        family.id,
        Number(member.user_id),
        modalAction,
        activityData
      )
      
      if (achievements.length > 0) {
        setNewAchievements(achievements)
        setShowAchievementNotification(true)
        
        // Отправляем пуш-уведомления для каждого достижения
        for (const achievement of achievements) {
          await achievementService.sendAchievementNotification(achievement)
        }
        
        // Автоматически скрываем уведомление через 5 секунд
        setTimeout(() => {
          setShowAchievementNotification(false)
        }, 5000)
      }
    } catch (error) {
      console.error('Error checking achievements:', error)
    }
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
        sleep_monitoring_enabled: settings.sleepMonitoringEnabled,
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

      // Дополнительная проверка: не активируем pull-to-refresh в настройках, истории и тетрисе
      if (activeTab === 'settings' || activeTab === 'history' || activeTab === 'tetris') {
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

      // Дополнительная проверка: не активируем pull-to-refresh в настройках, истории и тетрисе
      if (activeTab === 'settings' || activeTab === 'history' || activeTab === 'tetris') {
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
        <div className={`flex-1 ${activeTab === 'tetris' ? '' : 'px-4 py-2 pb-16 iphone14-dashboard pwa-content overflow-y-auto overflow-x-hidden'}`}>
          {activeTab === 'tamagotchi' ? (
            <TamagotchiPage />
          ) : activeTab === 'tetris' ? (
            <TetrisPage />
          ) : activeTab === 'settings' ? (
            <div className="space-y-3">
              <div className="text-center">
                <h1 className="text-lg font-bold text-gray-900 mb-1">⚙️ Настройки</h1>
                <p className="text-xs text-gray-600">Персонализируйте приложение под вашего малыша</p>
        </div>

              {/* Достижения */}
              <div className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100 iphone14-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center text-sm">
                    🏆
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">Достижения</h2>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 mb-3">
                    Просматривайте ваши достижения и статистику семьи
                  </p>
                  <button
                    onClick={() => setAchievementModalOpen(true)}
                    className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold py-2 px-4 rounded-3xl shadow-lg hover:from-yellow-500 hover:to-orange-600 transition-all duration-200 text-sm flex items-center justify-center gap-2"
                  >
                    🏆 Открыть достижения
                  </button>
                  
                  {/* Компонент проверки истории достижений */}
                  <div className="mt-3">
                    <AchievementHistoryChecker />
                  </div>
                </div>
              </div>

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
                      
                      <div className="slider-labels">
                        <div className="slider-label">
                          <span className="label-value">1</span>
                          <span className="label-text">ч</span>
                        </div>
                        <div className="slider-label">
                          <span className="label-value">2</span>
                          <span className="label-text">ч</span>
                        </div>
                        <div className="slider-label">
                          <span className="label-value">3</span>
                          <span className="label-text">ч</span>
                        </div>
                        <div className="slider-label">
                          <span className="label-value">4</span>
                          <span className="label-text">ч</span>
                        </div>
                        <div className="slider-label">
                          <span className="label-value">5</span>
                          <span className="label-text">ч</span>
                        </div>
                        <div className="slider-label">
                          <span className="label-value">6</span>
                          <span className="label-text">ч</span>
                        </div>
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
                      
                      <div className="slider-labels">
                        <div className="slider-label">
                          <span className="label-value">1</span>
                          <span className="label-text">ч</span>
                        </div>
                        <div className="slider-label">
                          <span className="label-value">2</span>
                          <span className="label-text">ч</span>
                        </div>
                        <div className="slider-label">
                          <span className="label-value">3</span>
                          <span className="label-text">ч</span>
                        </div>
                        <div className="slider-label">
                          <span className="label-value">4</span>
                          <span className="label-text">ч</span>
                        </div>
                        <div className="slider-label">
                          <span className="label-value">5</span>
                          <span className="label-text">ч</span>
                        </div>
                        <div className="slider-label">
                          <span className="label-value">6</span>
                          <span className="label-text">ч</span>
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
                      
                      <div className="slider-labels">
                        <div className="slider-label">
                          <span className="label-value">1</span>
                          <span className="label-text">д</span>
                        </div>
                        <div className="slider-label">
                          <span className="label-value">2</span>
                          <span className="label-text">д</span>
                        </div>
                        <div className="slider-label">
                          <span className="label-value">3</span>
                          <span className="label-text">д</span>
                        </div>
                        <div className="slider-label">
                          <span className="label-value">4</span>
                          <span className="label-text">д</span>
                        </div>
                        <div className="slider-label">
                          <span className="label-value">5</span>
                          <span className="label-text">д</span>
                        </div>
                        <div className="slider-label">
                          <span className="label-value">6</span>
                          <span className="label-text">д</span>
                        </div>
                        <div className="slider-label">
                          <span className="label-value">7</span>
                          <span className="label-text">д</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>

              {/* Синхронизация сна */}
              <div className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100 iphone14-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center text-sm">
                    😴
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">Синхронизация сна</h2>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900">Семейная синхронизация</p>
                      <p className="text-xs text-gray-500">Сон малыша будет синхронизирован между всеми членами семьи</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        id="sleepMonitoring"
                        checked={settings.sleepMonitoringEnabled}
                        onChange={(event) => handleSettingChange('sleepMonitoringEnabled', event.target.checked)}
                        className="sr-only"
                      />
                      <label
                        htmlFor="sleepMonitoring"
                        className={`toggle-switch ${settings.sleepMonitoringEnabled ? 'active' : ''}`}
                      >
                        <div className="toggle-thumb"></div>
                      </label>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-3xl text-xs font-medium ${
                    settings.sleepMonitoringEnabled 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {settings.sleepMonitoringEnabled ? '✅ Синхронизация включена' : '❌ Синхронизация отключена'}
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
              
              {/* Отступ после кнопки сохранения */}
              <div className="h-4"></div>
            </div>
          ) : activeTab === 'home' && (
            <div className="space-y-3">
              {/* Иллюстрация младенца */}
              <div className="text-center">
                <BabyIllustration 
                  className="mb-3" 
                  state={getBabyImageState()} 
                  onClick={handleBabyImageClick}
                />
                <p className="text-xs text-gray-600 mb-3">
                  {getBabyImageState() === 'normal' 
                    ? 'Нажмите на малыша для быстрой записи' 
                    : 'Нажмите на малыша - пора действовать!'
                  }
                </p>
              </div>

              {/* Карточки активности */}
              <div className="space-y-2">
                <button
                    onClick={() => handleQuickAction('feeding')}
                  className="w-full bg-white rounded-3xl p-3 shadow-sm border border-gray-100 flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 iphone14-quick-action"
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
                  className="w-full bg-white rounded-3xl p-3 shadow-sm border border-gray-100 flex items-center gap-2 hover:bg-green-50 hover:border-green-200 transition-all duration-200 iphone14-quick-action"
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
                  className="w-full bg-white rounded-3xl p-3 shadow-sm border border-gray-100 flex items-center gap-2 hover:bg-yellow-50 hover:border-yellow-200 transition-all duration-200 iphone14-quick-action"
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

{data?.dailyTip && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-3 shadow-sm border border-blue-100 iphone14-tip">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 flex items-center justify-center iphone14-tip-icon">
                      <img src="/icons/sovet.png" alt="Совет" className="w-8 h-8 object-contain" />
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

          </div>
        )}

          {activeTab === 'history' && (
            <div className="space-y-0.125">
              <div className="text-center">
                <h1 className="text-lg font-bold text-gray-900 mb-1">📋 История событий</h1>
                <p className="text-xs text-gray-600 mb-0.5">Подробная статистика и хронология всех записей</p>
            </div>

              {/* Дежурство */}
              <div className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100 iphone14-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Дежурство</p>
                      {currentDutyMemberFromDB && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-[10px] text-green-600 font-medium">Синхронизировано</span>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-base font-semibold text-gray-900">{currentDutyName}</p>
                    <p className="text-xs text-gray-500">
                      {currentDutyBlock ? `Интервал ${currentDutyBlock.label}` : 'Назначьте ответственного'}
                    </p>
                    {currentDutyMemberFromDB && (
                      <p className="text-[10px] text-green-600 mt-1">
                        📡 Данные синхронизированы со всеми устройствами
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDutyModalOpen(true)}
                    className="shrink-0 rounded-3xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                  >
                    Настроить
                  </button>
                </div>
                <div className="mt-3">
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-300"
                      style={{ width: `${currentDutyProgressDisplay}%` }}
                    />
                  </div>
                </div>
                {familyMembers.length === 0 && (
                  <p className="mt-3 text-xs text-gray-500">
                    Добавьте родителей в семью, чтобы распределять дежурства.
                  </p>
                )}
              </div>

              {/* Общая статистика */}
              <div className="bg-white rounded-3xl p-0.25 shadow-sm border border-gray-100 iphone14-card">
                <h2 className="text-xs font-semibold text-gray-900 mt-2 mb-2">📊 Общая статистика</h2>
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="text-center p-3 bg-blue-50 rounded-3xl">
                    <div className="text-xs font-bold text-blue-500 mb-0.5">{totalCounts?.feedings || 0}</div>
                    <div className="text-xs text-gray-600 mb-0.5">Кормлений</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-3xl">
                    <div className="text-xs font-bold text-green-500 mb-0.5">{totalCounts?.diapers || 0}</div>
                    <div className="text-xs text-gray-600 mb-0.5">Подгузников</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-3xl">
                    <div className="text-xs font-bold text-yellow-500 mb-0.5">{totalCounts?.baths || 0}</div>
                    <div className="text-xs text-gray-600 mb-0.5">Купаний</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-3xl">
                    <div className="text-xs font-bold text-purple-500 mb-0.5">{totalCounts?.activities || 0}</div>
                    <div className="text-xs text-gray-600 mb-0.5">Активностей</div>
                  </div>
                </div>
            </div>

              {/* Последние события */}
              <div className="bg-white rounded-3xl p-0.25 shadow-sm border border-gray-100 iphone14-card">
                <div className="flex items-center justify-between mb-0.5">
                  <h2 className="text-xs font-semibold text-gray-900 mt-2 mb-2">🕒 Последние события</h2>
                  <span className="text-xs text-gray-500">
                    {latestActivityTimestamp ? `Обновлено ${formatTime(latestActivityTimestamp)}` : 'Загрузка...'}
                  </span>
              </div>
              <p className="text-xs text-gray-500 mb-0.5 px-0.125">
                💡 Нажмите на запись для просмотра деталей
              </p>


              {/* Фильтры истории */}
              <HistoryFilters 
                selectedFilter={historyFilter} 
                onFilterChange={setHistoryFilter} 
              />

              {/* Переключатель группировки */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Группировка по дням</span>
                <button
                  onClick={() => setGroupByDate(!groupByDate)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-3xl transition-colors ${
                    groupByDate ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-3xl bg-white transition-transform ${
                      groupByDate ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

                <div className="space-y-0.0625">
                {historyData ? (
                  (() => {
                    const allEvents = [
                      ...(historyData.feedings || []).map(item => ({ ...item, type: 'feeding' as const })),
                      ...(historyData.diapers || []).map(item => ({ ...item, type: 'diaper' as const })),
                      ...(historyData.baths || []).map(item => ({ ...item, type: 'bath' as const })),
                      ...(historyData.activities || []).map(item => ({ ...item, type: 'activity' as const })),
                      // Для сна используем одну запись с меткой времени окончания, если она есть (иначе начала)
                      ...((historyData.sleepSessions || []).map(item => ({
                        ...item,
                        type: 'sleep' as const,
                        timestamp: item.end_time ?? item.start_time
                      })))
                    ]
                      .filter(item => historyFilter === 'all' || item.type === historyFilter)
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, MAX_HISTORY_EVENTS)

                    if (groupByDate) {
                      // Группируем события по дням
                      const groupedEvents = allEvents.reduce((groups, event) => {
                        const date = new Date(event.timestamp).toDateString()
                        if (!groups[date]) {
                          groups[date] = []
                        }
                        groups[date].push(event)
                        return groups
                      }, {} as Record<string, typeof allEvents>)

                      return Object.entries(groupedEvents)
                        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                        .map(([date, events]) => (
                          <EventGroup
                            key={date}
                            date={date}
                            events={events}
                            onEventClick={handleRecordClick}
                          />
                        ))
                    } else {
                      // Отображаем события без группировки (как было раньше)
                      return allEvents.map((item, index) => {
                        const getTypeInfo = (type: typeof item.type) => {
                          switch (type) {
                            case 'feeding':
                                const feedingItem = item as any
                                const ouncesText = feedingItem.ounces ? ` • ${feedingItem.ounces} унций` : ''
                                return { 
                                  icon: <img src="/icons/feeding.png" alt="Кормление" className="w-6 h-6 object-contain" />, 
                                  label: 'Кормление', 
                                  color: 'bg-blue-100 text-blue-600',
                                  bgColor: 'bg-blue-50',
                                  description: `Ребенок покормлен${ouncesText}`,
                                  extraInfo: feedingItem.ounces ? `🍼 ${feedingItem.ounces} унций` : null
                                }
                            case 'diaper':
                                const diaperItem = item as any
                                const diaperTypeText = diaperItem.diaper_type === 'Покакал' ? ' • Покакал' : ''
                                return { 
                                  icon: <img src="/icons/poor.png" alt="Смена подгузника" className="w-6 h-6 object-contain" />, 
                                  label: 'Смена подгузника', 
                                  color: 'bg-green-100 text-green-600',
                                  bgColor: 'bg-green-50',
                                  description: `Подгузник заменен${diaperTypeText}`,
                                  extraInfo: diaperItem.diaper_type === 'Покакал' ? '💩 Покакал' : '💧 Просто'
                                }
                            case 'bath':
                                const bathItem = item as any
                                const moodText = bathItem.bath_mood === 'Кричал' ? ' • Беспокоился' : ''
                                return { 
                                  icon: <img src="/icons/bath.png" alt="Купание" className="w-6 h-6 object-contain" />, 
                                  label: 'Купание', 
                                  color: 'bg-yellow-100 text-yellow-600',
                                  bgColor: 'bg-yellow-50',
                                  description: `Ребенок искупан${moodText}`,
                                  extraInfo: bathItem.bath_mood === 'Кричал' ? '😢 Беспокоился' : '😊 Спокойно'
                                }
                            case 'activity':
                                const activityItem = item as any
                                return { 
                                  icon: <img src="/icons/activity.png" alt="Активность" className="w-6 h-6 object-contain" />, 
                                  label: 'Активность', 
                                  color: 'bg-purple-100 text-purple-600',
                                  bgColor: 'bg-purple-50',
                                  description: activityItem.activity_type || 'Активность записана',
                                  extraInfo: null // Убираем дублирование - тип активности уже в описании
                                }
                            default:
                                return { 
                                  icon: '⭐', 
                                  label: 'Событие', 
                                  color: 'bg-gray-100 text-gray-600',
                                  bgColor: 'bg-gray-50',
                                  description: 'Записано событие',
                                  extraInfo: null
                                }
                          }
                        }

                        const typeInfo = getTypeInfo(item.type)
                          const eventDate = new Date(item.timestamp)
                          const timeAgo = getTimeAgo(item.timestamp)

                        return (
                            <div 
                              key={`${item.type}-${item.id}-${index}`} 
                              className={`flex items-center space-x-0.125 p-0.125 rounded-3xl ${typeInfo.bgColor} border border-gray-100 iphone14-card cursor-pointer hover:shadow-md transition-all duration-200`}
                              onClick={() => handleRecordClick(item)}
                            >
                              <div className="w-8 h-8 flex items-center justify-center">
                                {typeInfo.icon}
                              </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                  <h3 className="text-xs font-semibold text-gray-900">{typeInfo.label}</h3>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium text-gray-500">{timeAgo}</span>
                                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                              </div>
                                <p className="text-xs text-gray-600 mt-0.5">{typeInfo.description}</p>
                                {typeInfo.extraInfo && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className="text-xs font-medium text-gray-700 bg-white px-1.5 py-0.5 rounded-3xl border border-gray-200">
                                      {typeInfo.extraInfo}
                                    </span>
                                  </div>
                                )}
                                <p className="text-xs text-gray-500 mt-0.5">
                                  📅 {eventDate.toLocaleDateString('ru-RU')} в {formatTime(eventDate)}
                                </p>
                            </div>
                          </div>
                        )
                      })
                    }
                  })()
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">⏳</div>
                      <p>Загружаем историю событий...</p>
                  </div>
                )}
              </div>
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

        {/* Уведомления о достижениях */}
        {showAchievementNotification && newAchievements.length > 0 && (
          <AchievementNotification
            achievement={newAchievements[0]}
            onClose={() => setShowAchievementNotification(false)}
          />
        )}

        {/* Модальное окно достижений */}
        <AchievementModal
          isOpen={achievementModalOpen}
          onClose={() => setAchievementModalOpen(false)}
          familyId={family?.id || 0}
          userId={Number(member?.user_id) || 0}
        />

        {/* Модальное окно деталей записи */}
        <RecordDetailModal
          isOpen={recordDetailModalOpen}
          onClose={handleRecordModalClose}
          onDelete={handleRecordDelete}
          record={selectedRecord}
        />

        {process.env.NODE_ENV === 'development' && <DebugPanel />}
      </div>

  )
}
