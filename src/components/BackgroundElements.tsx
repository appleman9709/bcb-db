import React from 'react'
import { useTheme } from '../contexts/ThemeContext'

export default function BackgroundElements() {
  const { actualTheme } = useTheme()
  const isDark = actualTheme === 'dark'

  if (isDark) {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f1b39] via-[#0a0f24] to-[#040814]">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                'radial-gradient(1px 1px at 20% 30%, rgba(255, 255, 255, 0.7) 0, rgba(255, 255, 255, 0.7) 1px, transparent 1px), radial-gradient(1px 1px at 80% 20%, rgba(255, 255, 255, 0.6) 0, rgba(255, 255, 255, 0.6) 1px, transparent 1px), radial-gradient(1px 1px at 40% 70%, rgba(255, 255, 255, 0.6) 0, rgba(255, 255, 255, 0.6) 1px, transparent 1px), radial-gradient(1px 1px at 65% 55%, rgba(255, 255, 255, 0.5) 0, rgba(255, 255, 255, 0.5) 1px, transparent 1px)'
            }}
          ></div>

          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#060a15] via-transparent to-transparent"></div>
        </div>
      </div>
    )
  }
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Небо с облаками - оптимизированные */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-100 to-blue-200">
        {/* Облака - только одно анимированное */}
        <div className="absolute top-8 left-8 w-16 h-8 bg-white rounded-3xl opacity-80 loading-element-primary"></div>
        <div className="absolute top-12 left-20 w-12 h-6 bg-white rounded-3xl opacity-60 decoration-animation"></div>
        <div className="absolute top-6 right-12 w-20 h-10 bg-white rounded-3xl opacity-70 decoration-animation"></div>
        <div className="absolute top-16 right-20 w-14 h-7 bg-white rounded-3xl opacity-50 decoration-animation"></div>
        
        {/* Звезды - только одна анимированная */}
        <div className="absolute top-4 left-16 w-1 h-1 bg-yellow-200 rounded-3xl loading-element-secondary"></div>
        <div className="absolute top-8 right-16 w-1 h-1 bg-yellow-200 rounded-3xl decoration-animation"></div>
        <div className="absolute top-12 left-32 w-1 h-1 bg-yellow-200 rounded-3xl decoration-animation"></div>
        <div className="absolute top-6 right-32 w-1 h-1 bg-yellow-200 rounded-3xl decoration-animation"></div>
      </div>
      
      {/* Ландшафт */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-green-300 to-green-200">
        {/* Холмы */}
        <div className="absolute bottom-0 left-0 w-32 h-20 bg-green-400 rounded-t-full"></div>
        <div className="absolute bottom-0 left-24 w-24 h-16 bg-green-500 rounded-t-full"></div>
        <div className="absolute bottom-0 right-0 w-28 h-24 bg-green-400 rounded-t-full"></div>
        <div className="absolute bottom-0 right-20 w-20 h-18 bg-green-500 rounded-t-full"></div>
        
        {/* Кусты */}
        <div className="absolute bottom-10 left-12 w-8 h-8 bg-green-600 rounded-3xl"></div>
        <div className="absolute bottom-8 left-20 w-6 h-6 bg-green-600 rounded-3xl"></div>
        <div className="absolute bottom-12 right-16 w-10 h-10 bg-green-600 rounded-3xl"></div>
        <div className="absolute bottom-10 right-24 w-7 h-7 bg-green-600 rounded-3xl"></div>
        
        {/* Цветы */}
        <div className="absolute bottom-14 left-16 w-3 h-3 bg-orange-300 rounded-3xl"></div>
        <div className="absolute bottom-12 left-28 w-2 h-2 bg-white rounded-3xl"></div>
        <div className="absolute bottom-16 right-20 w-3 h-3 bg-orange-300 rounded-3xl"></div>
        <div className="absolute bottom-14 right-28 w-2 h-2 bg-white rounded-3xl"></div>
        <div className="absolute bottom-10 left-36 w-2 h-2 bg-orange-300 rounded-3xl"></div>
        <div className="absolute bottom-12 right-36 w-3 h-3 bg-white rounded-3xl"></div>
      </div>
    </div>
  )
}
