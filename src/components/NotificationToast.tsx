import React from 'react'
import { Notification } from '../contexts/NotificationContext'

interface NotificationToastProps {
  notification: Notification
  onClose: () => void
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'error':
        return '❌'
      case 'reminder':
        return '🔔'
      default:
        return 'ℹ️'
    }
  }

  const getBgColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'reminder':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getTextColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-800'
      case 'warning':
        return 'text-yellow-800'
      case 'error':
        return 'text-red-800'
      case 'reminder':
        return 'text-blue-800'
      default:
        return 'text-gray-800'
    }
  }

  return (
    <div className={`relative p-4 rounded-lg border-2 shadow-lg transition-all duration-300 ${getBgColor()} ${notification.read ? 'opacity-60' : ''}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 text-2xl">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${getTextColor()}`}>
            {notification.title}
          </h4>
          <p className={`text-sm mt-1 ${getTextColor()} opacity-80`}>
            {notification.message}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {notification.timestamp.toLocaleTimeString()}
          </p>
          
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded-full hover:bg-blue-600 transition-colors"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default NotificationToast
