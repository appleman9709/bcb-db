import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  variant?: 'default' | 'glass'
}

export default function Card({ children, className = '', onClick, variant = 'default' }: CardProps) {
  const baseClasses = [
    'rounded-2xl',
    'p-6',
    'shadow-lg',
    'transition-shadow',
    'duration-200'
  ]

  const variantClasses: Record<CardProps['variant'], string> = {
    default: 'border border-gray-700/60 bg-gray-900/80',
    glass: 'border border-white/10 bg-white/5 backdrop-blur-lg'
  }

  const finalClassName = [
    ...baseClasses,
    variantClasses[variant],
    onClick ? 'cursor-pointer hover:shadow-xl' : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <div
      className={finalClassName}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
