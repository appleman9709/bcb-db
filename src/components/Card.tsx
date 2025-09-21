import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className = '', onClick }: CardProps) {
  const baseClasses = [
    'rounded-2xl',
    'border',
    'border-gray-700/60',
    'bg-gray-900/80',
    'p-6',
    'shadow-lg',
    'transition-shadow',
    'duration-200'
  ]

  const finalClassName = [
    ...baseClasses,
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
