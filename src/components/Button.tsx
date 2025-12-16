import React, { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}

export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  className = ''
}: ButtonProps) {
  const baseClasses = 'font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white focus:ring-blue-500 shadow-lg',
    secondary: 'text-gray-700 focus:ring-gray-500 border border-gray-200',
    success: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white focus:ring-green-500 shadow-lg',
    warning: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white focus:ring-yellow-500 shadow-lg',
    danger: 'bg-gradient-to-r from-red-500 to-pink-600 text-white focus:ring-red-500 shadow-lg'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  }
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
