import { ReactNode } from 'react'
import Card from './Card'

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'pink'
  subtitle?: string
  onClick?: () => void
  gradientProgress?: number // От 0 (зеленый) до 1 (красный)
}

export default function StatCard({ title, value, icon, color = 'blue', subtitle, onClick, gradientProgress }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
    pink: 'from-pink-500 to-pink-600'
  }

  // Функция для создания градиента от зеленого к красному
  const getGradientStyle = (progress: number) => {
    if (progress === undefined) return {}
    
    // Более красивые и насыщенные цвета с плавными переходами
    let startColor, endColor
    
    if (progress <= 0.2) {
      // Зеленый диапазон - от ярко-зеленого к темно-зеленому
      const intensity = progress / 0.2
      startColor = `rgb(${Math.round(34 + (20 - 34) * intensity)}, ${Math.round(197 + (180 - 197) * intensity)}, ${Math.round(94 + (80 - 94) * intensity)})`
      endColor = `rgb(${Math.round(20 + (10 - 20) * intensity)}, ${Math.round(180 + (150 - 180) * intensity)}, ${Math.round(80 + (60 - 80) * intensity)})`
    } else if (progress <= 0.8) {
      // Желто-оранжевый диапазон - плавный переход через теплые тона
      const intensity = (progress - 0.2) / 0.6
      const r = Math.round(20 + (255 - 20) * intensity)
      const g = Math.round(150 + (140 - 150) * intensity)
      const b = Math.round(60 + (0 - 60) * intensity)
      
      startColor = `rgb(${r}, ${g}, ${b})`
      endColor = `rgb(${Math.round(r * 0.8)}, ${Math.round(g * 0.7)}, ${Math.round(b * 0.6)})`
    } else {
      // Красный диапазон - от оранжево-красного к темно-красному
      const intensity = (progress - 0.8) / 0.2
      startColor = `rgb(${Math.round(255 - (255 - 220) * intensity)}, ${Math.round(140 - (140 - 38) * intensity)}, ${Math.round(0 + (38 - 0) * intensity)})`
      endColor = `rgb(${Math.round(220 - (220 - 180) * intensity)}, ${Math.round(38 + (20 - 38) * intensity)}, ${Math.round(38 + (20 - 38) * intensity)})`
    }
    
    return {
      background: `linear-gradient(135deg, ${startColor} 0%, ${endColor} 100%)`,
      transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      boxShadow: `0 8px 32px rgba(${startColor.match(/\d+/g)?.join(', ') || '0,0,0'}, 0.3)`,
      animation: 'gradientPulse 3s ease-in-out infinite'
    }
  }

  // Функция для определения оптимального цвета текста на основе яркости фона
  const getTextColorClass = (progress: number) => {
    if (progress === undefined) return 'text-white'
    
    // Для светлых градиентов (желто-оранжевый диапазон) используем темный текст
    if (progress > 0.3 && progress < 0.7) {
      return 'text-gray-900'
    }
    
    // Для остальных случаев используем белый текст с тенью
    return 'text-white'
  }

  const iconClassName = [
    'w-12 h-12 sm:w-14 sm:h-14',
    'rounded-3xl',
    'bg-gradient-to-r',
    colorClasses[color],
    'flex items-center justify-center text-white text-lg sm:text-xl shadow-lg'
  ].join(' ')

  return (
    <Card 
      onClick={onClick} 
      className={`space-y-1 sm:space-y-2 p-2 sm:p-3 md:p-4 iphone14-stat-card ${gradientProgress !== undefined ? 'shadow-lg transform hover:scale-[1.02]' : ''}`}
      style={gradientProgress !== undefined ? getGradientStyle(gradientProgress) : undefined}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm sm:text-base font-medium mb-0.5 sm:mb-1 ${gradientProgress !== undefined ? 'text-white/80 drop-shadow-sm' : 'text-gray-400'}`}>{title}</p>
          <p className={`text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-0.5 sm:mb-1 truncate ${getTextColorClass(gradientProgress)} ${gradientProgress !== undefined ? 'drop-shadow-lg' : ''}`}>{value}</p>
          {subtitle && <p className={`text-sm sm:text-base truncate ${gradientProgress !== undefined ? 'text-white/70 drop-shadow-sm' : 'text-gray-500'}`}>{subtitle}</p>}
        </div>
        <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ${iconClassName.split(' ').slice(1).join(' ')}`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
