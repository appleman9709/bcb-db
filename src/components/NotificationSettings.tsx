import React, { useEffect } from 'react'
import { useNotification } from '../contexts/NotificationContext'

export default function NotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    checkStatus
  } = useNotification()

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          Push-уведомления не поддерживаются
        </h3>
        <p className="text-yellow-700">
          Ваш браузер не поддерживает push-уведомления. Пожалуйста, используйте современный браузер.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Push-уведомления
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {permission === 'denied' && !isSubscribed && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm mb-2">
            Разрешения для уведомлений заблокированы в настройках браузера.
          </p>
          <p className="text-yellow-700 text-xs">
            Чтобы включить уведомления, разрешите их в настройках браузера:
            <br />
            • Chrome: Настройки → Конфиденциальность и безопасность → Уведомления
            <br />
            • Firefox: Настройки → Конфиденциальность и безопасность → Разрешения
            <br />
            • Safari: Настройки → Веб-сайты → Уведомления
          </p>
        </div>
      )}

      {permission === 'granted' && isSubscribed && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            ✓ Вы подписаны на push-уведомления
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-700 mb-1">
            {isSubscribed
              ? 'Push-уведомления включены'
              : 'Push-уведомления выключены'}
          </p>
          <p className="text-xs text-gray-500">
            {isSubscribed
              ? 'Вы будете получать уведомления о важных событиях'
              : 'Включите, чтобы получать уведомления о важных событиях'}
          </p>
        </div>

        <button
          onClick={handleToggle}
          disabled={isLoading || permission === 'denied'}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors
            ${isSubscribed
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
            }
            ${(isLoading || permission === 'denied')
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Обработка...
            </span>
          ) : isSubscribed ? (
            'Отключить'
          ) : (
            'Включить'
          )}
        </button>
      </div>

      {isSubscribed && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            Вы будете получать уведомления о важных событиях:
            <br />• Новые записи активности
            <br />• Напоминания о важных событиях
            <br />• Изменения в режиме сна
          </p>
        </div>
      )}
    </div>
  )
}

