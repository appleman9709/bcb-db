import { useEffect, useMemo, useState } from 'react'
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

const getLocalDateTimeString = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60000
  const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
  return localISOTime
}

export default function QuickActionModal({ isOpen, onClose, actionType, onSuccess }: QuickActionModalProps) {
  const [loading, setLoading] = useState(false)
  const [selectedDateTime, setSelectedDateTime] = useState(getLocalDateTimeString(new Date()))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSelectedDateTime(getLocalDateTimeString(new Date()))
      setError(null)
    }
  }, [isOpen, actionType])

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
      description: 'Запишите, когда прошло кормление, чтобы не сбиться с графика.',
      buttonText: 'Добавить кормление',
      buttonVariant: 'primary',
      accent: 'from-blue-500 to-purple-500'
    },
    diaper: {
      title: 'Смена подгузника',
      icon: '🧷',
      description: 'Фиксируйте смену подгузника для контроля интервалов.',
      buttonText: 'Добавить смену',
      buttonVariant: 'success',
      accent: 'from-green-500 to-emerald-500'
    },
    bath: {
      title: 'Купание',
      icon: '🛁',
      description: 'Сохраняйте расписание купаний, чтобы не пропустить процедуру.',
      buttonText: 'Добавить купание',
      buttonVariant: 'warning',
      accent: 'from-yellow-500 to-orange-500'
    }
  }

  const config = actionConfig[actionType]

  const formattedPreview = useMemo(() => {
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
      setError('Выберите время события')
      return
    }

    const eventDate = new Date(selectedDateTime)
    if (Number.isNaN(eventDate.getTime())) {
      setError('Некорректная дата и время')
      return
    }

    setLoading(true)
    setError(null)

    const timestamp = eventDate.toISOString()

    try {
      let result = null

      switch (actionType) {
        case 'feeding':
          result = await dataService.addFeeding(timestamp)
          break
        case 'diaper':
          result = await dataService.addDiaper(timestamp)
          break
        case 'bath':
          result = await dataService.addBath(timestamp)
          break
        default:
          result = null
      }

      if (result) {
        onSuccess?.()
        onClose()
      }
    } catch (error) {
      console.error('Error adding record:', error)
      setError('Не удалось сохранить запись, попробуйте еще раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={config.title} size="md">
      <div className="space-y-6">
        <div className="text-center">
          <div className={`w-16 h-16 bg-gradient-to-r ${config.accent} rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-4 shadow-lg`}>
            {config.icon}
          </div>
          <p className="text-gray-600">{config.description}</p>
        </div>

        <div className="space-y-3 min-w-0">
          <label className="block text-sm font-medium text-gray-700" htmlFor="quick-action-datetime">
            Время события
          </label>
          <input
            id="quick-action-datetime"
            type="datetime-local"
            value={selectedDateTime}
            onChange={(e) => setSelectedDateTime(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ios-input text-base"
          />
          <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-600">
            Вы выбрали: <span className="font-semibold text-gray-900">{formattedPreview}</span>
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
            Отмена
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
