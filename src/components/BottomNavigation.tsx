import React from 'react'

interface BottomNavigationProps {
  activeTab: 'home' | 'history' | 'settings' | 'tamagotchi' | 'tetris'
  onTabChange: (tab: 'home' | 'history' | 'settings' | 'tamagotchi' | 'tetris') => void
}

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb iphone14-nav">
      <div className="flex justify-center items-center gap-6">
        {/* Дом */}
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors iphone14-nav-button ${
            activeTab === 'home' 
              ? 'text-blue-500 bg-blue-50' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
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
            className="w-5 h-5"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
          <span className="text-xs font-medium">Главная</span>
        </button>

        {/* История */}
        <button
          onClick={() => onTabChange('history')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors iphone14-nav-button ${
            activeTab === 'history' 
              ? 'text-blue-500 bg-blue-50' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
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
            className="w-5 h-5"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
          <span className="text-xs font-medium">История</span>
        </button>

        {/* Тамагочи */}
        <button
          onClick={() => onTabChange('tamagotchi')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors iphone14-nav-button ${
            activeTab === 'tamagotchi' 
              ? 'text-blue-500 bg-blue-50' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
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
            className="w-5 h-5"
          >
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
          <span className="text-xs font-medium">Тамагочи</span>
        </button>

        {/* Тетрис */}
        <button
          onClick={() => onTabChange('tetris')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors iphone14-nav-button ${
            activeTab === 'tetris' 
              ? 'text-blue-500 bg-blue-50' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
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
            className="w-5 h-5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <rect x="7" y="7" width="3" height="3"/>
            <rect x="14" y="7" width="3" height="3"/>
            <rect x="7" y="14" width="3" height="3"/>
            <rect x="14" y="14" width="3" height="3"/>
          </svg>
          <span className="text-xs font-medium">Тетрис</span>
        </button>

        {/* Настройки */}
        <button
          onClick={() => onTabChange('settings')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors iphone14-nav-button ${
            activeTab === 'settings' 
              ? 'text-blue-500 bg-blue-50' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
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
            className="w-5 h-5"
          >
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span className="text-xs font-medium">Настройки</span>
        </button>
      </div>
    </div>
  )
}
