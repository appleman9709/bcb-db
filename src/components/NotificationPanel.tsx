import React, { useState } from 'react'
import { useNotifications } from '../contexts/NotificationContext'
import NotificationToast from './NotificationToast'

const NotificationPanel: React.FC = () => {
  const { notifications, markAsRead, removeNotification, clearAll, requestPermission } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const [permissionRequested, setPermissionRequested] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  const handleRequestPermission = async () => {
    const granted = await requestPermission()
    setPermissionRequested(true)
    
    if (granted) {
      // Показываем уведомление об успешном разрешении
      // Это будет обработано через контекст
    }
  }

  const handleMarkAsRead = (id: string) => {
    markAsRead(id)
  }

  const handleRemoveNotification = (id: string) => {
    removeNotification(id)
  }

  return (
    <>
      {/* Кнопка уведомлений */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          🔔
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Панель уведомлений */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Уведомления</h3>
                <div className="flex space-x-2">
                  {!permissionRequested && (
                    <button
                      onClick={handleRequestPermission}
                      className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      Разрешить
                    </button>
                  )}
                  <button
                    onClick={clearAll}
                    className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    Очистить
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="text-2xl mb-2">🔔</div>
                  <p>Нет уведомлений</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="relative">
                      <NotificationToast
                        notification={notification}
                        onClose={() => handleRemoveNotification(notification.id)}
                      />
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="absolute top-2 right-2 text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          Прочитано
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Overlay для закрытия панели */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

export default NotificationPanel
