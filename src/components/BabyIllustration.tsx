import React from 'react'

interface BabyIllustrationProps {
  className?: string
}

export default function BabyIllustration({ className = '' }: BabyIllustrationProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Основной круг с градиентом */}
      <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-blue-200 to-blue-300 rounded-full shadow-lg overflow-hidden flex items-center justify-center iphone14-baby-illustration">
        {/* Изображение малыша */}
        <img 
          src="/icons/baby.png" 
          alt="Малыш" 
          className="w-16 h-16 object-contain"
        />
      </div>
    </div>
  )
}
