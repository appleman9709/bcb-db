import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  variant?: 'default' | 'glass'
  style?: React.CSSProperties
}

export default function Card({ children, className = '', onClick, variant = 'default', style }: CardProps) {
  const baseClasses = [
    'rounded-xl sm:rounded-2xl',
    'p-3 sm:p-4 lg:p-6',
    'shadow-lg',
    'transition-shadow',
    'duration-200'
  ]

  const variantClasses: Record<CardProps['variant'], string> = {
    default: 'border border-gray-700/60',
    glass: 'border border-white/10 bg-white/5 backdrop-blur-lg'
  }

  // Если есть style с градиентом, не применяем фоновый цвет по умолчанию
  const backgroundClass = style?.background ? '' : 'bg-gray-900/80'

  const finalClassName = [
    ...baseClasses,
    variantClasses[variant],
    backgroundClass,
    onClick ? 'cursor-pointer hover:shadow-xl' : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <div
      className={finalClassName}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  )
}
