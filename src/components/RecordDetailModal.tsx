import React from 'react'
import Modal from './Modal'
import Button from './Button'

interface RecordDetailModalProps {
  isOpen: boolean
  onClose: () => void
  onDelete: () => void
  record: {
  type: 'feeding' | 'diaper' | 'bath' | 'activity' | 'sleep'
    id: number
    timestamp: string
    author_name: string
    author_role: string
    activity_type?: string
    ounces?: number
    diaper_type?: string
    bath_mood?: string
  // sleep-specific
  start_time?: string
  end_time?: string
  duration_minutes?: number
  } | null
}

const getRecordTypeInfo = (type: string) => {
  switch (type) {
    case 'feeding':
      return {
        title: 'Кормление',
        icon: '/icons/feeding.png',
        description: 'Запись о кормлении малыша',
        color: 'from-blue-500 to-purple-500',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700'
      }
    case 'diaper':
      return {
        title: 'Смена подгузника',
        icon: '/icons/poor.png',
        description: 'Запись о смене подгузника',
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700'
      }
    case 'bath':
      return {
        title: 'Купание',
        icon: '/icons/bath.png',
        description: 'Запись о купании малыша',
        color: 'from-yellow-500 to-orange-500',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700'
      }
    case 'activity':
      return {
        title: 'Активность',
        icon: '/icons/baby.png',
        description: 'Запись об активности малыша',
        color: 'from-purple-500 to-pink-500',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-700'
      }
    case 'sleep':
      return {
        title: 'Сон',
        icon: '/icons/sleep.png',
        description: 'Запись о сне малыша',
        color: 'from-indigo-500 to-blue-500',
        bgColor: 'bg-indigo-50',
        textColor: 'text-indigo-700'
      }
    default:
      return {
        title: 'Событие',
        icon: '/icons/baby.png',
        description: 'Запись о событии',
        color: 'from-gray-500 to-gray-600',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700'
      }
  }
}

const formatDateTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return {
    date: date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    time: date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    relative: getRelativeTime(timestamp)
  }
}

const getRelativeTime = (timestamp: string) => {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInMinutes = Math.max(0, Math.floor((now.getTime() - time.getTime()) / (1000 * 60)))

  if (diffInMinutes === 0) {
    return 'только что'
  }

  if (diffInMinutes < 60) {
    return `${diffInMinutes} мин назад`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} ч назад`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} дн назад`
}

export default function RecordDetailModal({ isOpen, onClose, onDelete, record }: RecordDetailModalProps) {
  if (!record) return null

  const typeInfo = getRecordTypeInfo(record.type)
  const dateTime = formatDateTime(record.timestamp)

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="space-y-4">
        {/* Заголовок с иконкой */}
        <div className={`${typeInfo.bgColor} rounded-3xl p-4 border border-gray-200 flex items-center gap-3`}>
          <div className="w-12 h-12 flex items-center justify-center">
            <img 
              src={typeInfo.icon} 
              alt={typeInfo.title} 
              className="w-10 h-10 object-contain" 
            />
          </div>
          <div className="flex-1">
            <h2 className={`text-lg font-semibold ${typeInfo.textColor}`}>
              {typeInfo.title}
            </h2>
            {record.type === 'activity' && record.activity_type && (
              <p className="text-sm text-gray-600 mt-1">
                Тип: {record.activity_type}
              </p>
            )}
          </div>
        </div>

        {/* Информация о времени */}
        <div className="bg-gray-50 rounded-3xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Дата и время:</span>
            <span className="text-sm text-gray-900 font-semibold">
              {dateTime.time}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Дата:</span>
            <span className="text-sm text-gray-900">
              {dateTime.date}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Время назад:</span>
            <span className="text-sm text-gray-600">
              {dateTime.relative}
            </span>
          </div>
        </div>

        {/* Дополнительная информация в зависимости от типа записи */}
        {(record.type === 'feeding' && record.ounces) || 
         (record.type === 'diaper' && record.diaper_type) || 
         (record.type === 'bath' && record.bath_mood) || 
         (record.type === 'activity' && record.activity_type) ? (
          <div className="rounded-3xl p-4 space-y-3 border border-blue-100">
            <h3 className="text-sm font-semibold text-gray-800">📊 Детали события</h3>
            
            {record.type === 'feeding' && record.ounces && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Количество унций:</span>
                <span className="text-sm text-blue-600 font-semibold bg-white px-2 py-1 rounded-xl border border-blue-200">
                  🍼 {record.ounces} унций
                </span>
              </div>
            )}
            
            {record.type === 'diaper' && record.diaper_type && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Тип смены:</span>
                <span className={`text-sm font-semibold px-2 py-1 rounded-3xl border ${
                  record.diaper_type === 'Покакал' 
                    ? 'text-orange-600 bg-orange-50 border-orange-200' 
                    : 'text-blue-600 bg-blue-50 border-blue-200'
                }`}>
                  {record.diaper_type === 'Покакал' ? '💩 Покакал' : '💧 Просто'}
                </span>
              </div>
            )}
            
            {record.type === 'bath' && record.bath_mood && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Настроение:</span>
                <span className={`text-sm font-semibold px-2 py-1 rounded-3xl border ${
                  record.bath_mood === 'Беспокоился' 
                    ? 'text-red-600 bg-red-50 border-red-200' 
                    : 'text-green-600 bg-green-50 border-green-200'
                }`}>
                  {record.bath_mood === 'Беспокоился' ? '😢 Беспокоился' : '😊 Спокойно'}
                </span>
              </div>
            )}
            
            {record.type === 'activity' && record.activity_type && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Тип активности:</span>
                <span className="text-sm text-purple-600 font-semibold bg-white px-2 py-1 rounded-3xl border border-purple-200">
                  🎯 {record.activity_type}
                </span>
              </div>
            )}
          </div>
        ) : null}

        {/* Информация об авторе */}
        <div className="bg-gray-50 rounded-3xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Записал(а):</span>
            <span className="text-sm text-gray-900 font-medium">
              {record.author_name}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Роль:</span>
            <span className="text-sm text-gray-600">
              {record.author_role}
            </span>
          </div>
        </div>

        {/* Описание */}
        <div className="bg-gray-50 rounded-3xl p-4">
          <p className="text-sm text-gray-700">
            {typeInfo.description}
          </p>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Закрыть
          </Button>
          <Button
            variant="danger"
            onClick={onDelete}
            className="flex-1"
          >
            🗑️ Удалить
          </Button>
        </div>
      </div>
    </Modal>
  )
}
