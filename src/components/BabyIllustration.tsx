import React from 'react'

type BabyState = 'normal' | 'hungry' | 'diaper' | 'bath'

interface BabyIllustrationProps {
  className?: string
  state?: BabyState
  onClick?: () => void
}

export default function BabyIllustration({ className = '', state = 'normal', onClick }: BabyIllustrationProps) {
  const getImageSrc = () => {
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
      {/* Основной круг с градиентом */}
      <div 
        className={`relative w-40 h-40 mx-auto ${getGradientClass()} rounded-full shadow-lg flex items-center justify-center iphone14-baby-illustration ${
          onClick ? 'cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105' : ''
        }`}
        onClick={onClick}
      >
        {/* Изображение малыша */}
        <img 
          src={getImageSrc()} 
          alt="Малыш" 
          className="object-contain relative z-10"
          style={{ width: '128px', height: '128px' }}
        />
        
      </div>
    </div>
  )
}
