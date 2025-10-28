import React from 'react'

/**
 * Компонент для отображения рекорда/статистики
 * Упрощает структуру блоков с рекордами
 */
interface RecordDisplayProps {
  icon: string
  title: string
  playerName: string
  date: string
  score: number
  details: string
  className?: string
}

export const RecordDisplay: React.FC<RecordDisplayProps> = ({
  icon,
  title,
  playerName,
  date,
  score,
  details,
  className = ''
}) => (
  <div className={`bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-yellow-200 p-3 flex items-center justify-between ${className}`}>
    <div className="flex items-center gap-2">
      <span className="text-xl">{icon}</span>
      <div>
        <div className="font-bold text-yellow-800 text-sm">{title}</div>
        <div className="font-semibold text-yellow-700 text-xs">{playerName}</div>
        <div className="text-xs text-yellow-600">{date}</div>
      </div>
    </div>
    <div className="text-right">
      <div className="font-bold text-yellow-800 text-lg">{score.toLocaleString()}</div>
      <div className="text-xs text-yellow-600">{details}</div>
    </div>
  </div>
)
