import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import { dataService } from '../services/dataService'
import React from 'react';

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
    buttonText: 'Записать кормление',
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
      // Сбрасываем значения по умолчанию (чистый подгузник и т.д.)
      setDiaperType('Просто')
      setBathMood('Спокойное купание')
      // feedingOunces не сбрасываем - сохраняем последнее значение
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
    // Сохраняем значение последнего кормления в localStorage
    localStorage.setItem('lastFeedingOunces', value.toString())
  }

  const config = actionConfig[actionType]

  const formattedPreview = useMemo(() => {
    if (!selectedDateTime) {
      return 'Выберите дату и время'
    }

    const eventDate = new Date(selectedDateTime)
    if (Number.isNaN(eventDate.getTime())) {
      return 'Некорректная дата'
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
      setError('Выберите дату и время события')
      return
    }

    const eventDate = new Date(selectedDateTime)
    if (Number.isNaN(eventDate.getTime())) {
      setError('Не удалось распознать дату')
      return
    }

    setLoading(true)
    setError(null)

    const timestamp = eventDate.toISOString()

    try {
      let result: any = null
      let shouldCloseImmediately = false
      
      switch (actionType) {
        case 'feeding':
          result = await dataService.addFeeding(timestamp, feedingOunces)
          shouldCloseImmediately = true
          break
        case 'diaper':
          result = await dataService.addDiaper(timestamp, diaperType)
          shouldCloseImmediately = true
          break
        case 'bath':
          result = await dataService.addBath(timestamp, bathMood)
          shouldCloseImmediately = true
          break
        case 'activity':
          result = await dataService.addActivity(selectedActivity, timestamp)
          break
      }

      // ✅ Для feeding, diaper, bath - закрываем окно сразу после получения результата
      // (побочные эффекты выполняются в фоне)
      if (shouldCloseImmediately && result) {
        setLoading(false)
        onClose()
        // Вызываем onSuccess в следующем тике, чтобы дать время окну закрыться
        setTimeout(() => {
          onSuccess?.(result)
        }, 10)
        return // Выходим, чтобы не выполнять код ниже
      }

      // Для activity - стандартное поведение
      setLoading(false)
      onClose()

      setTimeout(() => {
        onSuccess?.(result)
      }, 10)
    } catch (submitError) {
      console.error('Error adding record:', submitError)
      setError('Не удалось сохранить запись, попробуйте позже')
      setLoading(false)
    }
  }

  const handleDiaperSubmit = async (diaperTypeValue: string) => {
    if (!selectedDateTime) {
      setError('Выберите дату и время события')
      return
    }

    const eventDate = new Date(selectedDateTime)
    if (Number.isNaN(eventDate.getTime())) {
      setError('Не удалось распознать дату')
      return
    }

    setLoading(true)
    setError(null)

    const timestamp = eventDate.toISOString()

    try {
      const result = await dataService.addDiaper(timestamp, diaperTypeValue)

      // ✅ Закрываем окно сразу после получения результата
      // (побочные эффекты выполняются в фоне)
      if (result) {
        setLoading(false)
        onClose()
        setTimeout(() => {
          onSuccess?.(result)
        }, 10)
      } else {
        setError('Не удалось сохранить запись, попробуйте позже')
        setLoading(false)
      }
    } catch (submitError) {
      console.error('Error adding diaper record:', submitError)
      setError('Не удалось сохранить запись, попробуйте позже')
      setLoading(false)
    }
  }

  const handleBathSubmit = async (bathMoodValue: string) => {
    if (!selectedDateTime) {
      setError('Выберите дату и время события')
      return
    }

    const eventDate = new Date(selectedDateTime)
    if (Number.isNaN(eventDate.getTime())) {
      setError('Не удалось распознать дату')
      return
    }

    setLoading(true)
    setError(null)

    const timestamp = eventDate.toISOString()

    try {
      const result = await dataService.addBath(timestamp, bathMoodValue)

      // ✅ Закрываем окно сразу после получения результата
      // (побочные эффекты выполняются в фоне)
      if (result) {
        setLoading(false)
        onClose()
        setTimeout(() => {
          onSuccess?.(result)
        }, 10)
      } else {
        setError('Не удалось сохранить запись, попробуйте позже')
        setLoading(false)
      }
    } catch (submitError) {
      console.error('Error adding bath record:', submitError)
      setError('Не удалось сохранить запись, попробуйте позже')
      setLoading(false)
    }
  }

  const handleActivitySubmit = async (activityTypeValue: string) => {
    if (!selectedDateTime) {
      setError('Выберите дату и время события')
      return
    }

    const eventDate = new Date(selectedDateTime)
    if (Number.isNaN(eventDate.getTime())) {
      setError('Не удалось распознать дату')
      return
    }

    setLoading(true)
    setError(null)

    const timestamp = eventDate.toISOString()

    try {
      const result = await dataService.addActivity(activityTypeValue, timestamp)

      setLoading(false)
      onClose()
      setTimeout(() => {
        onSuccess?.({})
      }, 10)
    } catch (submitError) {
      console.error('Error adding activity record:', submitError)
      setError('Не удалось сохранить запись, попробуйте позже')
      setLoading(false)
    }
  }

  const isActivityAction = actionType === 'activity'

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      {isActivityAction ? (
        <div className="quick-action-modal space-y-3">
          <div className="space-y-2">
            {/* Быстрые кнопки временных смещений */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {QUICK_OFFSETS.map(option => {
                    const active = isQuickOptionActive(option.minutes)
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => applyQuickOffset(option.minutes)}
                        className={`rounded-3xl px-2.5 py-1 text-[14px] font-medium transition-colors ${
                          active
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600'
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
              </div>
              <div className="rounded-3xl bg-gray-50 px-3 py-2 text-[11px] text-gray-600 sm:text-xs">
                <span className="font-medium text-gray-900">{formattedPreview}</span>
              </div>
            {error && <p className="text-xs text-red-500 sm:text-sm">{error}</p>}
           </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {activityTypes.map((activity) => (
                <button
                  key={activity.id}
                  type="button"
                  onClick={async () => {
                    setSelectedActivity(activity.id)
                    await handleActivitySubmit(activity.id)
                  }}
                  disabled={loading}
                  className={`p-4 rounded-3xl border-2 transition-all duration-200 flex flex-col items-center space-y-2 ${
                    loading
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : `border-blue-500 bg-gradient-to-br ${activity.color} text-white shadow-lg`
                  }`}
                >
                  <img
                    src={activity.icon}
                    alt={activity.label} 
                    className="w-10 h-10 object-contain"
                  />
                  <span className="text-sm font-semibold text-center leading-tight">
                    {activity.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          </div>
      ) : (
        <div className="quick-action-modal quick-action-layout gap-3">
          <div className="text-center space-y-0.5">
              <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">
                {config.title}
              </h2>
              {actionType !== 'feeding' && (
                <p className="text-xs text-gray-500 sm:text-sm">
                  {config.description}
                </p>
              )}
            </div>
          <div className="quick-action-visual">
            <img
              src={
                actionType === 'diaper' ? '/icons/poo.png' :
                actionType === 'bath' ? '/icons/alarm.png' :
                '/icons/eat.png'
              }
              alt={config.title}
              className="w-24 h-24 object-contain mx-auto"
            />

            {actionType === 'feeding' && (
              <div className="space-y-1">
                <span className="text-lg font-semibold text-blue-600 text-center block">
                  {feedingOunces > 0 ? `${feedingOunces} унций` : 'Не указано'}
                </span>
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
              </div>
            )}
            {/* Раздел для даты и времени */}
            <div className="space-y-3">
              {/* Поле даты - компактное оформление */}
              <div className="rounded-2xl border-2 border-blue-200 p-2 shadow-sm transition-all duration-200 cursor-pointer">
                <label className="text-[9px] font-medium uppercase tracking-wide block">Дата</label>
                <input
                  type="date"
                  value={datePart}
                  onChange={(event) => handleDateChange(event.target.value)}
                  className="w-full text-center text-gray-800 bg-transparent"
                  style={{
                    colorScheme: 'light',
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield'
                  }}
                />
              </div>

              {/* Поле времени - акцентное оформление */}
              <div className="rounded-2xl border-2 border-blue-200 p-2 shadow-sm transition-all duration-200 cursor-pointer">
              <label className="text-[9px] font-medium uppercase tracking-wide block">Время</label>
                <input
                  type="time"
                  step={300}
                  value={timePart}
                  onChange={(event) => handleTimeChange(event.target.value)}
                  className="w-full text-center text-gray-800 bg-transparent"
                  style={{
                    colorScheme: 'light',
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield'
                  }}
                />
              </div>
            </div>

            <div className="quick-action-main flex">
            {/* Быстрые кнопки временных смещений */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {QUICK_OFFSETS.map(option => {
                const active = isQuickOptionActive(option.minutes)
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => applyQuickOffset(option.minutes)}
                    className={`rounded-3xl px-2.5 py-1 text-[14px] font-medium transition-colors ${
                      active
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            <div className="rounded-3xl bg-gray-50 px-3 py-2 text-[11px] text-gray-600 sm:text-xs">
              <span className="font-medium text-gray-900">{formattedPreview}</span>
            </div>

            {error && <p className="text-xs text-red-500 sm:text-sm">{error}</p>}

            {/* Кнопки действий - только для кормления */}
            {actionType === 'feeding' && (
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
            )}
          </div>

            {/* Кнопки выбора типа подгузника */}
            {actionType === 'diaper' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      setDiaperType('Покакал')
                      await handleDiaperSubmit('Покакал')
                    }}
                    disabled={loading}
                    className={`p-4 rounded-3xl border-2 transition-all duration-200 flex flex-col items-center space-y-2 ${
                      loading
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-orange-500 bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-lg'
                    }`}
                  >
                    <img
                      src="/icons/poor.png"
                      alt="Покакал"
                      className="w-10 h-10 object-contain"
                    />
                    <span className="text-sm font-semibold">Покакал</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setDiaperType('Просто')
                      await handleDiaperSubmit('Просто')
                    }}
                    disabled={loading}
                    className={`p-4 rounded-3xl border-2 transition-all duration-200 flex flex-col items-center space-y-2 ${
                      loading
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-green-500 bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg'
                    }`}
                  >
                    <img
                      src="/icons/common.png"
                      alt="Просто"
                      className="w-10 h-10 object-contain"
                    />
                    <span className="text-sm font-semibold">Просто</span>
                  </button>
                </div>
              </div>
            )}

            {/* Кнопки выбора настроения купания */}
            {actionType === 'bath' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      setBathMood('Беспокоился')
                      await handleBathSubmit('Беспокоился')
                    }}
                    disabled={loading}
                    className={`p-4 rounded-3xl border-2 transition-all duration-200 flex flex-col items-center space-y-2 ${
                      loading
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-orange-500 bg-gradient-to-br from-orange-400 to-yellow-500 text-white shadow-lg'
                    }`}
                  >
                    <img
                      src="/icons/angry.png"
                      alt="Беспокоился"
                      className="w-10 h-10 object-contain"
                    />
                    <span className="text-sm font-semibold">Беспокоился</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setBathMood('Спокойное')
                      await handleBathSubmit('Спокойное')
                    }}
                    disabled={loading}
                    className={`p-4 rounded-3xl border-2 transition-all duration-200 flex flex-col items-center space-y-2 ${
                      loading
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-blue-500 bg-gradient-to-br from-blue-400 to-cyan-500 text-white shadow-lg'
                    }`}
                  >
                    <img
                      src="/icons/still.png"
                      alt="Спокойное"
                      className="w-10 h-10 object-contain"
                    />
                    <span className="text-sm font-semibold">Спокойное</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}