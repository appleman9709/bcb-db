import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { dataService, Feeding, Diaper, Bath, ParentCoins } from '../services/dataService'
import QuickActionModal from '../components/QuickActionModal'

type BabyState = 'ok' | 'feeding' | 'all-in' | 'poo' | 'dirty'
type QuickActionType = 'feeding' | 'diaper' | 'bath'

interface TamagotchiData {
  lastFeeding: Feeding | null
  lastDiaper: Diaper | null
  lastBath: Bath | null
  parentCoins: ParentCoins | null
}

interface SettingsState {
  feedingInterval: number
  diaperInterval: number
  bathInterval: number
}

export default function TamagotchiPage() {
  console.log('TamagotchiPage rendered') // Отладочная информация
  
  const [data, setData] = useState<TamagotchiData | null>(null)
  const [settings, setSettings] = useState<SettingsState>({
    feedingInterval: 3,
    diaperInterval: 2,
    bathInterval: 1
  })
  const [loading, setLoading] = useState(true)
  const [babyState, setBabyState] = useState<BabyState>('ok')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<QuickActionType>('feeding')
  const [score, setScore] = useState(0)
  const [scoreAnimation, setScoreAnimation] = useState(false)
  const [coins, setCoins] = useState<Array<{id: number, x: number, y: number, collected: boolean, falling: boolean, icon: string, type: 'feeding_coins' | 'diaper_coins' | 'bath_coins' | 'mom_coins'}>>([])
  const [isVideoMuted, setIsVideoMuted] = useState(true) // Состояние для управления звуком видео
  const [coinSpawnInterval, setCoinSpawnInterval] = useState<NodeJS.Timeout | null>(null)
  
  // Отдельные счетчики для каждого типа монеток
  const [feedingCoins, setFeedingCoins] = useState(0)
  const [diaperCoins, setDiaperCoins] = useState(0)
  const [bathCoins, setBathCoins] = useState(0)
  const [momCoins, setMomCoins] = useState(0)

  const { member, family } = useAuth()

  const fetchData = useCallback(async () => {
    if (!member || !family) {
      return
    }

    try {
      setLoading(true)
      const [lastFeeding, lastDiaper, lastBath, settingsFromDb, parentCoins] = await Promise.all([
        dataService.getLastFeeding(),
        dataService.getLastDiaper(),
        dataService.getLastBath(),
        dataService.getSettings(),
        dataService.getParentCoins()
      ])

      setData({
        lastFeeding,
        lastDiaper,
        lastBath,
        parentCoins
      })

      if (settingsFromDb) {
        setSettings(prev => ({
          ...prev,
          feedingInterval: settingsFromDb.feed_interval ?? prev.feedingInterval,
          diaperInterval: settingsFromDb.diaper_interval ?? prev.diaperInterval,
          bathInterval: settingsFromDb.bath_reminder_period ?? prev.bathInterval
        }))
      }
    } catch (error) {
      console.error('Error fetching tamagotchi data:', error)
    } finally {
      setLoading(false)
    }
  }, [member, family])

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
  }, [babyState]) // Перезапускаем при изменении состояния малыша

  // Синхронизируем локальное состояние монеток с данными из БД
  useEffect(() => {
    if (data?.parentCoins) {
      setFeedingCoins(data.parentCoins.feeding_coins)
      setDiaperCoins(data.parentCoins.diaper_coins)
      setBathCoins(data.parentCoins.bath_coins)
      setMomCoins(data.parentCoins.mom_coins)
      setScore(data.parentCoins.total_score)
    }
  }, [data?.parentCoins])

  const getVideoSource = (state: BabyState): string => {
    switch (state) {
      case 'ok':
        return '/icons/ok.MP4'
      case 'feeding':
        return '/icons/feeding.MP4'
      case 'all-in':
        return '/icons/all-in.MP4'
      case 'poo':
        return '/icons/poo.MP4'
      case 'dirty':
        return '/icons/dirty.MP4'
      default:
        return '/icons/ok.MP4'
    }
  }

  const getStateDescription = (state: BabyState): string => {
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
  const getCoinIcon = (state: BabyState): string => {
    switch (state) {
      case 'feeding':
        return '/icons/feeding.png'
      case 'poo':
        return '/icons/poor.png'
      case 'dirty':
        return '/icons/sponge.png'
      case 'all-in':
        return '/icons/mom.png' // Для состояния "все сразу" используем стандартную иконку
      case 'ok':
      default:
        return '/icons/mom.png'
    }
  }

  // Функция для получения типа монетки в зависимости от состояния
  const getCoinType = (state: BabyState): 'feeding_coins' | 'diaper_coins' | 'bath_coins' | 'mom_coins' => {
    switch (state) {
      case 'feeding':
        return 'feeding_coins'
      case 'poo':
        return 'diaper_coins'
      case 'dirty':
        return 'bath_coins'
      case 'all-in':
      case 'ok':
      default:
        return 'mom_coins'
    }
  }

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
      const coinType = getCoinType(babyState)
      const coinIcon = getCoinIcon(babyState)
      
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
        setMomCoins(updatedCoins.mom_coins)
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
        case 'mom_coins':
          setMomCoins(prev => prev + 1)
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

  const handleVideoClick = (event: React.MouseEvent<HTMLVideoElement>) => {
    // Включаем звук при первом нажатии только если малыш не в состоянии "ok"
    if (isVideoMuted && babyState !== 'ok') {
      setIsVideoMuted(false)
    }
    
    // Теперь клик по видео только включает звук, монеты появляются автоматически
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
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
            <div className="flex items-center gap-1 bg-pink-100 px-1.5 py-0.5 rounded-full">
              <img src="/icons/feeding.png" alt="Кормление" className="w-3 h-3" />
              <span className="text-xs font-bold text-pink-800">{feedingCoins}</span>
            </div>
          )}
          
          {/* Стопка подгузников */}
          {diaperCoins > 0 && (
            <div className="flex items-center gap-1 bg-yellow-100 px-1.5 py-0.5 rounded-full">
              <img src="/icons/poor.png" alt="Подгузник" className="w-3 h-3" />
              <span className="text-xs font-bold text-yellow-800">{diaperCoins}</span>
            </div>
          )}
          
          {/* Стопка купания */}
          {bathCoins > 0 && (
            <div className="flex items-center gap-1 bg-purple-100 px-1.5 py-0.5 rounded-full">
              <img src="/icons/sponge.png" alt="Купание" className="w-3 h-3" />
              <span className="text-xs font-bold text-purple-800">{bathCoins}</span>
            </div>
          )}
          
          {/* Стопка обычных монеток */}
          {momCoins > 0 && (
            <div className="flex items-center gap-1 bg-green-100 px-1.5 py-0.5 rounded-full">
              <img src="/icons/mom.png" alt="Монетка" className="w-3 h-3" />
              <span className="text-xs font-bold text-green-800">{momCoins}</span>
            </div>
          )}
          
          {/* Общий счетчик очков */}
          <div className={`inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full transition-all duration-300 ${
            scoreAnimation ? 'score-animation bg-gray-200 shadow-lg' : 'scale-100'
          }`}>
            <span className="text-xs font-bold text-gray-800">⭐</span>
            <span className={`text-xs font-bold text-gray-800 transition-all duration-300 ${
              scoreAnimation ? 'text-gray-900' : ''
            }`}>{score}</span>
          </div>
        </div>
      </div>

      {/* Видео малыша - адаптивное */}
      <div className="tamagotchi-video-container">
        <div className="relative inline-block">
          <video
            key={babyState} // Принудительно перезагружаем видео при смене состояния
            autoPlay
            loop
            muted={isVideoMuted}
            playsInline
            onClick={handleVideoClick}
            className="tamagotchi-video w-[75vw] max-w-[400px] object-cover rounded-lg cursor-pointer"
          >
            <source src={getVideoSource(babyState)} type="video/mp4" />
            Ваш браузер не поддерживает видео.
          </video>
          
          {/* Индикатор состояния */}
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg">
            {babyState === 'ok' && <span className="bg-green-500 w-full h-full rounded-full flex items-center justify-center">😊</span>}
            {babyState === 'feeding' && (
              <div className="bg-blue-500 w-full h-full rounded-full flex items-center justify-center">
                <img src="/icons/feeding.png" alt="Кормление" className="w-5 h-5 object-contain" />
              </div>
            )}
            {babyState === 'all-in' && <span className="bg-red-500 w-full h-full rounded-full flex items-center justify-center">😰</span>}
            {babyState === 'poo' && (
              <div className="bg-yellow-500 w-full h-full rounded-full flex items-center justify-center">
                <img src="/icons/poor.png" alt="Подгузник" className="w-5 h-5 object-contain" />
              </div>
            )}
            {babyState === 'dirty' && (
              <div className="bg-purple-500 w-full h-full rounded-full flex items-center justify-center">
                <img src="/icons/sponge.png" alt="Купание" className="w-5 h-5 object-contain" />
              </div>
            )}
          </div>
        </div>
        
        <p className="text-xs font-medium text-gray-700 mt-2">
          {getStateDescription(babyState)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          💡 Тапайте по появляющимся монеткам, чтобы собирать их!
        </p>
      </div>

      {/* Лоток с предметами - компактный */}
      <div className="tamagotchi-inventory bg-white rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xs font-semibold text-gray-900 mb-2 text-center">🛠️ Инвентарь</h2>
        
        <div className="grid grid-cols-3 gap-3">
          {/* Подгузник */}
          <div 
            onClick={() => handleItemClick('diaper')}
            className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <img 
              src="/icons/diaper.png" 
              alt="Подгузник" 
              className="w-12 h-12 object-contain"
            />
          </div>

          {/* Бутылочка */}
          <div 
            onClick={() => handleItemClick('feeding')}
            className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <img 
              src="/icons/feeding.png" 
              alt="Бутылочка" 
              className="w-12 h-12 object-contain"
            />
          </div>

          {/* Губка */}
          <div 
            onClick={() => handleItemClick('bath')}
            className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <img 
              src="/icons/sponge.png" 
              alt="Губка" 
              className="w-12 h-12 object-contain"
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
