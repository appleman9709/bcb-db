import React from 'react'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <div className="bg-white px-3 py-2 flex items-center justify-between border-b border-gray-100 iphone14-header">
      {/* Меню */}
      <button
        onClick={onMenuClick}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Открыть меню"
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="w-5 h-5 text-gray-700"
        >
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Название приложения */}
      <h1 className="text-lg font-bold text-gray-900">Никола</h1>

      {/* Пустое место для симметрии */}
      <div className="w-8 h-8"></div>
    </div>
  )
}
