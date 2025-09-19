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
  
  return (
    <Card onClick={onClick} className="relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${colorClasses[color]} flex items-center justify-center text-white text-xl shadow-lg`}>
          {icon}
        </div>
      </div>
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-r ${colorClasses[color]} opacity-10 rounded-full -translate-y-6 translate-x-6`}></div>
    </Card>
  )
}
