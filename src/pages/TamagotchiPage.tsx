import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { dataService, Feeding, Diaper, Bath, ParentCoins, SleepSession, FamilyInventory, GRAMS_PER_OUNCE } from '../services/dataService'
import QuickActionModal from '../components/QuickActionModal'
import { achievementService, NewAchievement } from '../services/achievementService'
import { AchievementNotification } from '../components/AchievementNotification'

type BabyState = 'ok' | 'feeding' | 'all-in' | 'poo' | 'dirty'
type QuickActionType = 'feeding' | 'diaper' | 'bath' | 'activity'

interface TamagotchiData {
  lastFeeding: Feeding | null
  lastDiaper: Diaper | null
  lastBath: Bath | null
  parentCoins: ParentCoins | null
  currentSleepSession: SleepSession | null
  familySleepStatus: { isSleeping: boolean; sleepSession: SleepSession | null }
  inventory: FamilyInventory | null
}

const DIAPER_ALERT_LEVEL = 5
const DIAPER_TARGET = 20
const FORMULA_ALERT_LEVEL = 6
const FORMULA_TARGET = 24
// Размер порции теперь хранится в БД

interface SettingsState {
  feedingInterval: number
  diaperInterval: number
  bathInterval: number
  sleepMonitoringEnabled: boolean
  wakeOnActivityEnabled: boolean
}

export default function TamagotchiPage() {
  console.log('TamagotchiPage rendered') // Отладочная информация
  
  const [data, setData] = useState<TamagotchiData | null>(null)
  const [settings, setSettings] = useState<SettingsState>({
    feedingInterval: 3,
    diaperInterval: 2,
    bathInterval: 1,
    sleepMonitoringEnabled: true,
    wakeOnActivityEnabled: true
  })
  const [loading, setLoading] = useState(true)
  const [babyState, setBabyState] = useState<BabyState>('ok')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<QuickActionType>('feeding')
  const [score, setScore] = useState(0)
  const [justWokeUp, setJustWokeUp] = useState(false)
  const [scoreAnimation, setScoreAnimation] = useState(false)
  const [coins, setCoins] = useState<Array<{id: number, x: number, y: number, collected: boolean, falling: boolean, icon: string, type: 'feeding_coins' | 'diaper_coins' | 'bath_coins' | 'activity_coins' | 'mom_coins' | 'sleep_coins'}>>([])
  const [coinSpawnInterval, setCoinSpawnInterval] = useState<NodeJS.Timeout | null>(null)
  const [isSleepMode, setIsSleepMode] = useState(false)
  
  // Отдельные счетчики для каждого типа монеток
  const [feedingCoins, setFeedingCoins] = useState(0)
  const [diaperCoins, setDiaperCoins] = useState(0)
  const [bathCoins, setBathCoins] = useState(0)
  const [activityCoins, setActivityCoins] = useState(0)
  const [momCoins, setMomCoins] = useState(0)
  const [sleepCoins, setSleepCoins] = useState(0)
  const [newAchievements, setNewAchievements] = useState<NewAchievement[]>([])
  const [showAchievementNotification, setShowAchievementNotification] = useState(false)
  const [backpackOpen, setBackpackOpen] = useState(false)
  const [restockDiapersInput, setRestockDiapersInput] = useState('')
  const [restockGramsInput, setRestockGramsInput] = useState('')
  const [restockLoading, setRestockLoading] = useState(false)
  const [restockFeedback, setRestockFeedback] = useState<string | null>(null)
  const [restockFeedbackTone, setRestockFeedbackTone] = useState<'neutral' | 'success' | 'error'>('neutral')
  const [portionSizeOunces, setPortionSizeOunces] = useState<number>(1)
  const [portionSizeOuncesInput, setPortionSizeOuncesInput] = useState<string>('1')
  const [portionSizeStatus, setPortionSizeStatus] = useState<string | null>(null)
  const [portionSizeStatusTone, setPortionSizeStatusTone] = useState<'neutral' | 'success' | 'error'>('neutral')

  const { member, family } = useAuth()

  // Загружаем размер порции из БД при загрузке данных
  useEffect(() => {
    if (data?.inventory?.portion_size_ounces) {
      const portionSize = data.inventory.portion_size_ounces
      setPortionSizeOunces(portionSize)
      setPortionSizeOuncesInput(portionSize.toString())
    }
  }, [data?.inventory?.portion_size_ounces])

  const inventoryTotals = useMemo(() => {
    const rawInventory = data?.inventory
    const diapers = Math.max(0, rawInventory?.diapers_stock ?? 0)
    const grams = Math.max(0, rawInventory?.formula_grams ?? 0)
    
    // Размер порции в унциях * 4.37 = граммы на порцию
    const portionSizeInGrams = portionSizeOunces * GRAMS_PER_OUNCE
    // Количество порций = граммы / (унции * 4.37), округляем до целых
    const displayPortions = portionSizeInGrams > 0 ? Math.round(grams / portionSizeInGrams) : 0
    
    const portionsSource =
      rawInventory?.formula_portions ?? (grams > 0 ? grams / GRAMS_PER_OUNCE : 0)
    const rawPortions = Math.round(Math.max(0, portionsSource) * 10) / 10

    return {
      diapers,
      grams: Math.round(grams * 10) / 10,
      portions: displayPortions,
      rawPortions,
      portionsSource,
      portionSize: portionSizeInGrams
    }
  }, [data?.inventory, portionSizeOunces])

  // Размер порции теперь сохраняется в БД через updatePortionSize

  const lowOnDiapers = inventoryTotals.diapers <= DIAPER_ALERT_LEVEL
  const lowOnFormula = inventoryTotals.portions <= FORMULA_ALERT_LEVEL

  const shoppingList = useMemo(() => {
    const items: Array<{ id: string; label: string; message: string }> = []
    const DIAPER_ALERT_LEVEL = 5
    const DIAPER_TARGET = 20
    const FORMULA_ALERT_LEVEL = 6
    const FORMULA_TARGET = 24

    const formatAmount = (value: number) =>
      Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)

    if (inventoryTotals.diapers <= DIAPER_ALERT_LEVEL) {
      const shortfall = Math.max(0, DIAPER_TARGET - inventoryTotals.diapers)
      items.push({
        id: 'diapers',
        label: 'Подгузники',
        message: `Осталось ${inventoryTotals.diapers} шт. Желательно докупить ещё ~${shortfall} шт.`
      })
    }

    if (inventoryTotals.portions <= FORMULA_ALERT_LEVEL) {
      const shortfall = Math.max(0, FORMULA_TARGET - inventoryTotals.portions)
      const gramsNeeded = Math.max(0, Math.round(shortfall * inventoryTotals.portionSize))
      const ouncesNeeded = Math.round((gramsNeeded / GRAMS_PER_OUNCE) * 10) / 10
      
      items.push({
        id: 'formula',
        label: 'Смесь',
        message: `Смеси — ${formatAmount(inventoryTotals.portions)} порций. Добавьте ~${formatAmount(shortfall)} порций (~${gramsNeeded} г / ~${ouncesNeeded} унций).`
      })
    }

    return items
  }, [inventoryTotals.diapers, inventoryTotals.portions, inventoryTotals.portionSize])

  const displayPortionsText = useMemo(() => {
    const value = inventoryTotals.portions
    if (!Number.isFinite(value) || value <= 0) {
      return '0'
    }

    return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
  }, [inventoryTotals.portions])

  const restockPortionsPreview = useMemo(() => {
    const normalized = restockGramsInput.replace(',', '.').trim()
    if (!normalized) {
      return 0
    }

    const numericValue = Number(normalized)
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return 0
    }

    // Режим унций: граммы / (унции * 4.37), округляем до целых
    const portionSizeInGrams = portionSizeOunces * GRAMS_PER_OUNCE
    return portionSizeInGrams > 0 ? Math.round(numericValue / portionSizeInGrams) : 0
  }, [restockGramsInput, portionSizeOunces])

  const restockPortionsPreviewText = useMemo(() => {
    if (!Number.isFinite(restockPortionsPreview) || restockPortionsPreview <= 0) {
      return ''
    }

    return Number.isInteger(restockPortionsPreview)
      ? restockPortionsPreview.toFixed(0)
      : restockPortionsPreview.toFixed(1)
  }, [restockPortionsPreview])

  const restockFeedbackClass = useMemo(() => {
    switch (restockFeedbackTone) {
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }, [restockFeedbackTone])

  const portionSizeStatusClass = useMemo(() => {
    switch (portionSizeStatusTone) {
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }, [portionSizeStatusTone])

  useEffect(() => {
    if (!restockFeedback) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setRestockFeedback(null)
      setRestockFeedbackTone('neutral')
    }, 4000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [restockFeedback])

  useEffect(() => {
    if (!portionSizeStatus) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setPortionSizeStatus(null)
      setPortionSizeStatusTone('neutral')
    }, 3000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [portionSizeStatus])

  const handleRestockSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!member || !family) {
      setRestockFeedback('Нет доступа к семейному рюкзаку.')
      setRestockFeedbackTone('error')
      return
    }

    if (restockLoading) {
      return
    }

    const parsedDiapers = Number(restockDiapersInput.replace(',', '.').trim())
    const parsedGrams = Number(restockGramsInput.replace(',', '.').trim())

    const diapersToAdd = Number.isFinite(parsedDiapers) && parsedDiapers > 0
      ? Math.round(parsedDiapers)
      : 0
    const gramsToAdd = Number.isFinite(parsedGrams) && parsedGrams > 0
      ? Math.round(parsedGrams * 1000) / 1000
      : 0

    if (diapersToAdd === 0 && gramsToAdd === 0) {
      setRestockFeedback('Введите, что хотите добавить.')
      setRestockFeedbackTone('error')
      return
    }

    setRestockLoading(true)
    setRestockFeedback(null)
    setRestockFeedbackTone('neutral')

    const payload: { diapers?: number; formulaGrams?: number; portionSizeGrams?: number } = {}
    if (diapersToAdd > 0) {
      payload.diapers = diapersToAdd
    }
    if (gramsToAdd > 0) {
      payload.formulaGrams = gramsToAdd
      // Передаем актуальный размер порции для корректного расчета
      payload.portionSizeGrams = portionSizeOunces * GRAMS_PER_OUNCE
    }

    try {
      await dataService.restockInventory(payload)

      const updatedInventory = await dataService.getFamilyInventory()
      setData(prev => (prev ? { ...prev, inventory: updatedInventory } : prev))

      setRestockFeedback('Запасы пополнены!')
      setRestockFeedbackTone('success')
      if (diapersToAdd > 0) {
        setRestockDiapersInput('')
      }
      if (gramsToAdd > 0) {
        setRestockGramsInput('')
      }
    } catch (error) {
      console.error('Error restocking inventory:', error)
      setRestockFeedback('Не получилось обновить запасы. Попробуйте ещё раз.')
      setRestockFeedbackTone('error')
    } finally {
      setRestockLoading(false)
    }
  }, [
    family,
    member,
    restockDiapersInput,
    restockLoading,
    restockGramsInput,
    portionSizeOunces
  ])

  const handleApplyPortionSize = useCallback(async () => {
    const normalized = portionSizeOuncesInput.replace(',', '.').trim()
    const parsedValue = Number(normalized)

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setPortionSizeStatus('Введите корректный размер порции в унциях.')
      setPortionSizeStatusTone('error')
      return
    }

    const rounded = Math.round(parsedValue * 10) / 10

    if (rounded === portionSizeOunces) {
      setPortionSizeStatus('Размер порции без изменений.')
      setPortionSizeStatusTone('neutral')
      return
    }

    try {
      // Сохраняем в БД
      const updatedInventory = await dataService.updatePortionSize(rounded)
      
      if (updatedInventory) {
        // Обновляем локальное состояние
        setPortionSizeOunces(rounded)
        setPortionSizeOuncesInput(rounded.toString())
        
        // Обновляем данные в состоянии
        setData(prev => prev ? { ...prev, inventory: updatedInventory } : null)
        
        setPortionSizeStatus(`Размер порции обновлён: ${rounded} унций (${Math.round(rounded * GRAMS_PER_OUNCE * 10) / 10} г).`)
        setPortionSizeStatusTone('success')
      } else {
        setPortionSizeStatus('Ошибка при сохранении размера порции.')
        setPortionSizeStatusTone('error')
      }
    } catch (error) {
      console.error('Error updating portion size:', error)
      setPortionSizeStatus('Ошибка при сохранении размера порции.')
      setPortionSizeStatusTone('error')
    }
  }, [portionSizeOuncesInput, portionSizeOunces])

  const toggleBackpack = useCallback(() => {
    setBackpackOpen(prev => !prev)
  }, [])

  const fetchData = useCallback(async () => {
    if (!member || !family) {
      return
    }

    try {
      setLoading(true)
      
      // Сохраняем предыдущее состояние сна
      const wasSleeping = isSleepMode
      
      const [
        lastFeeding,
        lastDiaper,
        lastBath,
        settingsFromDb,
        parentCoins,
        currentSleepSession,
        familySleepStatus,
        inventory
      ] = await Promise.all([
        dataService.getLastFeeding(),
        dataService.getLastDiaper(),
        dataService.getLastBath(),
        dataService.getSettings(),
        dataService.getParentCoins(),
        dataService.getCurrentSleepSession(),
        dataService.getFamilySleepStatus(),
        dataService.getFamilyInventory()
      ])

      setData({
        lastFeeding,
        lastDiaper,
        lastBath,
        parentCoins,
        currentSleepSession,
        familySleepStatus,
        inventory: inventory ?? null
      })

      if (settingsFromDb) {
        setSettings(prev => ({
          ...prev,
          feedingInterval: settingsFromDb.feed_interval ?? prev.feedingInterval,
          diaperInterval: settingsFromDb.diaper_interval ?? prev.diaperInterval,
          bathInterval: settingsFromDb.bath_reminder_period ?? prev.bathInterval,
          sleepMonitoringEnabled: settingsFromDb.sleep_monitoring_enabled ?? prev.sleepMonitoringEnabled,
          wakeOnActivityEnabled: settingsFromDb.wake_on_activity_enabled ?? prev.wakeOnActivityEnabled
        }))
      }

      // Обновляем состояние сна
      const isCurrentlySleeping = familySleepStatus?.isSleeping ?? false
      setIsSleepMode(isCurrentlySleeping)
      
      // Если малыш был в режиме сна и теперь не спит, показываем сообщение о пробуждении
      if (wasSleeping && !isCurrentlySleeping && settings.wakeOnActivityEnabled) {
        setJustWokeUp(true)
        // Скрываем сообщение через 5 секунд
        setTimeout(() => {
          setJustWokeUp(false)
        }, 5000)
      }
      
    } catch (error) {
      console.error('Error fetching tamagotchi data:', error)
    } finally {
      setLoading(false)
    }
  }, [member, family, isSleepMode, settings.wakeOnActivityEnabled])

  // Функция для определения состояния малыша
  const calculateBabyState = useCallback((): BabyState => {
    if (!data) return 'ok'

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

    // Определяем состояние по приоритету
    if (feedingOverdue && diaperOverdue) return 'all-in'
    if (feedingOverdue) return 'feeding'
    if (diaperOverdue) return 'poo'
    if (bathOverdue) return 'dirty'
    
    return 'ok'
  }, [data, settings])

  // Обновляем состояние каждую минуту
  useEffect(() => {
    const interval = setInterval(() => {
      setBabyState(calculateBabyState())
    }, 60000) // Каждую минуту

    return () => clearInterval(interval)
  }, [calculateBabyState])

  // Синхронизируем локальное состояние сна с данными из БД
  useEffect(() => {
    if (data?.familySleepStatus) {
      setIsSleepMode(data.familySleepStatus.isSleeping)
    }
  }, [data?.familySleepStatus])

  useEffect(() => {
    if (!member || !family) {
      return
    }

    fetchData()
  }, [member, family, fetchData])

  useEffect(() => {
    setBabyState(calculateBabyState())
  }, [calculateBabyState])

  // Автоматическое появление монет каждые 10-20 секунд
  useEffect(() => {
    const startCoinSpawning = () => {
      const spawnInterval = () => {
        const delay = Math.random() * 10000 + 10000 // 10-20 секунд
        const timeout = setTimeout(() => {
          spawnCoin()
          spawnInterval() // Рекурсивно планируем следующую монетку
        }, delay)
        setCoinSpawnInterval(timeout)
      }
      spawnInterval()
    }

    startCoinSpawning()

    return () => {
      if (coinSpawnInterval) {
        clearTimeout(coinSpawnInterval)
      }
    }
  }, [babyState, isSleepMode]) // Перезапускаем при изменении состояния малыша или режима сна

  // Синхронизируем локальное состояние монеток с данными из БД
  useEffect(() => {
    if (data?.parentCoins) {
      setFeedingCoins(data.parentCoins.feeding_coins)
      setDiaperCoins(data.parentCoins.diaper_coins)
      setBathCoins(data.parentCoins.bath_coins)
      setActivityCoins(data.parentCoins.activity_coins || 0)
      setMomCoins(data.parentCoins.mom_coins)
      setSleepCoins(data.parentCoins.sleep_coins || 0)
      setScore(data.parentCoins.total_score)
    }
  }, [data?.parentCoins])

  const getGifSource = (state: BabyState): string => {
    // Если включен режим сна, проверяем продолжительность сна
    if (isSleepMode) {
      // Проверяем, есть ли информация о сессии сна
      if (data?.familySleepStatus?.sleepSession) {
        const sleepSession = data.familySleepStatus.sleepSession
        const startTime = new Date(sleepSession.start_time)
        const durationMinutes = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60))
        
        // Если сон длится больше 3 минут, показываем картинку
        if (durationMinutes > 3) {
          return '/icons/sleep3min.png'
        }
      }
      
      // Иначе показываем обычное видео сна
      return '/icons/sleep.MP4'
    }
    
    switch (state) {
      case 'ok':
        return '/icons/ok.gif'
      case 'feeding':
        return '/icons/feeding.gif'
      case 'all-in':
        return '/icons/all-in.gif'
      case 'poo':
        return '/icons/poo.gif'
      case 'dirty':
        return '/icons/dirty.gif'
      default:
        return '/icons/ok.gif'
    }
  }

  const handleSleepAchievements = useCallback(async (session: SleepSession) => {
    if (!member || !family) {
      return
    }

    try {
      const timestamp = session.end_time ?? session.start_time
      const userId = member.user_id?.toString().trim()
      if (!userId) {
        console.warn('[Tamagotchi] Skipping sleep achievement check: missing user_id in member context')
        return
      }

      const achievements = await achievementService.checkAndAwardAchievements(
        family.id,
        userId,
        'sleep',
        { timestamp }
      )

      if (achievements.length > 0) {
        setNewAchievements(achievements)
        setShowAchievementNotification(true)

        for (const achievement of achievements) {
          await achievementService.sendAchievementNotification(achievement)
        }

        setTimeout(() => {
          setShowAchievementNotification(false)
        }, 5000)
      }
    } catch (error) {
      console.error('Error awarding sleep achievements:', error)
    }
  }, [family, member])

  const toggleSleepMode = async () => {
    try {
      // Немедленно обновляем локальное состояние
      const newSleepMode = !isSleepMode
      setIsSleepMode(newSleepMode)
      console.log('🌙 toggleSleepMode: immediately setting isSleepMode to:', newSleepMode)
      
      if (isSleepMode) {
        // Завершаем сессию сна
        const endedSession = await dataService.endSleepSession()
        if (endedSession) {
          console.log('🌙 Sleep session ended:', endedSession)
          // Добавляем монетки за сон
          await dataService.addCoins('sleep_coins', 1)
          await handleSleepAchievements(endedSession)
        }
      } else {
        // Начинаем сессию сна
        const startedSession = await dataService.startSleepSession()
        if (startedSession) {
          console.log('🌙 Sleep session started:', startedSession)
          await handleSleepAchievements(startedSession)
        }
      }
      
      // Обновляем данные
      await fetchData()
    } catch (error) {
      console.error('Error toggling sleep mode:', error)
      // В случае ошибки возвращаем состояние обратно
      setIsSleepMode(isSleepMode)
    }
  }

  const getStateDescription = (state: BabyState): string => {
    // Если малыш только что проснулся, показываем специальное сообщение
    if (justWokeUp) {
      return "🌅 Малыш проснулся после активности!"
    }
    
    // Если включен режим сна, показываем специальное сообщение
    if (isSleepMode && data?.familySleepStatus?.sleepSession) {
      const sleepSession = data.familySleepStatus.sleepSession
      const startTime = new Date(sleepSession.start_time)
      const durationMinutes = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60))
      const hours = Math.floor(durationMinutes / 60)
      const minutes = durationMinutes % 60
      
      let durationText = ''
      if (hours > 0) {
        durationText = `${hours}ч ${minutes}м`
      } else {
        durationText = `${minutes} минут`
      }
      
      if (settings.sleepMonitoringEnabled) {
        return `😴 Малыш спит уже ${durationText} (включил: ${sleepSession.author_name})`
      } else {
        return `😴 Малыш спит уже ${durationText}`
      }
    } else if (isSleepMode) {
      return "😴 Малыш спит сладким сном..."
    }
    
    return getStatePhrase(state, score)
  }

  const handleItemClick = (action: QuickActionType) => {
    setModalAction(action)
    setModalOpen(true)
  }

  const handleModalSuccess = async () => {
    // Обновляем данные после успешного действия
    await fetchData()
    setModalOpen(false)
  }

  // Функция для получения фразы в зависимости от состояния и очков
  const getStatePhrase = (state: BabyState, currentScore: number): string => {
    const scoreLevel = Math.floor(currentScore / 10)
    
    switch (state) {
      case 'feeding':
        const feedingPhrases = [
          "Покорми меня, пожалуйста!",
          "Я очень голодный малыш!",
          "Мам, где моя бутылочка?",
          "Время обеда уже пришло!",
          "Я хочу кушать прямо сейчас!",
          "Покорми меня, и я буду счастлив!",
          "Мой животик урчит от голода!",
          "Пожалуйста, дай мне покушать!",
          "Я так хочу молочка!",
          "Кормление - это самое важное!"
        ]
        return feedingPhrases[scoreLevel % feedingPhrases.length]
      
      case 'poo':
        const diaperPhrases = [
          "Пора сменить подгузник!",
          "Мне некомфортно в этом подгузнике!",
          "Мама, помоги мне!",
          "Я хочу быть чистым малышом!",
          "Пожалуйста, смени подгузник!",
          "Мне нужна свежая одежда!",
          "Я чувствую себя не очень хорошо!",
          "Помоги мне стать чистым!",
          "Подгузник нужно поменять!",
          "Я хочу быть сухим и комфортным!"
        ]
        return diaperPhrases[scoreLevel % diaperPhrases.length]
      
      case 'dirty':
        const bathPhrases = [
          "Пора искупать меня!",
          "Я хочу быть чистым малышом!",
          "Время водных процедур!",
          "Мне нужна ванночка!",
          "Пожалуйста, искупай меня!",
          "Я люблю купаться!",
          "Вода - это так весело!",
          "Помоги мне стать чистым!",
          "Купание - это здорово!",
          "Я хочу поплескаться в воде!"
        ]
        return bathPhrases[scoreLevel % bathPhrases.length]
      
      case 'all-in':
        const allInPhrases = [
          "Мне нужно и кушать, и сменить подгузник!",
          "Я очень нуждаюсь в твоей помощи!",
          "Пожалуйста, позаботься обо мне!",
          "Мне нужна забота и внимание!",
          "Я хочу быть счастливым малышом!",
          "Помоги мне чувствовать себя хорошо!",
          "Я так нуждаюсь в твоей любви!",
          "Позаботься обо мне, пожалуйста!",
          "Мне нужна твоя помощь прямо сейчас!",
          "Я хочу быть здоровым и счастливым!"
        ]
        return allInPhrases[scoreLevel % allInPhrases.length]
      
      case 'ok':
      default:
        const okPhrases = [
          "Я счастливый малыш!",
          "Спасибо за заботу!",
          "Ты лучшая мама на свете!",
          "Я чувствую себя отлично!",
          "Мне так хорошо с тобой!",
          "Ты делаешь меня счастливым!",
          "Я люблю тебя!",
          "Ты заботишься обо мне!",
          "Мне так повезло с тобой!",
          "Ты мой самый любимый человек!"
        ]
        return okPhrases[scoreLevel % okPhrases.length]
    }
  }

  // Функция для получения иконки монетки в зависимости от состояния
  const getCoinIcon = useCallback((state: BabyState, sleepMode: boolean = false): string => {
    // Если включен режим сна, всегда показываем иконку сна
    if (sleepMode) {
      console.log('🌙 getCoinIcon: Sleep mode ON, returning sleep.png')
      return '/icons/sleep.png'
    }
    
    console.log('🌙 getCoinIcon: Sleep mode OFF, state:', state)
    switch (state) {
      case 'feeding':
        return '/icons/feeding.png'
      case 'poo':
        return '/icons/poor.png'
      case 'dirty':
        return '/icons/sponge.png'
      case 'all-in':
        // Для состояния "all-in" случайно выбираем между feeding и poor
        return Math.random() < 0.5 ? '/icons/feeding.png' : '/icons/poor.png'
      case 'ok':
        return '/icons/mom.png'
      default:
        // Для неизвестных состояний возвращаем mom.png как fallback
        return '/icons/mom.png'
    }
  }, [])

  // Функция для получения типа монетки в зависимости от состояния
  const getCoinType = useCallback((state: BabyState, sleepMode: boolean = false): 'feeding_coins' | 'diaper_coins' | 'bath_coins' | 'activity_coins' | 'mom_coins' | 'sleep_coins' => {
    // Если включен режим сна, всегда показываем монетки сна
    if (sleepMode) {
      console.log('🌙 getCoinType: Sleep mode ON, returning sleep_coins')
      return 'sleep_coins'
    }
    
    console.log('🌙 getCoinType: Sleep mode OFF, state:', state)
    switch (state) {
      case 'feeding':
        return 'feeding_coins'
      case 'poo':
        return 'diaper_coins'
      case 'dirty':
        return 'bath_coins'
      case 'all-in':
        // Для состояния "all-in" случайно выбираем между feeding и poor
        return Math.random() < 0.5 ? 'feeding_coins' : 'diaper_coins'
      case 'ok':
        return 'mom_coins'
      default:
        // Для неизвестных состояний возвращаем mom_coins как fallback
        return 'mom_coins'
    }
  }, [])

  // Функция для создания случайной позиции монетки
  const getRandomCoinPosition = () => {
    const containerWidth = window.innerWidth
    const containerHeight = window.innerHeight
    const coinSize = 48 // размер монетки
    
    // Позиционируем монеты в области видео и вокруг него
    const videoAreaWidth = Math.min(400, containerWidth * 0.75) // ширина видео
    const videoAreaHeight = containerHeight * 0.6 // высота области видео
    
    const centerX = containerWidth / 2
    const centerY = containerHeight / 2
    
    return {
      x: centerX + (Math.random() - 0.5) * videoAreaWidth,
      y: centerY + (Math.random() - 0.5) * videoAreaHeight
    }
  }

  // Функция для создания новой монетки
  const spawnCoin = () => {
    // Ограничиваем количество монет на экране (максимум 5)
    setCoins(prev => {
      if (prev.filter(coin => !coin.collected).length >= 5) {
        return prev
      }
      
      const position = getRandomCoinPosition()
      
      // Определяем тип и иконку монетки на основе текущего состояния
      console.log('🌙 spawnCoin called with:', { babyState, isSleepMode })
      console.log('🌙 isSleepMode type:', typeof isSleepMode, 'value:', isSleepMode)
      
      // Если малыш спит, всегда показываем монетки сна
      let coinType: 'feeding_coins' | 'diaper_coins' | 'bath_coins' | 'activity_coins' | 'mom_coins' | 'sleep_coins'
      let coinIcon: string
      
      if (isSleepMode) {
        coinType = 'sleep_coins'
        coinIcon = '/icons/sleep.png'
        console.log('🌙 Sleep mode detected - using sleep coins')
      } else {
        coinType = getCoinType(babyState, false)
        coinIcon = getCoinIcon(babyState, false)
        console.log('🌙 Normal mode - using state-based coins:', { babyState, coinType, coinIcon })
      }
      
      // Отладочная информация
      console.log('🌙 Final coin data:', { coinType, coinIcon, isSleepMode })
      console.log('🌙 Expected: sleep_coins + sleep.png when sleep mode is ON')
      console.log('🌙 getCoinType result:', getCoinType(babyState, false))
      console.log('🌙 getCoinIcon result:', getCoinIcon(babyState, false))
      
      const newCoin = {
        id: Date.now() + Math.random(),
        x: position.x,
        y: position.y,
        collected: false,
        falling: false,
        icon: coinIcon,
        type: coinType
      }
      
      // Автоматически убираем монетку через 10 секунд, если она не была собрана
      setTimeout(() => {
        setCoins(prevCoins => prevCoins.filter(coin => coin.id !== newCoin.id))
      }, 10000)
      
      return [...prev, newCoin]
    })
  }

  // Функция для сбора монетки
  const collectCoin = async (coinId: number) => {
    const coin = coins.find(c => c.id === coinId)
    if (!coin || coin.collected) return

    // Добавляем вибрацию при сборе монетки
    if ('vibrate' in navigator) {
      navigator.vibrate(50) // Короткая вибрация 50мс
    }

    // Помечаем монетку как собранную
    setCoins(prev => prev.map(c => 
      c.id === coinId ? { ...c, collected: true, falling: true } : c
    ))

    try {
      // Сохраняем монетку в БД
      console.log(`Adding ${coin.type} coin to database...`)
      const updatedCoins = await dataService.addCoins(coin.type, 1)
      
      if (updatedCoins) {
        console.log('Coins updated successfully:', updatedCoins)
        // Обновляем локальное состояние с данными из БД
        setFeedingCoins(updatedCoins.feeding_coins)
        setDiaperCoins(updatedCoins.diaper_coins)
        setBathCoins(updatedCoins.bath_coins)
        setActivityCoins(updatedCoins.activity_coins || 0)
        setMomCoins(updatedCoins.mom_coins)
        setSleepCoins(updatedCoins.sleep_coins || 0)
        setScore(updatedCoins.total_score)
        
        // Обновляем данные в состоянии
        setData(prev => prev ? { ...prev, parentCoins: updatedCoins } : null)
      } else {
        console.warn('Failed to update coins in database')
      }
    } catch (error) {
      console.error('Error saving coins to database:', error)
      // В случае ошибки все равно обновляем локальное состояние для UX
      setScore(prev => prev + 10)
      
      switch (coin.type) {
        case 'feeding_coins':
          setFeedingCoins(prev => prev + 1)
          break
        case 'diaper_coins':
          setDiaperCoins(prev => prev + 1)
          break
        case 'bath_coins':
          setBathCoins(prev => prev + 1)
          break
        case 'activity_coins':
          setActivityCoins(prev => prev + 1)
          break
        case 'mom_coins':
          setMomCoins(prev => prev + 1)
          break
        case 'sleep_coins':
          setSleepCoins(prev => prev + 1)
          break
      }
    }
    
    // Анимация счетчика очков
    setScoreAnimation(true)
    setTimeout(() => setScoreAnimation(false), 300)
    
    // Убираем монетку через время анимации
    setTimeout(() => {
      setCoins(prev => prev.filter(c => c.id !== coinId))
    }, 1800)
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-3xl animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Загружаем малыша...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tamagotchi-container relative">

      {/* Монетки для сбора - позиционированы относительно всего контейнера */}
      {coins.map(coin => (
        <div
          key={coin.id}
          className={`absolute w-12 h-12 transition-all duration-200 cursor-pointer ${
            coin.falling ? 'coin-falling' : coin.collected ? 'opacity-0 scale-0' : 'coin-float'
          }`}
          style={{
            left: `${coin.x - 24}px`,
            top: `${coin.y - 24}px`,
            zIndex: 20
          }}
          onClick={() => !coin.collected && collectCoin(coin.id)}
        >
          <img 
            src={coin.icon} 
            alt="Монетка" 
            className="w-full h-full object-contain hover:scale-110 transition-transform duration-200"
          />
        </div>
      ))}

      {/* Стопки монеток - компактные */}
      <div className="tamagotchi-coins text-center">
        <div className="flex justify-center gap-1 flex-wrap items-center">
          {/* Стопка кормления */}
          {feedingCoins > 0 && (
            <div className="flex items-center gap-1 bg-pink-100 px-1.5 py-0.5 rounded-3xl">
              <img src="/icons/feeding.png" alt="Кормление" className="w-3 h-3" />
              <span className="text-xs font-bold text-pink-800">{feedingCoins}</span>
            </div>
          )}
          
          {/* Стопка подгузников */}
          {diaperCoins > 0 && (
            <div className="flex items-center gap-1 bg-yellow-100 px-1.5 py-0.5 rounded-3xl">
              <img src="/icons/poor.png" alt="Подгузник" className="w-3 h-3" />
              <span className="text-xs font-bold text-yellow-800">{diaperCoins}</span>
            </div>
          )}
          
          {/* Стопка купания */}
          {bathCoins > 0 && (
            <div className="flex items-center gap-1 bg-purple-100 px-1.5 py-0.5 rounded-3xl">
              <img src="/icons/sponge.png" alt="Купание" className="w-3 h-3" />
              <span className="text-xs font-bold text-purple-800">{bathCoins}</span>
            </div>
          )}
          
          {/* Стопка активности */}
          {activityCoins > 0 && (
            <div className="flex items-center gap-1 bg-indigo-100 px-1.5 py-0.5 rounded-3xl">
              <img src="/icons/baby.png" alt="Активность" className="w-3 h-3" />
              <span className="text-xs font-bold text-indigo-800">{activityCoins}</span>
            </div>
          )}
          
          {/* Стопка обычных монеток */}
          {momCoins > 0 && (
            <div className="flex items-center gap-1 bg-green-100 px-1.5 py-0.5 rounded-3xl">
              <img src="/icons/mom.png" alt="Монетка" className="w-3 h-3" />
              <span className="text-xs font-bold text-green-800">{momCoins}</span>
            </div>
          )}
          
          {/* Стопка монеток сна */}
          {sleepCoins > 0 && (
            <div className="flex items-center gap-1 bg-indigo-100 px-1.5 py-0.5 rounded-3xl">
              <img src="/icons/sleep.png" alt="Сон" className="w-3 h-3" />
              <span className="text-xs font-bold text-indigo-800">{sleepCoins}</span>
            </div>
          )}
          
          {/* Общий счетчик очков */}
          <div className={`inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-3xl transition-all duration-300 ${
            scoreAnimation ? 'score-animation bg-gray-200 shadow-lg' : 'scale-100'
          }`}>
            <span className="text-xs font-bold text-gray-800">⭐</span>
            <span className={`text-xs font-bold text-gray-800 transition-all duration-300 ${
              scoreAnimation ? 'text-gray-900' : ''
            }`}>{score}</span>
          </div>
        </div>
      </div>

      {/* GIF/Video малыша - адаптивное */}
      <div className="tamagotchi-video-container">
        <div className="relative inline-block">
          {isSleepMode && getGifSource(babyState).endsWith('.MP4') ? (
            <video
              key="sleep-video"
              src={getGifSource(babyState)}
              className="tamagotchi-video w-[75vw] max-w-[400px] object-cover rounded-3xl cursor-pointer"
              autoPlay
              muted
              playsInline
              loop={false}
            />
          ) : (
            <img
              key={isSleepMode ? 'sleep-image' : babyState} // Принудительно перезагружаем при смене состояния
              src={getGifSource(babyState)}
              alt={`Малыш в состоянии ${babyState}`}
              className="tamagotchi-video w-[75vw] max-w-[400px] object-cover rounded-3xl cursor-pointer"
            />
          )}
          

          {/* Кнопка режима сна: солнце (не спит) / луна (спит) */}
          <div className="absolute top-5 left-4">
            <button
              onClick={toggleSleepMode}
              className="p-0 rounded-3xl bg-transparent shadow-none border-0 hover:bg-transparent transition"
              aria-label={isSleepMode ? 'Выключить режим сна' : 'Включить режим сна'}
            >
              <img
                src={isSleepMode ? '/icons/moon.png' : '/icons/sun.png'}
                alt={isSleepMode ? 'Спит' : 'Не спит'}
                className="w-16 h-16 object-contain"
              />
            </button>
          </div>

          {/* Кнопка рюкзака в нижнем правом углу */}
          <div className="absolute bottom-4 right-4 z-50 flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={toggleBackpack}
              className="relative p-1 bg-transparent hover:bg-white/20 rounded-3xl transition-colors"
              aria-label={backpackOpen ? 'Закрыть рюкзак' : 'Открыть рюкзак'}
            >
              <img 
                src="/icons/bag.png" 
                alt="Рюкзак" 
                className="w-16 h-16 object-contain"
              />
              {shoppingList.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] rounded-full bg-red-100 text-red-600 font-semibold">
                  {shoppingList.length}
                </span>
              )}
            </button>

            {backpackOpen && (
              <div className="w-72 max-w-[85vw] bg-white/95 backdrop-blur-md rounded-3xl shadow-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">🎒 Семейный рюкзак</h3>
                    <p className="text-[11px] text-gray-500">Отслеживайте запасы и пополняйте их здесь.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBackpackOpen(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Закрыть рюкзак"
                  >
                    ✕
                  </button>
                </div>

                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">Подгузники</span>
                    <span className={`font-semibold ${lowOnDiapers ? 'text-red-500' : 'text-gray-900'}`}>
                      {inventoryTotals.diapers} шт
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">Смесь</span>
                    <span className={`font-semibold ${lowOnFormula ? 'text-red-500' : 'text-gray-900'}`}>
                      {displayPortionsText} порций
                      <span className="text-[10px] text-gray-400 ml-1">
                        (~{inventoryTotals.grams} г / {portionSizeOunces} унц.)
                      </span>
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700" htmlFor="portion-size-ounces">
                    Размер порции смеси (унции)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="portion-size-ounces"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Например, 5"
                      value={portionSizeOuncesInput}
                      onChange={event => setPortionSizeOuncesInput(event.target.value)}
                      onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); handleApplyPortionSize(); } }}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition"
                    />
                    <button
                      type="button"
                      onClick={handleApplyPortionSize}
                      className="px-3 py-2 rounded-2xl bg-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-300 transition-colors"
                    >
                      Ок
                    </button>
                  </div>
                  {portionSizeStatus && (
                    <p className={`text-[10px] ${portionSizeStatusClass}`}>
                      {portionSizeStatus}
                    </p>
                  )}
                </div>
                <form className="space-y-2.5" onSubmit={handleRestockSubmit}>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-700" htmlFor="restock-diapers">
                      Добавить подгузники (шт)
                    </label>
                    <input
                      id="restock-diapers"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      placeholder="Например, 10"
                      value={restockDiapersInput}
                      onChange={event => setRestockDiapersInput(event.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-700" htmlFor="restock-grams">
                      Добавить смесь (г)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="restock-grams"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Например, 180"
                        value={restockGramsInput}
                        onChange={event => setRestockGramsInput(event.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition"
                      />
                      {restockPortionsPreview > 0 && restockPortionsPreviewText && (
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                          ≈ {restockPortionsPreviewText} порц. ({portionSizeOunces} унц.)
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={restockLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-500 text-white text-xs font-semibold py-2.5 shadow hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {restockLoading ? 'Сохраняем...' : 'Пополнить запасы'}
                  </button>
                </form>

                {restockFeedback && (
                  <div className={`text-[11px] text-center font-medium ${restockFeedbackClass}`} aria-live="polite">
                    {restockFeedback}
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-800 mb-1.5 flex items-center gap-1">
                    <span role="img" aria-hidden="true">🛒</span>
                    <span>Список покупок</span>
                  </h4>
                  {shoppingList.length > 0 ? (
                    <ul className="space-y-1">
                      {shoppingList.map(item => (
                        <li key={item.id} className="text-[11px] leading-snug text-gray-600">
                          <span className="font-medium text-gray-800">{item.label}:</span> {item.message}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-gray-500">Пока ничего докупать не нужно.</p>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
        
        <p className="text-xs font-medium text-gray-700 mt-2">
          {getStateDescription(babyState)}
        </p>
      </div>

      {/* Лоток с предметами - в стиле liquid glass */}
      <div className="tamagotchi-inventory-liquid">
        <div className="tamagotchi-inventory-container">
          {/* Подгузник */}
          <div 
            onClick={() => handleItemClick('diaper')}
            className="tamagotchi-inventory-item"
          >
            <div className="tamagotchi-inventory-icon">
              <img 
                src="/icons/diaper.png" 
                alt="Подгузник" 
              />
            </div>
            <div className={`tamagotchi-inventory-label ${lowOnDiapers ? 'text-red-500' : ''}`}>
              {inventoryTotals.diapers}
            </div>
          </div>

          {/* Бутылочка */}
          <div 
            onClick={() => handleItemClick('feeding')}
            className="tamagotchi-inventory-item"
          >
            <div className="tamagotchi-inventory-icon">
              <img 
                src="/icons/feeding.png" 
                alt="Бутылочка" 
              />
            </div>
            <div className={`tamagotchi-inventory-label ${lowOnFormula ? 'text-red-500' : ''}`}>
              {displayPortionsText}
            </div>
          </div>

          {/* Губка */}
          <div 
            onClick={() => handleItemClick('bath')}
            className="tamagotchi-inventory-item"
          >
            <div className="tamagotchi-inventory-icon">
              <img 
                src="/icons/sponge.png" 
                alt="Губка" 
              />
            </div>
          </div>

          {/* Активность */}
          <div 
            onClick={() => handleItemClick('activity')}
            className="tamagotchi-inventory-item"
          >
            <div className="tamagotchi-inventory-icon">
              <img 
                src="/icons/activity.png" 
                alt="Активность" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно для действий */}
      {showAchievementNotification && newAchievements.length > 0 && (
        <AchievementNotification
          achievement={newAchievements[0]}
          onClose={() => setShowAchievementNotification(false)}
        />
      )}

      <QuickActionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        actionType={modalAction}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}

