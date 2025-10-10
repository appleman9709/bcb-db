import React from 'react'

interface BottomNavigationProps {
  activeTab: 'home' | 'history'
  onTabChange: (tab: 'home' | 'history') => void
}

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb iphone14-nav">
      <div className="flex justify-center items-center gap-8">
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
      </div>
    </div>
  )
}
