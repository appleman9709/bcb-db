import { ReactNode } from 'react'
import Card from './Card'

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'pink'
  subtitle?: string
  onClick?: () => void
}

export default function StatCard({ title, value, icon, color = 'blue', subtitle, onClick }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
    pink: 'from-pink-500 to-pink-600'
  }

  const iconClassName = [
    'w-12 h-12',
    'rounded-xl',
    'bg-gradient-to-r',
    colorClasses[color],
    'flex items-center justify-center text-white text-xl shadow-lg'
  ].join(' ')

  return (
    <Card onClick={onClick} className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white mb-1 truncate">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
        </div>
        <div className={iconClassName}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
