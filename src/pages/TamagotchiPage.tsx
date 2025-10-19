﻿import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { dataService, Feeding, Diaper, Bath, ParentCoins, SleepSession, FamilyInventory, GRAMS_PER_OUNCE } from '../services/dataService'
import CategoryPreloader from '../components/CategoryPreloader'

type BabyState = 'ok' | 'feeding' | 'all-in' | 'poo' | 'dirty'
type QuickActionType = 'feeding' | 'diaper' | 'bath' | 'activity'

interface TamagotchiPageProps {
  onModalOpen: (action: QuickActionType) => void
}

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
  wakeOnActivityEnabled: boolean
}

export default function TamagotchiPage({ onModalOpen }: TamagotchiPageProps) {
  // console.log('TamagotchiPage rendered') // Отключено для экономии ресурсов
  
  const [data, setData] = useState<TamagotchiData | null>(null)
  const [settings, setSettings] = useState<SettingsState>({
    feedingInterval: 3,
    diaperInterval: 2,
    bathInterval: 1,
    wakeOnActivityEnabled: true
  })
  const [loading, setLoading] = useState(true)
  const [backgroundLoading, setBackgroundLoading] = useState(false)
  const [babyState, setBabyState] = useState<BabyState>('ok')
  const [justWokeUp, setJustWokeUp] = useState(false)
  const [scoreAnimation, setScoreAnimation] = useState(false)
  const [coins, setCoins] = useState<Array<{id: number, x: number, y: number, collected: boolean, falling: boolean, icon: string, type: 'feeding_coins' | 'diaper_coins' | 'bath_coins' | 'activity_coins' | 'mom_coins' | 'sleep_coins'}>>([])
  const coinSpawnIntervalRef = useRef<number | null>(null)
  const coinTimeoutRefs = useRef<Set<number>>(new Set())
  const previousSleepModeRef = useRef<boolean>(false)
  const allTimeoutsRef = useRef<Set<number>>(new Set())
  const [isSleepMode, setIsSleepMode] = useState(false)
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

  // Получаем числа монет из parentCoins через useMemo
  const coinCounts = useMemo(() => {
    if (!data?.parentCoins) {
      return {
        feedingCoins: 0,
        diaperCoins: 0,
        bathCoins: 0,
        activityCoins: 0,
        momCoins: 0,
        sleepCoins: 0,
        score: 0
      }
    }
    
    return {
      feedingCoins: data.parentCoins.feeding_coins,
      diaperCoins: data.parentCoins.diaper_coins,
      bathCoins: data.parentCoins.bath_coins,
      activityCoins: data.parentCoins.activity_coins || 0,
      momCoins: data.parentCoins.mom_coins,
      sleepCoins: data.parentCoins.sleep_coins || 0,
      score: data.parentCoins.total_score
    }
  }, [data?.parentCoins])

  // Загружаем размер порции из БД при загрузке данных
  useEffect(() => {
    if (data?.inventory?.portion_size_ounces) {
      const portionSize = data.inventory.portion_size_ounces
      setPortionSizeOunces(portionSize)
      setPortionSizeOuncesInput(portionSize.toString())
    }
  }, [data?.inventory?.portion_size_ounces])

  useEffect(() => {
    if (!backpackOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setBackpackOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [backpackOpen])

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

  const hasShoppingListItems = shoppingList.length > 0
  const backpackIntroMessage = hasShoppingListItems
    ? 'Запасы подсказывают, что скоро пригодится поход по магазинам.'
    : 'Все нужное под рукой — можно отдыхать!'

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
      allTimeoutsRef.current.delete(timeoutId)
    }, 4000)
    allTimeoutsRef.current.add(timeoutId)

    return () => {
      window.clearTimeout(timeoutId)
      allTimeoutsRef.current.delete(timeoutId)
    }
  }, [restockFeedback])

  useEffect(() => {
    if (!portionSizeStatus) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setPortionSizeStatus(null)
      setPortionSizeStatusTone('neutral')
      allTimeoutsRef.current.delete(timeoutId)
    }, 3000)
    allTimeoutsRef.current.add(timeoutId)

    return () => {
      window.clearTimeout(timeoutId)
      allTimeoutsRef.current.delete(timeoutId)
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

  const fetchData = useCallback(async (isBackgroundUpdate: boolean = false) => {
    if (!member || !family) {
      return
    }

    try {
      // Устанавливаем соответствующее состояние загрузки
      if (isBackgroundUpdate) {
        setBackgroundLoading(true)
      } else {
        setLoading(true)
      }
      
      // Сохраняем предыдущее состояние сна из useRef
      const wasSleeping = previousSleepModeRef.current
      
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
        const wakeUpTimeoutId = window.setTimeout(() => {
          setJustWokeUp(false)
          allTimeoutsRef.current.delete(wakeUpTimeoutId)
        }, 5000)
        allTimeoutsRef.current.add(wakeUpTimeoutId)
      }
      
    } catch (error) {
      console.error('Error fetching tamagotchi data:', error)
    } finally {
      // Сбрасываем соответствующее состояние загрузки
      if (isBackgroundUpdate) {
        setBackgroundLoading(false)
      } else {
        setLoading(false)
      }
    }
  }, [member, family, settings.wakeOnActivityEnabled])

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

  // Обновляем состояние каждые 5 минут (увеличено с 1 минуты)
  // Используем useRef для предотвращения лишних рендеров
  const babyStateIntervalRef = useRef<number | null>(null)
  
  useEffect(() => {
    babyStateIntervalRef.current = window.setInterval(() => {
      setBabyState(calculateBabyState())
    }, 300000) // Каждые 5 минут

    return () => {
      if (babyStateIntervalRef.current) {
        clearInterval(babyStateIntervalRef.current)
        babyStateIntervalRef.current = null
      }
    }
  }, [calculateBabyState])

  // Обновляем previousSleepModeRef при изменении isSleepMode
  useEffect(() => {
    previousSleepModeRef.current = isSleepMode
  }, [isSleepMode])

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

  // Автоматическое фоновое обновление данных каждые 10 минут (увеличено с 2 минут)
  // Используем useRef для предотвращения лишних рендеров
  const backgroundUpdateIntervalRef = useRef<number | null>(null)
  
  useEffect(() => {
    if (!member || !family) {
      return
    }

    backgroundUpdateIntervalRef.current = window.setInterval(() => {
      fetchData(true) // Фоновое обновление
    }, 600000) // 10 минут

    return () => {
      if (backgroundUpdateIntervalRef.current) {
        clearInterval(backgroundUpdateIntervalRef.current)
        backgroundUpdateIntervalRef.current = null
      }
    }
  }, [member?.id, family?.id, fetchData])

  useEffect(() => {
    setBabyState(calculateBabyState())
  }, [calculateBabyState])

  // Функция для получения иконки монетки в зависимости от состояния
  const getCoinIcon = useCallback((state: BabyState, sleepMode: boolean = false): string => {
    // Если включен режим сна, всегда показываем иконку сна
    if (sleepMode) {
      // console.log('🌙 getCoinIcon: Sleep mode ON, returning sleep.png') // Отключено для экономии ресурсов
      return '/icons/sleep.png'
    }
    
    // console.log('🌙 getCoinIcon: Sleep mode OFF, state:', state) // Отключено для экономии ресурсов
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
      // console.log('🌙 getCoinType: Sleep mode ON, returning sleep_coins') // Отключено для экономии ресурсов
      return 'sleep_coins'
    }
    
    // console.log('🌙 getCoinType: Sleep mode OFF, state:', state) // Отключено для экономии ресурсов
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
  const spawnCoin = useCallback(() => {
    // Ограничиваем количество монет на экране (максимум 3 вместо 5)
    setCoins(prev => {
      if (prev.filter(coin => !coin.collected).length >= 3) {
        return prev
      }
      
      const position = getRandomCoinPosition()
      
      // Определяем тип и иконку монетки на основе текущего состояния
      // console.log('🌙 spawnCoin called with:', { babyState, isSleepMode }) // Отключено для экономии ресурсов
      // console.log('🌙 isSleepMode type:', typeof isSleepMode, 'value:', isSleepMode) // Отключено для экономии ресурсов
      
      // Если малыш спит, всегда показываем монетки сна
      let coinType: 'feeding_coins' | 'diaper_coins' | 'bath_coins' | 'activity_coins' | 'mom_coins' | 'sleep_coins'
      let coinIcon: string
      
      if (isSleepMode) {
        coinType = 'sleep_coins'
        coinIcon = '/icons/sleep.png'
        // console.log('🌙 Sleep mode detected - using sleep coins') // Отключено для экономии ресурсов
      } else {
        coinType = getCoinType(babyState, false)
        coinIcon = getCoinIcon(babyState, false)
        // console.log('🌙 Normal mode - using state-based coins:', { babyState, coinType, coinIcon }) // Отключено для экономии ресурсов
      }
      
      // Отладочная информация отключена для экономии ресурсов
      // console.log('🌙 Final coin data:', { coinType, coinIcon, isSleepMode })
      // console.log('🌙 Expected: sleep_coins + sleep.png when sleep mode is ON')
      // console.log('🌙 getCoinType result:', getCoinType(babyState, false))
      // console.log('🌙 getCoinIcon result:', getCoinIcon(babyState, false))
      
      const newCoin = {
        id: Date.now() + Math.random(),
        x: position.x,
        y: position.y,
        collected: false,
        falling: false,
        icon: coinIcon,
        type: coinType
      }
      
      // Автоматически убираем монетку через 5 секунд, если она не была собрана (уменьшено для экономии ресурсов)
      const timeoutId = window.setTimeout(() => {
        setCoins(prevCoins => prevCoins.filter(coin => coin.id !== newCoin.id))
        coinTimeoutRefs.current.delete(timeoutId)
      }, 5000)
      coinTimeoutRefs.current.add(timeoutId)
      
      return [...prev, newCoin]
    })
  }, [babyState, isSleepMode, getCoinType, getCoinIcon])

  // Очистка всех таймеров при размонтировании компонента
  useEffect(() => {
    return () => {
      // Очищаем основной таймер монеток
      if (coinSpawnIntervalRef.current) {
        clearTimeout(coinSpawnIntervalRef.current)
        coinSpawnIntervalRef.current = null
      }
      // Очищаем интервал состояния малыша
      if (babyStateIntervalRef.current) {
        clearInterval(babyStateIntervalRef.current)
        babyStateIntervalRef.current = null
      }
      // Очищаем интервал фонового обновления
      if (backgroundUpdateIntervalRef.current) {
        clearInterval(backgroundUpdateIntervalRef.current)
        backgroundUpdateIntervalRef.current = null
      }
      // Очищаем все таймеры монеток
      coinTimeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId))
      coinTimeoutRefs.current.clear()
      // Очищаем все остальные таймеры
      allTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId))
      allTimeoutsRef.current.clear()
    }
  }, [])

  // Автоматическое появление монет каждые 30-60 секунд (увеличено для экономии ресурсов)
  useEffect(() => {
    const startCoinSpawning = () => {
      const spawnInterval = () => {
        const delay = Math.random() * 30000 + 30000 // 30-60 секунд
        const timeout = window.setTimeout(() => {
          spawnCoin()
          spawnInterval() // Рекурсивно планируем следующую монетку
        }, delay)
        coinSpawnIntervalRef.current = timeout
      }
      spawnInterval()
    }

    startCoinSpawning()

    return () => {
      if (coinSpawnIntervalRef.current) {
        clearTimeout(coinSpawnIntervalRef.current)
        coinSpawnIntervalRef.current = null
      }
    }
  }, [spawnCoin]) // Перезапускаем при изменении функции spawnCoin


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

  const toggleSleepMode = async () => {
    try {
      // Немедленно обновляем локальное состояние
      const newSleepMode = !isSleepMode
      setIsSleepMode(newSleepMode)
      // console.log('🌙 toggleSleepMode: immediately setting isSleepMode to:', newSleepMode) // Отключено для экономии ресурсов
      
      if (isSleepMode) {
        // Завершаем сессию сна
        const endedSession = await dataService.endSleepSession()
        if (endedSession) {
          console.log('🌙 Sleep session ended:', endedSession)
          // Добавляем монетки за сон
          await dataService.addCoins('sleep_coins', 1)
        }
      } else {
        // Начинаем сессию сна
        const startedSession = await dataService.startSleepSession()
        if (startedSession) {
          console.log('🌙 Sleep session started:', startedSession)
        }
      }
      
      // Обновляем данные в фоновом режиме
      await fetchData(true)
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
      
      return `😴 Малыш спит уже ${durationText} (включил: ${sleepSession.author_name})`
    } else if (isSleepMode) {
      return "😴 Малыш спит сладким сном..."
    }
    
    return getStatePhrase(state, coinCounts.score)
  }

  const handleItemClick = (action: QuickActionType) => {
    onModalOpen(action)
  }
  
  const getStatePhrase = (state: BabyState, currentScore: number): string => {
    const scoreLevel = Math.floor(currentScore / 10)

    switch (state) {
      case 'feeding': {
        const feedingPhrases = [
          'Ммм, вот это обед!',
          'Спасибо, теперь животик счастлив.',
          'Готов к приключениям после перекуса!',
          'Это было вкуснее всего на свете!',
          'Еще ложечку? Не откажусь!',
          'Теперь можно и поспать.',
          'Хрум-хрум, силы вернулись!',
          'Вы лучший шеф на свете.',
          'Так бы и ел весь день.',
          'Супер! Животик доволен.'
        ]
        return feedingPhrases[scoreLevel % feedingPhrases.length]
      }
      case 'poo': {
        const diaperPhrases = [
          'Как же приятно быть чистым!',
          'Новый подгузник — новая жизнь.',
          'Теперь мне снова комфортно.',
          'Фух, вот это облегчение.',
          'Свежесть вернулась!',
          'Вы спасли меня от неудобств.',
          'Пахнет как свежий воздух.',
          'Чистота — залог веселья.',
          'Теперь можно и играть.',
          'Спасибо за заботу!'
        ]
        return diaperPhrases[scoreLevel % diaperPhrases.length]
      }
      case 'dirty': {
        const bathPhrases = [
          'Плеск-плеск! Вода — моя стихия.',
          'Как приятно быть чистым и бодрым.',
          'Пузырьки щекочут!',
          'Это целый спа-салон.',
          'Готов сиять и пахнуть!',
          'Освежился и проснулся.',
          'Как же классно плескаться.',
          'Я капитан в ванной!',
          'Теперь я как новенький.',
          'Люблю водные процедуры!'
        ]
        return bathPhrases[scoreLevel % bathPhrases.length]
      }
      case 'all-in': {
        const allInPhrases = [
          'Уф, целая серия забот — спасибо!',
          'Вот это сервис: и накормлен, и чист!',
          'Вы супергерой: всё сделали сразу.',
          'Такой уход заслуживает медали.',
          'Все дела сделаны — можно отдыхать.',
          'Меня ухаживали как в санатории!',
          'Комбо заботы принято, спасибо.',
          'Так приятно, когда обо мне помнят.',
          'Идеальный уход за пару минут!',
          'Я готов сиять — спасибо за комбо.'
        ]
        return allInPhrases[scoreLevel % allInPhrases.length]
      }
      case 'ok':
      default: {
        const okPhrases = [
          'Я в полном порядке!',
          'Все отлично, просто отдыхай рядом.',
          'Мне хорошо и спокойно.',
          'Настроение — как ясный день.',
          'Все под контролем.',
          'Я готов к новым играм.',
          'Просто наслаждаюсь моментом.',
          'У меня всё замечательно.',
          'Как же классно вместе!',
          'Пока все супер — спасибо!'
        ]
        return okPhrases[scoreLevel % okPhrases.length]
      }
    }
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
      // console.log(`Adding ${coin.type} coin to database...`) // Отключено для экономии ресурсов
      const updatedCoins = await dataService.addCoins(coin.type, 1)
      
      if (updatedCoins) {
        // console.log('Coins updated successfully:', updatedCoins) // Отключено для экономии ресурсов
        // Обновляем данные в состоянии локально для быстрого отклика
        setData(prev => prev ? { ...prev, parentCoins: updatedCoins } : null)
        // Дополнительно обновляем данные в фоновом режиме для синхронизации
        fetchData(true)
      } else {
        console.warn('Failed to update coins in database')
      }
    } catch (error) {
      console.error('Error saving coins to database:', error)
      // В случае ошибки все равно обновляем локальное состояние для UX
      setData(prev => {
        if (!prev?.parentCoins) return prev
        
        const updatedParentCoins = { ...prev.parentCoins }
        updatedParentCoins.total_score += 10
        
        switch (coin.type) {
          case 'feeding_coins':
            updatedParentCoins.feeding_coins += 1
            break
          case 'diaper_coins':
            updatedParentCoins.diaper_coins += 1
            break
          case 'bath_coins':
            updatedParentCoins.bath_coins += 1
            break
          case 'activity_coins':
            updatedParentCoins.activity_coins = (updatedParentCoins.activity_coins || 0) + 1
            break
          case 'mom_coins':
            updatedParentCoins.mom_coins += 1
            break
          case 'sleep_coins':
            updatedParentCoins.sleep_coins = (updatedParentCoins.sleep_coins || 0) + 1
            break
        }
        
        return { ...prev, parentCoins: updatedParentCoins }
      })
    }
    
    // Анимация счетчика очков
    setScoreAnimation(true)
    const animationTimeoutId = window.setTimeout(() => {
      setScoreAnimation(false)
      coinTimeoutRefs.current.delete(animationTimeoutId)
    }, 300)
    coinTimeoutRefs.current.add(animationTimeoutId)
    
    // Убираем монетку через время анимации
    const removeTimeoutId = window.setTimeout(() => {
      setCoins(prev => prev.filter(c => c.id !== coinId))
      coinTimeoutRefs.current.delete(removeTimeoutId)
    }, 1800)
    coinTimeoutRefs.current.add(removeTimeoutId)
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
      {/* Предзагрузка изображений для тамагочи */}
      <CategoryPreloader category="tamagotchi" priority="high" delay={300} />
      
      {/* Индикатор фонового обновления */}
      {backgroundLoading && (
        <div className="absolute top-2 right-2 z-30 bg-blue-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Обновление...</span>
        </div>
      )}

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
          {coinCounts.feedingCoins > 0 && (
            <div className="flex items-center gap-1 bg-pink-100 px-1.5 py-0.5 rounded-3xl">
              <img src="/icons/feeding.png" alt="Кормление" className="w-3 h-3" />
              <span className="text-xs font-bold text-pink-800">{coinCounts.feedingCoins}</span>
            </div>
          )}
          
          {/* Стопка подгузников */}
          {coinCounts.diaperCoins > 0 && (
            <div className="flex items-center gap-1 bg-yellow-100 px-1.5 py-0.5 rounded-3xl">
              <img src="/icons/poor.png" alt="Подгузник" className="w-3 h-3" />
              <span className="text-xs font-bold text-yellow-800">{coinCounts.diaperCoins}</span>
            </div>
          )}
          
          {/* Стопка купания */}
          {coinCounts.bathCoins > 0 && (
            <div className="flex items-center gap-1 bg-purple-100 px-1.5 py-0.5 rounded-3xl">
              <img src="/icons/sponge.png" alt="Купание" className="w-3 h-3" />
              <span className="text-xs font-bold text-purple-800">{coinCounts.bathCoins}</span>
            </div>
          )}
          
          {/* Стопка активности */}
          {coinCounts.activityCoins > 0 && (
            <div className="flex items-center gap-1 bg-indigo-100 px-1.5 py-0.5 rounded-3xl">
              <img src="/icons/baby.png" alt="Активность" className="w-3 h-3" />
              <span className="text-xs font-bold text-indigo-800">{coinCounts.activityCoins}</span>
            </div>
          )}
          
          {/* Стопка обычных монеток */}
          {coinCounts.momCoins > 0 && (
            <div className="flex items-center gap-1 bg-green-100 px-1.5 py-0.5 rounded-3xl">
              <img src="/icons/mom.png" alt="Монетка" className="w-3 h-3" />
              <span className="text-xs font-bold text-green-800">{coinCounts.momCoins}</span>
            </div>
          )}
          
          {/* Стопка монеток сна */}
          {coinCounts.sleepCoins > 0 && (
            <div className="flex items-center gap-1 bg-indigo-100 px-1.5 py-0.5 rounded-3xl">
              <img src="/icons/sleep.png" alt="Сон" className="w-3 h-3" />
              <span className="text-xs font-bold text-indigo-800">{coinCounts.sleepCoins}</span>
            </div>
          )}
          
          {/* Общий счетчик очков */}
          <div className={`inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-3xl transition-all duration-300 ${
            scoreAnimation ? 'score-animation bg-gray-200 shadow-lg' : 'scale-100'
          }`}>
            <span className="text-xs font-bold text-gray-800">⭐</span>
            <span className={`text-xs font-bold text-gray-800 transition-all duration-300 ${
              scoreAnimation ? 'text-gray-900' : ''
            }`}>{coinCounts.score}</span>
          </div>
        </div>
      </div>

      {/* GIF/Video малыша - адаптивное */}
      <div className="tamagotchi-video-container">
        <p className="text-xs font-medium text-gray-700 mt-2 mb-2">
          {getStateDescription(babyState)}
        </p>
        
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

          {/* Кнопка рюкзака - в нижнем правом углу относительно контейнера с изображением */}
          <div className="absolute bottom-4 right-4 z-50">
            <button
              type="button"
              onClick={toggleBackpack}
              className="relative p-1 bg-transparent hover:bg-white/20 rounded-3xl transition-colors"
              aria-label={backpackOpen ? 'Закрыть рюкзак' : 'Открыть рюкзак'}
            >
              <img 
                src="/icons/bag.png" 
                alt="Рюкзак" 
                className="w-20 h-20 object-contain"
              />
              {shoppingList.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] rounded-full bg-red-100 text-red-600 font-semibold">
                  {shoppingList.length}
                </span>
              )}
            </button>

            {/* Модальное окно рюкзака - будет рендериться через портал */}
          </div>

        </div>
      </div>


      {/* Лоток с предметами - в стиле liquid glass */}
      <div className="tamagotchi-inventory-liquid">
        <div className="tamagotchi-inventory-container">
          {/* Подгузник */}
          <div 
            onClick={(e) => {
              e.currentTarget.classList.add('clicked');
              setTimeout(() => e.currentTarget.classList.remove('clicked'), 600);
              handleItemClick('diaper');
            }}
            className={`tamagotchi-inventory-item ${lowOnDiapers ? 'low-stock' : ''}`}
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
            onClick={(e) => {
              e.currentTarget.classList.add('clicked');
              setTimeout(() => e.currentTarget.classList.remove('clicked'), 600);
              handleItemClick('feeding');
            }}
            className={`tamagotchi-inventory-item ${lowOnFormula ? 'low-stock' : ''}`}
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
            onClick={(e) => {
              e.currentTarget.classList.add('clicked');
              setTimeout(() => e.currentTarget.classList.remove('clicked'), 600);
              handleItemClick('bath');
            }}
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
            onClick={(e) => {
              e.currentTarget.classList.add('clicked');
              setTimeout(() => e.currentTarget.classList.remove('clicked'), 600);
              handleItemClick('activity');
            }}
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

      {/* Модальное окно рюкзака через портал */}
      {backpackOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center px-3 py-6 sm:px-4 sm:py-10 sm:pb-16">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setBackpackOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Рюкзак семьи"
            className="relative z-[100000] w-full max-w-[360px] pointer-events-auto sm:max-w-md"
          >
            <div className="relative flex h-[70vh] max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl sm:h-[70vh] sm:max-h-[70vh] animate-bounce-in">
              <button
                type="button"
                onClick={() => setBackpackOpen(false)}
                className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                aria-label="Закрыть рюкзак"
              >
                ×
              </button>

              <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 px-3 pt-3 pb-1.5 sm:px-4 sm:pt-4 sm:pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-inner">
                    <img
                      src="/icons/bag.png"
                      alt="Рюкзак"
                      className="h-6 w-6 object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-900">Рюкзак семьи</h3>
                    <p className="text-[10px] leading-snug text-slate-600">{backpackIntroMessage}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2.5 px-3 pb-2 pt-2.5 overflow-y-auto sm:gap-3 sm:px-4 sm:pb-3 sm:pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-xl border p-2.5 ${lowOnDiapers ? "border-amber-200 bg-amber-50/70" : "border-emerald-100 bg-emerald-50/60"}`}>
                    <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Подгузники</div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-lg font-bold text-slate-900">{inventoryTotals.diapers}</span>
                      <span className="text-[10px] font-semibold text-slate-500">шт.</span>
                    </div>
                  </div>

                  <div className={`rounded-xl border p-2.5 ${lowOnFormula ? "border-amber-200 bg-amber-50/70" : "border-indigo-100 bg-indigo-50/60"}`}>
                    <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Смесь</div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-lg font-bold text-slate-900">{displayPortionsText}</span>
                      <span className="text-[10px] font-semibold text-slate-500">порций</span>
                    </div>
                    <p className="mt-1 text-[9px] text-slate-400">
                      ~{inventoryTotals.grams} г / {portionSizeOunces} оз на порцию
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr,0.8fr] sm:items-center sm:gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">Размер порции</span>
                      <span className="text-[10px] text-slate-400">унц.</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseFloat(portionSizeOuncesInput) || 1
                          const newValue = Math.max(0.5, current - 0.5)
                          setPortionSizeOuncesInput(newValue.toString())
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
                        aria-label="Уменьшить размер порции"
                      >
                        -
                      </button>
                      <span className="text-lg font-semibold text-slate-900">
                        {portionSizeOuncesInput}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseFloat(portionSizeOuncesInput) || 1
                          const newValue = Math.min(20, current + 0.5)
                          setPortionSizeOuncesInput(newValue.toString())
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
                        aria-label="Увеличить размер порции"
                      >
                        +
                      </button>
                    </div>
                    <p className="mt-1.5 text-center text-[9px] text-slate-400">
                      Выбранное значение указано в унциях.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyPortionSize}
                    className="h-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow transition-colors hover:bg-slate-700"
                  >
                    Сохранить
                  </button>
                  {portionSizeStatus && (
                    <p className={`col-span-full text-center text-[10px] ${portionSizeStatusClass}`}>
                      {portionSizeStatus}
                    </p>
                  )}
                </div>

                 <form className="grid grid-cols-1 gap-2 rounded-xl sm:grid-cols-2 sm:gap-3" onSubmit={handleRestockSubmit}>
                  <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      <span>Подгузники</span>
                      <span className="text-[9px] text-slate-400">шт.</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseInt(restockDiapersInput) || 0
                          const newValue = Math.max(0, current - 25)
                          setRestockDiapersInput(newValue.toString())
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
                        aria-label="Уменьшить количество подгузников"
                      >
                        -
                      </button>
                      <span className="text-lg font-semibold text-slate-900">
                        {restockDiapersInput || "0"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseInt(restockDiapersInput) || 0
                          const newValue = Math.min(500, current + 25)
                          setRestockDiapersInput(newValue.toString())
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
                        aria-label="Увеличить количество подгузников"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      <span>Смесь</span>
                      <span className="text-[9px] text-slate-400">г</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseInt(restockGramsInput) || 0
                          const newValue = Math.max(0, current - 100)
                          setRestockGramsInput(newValue.toString())
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
                        aria-label="Уменьшить количество смеси"
                      >
                        -
                      </button>
                      <span className="text-lg font-semibold text-slate-900">
                        {restockGramsInput || "0"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseInt(restockGramsInput) || 0
                          const newValue = Math.min(4000, current + 100)
                          setRestockGramsInput(newValue.toString())
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
                        aria-label="Увеличить количество смеси"
                      >
                        +
                      </button>
                    </div>
                    {restockPortionsPreviewText && (
                      <span className="mt-1.5 block text-[9px] font-medium text-slate-500">
                        ≈ {restockPortionsPreviewText} порций ({portionSizeOunces} оз.)
                      </span>
                    )}
                  </div>

                  <div className="col-span-full flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                     <button
                       type="submit"
                       disabled={restockLoading}
                       className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white shadow transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
                     >
                       {restockLoading ? "Обработка..." : "Добавить в запасы"}
                     </button>

                    {restockFeedback && (
                      <div className={`text-center text-[10px] font-medium ${restockFeedbackClass}`} aria-live="polite">
                        {restockFeedback}
                      </div>
                    )}
                  </div>
                </form>

                <button
                  type="button"
                  onClick={() => setBackpackOpen(false)}
                  className="w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                >
                  Закрыть
                </button>

              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}
