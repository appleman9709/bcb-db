import React from 'react'

type TabKey = 'home' | 'settings' | 'tamagotchi' | 'tetris'

interface BottomNavigationProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
}

const tabs: Array<{ key: TabKey; label: string; icon: string; alt: string }> = [
  { key: 'home', label: 'Никола', icon: '/icons/general.svg', alt: 'Дашборд' },
  { key: 'tamagotchi', label: 'Тамагочи', icon: '/icons/tamagochi.svg', alt: 'Тамагочи' },
  { key: 'tetris', label: 'Тетрис', icon: '/icons/tetris.svg', alt: 'Тетрис' },
  { key: 'settings', label: 'Настройки', icon: '/icons/settings.svg', alt: 'Настройки' },
]

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <div className="liquid-glass-tab-bar" data-landscape-side="left">
     <div className="liquid-glass-tab-container">
      {tabs.map(({ key, label, icon, alt }) => (
          <button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            className={`liquid-glass-tab-button ${activeTab === key ? 'liquid-glass-tab-active' : ''}`}
            aria-pressed={activeTab === key}
          >
            <div className="liquid-glass-tab-icon">
              <img src={icon} alt={alt} className="w-8 h-8" />
            </div>
            <span className="liquid-glass-tab-label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}