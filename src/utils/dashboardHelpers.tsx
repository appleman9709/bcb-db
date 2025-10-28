import React from 'react'

export const formatDuration = (minutes: number) => {
  const absMinutes = Math.abs(minutes)
  const days = Math.floor(absMinutes / 1440)
  const hours = Math.floor((absMinutes % 1440) / 60)
  const mins = absMinutes % 60
  const parts: string[] = []

  if (days > 0) {
    parts.push(`${days} д`)
  }

  if (hours > 0 || days > 0) {
    parts.push(`${hours} ч`)
    parts.push(`${mins} мин`)
  } else {
    parts.push(`${mins} мин`)
  }

  return parts.join(' ')
}

export const formatTime = (date: Date) =>
  date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

const ACTIVITY_INFO_MAP: Record<
  string,
  { icon: string; label: string; color: string; bgColor: string; extraInfo: string | null }
> = {
  'Ходьба': {
    icon: '/icons/walking.png',
    label: 'Ходьба',
    color: 'bg-green-100 text-green-600',
    bgColor: 'bg-green-50',
    extraInfo: '🚶 Ходьба'
  },
  'Игры на животике': {
    icon: '/icons/belly.png',
    label: 'Игры на животике',
    color: 'bg-blue-100 text-blue-600',
    bgColor: 'bg-blue-50',
    extraInfo: '🤱 Игры на животике'
  },
  'Массаж': {
    icon: '/icons/massage.png',
    label: 'Массаж',
    color: 'bg-purple-100 text-purple-600',
    bgColor: 'bg-purple-50',
    extraInfo: '💆 Массаж'
  },
  'Танцы и музыка': {
    icon: '/icons/dance.png',
    label: 'Танцы и музыка',
    color: 'bg-orange-100 text-orange-600',
    bgColor: 'bg-orange-50',
    extraInfo: '🎵 Танцы и музыка'
  }
}

export interface TypeInfo {
  icon: React.ReactNode
  label: string
  color: string
  bgColor: string
  description: string
  extraInfo: string | null
}

export const getTypeInfo = (type: string, item: any): TypeInfo => {
  switch (type) {
    case 'feeding':
      return {
        icon: <img src="/icons/feeding.png" alt="Кормление" className="w-9 h-9 object-contain" />,
        label: 'Кормление',
        color: 'bg-blue-100 text-blue-600',
        bgColor: 'bg-blue-50',
        description: '',
        extraInfo: item.ounces ? `🍼 ${item.ounces} унц` : null
      }
    case 'diaper':
      return {
        icon: <img src="/icons/poor.png" alt="Подгузники полные" className="w-9 h-9 object-contain" />,
        label: 'Подгузники полные',
        color: 'bg-green-100 text-green-600',
        bgColor: 'bg-green-50',
        description: '',
        extraInfo: item.diaper_type === 'Мокрый' ? '💧 Мокрый' : '💩 Грязный'
      }
    case 'bath':
      return {
        icon: <img src="/icons/bath.png" alt="Купание" className="w-9 h-9 object-contain" />,
        label: 'Купание',
        color: 'bg-yellow-100 text-yellow-600',
        bgColor: 'bg-yellow-50',
        description: '',
        extraInfo: item.bath_mood === 'Довольный' ? '😊 Довольный' : '😢 Недоволен'
      }
    case 'activity': {
      const activityInfo =
        ACTIVITY_INFO_MAP[item.activity_type as string] ?? {
          icon: '/icons/activity.png',
          label: 'Активность',
          color: 'bg-gray-100 text-gray-600',
          bgColor: 'bg-gray-50',
          extraInfo: item.activity_type ? `🏃 ${item.activity_type}` : null
        }

      return {
        icon: <img src={activityInfo.icon} alt={activityInfo.label} className="w-9 h-9 object-contain" />,
        label: activityInfo.label,
        color: activityInfo.color,
        bgColor: activityInfo.bgColor,
        description: '',
        extraInfo: activityInfo.extraInfo
      }
    }
    case 'sleep': {
      const hasEnded = Boolean(item?.end_time)
      const computedDuration = (() => {
        if (typeof item?.duration_minutes === 'number' && item.duration_minutes > 0) {
          return item.duration_minutes as number
        }
        if (hasEnded && item.start_time && item.end_time) {
          const start = new Date(item.start_time).getTime()
          const end = new Date(item.end_time).getTime()
          if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
            return Math.max(1, Math.floor((end - start) / (1000 * 60)))
          }
        }
        return undefined
      })()

      if (hasEnded) {
        const durationText = typeof computedDuration === 'number' ? formatDuration(computedDuration) : null
        return {
          icon: <img src="/icons/sleep.png" alt="Сон" className="w-9 h-9 object-contain" />,
          label: 'Сон',
          color: 'bg-indigo-100 text-indigo-600',
          bgColor: 'bg-indigo-50',
          description: '',
          extraInfo: durationText ? `😴 ${durationText}` : null
        }
      }

      return {
        icon: <img src="/icons/sleep.png" alt="Сон начат" className="w-9 h-9 object-contain" />,
        label: 'Сон начат',
        color: 'bg-indigo-100 text-indigo-600',
        bgColor: 'bg-indigo-50',
        description: '',
        extraInfo: '😴 В процессе'
      }
    }
    default:
      return {
        icon: <img src="/icons/activity.png" alt="Другое" className="w-9 h-9 object-contain" />,
        label: 'Другое',
        color: 'bg-gray-100 text-gray-600',
        bgColor: 'bg-gray-50',
        description: '',
        extraInfo: null
      }
  }
}

export const calculateAgeInMonths = (birthDate: string, now: Date = new Date()) => {
  const birth = new Date(birthDate)
  const diffInMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  return Math.max(0, diffInMonths)
}
