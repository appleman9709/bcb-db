import React from 'react'

interface ActivityCardProps {
  icon: string
  title: string
  subtitle: string
  progress: number // 0-100
  value: string
  color: 'blue' | 'green' | 'orange'
}

export default function ActivityCard({ icon, title, subtitle, progress, value, color }: ActivityCardProps) {
  const colorClasses = {
    blue: 'from-blue-400 to-blue-500',
    green: 'from-green-400 to-green-500', 
    orange: 'from-orange-400 to-orange-500'
  }

  const progressColorClasses = {
    blue: 'bg-blue-400',
    green: 'bg-green-400',
    orange: 'bg-orange-400'
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
      {/* Иконка */}
      <div className={`w-12 h-12 rounded-3xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white text-xl shadow-sm`}>
        {icon}
      </div>
      
      {/* Контент */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        
        {/* Прогресс-бар */}
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${progressColorClasses[color]} transition-all duration-300`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          ></div>
        </div>
      </div>
      
      {/* Значение */}
      <div className="text-right">
        <span className="text-sm font-medium text-gray-700">{value}</span>
      </div>
    </div>
  )
}
