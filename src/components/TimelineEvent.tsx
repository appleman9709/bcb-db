import React from 'react'

interface TimelineEventProps {
  event: {
    type: 'feeding' | 'diaper' | 'bath' | 'activity' | 'sleep'
    id: number
    timestamp: string
    author_name: string
    author_role: string
    activity_type?: string
    ounces?: number
    diaper_type?: string
    bath_mood?: string
    start_time?: string
    end_time?: string
    duration_minutes?: number
  }
  isLast?: boolean
  onClick: (event: any) => void
}

const formatTime = (date: Date) =>
  date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

const getTimeAgo = (timestamp: string) => {
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

export default function TimelineEvent({ event, isLast = false, onClick }: TimelineEventProps) {
  const getEventInfo = () => {
    switch (event.type) {
      case 'feeding':
        const ouncesText = event.ounces ? ` • ${event.ounces} унций` : ''
        return {
          icon: <img src="/icons/feeding.png" alt="Кормление" className="w-9 h-9 object-contain" />,
          title: 'Кормление',
          description: `Ребенок покормлен${ouncesText}`,
          color: 'bg-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          extraInfo: event.ounces ? `🍼 ${event.ounces} унций` : null
        }
      case 'diaper':
        const diaperTypeText = event.diaper_type === 'Покакал' ? ' • Покакал' : ''
        return {
          icon: <img src="/icons/poor.png" alt="Смена подгузника" className="w-9 h-9 object-contain" />,
          title: 'Смена подгузника',
          description: `Подгузник заменен${diaperTypeText}`,
          color: 'bg-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          extraInfo: event.diaper_type === 'Покакал' ? '💩 Покакал' : '💧 Просто'
        }
      case 'bath':
        const moodText = event.bath_mood === 'Беспокоился' ? ' • Беспокоился' : ''
        return {
          icon: <img src="/icons/bath.png" alt="Купание" className="w-9 h-9 object-contain" />,
          title: 'Купание',
          description: `Ребенок искупан${moodText}`,
          color: 'bg-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          extraInfo: event.bath_mood === 'Беспокоился' ? '😢 Беспокоился' : '😊 Спокойно'
        }
      case 'activity':
        return {
          icon: <img src="/icons/activity.png" alt="Активность" className="w-9 h-9 object-contain" />,
          title: 'Активность',
          description: event.activity_type || 'Активность записана',
          color: 'bg-purple-500',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          extraInfo: event.activity_type ? `🎯 ${event.activity_type}` : null
        }
      case 'sleep':
        return {
          icon: <img src="/icons/sleep.png" alt="Сон" className="w-9 h-9 object-contain" />,
          title: 'Сон',
          description: 'Ребенок спал',
          color: 'bg-indigo-500',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-200',
          extraInfo: event.duration_minutes ? `😴 ${Math.floor(event.duration_minutes / 60)}ч ${event.duration_minutes % 60}м` : null
        }
      default:
        return {
          icon: '⭐',
          title: 'Событие',
          description: 'Записано событие',
          color: 'bg-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          extraInfo: null
        }
    }
  }

  const eventInfo = getEventInfo()
  const eventDate = new Date(event.timestamp)
  const timeAgo = getTimeAgo(event.timestamp)

  return (
    <div className="relative flex items-start space-x-3 pb-4">
      {/* Timeline line and icon */}
      <div className="flex flex-col items-center">
        {/* Timeline icon */}
        <div className="w-10 h-10 rounded-full z-10 flex items-center justify-center">
          <div className="w-9 h-9 flex items-center justify-center">
            {eventInfo.icon}
          </div>
        </div>
        {/* Timeline line */}
        {!isLast && (
          <div className="w-0.5 h-16 bg-gray-500 mt-2"></div>
        )}
      </div>

      {/* Event content */}
      <div 
        className={`flex-1 ${eventInfo.bgColor} ${eventInfo.borderColor} border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-all duration-200`}
        onClick={() => onClick(event)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{eventInfo.title}</h3>
              <p className="text-xs text-gray-600 mt-0.5">{formatTime(eventDate)}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">{timeAgo}</div>
          </div>
        </div>
        
        {eventInfo.extraInfo && (
          <div className="mt-2">
            <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-full border border-gray-200">
              {eventInfo.extraInfo}
            </span>
          </div>
        )}
        
        <div className="mt-2 text-xs text-gray-500">
          👤 {event.author_name} • {eventDate.toLocaleDateString('ru-RU')}
        </div>
      </div>
    </div>
  )
}
