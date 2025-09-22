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
    icon: '🍼',
    description: 'Зафиксируйте кормление, чтобы контролировать интервалы и напоминания.',
    buttonText: 'Сохранить кормление',
    buttonVariant: 'primary',
    accent: 'from-blue-500 to-purple-500'
  },
  diaper: {
    title: 'Смена подгузника',
    icon: '🧷',
    description: 'Добавьте отметку о смене подгузника и оставайтесь на шаг впереди.',
    buttonText: 'Сохранить смену',
    buttonVariant: 'success',
    accent: 'from-green-500 to-emerald-500'
  },
  bath: {
    title: 'Купание',
    icon: '🛁',
    description: 'Запланируйте или отметьте купание, чтобы не нарушать режим дня.',
    buttonText: 'Сохранить купание',
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
    const target = new Date()
    target.setMinutes(target.getMinutes() + minutes)
    return buildLocalState(target).value === selectedDateTime
  }

  const config = actionConfig[actionType]

  const formattedPreview = useMemo(() => {
    if (!selectedDateTime) {
      return '—'
    }

    const parsed = new Date(selectedDateTime)
    if (Number.isNaN(parsed.getTime())) {
      return '—'
    }

    return parsed.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
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
      setError('Что-то пошло не так при сохранении, попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={config.title} size="md">
      <div className="space-y-6">
        <div className="text-center">
          <div className={`w-16 h-16 bg-gradient-to-r ${config.accent} rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg`}>
            {config.icon}
          </div>
          <p className="text-gray-600">{config.description}</p>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Дата и время события
          </label>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="relative rounded-3xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">Дата</span>
              <input
                type="date"
                value={datePart}
                onChange={(event) => handleDateChange(event.target.value)}
                className="mt-3 w-full bg-transparent text-lg font-semibold text-gray-900 focus:outline-none focus:ring-0"
              />
            </div>

            <div className="relative rounded-[2.5rem] border border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 shadow-[0_15px_45px_-20px_rgba(59,130,246,0.7)]">
              <span className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600">Время</span>
              <input
                type="time"
                step={300}
                value={timePart}
                onChange={(event) => handleTimeChange(event.target.value)}
                className="mt-4 w-full bg-transparent text-3xl font-semibold tracking-[0.3em] text-blue-700 focus:outline-none focus:ring-0"
              />
              <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] border border-white/60" aria-hidden="true" />
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
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 text-center text-sm text-gray-600">
            Текущее значение: <span className="font-semibold text-gray-900">{formattedPreview}</span>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Отменить
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleSubmit}
            className="flex-1"
            disabled={loading}
          >
            {loading ? 'Сохраняем...' : config.buttonText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
