import React from 'react'

type BabyState = 'normal' | 'hungry' | 'diaper' | 'bath'

interface BabyIllustrationProps {
  className?: string
  state?: BabyState
  onClick?: () => void
  customImage?: string | null
  dutyProgress?: number
}

export default function BabyIllustration({ className = '', state = 'normal', onClick, customImage, dutyProgress = 0 }: BabyIllustrationProps) {
  const getImageSrc = () => {
    // Если есть пользовательское изображение и состояние normal, используем его
    if (customImage && state === 'normal') {
      return customImage
    }
    
    switch (state) {
      case 'hungry':
        return '/icons/old-feed.png'
      case 'diaper':
        return '/icons/old-pee.png'
      case 'bath':
        return '/icons/old-bath.png'
      default:
        return '/icons/baby.png'
    }
  }

  const getGradientClass = () => {
    switch (state) {
      case 'hungry':
        return 'bg-gradient-to-br from-red-200 to-red-300'
      case 'diaper':
        return 'bg-gradient-to-br from-yellow-200 to-yellow-300'
      case 'bath':
        return 'bg-gradient-to-br from-purple-200 to-purple-300'
      default:
        return 'bg-gradient-to-br from-blue-200 to-blue-300'
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Полоса дежурства вокруг изображения */}
      <div className="relative w-64 h-64 mx-auto">
        {/* SVG для круговой полосы дежурства */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 192 192">
          <defs>
            <linearGradient id="dutyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          {/* Фон полосы */}
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="6"
          />
          {/* Прогресс полосы */}
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            stroke="url(#dutyGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 88}`}
            strokeDashoffset={`${2 * Math.PI * 88 * (1 - dutyProgress / 100)}`}
            className="transition-all duration-500 ease-out"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '96px 96px' }}
          />
        </svg>
        
        {/* Основной круг с градиентом */}
        <div 
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-52 h-52 ${getGradientClass()} rounded-full shadow-lg flex items-center justify-center iphone14-baby-illustration ${
            onClick ? 'cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105' : ''
          }`}
          onClick={onClick}
        >
          {/* Изображение малыша */}
          <img 
            src={getImageSrc()} 
            alt="Малыш" 
            className={`relative z-10 ${
              customImage && state === 'normal' 
                ? 'w-full h-full object-cover rounded-full' 
                : 'object-contain'
            }`}
            style={{ 
              width: customImage && state === 'normal' ? '100%' : '160px', 
              height: customImage && state === 'normal' ? '100%' : '160px' 
            }}
          />
        </div>
      </div>
    </div>
  )
}
