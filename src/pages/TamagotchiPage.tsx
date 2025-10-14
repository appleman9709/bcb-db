import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { dataService, Feeding, Diaper, Bath, ParentCoins, SleepSession } from '../services/dataService'
import QuickActionModal from '../components/QuickActionModal'

type BabyState = 'ok' | 'feeding' | 'all-in' | 'poo' | 'dirty'
type QuickActionType = 'feeding' | 'diaper' | 'bath' | 'activity'

interface TamagotchiData {
  lastFeeding: Feeding | null
  lastDiaper: Diaper | null
  lastBath: Bath | null
  parentCoins: ParentCoins | null
  currentSleepSession: SleepSession | null
  familySleepStatus: { isSleeping: boolean; sleepSession: SleepSession | null }
}

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

  const { member, family } = useAuth()

  const fetchData = useCallback(async () => {
    if (!member || !family) {
      return
    }

    try {
      setLoading(true)
      
      // Сохраняем предыдущее состояние сна
      const wasSleeping = isSleepMode
      
      const [lastFeeding, lastDiaper, lastBath, settingsFromDb, parentCoins, currentSleepSession, familySleepStatus] = await Promise.all([
        dataService.getLastFeeding(),
        dataService.getLastDiaper(),
        dataService.getLastBath(),
        dataService.getSettings(),
        dataService.getParentCoins(),
        dataService.getCurrentSleepSession(),
        dataService.getFamilySleepStatus()
      ])

      setData({
        lastFeeding,
        lastDiaper,
        lastBath,
        parentCoins,
        currentSleepSession,
        familySleepStatus
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

  // Автоматическое появление монет каждые 3-7 секунд
  useEffect(() => {
    const startCoinSpawning = () => {
      const spawnInterval = () => {
        const delay = Math.random() * 4000 + 3000 // 3-7 секунд
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
    // Если включен режим сна, показываем видео сна
    if (isSleepMode) {
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
      
      // Обновляем данные
      await fetchData()
    } catch (error) {
      console.error('Error toggling sleep mode:', error)
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

  const handleModalSuccess = () => {
    fetchData() // Обновляем данные после успешного действия
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
  const getCoinIcon = useCallback((state: BabyState): string => {
    // Если включен режим сна, всегда показываем иконку сна
    if (isSleepMode) {
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
  }, [isSleepMode])

  // Функция для получения типа монетки в зависимости от состояния
  const getCoinType = useCallback((state: BabyState): 'feeding_coins' | 'diaper_coins' | 'bath_coins' | 'activity_coins' | 'mom_coins' | 'sleep_coins' => {
    // Если включен режим сна, всегда показываем монетки сна
    if (isSleepMode) {
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
  }, [isSleepMode])

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
      
      // Определяем тип и иконку монетки
      console.log('🌙 spawnCoin called with:', { babyState, isSleepMode })
      const coinType = getCoinType(babyState)
      const coinIcon = getCoinIcon(babyState)
      
      // Отладочная информация
      console.log('🌙 Final coin data:', { coinType, coinIcon, isSleepMode })
      console.log('🌙 Expected: sleep_coins + sleep.png when sleep mode is ON')
      
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
          {isSleepMode ? (
            <video
              key="sleep-video"
              src={getGifSource(babyState)}
              className="tamagotchi-video w-[75vw] max-w-[400px] object-cover rounded-3xl cursor-pointer"
              autoPlay
              muted
              playsInline
            />
          ) : (
            <img
              key={babyState} // Принудительно перезагружаем GIF при смене состояния
              src={getGifSource(babyState)}
              alt={`Малыш в состоянии ${babyState}`}
              className="tamagotchi-video w-[75vw] max-w-[400px] object-cover rounded-3xl cursor-pointer"
            />
          )}
          

          {/* Тумблер режима сна - увеличенный */}
          <div className="absolute -top-3 left-2">
            <button
              onClick={toggleSleepMode}
              className={`sleep-toggle ${isSleepMode ? 'active' : 'inactive'}`}
              aria-label={isSleepMode ? 'Выключить режим сна' : 'Включить режим сна'}
            >
              <div className="sleep-toggle-thumb">
                {isSleepMode ? (
                  <span className="text-lg">😴</span>
                ) : (
                  <span className="text-lg">👁️</span>
                )}
              </div>
            </button>
          </div>

        </div>
        
        <p className="text-xs font-medium text-gray-700 mt-2">
          {getStateDescription(babyState)}
        </p>
      </div>

      {/* Лоток с предметами - компактный */}
      <div className="tamagotchi-inventory bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-xs font-semibold text-gray-900 mb-2 text-center">🛠️ Инвентарь</h2>
        
        <div className="grid grid-cols-4 gap-2">
          {/* Подгузник */}
          <div 
            onClick={() => handleItemClick('diaper')}
            className="flex flex-col items-center p-2 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <img 
              src="/icons/diaper.png" 
              alt="Подгузник" 
              className="w-10 h-10 object-contain"
            />
          </div>

          {/* Бутылочка */}
          <div 
            onClick={() => handleItemClick('feeding')}
            className="flex flex-col items-center p-2 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <img 
              src="/icons/feeding.png" 
              alt="Бутылочка" 
              className="w-10 h-10 object-contain"
            />
          </div>

          {/* Губка */}
          <div 
            onClick={() => handleItemClick('bath')}
            className="flex flex-col items-center p-2 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <img 
              src="/icons/sponge.png" 
              alt="Губка" 
              className="w-10 h-10 object-contain"
            />
          </div>

          {/* Активность */}
          <div 
            onClick={() => handleItemClick('activity')}
            className="flex flex-col items-center p-2 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <img 
              src="/icons/activity.png" 
              alt="Активность" 
              className="w-10 h-10 object-contain"
            />
          </div>
        </div>
      </div>

      {/* Модальное окно для действий */}
      <QuickActionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        actionType={modalAction}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
