import { useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import { dataService } from '../services/dataService'

interface QuickActionModalProps {
  isOpen: boolean
  onClose: () => void
  actionType: 'feeding' | 'diaper' | 'sleep' | 'play' | 'medicine' | 'note'
  onSuccess?: () => void
}

export default function QuickActionModal({ isOpen, onClose, actionType, onSuccess }: QuickActionModalProps) {
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')

  const actionConfig = {
    feeding: {
      title: 'Кормление',
      icon: '🍼',
      description: 'Записать время кормления',
      buttonText: 'Записать кормление',
      buttonVariant: 'primary' as const
    },
    diaper: {
      title: 'Смена подгузника',
      icon: '👶',
      description: 'Отметить смену подгузника',
      buttonText: 'Записать смену',
      buttonVariant: 'success' as const
    },
    sleep: {
      title: 'Сон',
      icon: '😴',
      description: 'Записать время сна',
      buttonText: 'Начать сон',
      buttonVariant: 'purple' as const
    },
    play: {
      title: 'Активность',
      icon: '🎯',
      description: 'Отметить активность',
      buttonText: 'Записать активность',
      buttonVariant: 'warning' as const
    },
    medicine: {
      title: 'Лекарство',
      icon: '💊',
      description: 'Записать прием лекарств',
      buttonText: 'Записать прием',
      buttonVariant: 'danger' as const
    },
    note: {
      title: 'Заметка',
      icon: '📝',
      description: 'Добавить заметку',
      buttonText: 'Сохранить заметку',
      buttonVariant: 'secondary' as const
    }
  }

  const config = actionConfig[actionType]

  const handleSubmit = async () => {
    setLoading(true)
    try {
      let result = null
      
      switch (actionType) {
        case 'feeding':
          result = await dataService.addFeeding()
          break
        case 'diaper':
          result = await dataService.addDiaper()
          break
        case 'sleep':
          result = await dataService.addSleepSession()
          break
        case 'play':
          result = await dataService.addActivity('Игра')
          break
        case 'medicine':
          result = await dataService.addActivity('Лекарство')
          break
        case 'note':
          result = await dataService.addActivity('Заметка')
          break
      }

      if (result) {
        onSuccess?.()
        onClose()
        setNote('')
      }
    } catch (error) {
      console.error('Error adding record:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={config.title} size="md">
      <div className="space-y-6">
        {/* Icon and description */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-4 shadow-lg">
            {config.icon}
          </div>
          <p className="text-gray-600">{config.description}</p>
        </div>

        {/* Time display */}
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">Время записи</p>
          <p className="text-lg font-semibold text-gray-900">
            {new Date().toLocaleString('ru-RU')}
          </p>
        </div>

        {/* Note field for some actions */}
        {(actionType === 'note' || actionType === 'medicine') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {actionType === 'note' ? 'Заметка' : 'Описание лекарства'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
              rows={3}
              placeholder={actionType === 'note' ? 'Введите заметку...' : 'Опишите лекарство и дозировку...'}
            />
          </div>
        )}

        {/* Action buttons */}
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
            {loading ? 'Сохранение...' : config.buttonText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
