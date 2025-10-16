import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import { dataService } from '../services/dataService'
import { CompactButton, CompactField, QuickOptionButton, CompactSlider } from './ModalUtils'

type QuickActionType = 'feeding' | 'diaper' | 'bath' | 'activity'

interface QuickActionModalProps {
  isOpen: boolean
  onClose: () => void
  actionType: QuickActionType
  onSuccess?: (result?: {}) => void
}

const QUICK_OFFSETS = [
  { label: 'Сейчас', minutes: 0 },
  { label: '-15 мин', minutes: -15 },
  { label: '-30 мин', minutes: -30 },
  { label: '-1 час', minutes: -60 }
]

const actionConfig: Record<QuickActionType, {
  title: string
  icon: string
  description: string
  buttonText: string
  buttonVariant: 'primary' | 'success' | 'warning'
  accent: string
}> = {
  feeding: {
    title: 'Кормление',
    icon: '/icons/feeding.png',
    description: 'Запишите кормление, чтобы контролировать режим и заранее планировать следующее.',
    buttonText: 'Добавить кормление',
    buttonVariant: 'primary',
    accent: 'from-blue-500 to-purple-500'
  },
  diaper: {
    title: 'Смена подгузника',
    icon: '/icons/poor.png',
    description: 'Отметьте смену подгузника, чтобы вовремя следить за гигиеной малыша.',
    buttonText: 'Добавить смену',
    buttonVariant: 'success',
    accent: 'from-green-500 to-emerald-500'
  },
  bath: {
    title: 'Купание',
    icon: '/icons/bath.png',
    description: 'Запишите купание, чтобы поддерживать чистоту и настроение малыша.',
    buttonText: 'Добавить купание',
    buttonVariant: 'warning',
    accent: 'from-yellow-500 to-orange-500'
  },
  activity: {
    title: 'Активность',
    icon: '/icons/baby.png',
    description: 'Зафиксируйте активность малыша: игры, прогулки, массаж и другие занятия.',
    buttonText: 'Добавить активность',
    buttonVariant: 'primary',
    accent: 'from-purple-500 to-pink-500'
  }
}

const getLocalDateTimeString = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

const splitLocalDateTime = (value: string) => {
  const [date = '', time = ''] = value.split('T')
  return {
    date,
    time: time.slice(0, 5)
  }
}

const buildLocalState = (date: Date) => {
  const value = getLocalDateTimeString(date)
  const { date: localDate, time } = splitLocalDateTime(value)
  return { value, date: localDate, time }
}

const combineLocalDateTime = (date: string, time: string) => `${date}T${time}`

const activityTypes = [
  {
    id: 'Прогулка',
    label: 'Прогулка',
    icon: '/icons/walking.png',
    description: 'Прогулка на свежем воздухе',
    color: 'from-green-400 to-emerald-500'
  },
  {
    id: 'Выкладывание на живот',
    label: 'Выкладывание на живот',
    icon: '/icons/belly.png',
    description: 'Развитие мышц спины и шеи',
    color: 'from-blue-400 to-cyan-500'
  },
  {
    id: 'Массаж',
    label: 'Массаж',
    icon: '/icons/massage.png',
    description: 'Расслабляющий массаж для малыша',
    color: 'from-purple-400 to-pink-500'
  },
  {
    id: 'Танцы на руках',
    label: 'Танцы на руках',
    icon: '/icons/dance.png',
    description: 'Веселые танцы вместе с малышом',
    color: 'from-orange-400 to-red-500'
  }
]

export default function QuickActionModal({ isOpen, onClose, actionType, onSuccess }: QuickActionModalProps) {
  const initialStateRef = useRef(buildLocalState(new Date()))
  const [selectedDateTime, setSelectedDateTime] = useState(initialStateRef.current.value)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<string>('Прогулка')

  // Внутренние состояния для дополнительных полей (при смене типа действия)
  const [diaperType, setDiaperType] = useState<string>('Просто')
  const [bathMood, setBathMood] = useState<string>('Спокойное купание')
  const [feedingOunces, setFeedingOunces] = useState<number>(() => {
    // Загружаем сохраненное значение из localStorage
    const saved = localStorage.getItem('lastFeedingOunces')
    return saved ? parseFloat(saved) : 0
  })

  useEffect(() => {
    if (isOpen) {
      const next = buildLocalState(new Date())
      initialStateRef.current = next
      setSelectedDateTime(next.value)
      setError(null)
      if (actionType === 'activity') {
        setSelectedActivity('Прогулка')
      }
      // Сброс дополнительных опций (кроме унций)
      setDiaperType('Просто')
      setBathMood('Спокойное')
      // feedingOunces не сбрасываем - сохраняем предыдущее значение
    }
  }, [isOpen, actionType])

  const { date: datePart, time: timePart } = useMemo(() => {
    if (!selectedDateTime) {
      return { date: initialStateRef.current.date, time: initialStateRef.current.time }
    }

    return splitLocalDateTime(selectedDateTime)
  }, [selectedDateTime])

  const updateDateTime = (nextDate: string, nextTime: string) => {
    if (!nextDate) {
      setSelectedDateTime('')
      return
    }

    const sanitizedTime = (nextTime || '00:00').slice(0, 5)
    setSelectedDateTime(combineLocalDateTime(nextDate, sanitizedTime))
    setError(null)
  }

  const handleDateChange = (value: string) => {
    updateDateTime(value, timePart)
  }

  const handleTimeChange = (value: string) => {
    updateDateTime(datePart || initialStateRef.current.date, value)
  }

  const applyQuickOffset = (minutes: number) => {
    const target = new Date()
    target.setMinutes(target.getMinutes() + minutes)
    const next = buildLocalState(target)
    setSelectedDateTime(next.value)
    setError(null)
  }

  const isQuickOptionActive = (minutes: number) => {
    if (!selectedDateTime) {
      return minutes === 0
    }

    const now = buildLocalState(new Date())
    const diff = Math.abs(new Date(selectedDateTime).getTime() - new Date(now.value).getTime())
    return diff === Math.abs(minutes * 60000)
  }

  const handleFeedingOuncesChange = (value: number) => {
    setFeedingOunces(value)
    // Сохраняем значение в localStorage
    localStorage.setItem('lastFeedingOunces', value.toString())
  }

  const config = actionConfig[actionType]

  const formattedPreview = useMemo(() => {
    if (!selectedDateTime) {
      return 'Выберите дату и время'
    }

    const eventDate = new Date(selectedDateTime)
    if (Number.isNaN(eventDate.getTime())) {
      return 'Неверная дата'
    }

    return eventDate.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [selectedDateTime])

  const handleSubmit = async () => {
    if (!selectedDateTime) {
      setError('Выберите дату и время обязательно')
      return
    }

    const eventDate = new Date(selectedDateTime)
    if (Number.isNaN(eventDate.getTime())) {
      setError('Не удалось распознать выбранную дату')
      return
    }

    setLoading(true)
    setError(null)

    const timestamp = eventDate.toISOString()

    try {
      let result: any = null
      
      switch (actionType) {
        case 'feeding':
          // Всегда передаем значение унций, даже если оно 0
          // dataService.addFeeding теперь обрабатывает случай, когда унции не указаны
          result = await dataService.addFeeding(timestamp, feedingOunces)
          break
        case 'diaper':
          result = await dataService.addDiaper(timestamp, diaperType)
          break
        case 'bath':
          result = await dataService.addBath(timestamp, bathMood)
          break
        case 'activity':
          result = await dataService.addActivity(selectedActivity, timestamp)
          break
        default:
          break
      }

      // Добавляем вибрацию при успешном выполнении действия
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]) // Паттерн вибрации: 100мс, пауза 50мс, 100мс
      }

      // Сохраняем последнее значение унций для кормления
      if (actionType === 'feeding' && feedingOunces > 0) {
        localStorage.setItem('lastFeedingOunces', feedingOunces.toString())
      }

      onSuccess?.({})
      onClose()
    } catch (submitError) {
      console.error('Error adding record:', submitError)
      setError('Не удалось сохранить запись, попробуйте еще раз позже')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className={`quick-action-modal space-y-4 ${actionType === 'activity' ? 'sm:space-y-4' : 'sm:space-y-6'}`}>
        {/* Изображение только для кормления, подгузника и купания */}
        {actionType !== 'activity' && (
          <img 
            src={
              actionType === 'diaper' ? '/icons/poo.png' : 
              actionType === 'bath' ? '/icons/alarm.png' : 
              '/icons/eat.png'
            } 
            alt={config.title} 
            className="w-32 h-32 object-contain mx-auto" 
          />
        )}

        <div className="space-y-3 sm:space-y-4">
          {/* Выбор типа активности - только для активности */}
          {actionType === 'activity' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {activityTypes.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => setSelectedActivity(activity.id)}
                    className={`relative p-3 rounded-3xl border-2 transition-all duration-200 flex flex-col items-center space-y-1 ${
                      selectedActivity === activity.id
                        ? `border-blue-500 bg-gradient-to-br ${activity.color} text-white shadow-lg`
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <img 
                      src={activity.icon} 
                      alt={activity.label} 
                      className="w-8 h-8 object-contain"
                    />
                    <span className="text-xs font-medium text-center leading-tight">
                      {activity.label}
                    </span>
                    {selectedActivity === activity.id && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 text-center">
                {activityTypes.find(a => a.id === selectedActivity)?.description}
              </p>
            </div>
          )}

          {/* Опции для смены подгузника */}
          {actionType === 'diaper' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Тип смены подгузника</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDiaperType('Просто')}
                  className={`p-3 rounded-3xl border-2 transition-all duration-200 flex flex-col items-center space-y-1 ${
                    diaperType === 'Просто'
                      ? 'border-green-500 bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <img 
                    src="/icons/common.png" 
                    alt="Просто" 
                    className="w-8 h-8 object-contain"
                  />
                  <span className="text-xs font-medium">Просто</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDiaperType('Покакал')}
                  className={`p-3 rounded-3xl border-2 transition-all duration-200 flex flex-col items-center space-y-1 ${
                    diaperType === 'Покакал'
                      ? 'border-orange-500 bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-lg'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <img 
                    src="/icons/poor.png" 
                    alt="Покакал" 
                    className="w-8 h-8 object-contain"
                  />
                  <span className="text-xs font-medium">Покакал</span>
                </button>
              </div>
            </div>
          )}

          {/* Опции для купания */}
          {actionType === 'bath' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Настроение во время купания</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBathMood('Спокойное')}
                  className={`p-3 rounded-3xl border-2 transition-all duration-200 flex flex-col items-center space-y-1 ${
                    bathMood === 'Спокойное'
                      ? 'border-blue-500 bg-gradient-to-br from-blue-400 to-cyan-500 text-white shadow-lg'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <img 
                    src="/icons/still.png" 
                    alt="Спокойное" 
                    className="w-8 h-8 object-contain"
                  />
                  <span className="text-xs font-medium text-center">Спокойное</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBathMood('Беспокоился')}
                  className={`p-3 rounded-3xl border-2 transition-all duration-200 flex flex-col items-center space-y-1 ${
                    bathMood === 'Беспокоился'
                      ? 'border-orange-500 bg-gradient-to-br from-orange-400 to-yellow-500 text-white shadow-lg'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <img 
                    src="/icons/angry.png" 
                    alt="Беспокоился" 
                    className="w-8 h-8 object-contain"
                  />
                  <span className="text-xs font-medium">Беспокоился</span>
                </button>
              </div>
            </div>
          )}

          {/* Ползунок для кормления */}
          {actionType === 'feeding' && (
            <div className="space-y-2">
              <span className="text-lg font-semibold text-blue-600 text-center block">
                {feedingOunces > 0 ? `${feedingOunces} унций` : 'Не указано'}
              </span>
              <div className="slider-wrapper">
                <div className="slider-track-container">
                  <div className="slider-track">
                    <div 
                      className="slider-progress feeding-progress"
                      style={{ width: `${(feedingOunces / 8) * 100}%` }}
                    ></div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="0.5"
                    value={feedingOunces}
                    onChange={(e) => handleFeedingOuncesChange(parseFloat(e.target.value))}
                    className="modern-slider feeding-slider"
                  />
                </div>
                
                <div className="slider-labels">
                  <button className="slider-label" onClick={() => handleFeedingOuncesChange(0)}>
                    <span className="label-value">0</span>
                    <span className="label-text">унц</span>
                  </button>
                  <button className="slider-label" onClick={() => handleFeedingOuncesChange(2)}>
                    <span className="label-value">2</span>
                    <span className="label-text">унц</span>
                  </button>
                  <button className="slider-label" onClick={() => handleFeedingOuncesChange(4)}>
                    <span className="label-value">4</span>
                    <span className="label-text">унц</span>
                  </button>
                  <button className="slider-label" onClick={() => handleFeedingOuncesChange(6)}>
                    <span className="label-value">6</span>
                    <span className="label-text">унц</span>
                  </button>
                  <button className="slider-label" onClick={() => handleFeedingOuncesChange(8)}>
                    <span className="label-value">8</span>
                    <span className="label-text">унц</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Поля даты и времени - адаптивный макет */}
          <div className="space-y-3">
            {/* Поле даты - максимально компактное */}
            <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1 shadow-sm hover:border-gray-300 hover:bg-gray-100 transition-all duration-200 cursor-pointer flex items-center gap-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-gray-500 whitespace-nowrap">Дата</label>
              <input
                type="date"
                value={datePart}
                onChange={(event) => handleDateChange(event.target.value)}
                className="flex-1 bg-transparent text-[9px] font-medium text-gray-700 focus:outline-none focus:ring-0 cursor-pointer"
                style={{
                  colorScheme: 'light',
                  WebkitAppearance: 'none',
                  MozAppearance: 'textfield'
                }}
              />
              <svg className="w-2 h-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            
            {/* Поле времени - компактное */}
            <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-2 shadow-sm hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer">
              <label className="text-[9px] font-medium uppercase tracking-wide text-blue-600 block mb-0.5">Время</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  step={300}
                  value={timePart}
                  onChange={(event) => handleTimeChange(event.target.value)}
                  className="flex-1 bg-transparent text-xs font-semibold text-blue-700 focus:outline-none focus:ring-0 cursor-pointer"
                  style={{
                    colorScheme: 'light',
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield'
                  }}
                />
                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Компактные кнопки быстрого времени */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {QUICK_OFFSETS.map(option => {
              const active = isQuickOptionActive(option.minutes)
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => applyQuickOffset(option.minutes)}
                  className={`rounded-3xl px-2.5 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-xs ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          {/* Компактный предварительный просмотр */}
          <div className="rounded-3xl bg-gray-50 px-3 py-2 text-[11px] text-gray-600 sm:text-xs">
            <span className="font-medium text-gray-900">{formattedPreview}</span>
          </div>

          {error && <p className="text-xs text-red-500 sm:text-sm">{error}</p>}
        </div>

        <div className="flex gap-2 sm:gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Отмена
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleSubmit}
            className="flex-1"
            disabled={loading}
          >
            {loading ? 'Сохранение...' : config.buttonText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}