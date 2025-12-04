import React from 'react'

interface BottomNavigationProps {
  activeTab: 'home' | 'settings' | 'tamagotchi' | 'tetris'
  onTabChange: (tab: 'home' | 'settings' | 'tamagotchi' | 'tetris') => void
}

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <div className="liquid-glass-tab-bar" data-landscape-side="right">
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
          <span className="liquid-glass-tab-label">Никола</span>
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
          <span className="liquid-glass-tab-label">Тамагочи</span>
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
          <span className="liquid-glass-tab-label">Тетрис</span>
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
          <span className="liquid-glass-tab-label">Настройки</span>
        </button>
      </div>
    </div>
  )
}
