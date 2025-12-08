import React from 'react'

export default function LoadingScreen() {
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Иконка малыша с циркулярным прогресс-баром */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          {/* Циркулярный прогресс-бар */}
          <svg className="absolute inset-0" width="160" height="160">
            {/* Фоновый круг */}
            <circle
              cx="80"
              cy="80"
              r="76"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-gray-200"
            />
            {/* Прогресс-круг с анимацией вращения */}
            <circle
              cx="80"
              cy="80"
              r="76"
              stroke="url(#gradient)"
              strokeWidth="4"
              fill="none"
              strokeDasharray="119"
              strokeLinecap="round"
              className="animate-spin"
              style={{
                strokeDashoffset: '60',
                transformOrigin: '80px 80px'
              }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Иконка малыша */}
          <img 
            src="/icons/baby.png" 
            alt="Малыш" 
            className="w-32 h-32 object-contain animate-pulse relative z-10"
          />
        </div>
      </div>
    </div>
  )
}
