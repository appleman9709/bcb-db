import React from 'react'

interface EventGroupProps {
  date: string
  events: any[]
  onEventClick: (event: any) => void
}

const formatGroupDate = (dateString: string) => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const isToday = date.toDateString() === today.toDateString()
  const isYesterday = date.toDateString() === yesterday.toDateString()
  
  if (isToday) {
    return 'Сегодня'
  } else if (isYesterday) {
    return 'Вчера'
  } else {
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }
}

const getTypeInfo = (type: string, item: any) => {
  switch (type) {
    case 'feeding':
      const ouncesText = item.ounces ? ` • ${item.ounces} унций` : ''
      return { 
        icon: <img src="/icons/feeding.png" alt="Кормление" className="w-5 h-5 object-contain" />, 
        label: 'Кормление', 
        color: 'bg-blue-100 text-blue-600',
        bgColor: 'bg-blue-50',
        description: `Ребенок покормлен${ouncesText}`,
        extraInfo: item.ounces ? `🍼 ${item.ounces} унций` : null
      }
    case 'diaper':
      const diaperTypeText = item.diaper_type === 'Покакал' ? ' • Покакал' : ''
      return { 
        icon: <img src="/icons/poor.png" alt="Смена подгузника" className="w-5 h-5 object-contain" />, 
        label: 'Смена подгузника', 
        color: 'bg-green-100 text-green-600',
        bgColor: 'bg-green-50',
        description: `Подгузник заменен${diaperTypeText}`,
        extraInfo: item.diaper_type === 'Покакал' ? '💩 Покакал' : '💧 Просто'
      }
    case 'bath':
      const moodText = item.bath_mood === 'Кричал' ? ' • Беспокоился' : ''
      return { 
        icon: <img src="/icons/bath.png" alt="Купание" className="w-5 h-5 object-contain" />, 
        label: 'Купание', 
        color: 'bg-yellow-100 text-yellow-600',
        bgColor: 'bg-yellow-50',
        description: `Ребенок искупан${moodText}`,
        extraInfo: item.bath_mood === 'Кричал' ? '😢 Беспокоился' : '😊 Спокойно'
      }
    case 'activity':
      return { 
        icon: <img src="/icons/activity.png" alt="Активность" className="w-5 h-5 object-contain" />, 
        label: 'Активность', 
        color: 'bg-purple-100 text-purple-600',
        bgColor: 'bg-purple-50',
        description: item.activity_type || 'Активность записана',
        extraInfo: null // Убираем дублирование - тип активности уже в описании
      }
    case 'sleep':
      const duration = item.duration_minutes
      const durationText = duration ? formatDuration(duration) : 'В процессе'
      return { 
        icon: <img src="/icons/sleep.png" alt="Сон" className="w-5 h-5 object-contain" />, 
        label: 'Сон', 
        color: 'bg-indigo-100 text-indigo-600',
        bgColor: 'bg-indigo-50',
        description: `Ребенок спал ${durationText}`,
        extraInfo: duration ? `😴 ${durationText}` : '😴 В процессе'
      }
    default:
      return { 
        icon: '⭐', 
        label: 'Событие', 
        color: 'bg-gray-100 text-gray-600',
        bgColor: 'bg-gray-50',
        description: 'Записано событие',
        extraInfo: null
      }
  }
}

const formatTime = (date: Date) =>
  date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })

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

const formatDuration = (minutes: number) => {
  if (minutes < 60) {
    return `${minutes} мин`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours} ч`
  }
  
  return `${hours} ч ${remainingMinutes} мин`
}

export default function EventGroup({ date, events, onEventClick }: EventGroupProps) {
  const groupDate = formatGroupDate(date)
  
  // Подсчитываем общее время сна за день
  const totalSleepMinutes = events
    .filter(event => event.type === 'sleep' && event.duration_minutes)
    .reduce((total, event) => total + event.duration_minutes, 0)
  
  const totalSleepText = totalSleepMinutes > 0 ? ` • 😴 ${formatDuration(totalSleepMinutes)}` : ''
  
  return (
    <div className="mb-4">
      {/* Заголовок группы */}
      <div className="sticky top-0 bg-white z-10 py-2 mb-2 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-lg">📅</span>
          {groupDate}
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-3xl">
            {events.length} событий{totalSleepText}
          </span>
        </h3>
      </div>
      
      {/* События группы */}
      <div className="space-y-2">
        {events.map((item, index) => {
          const typeInfo = getTypeInfo(item.type, item)
          const eventDate = new Date(item.timestamp)
          const timeAgo = getTimeAgo(item.timestamp)
          
          return (
            <div 
              key={`${item.type}-${item.id}-${index}`} 
              className={`flex items-center space-x-3 p-3 rounded-3xl ${typeInfo.bgColor} border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200`}
              onClick={() => onEventClick(item)}
            >
              <div className="w-8 h-8 flex items-center justify-center">
                {typeInfo.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">{typeInfo.label}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">{timeAgo}</span>
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                
                <p className="text-xs text-gray-600 mt-1">{typeInfo.description}</p>
                
                {typeInfo.extraInfo && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded-3xl border border-gray-200">
                      {typeInfo.extraInfo}
                    </span>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-1">
                  🕐 {formatTime(eventDate)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
