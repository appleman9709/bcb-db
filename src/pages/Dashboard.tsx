import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QuickActionModal from '../components/QuickActionModal'
import LoadingScreen from '../components/LoadingScreen'
import BabyIllustration from '../components/BabyIllustration'
import BottomNavigation from '../components/BottomNavigation'
import BackgroundElements from '../components/BackgroundElements'
import CategoryPreloader from '../components/CategoryPreloader'
import TamagotchiPage from './TamagotchiPage'
import TetrisPage from './TetrisPage'
import GrowthChartCard, { WHO_HEIGHT_CURVES, WHO_WEIGHT_CURVES } from '../components/GrowthChartCard'
import WeeklyStatsChart from '../components/WeeklyStatsChart'
import { useAuth } from '../contexts/AuthContext'
import { dataService } from '../services/dataService'
import type { Feeding, Diaper, Bath, Activity, Tip, SleepSession, FamilyMember } from '../services/dataService'
import RecordDetailModal from '../components/RecordDetailModal'
import DutyScheduleModal from '../components/DutyScheduleModal'
import { calculateAgeInMonths, calculateAgeInWeeks, formatDuration, formatTime, getTypeInfo } from '../utils/dashboardHelpers'
import type { SettingsState } from '../types/dashboard'
import SettingsTab from '../components/dashboard/SettingsTab'
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
import { initGradientTimer } from '../lib/gradientUtils'

type DashboardSection = 'dashboard' | 'settings'
type QuickActionType = 'feeding' | 'diaper' | 'bath' | 'activity'

interface DashboardData {
  lastFeeding: Feeding | null
  lastDiaper: Diaper | null
  lastBath: Bath | null
  dailyTip: Tip | null
}

const PULL_REFRESH_THRESHOLD = 90
const MAX_PULL_DISTANCE = 140
export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<DashboardSection>('dashboard')
  const [data, setData] = useState<DashboardData | null>(null)
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
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'settings' | 'tamagotchi' | 'tetris'>('home')
  const [recordDetailModalOpen, setRecordDetailModalOpen] = useState(false)
  const [growthChartModalOpen, setGrowthChartModalOpen] = useState(false)
  const [growthChartType, setGrowthChartType] = useState<'height' | 'weight'>('height')
  const [weeklyStatsChartOpen, setWeeklyStatsChartOpen] = useState(false)
  const [weeklyStatsChartType, setWeeklyStatsChartType] = useState<'feedings' | 'diapers' | 'poo'>('feedings')
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
  const [todayStats, setTodayStats] = useState<{
    feedings: number
    diapers: number
    baths: number
    activities: number
    sleep: string
  }>({
    feedings: 0,
    diapers: 0,
    baths: 0,
    activities: 0,
    sleep: '0м'
  })
  
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


  const memberDisplayName = member?.name ?? member?.role ?? 'Участник семьи'

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

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

  const babyWeeks = useMemo(
    () => calculateAgeInWeeks(settings.birthDate, currentTime),
    [settings.birthDate, currentTime]
  )

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
      
      // Use optimized method to fetch all dashboard data in parallel
      const dashboardData = await dataService.getDashboardData()
      
      const babyAgeMonths = dashboardData.settings?.baby_age_months || 0
      const dailyTip = await dataService.getRandomTip(babyAgeMonths)

      const formatSleepDuration = (minutes: number): string => {
        if (minutes === 0) return '0м'
        const hours = Math.floor(minutes / 60)
        const remainingMinutes = minutes % 60
        if (hours > 0) {
          return `${hours}ч ${remainingMinutes}м`
        }
        return `${remainingMinutes}м`
      }

      setData({
        lastFeeding: dashboardData.lastFeeding,
        lastDiaper: dashboardData.lastDiaper,
        lastBath: dashboardData.lastBath,
        dailyTip
      })

      // Обновляем статистику за день
      setTodayStats({
        feedings: dashboardData.todayStats.feedings,
        diapers: dashboardData.todayStats.diapers,
        baths: dashboardData.todayStats.baths,
        activities: dashboardData.todayStats.activities,
        sleep: formatSleepDuration(dashboardData.todaySleepMinutes)
      })

      if (dashboardData.settings) {
        const settings = dashboardData.settings
        setSettings(prev => ({
          ...prev,
          birthDate: settings.baby_birth_date || settings.birth_date || prev.birthDate,
          feedingInterval: settings.feed_interval ?? prev.feedingInterval,
          diaperInterval: settings.diaper_interval ?? prev.diaperInterval,
          bathInterval: settings.bath_reminder_period ?? prev.bathInterval,
          wakeOnActivityEnabled: settings.wake_on_activity_enabled ?? prev.wakeOnActivityEnabled
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
    return todayStats
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

  const now = currentTime.getTime()

  const calculateActivityProgress = (
    timestamp: string | null | undefined,
    intervalMs: number
  ): { elapsedPercent: number; remainingPercent: number; overdue: boolean } => {
    if (!timestamp || intervalMs <= 0) {
      return {
        elapsedPercent: 0,
        remainingPercent: 100, // Полное кольцо когда нет данных
        overdue: false
      }
    }

    const elapsedMs = Math.max(0, now - new Date(timestamp).getTime())
    const elapsedPercent = Math.min(100, (elapsedMs / intervalMs) * 100)
    const overdue = elapsedMs >= intervalMs

    return {
      elapsedPercent,
      remainingPercent: overdue ? 0 : Math.max(0, 100 - elapsedPercent),
      overdue
    }
  }

  const feedingProgress = calculateActivityProgress(
    data?.lastFeeding?.timestamp ?? null,
    settings.feedingInterval * 60 * 60 * 1000
  )
  const diaperProgress = calculateActivityProgress(
    data?.lastDiaper?.timestamp ?? null,
    settings.diaperInterval * 60 * 60 * 1000
  )
  const bathProgress = calculateActivityProgress(
    data?.lastBath?.timestamp ?? null,
    settings.bathInterval * 24 * 60 * 60 * 1000
  )

  const getRingStyle = (color: string, percent: number) => ({
    background: `conic-gradient(from 0deg, ${color} 0% ${percent}%, #d0e4fe ${percent}% 100%)`
  })

  const handleModalSuccess = async () => {
    // Обновляем данные после записи активности
    setModalOpen(false)
    fetchData()
  }

  // Tamagotchi modal handlers
  const handleTamagotchiModalOpen = (action: QuickActionType) => {
    setTamagotchiModalAction(action)
    setTamagotchiModalOpen(true)
  }

  const handleTamagotchiModalSuccess = async () => {
    // Обновляем данные после записи активности из Tamagotchi
    setTamagotchiModalOpen(false)
    fetchData()
  }

  // Функция для загрузки недавних событий
  const fetchRecentEvents = useCallback(async () => {
    if (!member || !family) {
      return
    }

    try {
      setRecentEventsLoading(true)
      
      // Use optimized method to fetch all recent events in parallel
      const { feedings, diapers, baths, activities, sleepSessions } = await dataService.getRecentEvents(10)

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
    
    // Локально удаляем запись из recentEvents без перезагрузки страницы
    setRecentEvents(prevEvents => prevEvents.filter(event => 
      event.id !== selectedRecord.id || event.type !== selectedRecord.type
    ))
    
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

      // Дополнительная проверка: не активируем pull-to-refresh в настройках, истории, тетрисе, тамагочи, когда открыт таймлайн или когда открыто любое модальное окно
      if (activeTab === 'settings' || activeTab === 'tetris' || activeTab === 'tamagotchi' || recentEventsExpanded || modalOpen || tamagotchiModalOpen || recordDetailModalOpen || dutyModalOpen || growthChartModalOpen || weeklyStatsChartOpen) {
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

      // Дополнительная проверка: не активируем pull-to-refresh в настройках, истории, тетрисе, тамагочи, когда открыт таймлайн или когда открыто любое модальное окно
      if (activeTab === 'settings' || activeTab === 'tetris' || activeTab === 'tamagotchi' || recentEventsExpanded || modalOpen || tamagotchiModalOpen || recordDetailModalOpen || dutyModalOpen || growthChartModalOpen || weeklyStatsChartOpen) {
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
  }, [handleRefresh, updatePullDistance, activeSection, activeTab, recentEventsExpanded, modalOpen, tamagotchiModalOpen, recordDetailModalOpen, dutyModalOpen, growthChartModalOpen, weeklyStatsChartOpen])





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
        <div className={`flex-1 ${activeTab === 'tetris' ? '' : 'px-4 py-2 pb-16 iphone14-dashboard pwa-content'} ${
          // Оставляем прокрутку только для settings или когда открыты недавние события на home
          activeTab === 'settings' ? 'overflow-y-auto overflow-x-hidden' : 
          (activeTab === 'home' && recentEventsExpanded) ? 'overflow-y-auto overflow-x-hidden' : 
          'overflow-hidden'
        }`}>
          {activeTab === 'tamagotchi' ? (
            <TamagotchiPage 
              onModalOpen={handleTamagotchiModalOpen}
            />
          ) : activeTab === 'tetris' ? (
            <TetrisPage />
          ) : activeTab === 'settings' ? (
            <SettingsTab
              dailyTip={data?.dailyTip ?? null}
              settings={settings}
              onSettingChange={handleSettingChange}
              onSaveSettings={handleSaveSettings}
              familyName={family?.name}
              memberDisplayName={memberDisplayName}
              onSignOut={signOut}
            />
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
              <div className="text-center space-y-1">
                <BabyIllustration 
                  className="mb-3" 
                  state={getBabyImageState()} 
                  onClick={handleBabyImageClick}
                  customImage={customBabyImage}
                  dutyProgress={currentDutyProgressDisplay}
                />
                <p className="font-semibold text-gray-900 text-lg">
                  Неделя {babyWeeks}
                </p>
              </div>

              {/* Карточки активности */}
              <div className="flex flex-wrap gap-2 py-4">
                <button
                    onClick={() => handleQuickAction('feeding')}
                  className="flex-1 min-w-[104px] rounded-3xl flex flex-col items-center text-center transition-all duration-200 iphone14-quick-action"
                >
                  <div
                    className="mt-2 w-[98px] h-[98px] rounded-full p-2 flex items-center justify-center"
                    style={getRingStyle(feedingProgress.overdue ? '#ef4444' : '#38bdf8', feedingProgress.overdue ? 100 : feedingProgress.remainingPercent)}
                  >
                    <div className="w-full h-full rounded-full bg-[#d0e4fe] flex items-center justify-center">
                      <img src="/icons/feeding.png" alt="Кормление" className="w-[54px] h-[54px] object-contain" />
                    </div>
                  </div>
                  <span className="mt-2 font-semibold text-gray-900 text-sm">Кормление</span>
                  <span className="mt-2 text-sm font-medium text-gray-700">
                    {data?.lastFeeding
                      ? formatDuration(
                          Math.floor(
                            (Date.now() - new Date(data.lastFeeding.timestamp).getTime()) /
                              (1000 * 60),
                          ),
                        )
                      : 'Нет данных'}
                  </span>
                </button>

                <button
                    onClick={() => handleQuickAction('diaper')}
                  className="flex-1 min-w-[104px] rounded-3xl flex flex-col items-center text-center transition-all duration-200 iphone14-quick-action"
                >
                  <div
                    className="mt-2 w-[98px] h-[98px] rounded-full p-2 flex items-center justify-center"
                    style={getRingStyle(diaperProgress.overdue ? '#ef4444' : '#22c55e', diaperProgress.overdue ? 100 : diaperProgress.remainingPercent)}
                  >
                    <div className="w-full h-full rounded-full bg-[#d0e4fe] flex items-center justify-center">
                      <img src="/icons/diaper.png" alt="Смена подгузника" className="w-[54px] h-[54px] object-contain" />
                    </div>
                  </div>
                  <span className="mt-2 font-semibold text-gray-900 text-sm">Подгузник</span>
                  <span className="mt-2 text-sm font-medium text-gray-700">
                    {data?.lastDiaper
                      ? formatDuration(
                          Math.floor(
                            (Date.now() - new Date(data.lastDiaper.timestamp).getTime()) /
                              (1000 * 60),
                          ),
                        )
                      : 'Нет данных'}
                  </span>
                </button>

                <button
                    onClick={() => handleQuickAction('bath')}
                  className="flex-1 min-w-[104px] rounded-3xl flex flex-col items-center text-center transition-all duration-200 iphone14-quick-action"
                >
                  <div
                    className="mt-2 w-[98px] h-[98px] rounded-full p-2 flex items-center justify-center"
                    style={getRingStyle(bathProgress.overdue ? '#ef4444' : '#f59e0b', bathProgress.overdue ? 100 : bathProgress.remainingPercent)}
                  >
                    <div className="w-full h-full rounded-full bg-[#d0e4fe] flex items-center justify-center">
                      <img src="/icons/bath.png" alt="Купание" className="w-[54px] h-[54px] object-contain" />
                    </div>
                  </div>
                  <span className="mt-2 font-semibold text-gray-900 text-sm">Купание</span>
                  <span className="mt-2 text-sm font-medium text-gray-700">
                    {data?.lastBath
                      ? formatDuration(
                          Math.floor(
                            (Date.now() - new Date(data.lastBath.timestamp).getTime()) /
                              (1000 * 60),
                          ),
                        )
                      : 'Нет данных'}
                  </span>
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
                    {/* Кнопки графиков статистики */}
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <button
                        onClick={() => {
                          setWeeklyStatsChartType('feedings')
                          setWeeklyStatsChartOpen(true)
                        }}
                        className="flex items-center justify-center gap-3 mb-4 flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-2xl p-3 transition-all duration-200 active:scale-95 border border-blue-200"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-semibold">Кормление</span>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => {
                          setWeeklyStatsChartType('diapers')
                          setWeeklyStatsChartOpen(true)
                        }}
                        className="flex items-center justify-center gap-3 mb-4 flex-1 bg-green-50 hover:bg-green-100 text-green-600 rounded-2xl p-3 transition-all duration-200 active:scale-95 border border-green-200"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-semibold">Подгузник</span>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => {
                          setWeeklyStatsChartType('poo')
                          setWeeklyStatsChartOpen(true)
                        }}
                        className="flex items-center justify-center gap-3 mb-4 flex-1 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-2xl p-3 transition-all duration-200 active:scale-95 border border-amber-200"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-semibold">Покакал</span>
                        </div>
                      </button>
                    </div>
                    
                    <div className="text-center mb-3">
                      <h3 className="text-lg font-bold text-gray-900">
                        Недавние события
                      </h3>
                    </div>
                    
                    {/* Статистика за день */}
                    {!recentEventsLoading && recentEvents.length > 0 && (
                      <div className="mb-4 px-2">
                        <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-gray-600">
                          {(() => {
                            const today = new Date().toDateString()
                            const todaysEvents = recentEvents.filter(event => {
                              const eventDate = new Date(event.timestamp).toDateString()
                              return eventDate === today
                            })
                            
                            const feedingsCount = todaysEvents.filter(e => e.type === 'feeding').length
                            const diapersCount = todaysEvents.filter(e => e.type === 'diaper').length
                            const pooCount = todaysEvents.filter(e => e.type === 'diaper' && e.diaper_type === 'Покакал').length
                            
                            // Считаем общую продолжительность сна в минутах
                            const sleepMinutes = todaysEvents
                              .filter(e => e.type === 'sleep')
                              .reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
                            
                            // Форматируем сон в формат "6ч15м"
                            let sleepDisplay = ''
                            if (sleepMinutes > 0) {
                              const hours = Math.floor(sleepMinutes / 60)
                              const minutes = sleepMinutes % 60
                              sleepDisplay = minutes > 0 
                                ? `${hours}ч${minutes}м`
                                : `${hours}ч`
                            }
                            
                            return (
                              <>
                                {feedingsCount > 0 && (
                                  <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">
                                    🍼 {feedingsCount}
                                  </span>
                                )}
                                {diapersCount > 0 && (
                                  <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded-full font-medium">
                                    🧷 {diapersCount}
                                  </span>
                                )}
                                {pooCount > 0 && (
                                  <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-full font-medium">
                                    💩 {pooCount}
                                  </span>
                                )}
                                {sleepMinutes > 0 && (
                                  <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium">
                                    😴 {sleepDisplay}
                                  </span>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                    
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-1 py-2">
            <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden animate-bounce-in">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-2 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900">
                    {growthChartType === 'height' ? 'График роста малыша' : 'График веса малыша'}
                  </h2>
                  <button
                    onClick={() => setGrowthChartModalOpen(false)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="px-2 py-3">
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

        {/* Модальное окно графика статистики по неделям */}
        {weeklyStatsChartOpen && (
          <WeeklyStatsChart
            type={weeklyStatsChartType}
            onClose={() => setWeeklyStatsChartOpen(false)}
          />
        )}
      </div>

  )
}



