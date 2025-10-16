import React from 'react'

interface BottomNavigationProps {
  activeTab: 'home' | 'history' | 'settings' | 'tamagotchi' | 'tetris'
  onTabChange: (tab: 'home' | 'history' | 'settings' | 'tamagotchi' | 'tetris') => void
}

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <div className="liquid-glass-tab-bar">
      <div className="liquid-glass-tab-container">
        {/* Дом */}
        <button
          onClick={() => onTabChange('home')}
          className={`liquid-glass-tab-button ${activeTab === 'home' ? 'liquid-glass-tab-active' : ''}`}
        >
          <div className="liquid-glass-tab-icon">
            <img 
              src="/icons/general.svg" 
              alt="Дашборд" 
              className="w-8 h-8"
            />
          </div>
        </button>

        {/* История */}
        <button
          onClick={() => onTabChange('history')}
          className={`liquid-glass-tab-button ${activeTab === 'history' ? 'liquid-glass-tab-active' : ''}`}
        >
          <div className="liquid-glass-tab-icon">
            <img 
              src="/icons/history.svg" 
              alt="История" 
              className="w-8 h-8"
            />
          </div>
        </button>

        {/* Тамагочи */}
        <button
          onClick={() => onTabChange('tamagotchi')}
          className={`liquid-glass-tab-button ${activeTab === 'tamagotchi' ? 'liquid-glass-tab-active' : ''}`}
        >
          <div className="liquid-glass-tab-icon">
            <img 
              src="/icons/tamagochi.svg" 
              alt="Тамагочи" 
              className="w-8 h-8"
            />
          </div>
        </button>

        {/* Тетрис */}
        <button
          onClick={() => onTabChange('tetris')}
          className={`liquid-glass-tab-button ${activeTab === 'tetris' ? 'liquid-glass-tab-active' : ''}`}
        >
          <div className="liquid-glass-tab-icon">
            <img 
              src="/icons/tetris.svg" 
              alt="Тетрис" 
              className="w-8 h-8"
            />
          </div>
        </button>

        {/* Настройки */}
        <button
          onClick={() => onTabChange('settings')}
          className={`liquid-glass-tab-button ${activeTab === 'settings' ? 'liquid-glass-tab-active' : ''}`}
        >
          <div className="liquid-glass-tab-icon">
            <img 
              src="/icons/settings.svg" 
              alt="Настройки" 
              className="w-8 h-8"
            />
          </div>
        </button>
      </div>
    </div>
  )
}
