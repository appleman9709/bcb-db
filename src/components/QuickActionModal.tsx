
import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import { dataService } from '../services/dataService'

type QuickActionType = 'feeding' | 'diaper' | 'bath'

interface QuickActionModalProps {
  isOpen: boolean
  onClose: () => void
  actionType: QuickActionType
  onSuccess?: () => void
}

const QUICK_OFFSETS = [
  { label: 'Сейчас', minutes: 0 },
  { label: '-15 мин', minutes: -15 },
  { label: '-30 мин', minutes: -30 },
  { label: '-1 час', minutes: -60 },
  { label: '+15 мин', minutes: 15 }
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
    description: 'Записать кормление, чтобы отслеживать режим питания и планировать следующее кормление.',
    buttonText: 'Записать кормление',
    buttonVariant: 'primary',
    accent: 'from-blue-500 to-purple-500'
  },
  diaper: {
    title: 'Смена подгузника',
    icon: '/icons/poor.png',
    description: 'Отметить смену подгузника, чтобы следить за гигиеной малыша.',
    buttonText: 'Записать смену',
    buttonVariant: 'success',
    accent: 'from-green-500 to-emerald-500'
  },
  bath: {
    title: 'Купание',
    icon: '/icons/bath.png',
    description: 'Записать купание, чтобы поддерживать чистоту и здоровье малыша.',
    buttonText: 'Записать купание',
    buttonVariant: 'warning',
    accent: 'from-yellow-500 to-orange-500'
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

export default function QuickActionModal({ isOpen, onClose, actionType, onSuccess }: QuickActionModalProps) {
  const initialStateRef = useRef(buildLocalState(new Date()))
  const [selectedDateTime, setSelectedDateTime] = useState(initialStateRef.current.value)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      const next = buildLocalState(new Date())
      initialStateRef.current = next
      setSelectedDateTime(next.value)
      setError(null)
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
      switch (actionType) {
        case 'feeding':
          await dataService.addFeeding(timestamp)
          break
        case 'diaper':
          await dataService.addDiaper(timestamp)
          break
        case 'bath':
          await dataService.addBath(timestamp)
          break
        default:
          break
      }

      onSuccess?.()
      onClose()
    } catch (submitError) {
      console.error('Error adding record:', submitError)
      setError('Не удалось сохранить запись, попробуйте еще раз позже')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={config.title} size="sm">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex h-16 w-16 items-center justify-center">
            <img src={config.icon} alt={config.title} className="w-14 h-14 object-contain" />
          </div>
          <p className="text-sm text-gray-600 sm:text-base text-left">{config.description}</p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-400">Дата</span>
              <input
                type="date"
                value={datePart}
                onChange={(event) => handleDateChange(event.target.value)}
                className="mt-1 w-full bg-transparent text-base font-semibold text-gray-900 focus:outline-none focus:ring-0 sm:mt-2 sm:text-lg"
              />
            </div>

            <div className="relative rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-3 shadow-[0_10px_30px_-18px_rgba(59,130,246,0.65)] sm:rounded-[2rem] sm:px-6 sm:py-5 sm:shadow-[0_15px_45px_-20px_rgba(59,130,246,0.7)]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-blue-600">Время</span>
              <input
                type="time"
                step={300}
                value={timePart}
                onChange={(event) => handleTimeChange(event.target.value)}
                className="mt-2 w-full bg-transparent text-xl font-semibold tracking-[0.22em] text-blue-700 focus:outline-none focus:ring-0 sm:mt-3 sm:text-2xl sm:tracking-[0.3em]"
              />
              <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/60 sm:rounded-[2rem]" aria-hidden="true" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_OFFSETS.map(option => {
              const active = isQuickOptionActive(option.minutes)
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => applyQuickOffset(option.minutes)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/35'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          <div className="rounded-2xl bg-gray-50 px-3 py-2 text-xs text-gray-600 sm:px-4 sm:py-3 sm:text-sm">
            Предварительный просмотр: <span className="font-semibold text-gray-900">{formattedPreview}</span>
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
