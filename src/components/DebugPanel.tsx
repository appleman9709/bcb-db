import React, { useState } from 'react'
import { useNotifications } from '../contexts/NotificationContext'
import { notificationService } from '../services/notificationService'
import { dataService } from '../services/dataService'

const DebugPanel: React.FC = () => {
  const { notifications, addNotification, requestPermission } = useNotifications()
  const [debugInfo, setDebugInfo] = useState<string>('')

  const testNotification = (type: 'info' | 'success' | 'warning' | 'error' | 'reminder') => {
    addNotification({
      type,
      title: `Тест ${type}`,
      message: `Это тестовое уведомление типа ${type}`
    })
  }

  const testBrowserNotification = async () => {
    const granted = await requestPermission()
    if (granted) {
      addNotification({
        type: 'reminder',
        title: 'Браузерное уведомление',
        message: 'Это должно появиться как браузерное уведомление'
      })
    } else {
      setDebugInfo('Разрешение на уведомления не предоставлено')
    }
  }

  const checkReminders = async () => {
    try {
      const settings = await dataService.getSettings()
      if (settings) {
        const reminders = await notificationService.getReminderChecks(settings)
        setDebugInfo(`Найдено напоминаний: ${reminders.length}. Активных: ${reminders.filter(r => r.shouldNotify).length}`)
      } else {
        setDebugInfo('Настройки не найдены')
      }
    } catch (error) {
      setDebugInfo(`Ошибка: ${error}`)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <h3 className="font-bold mb-2">🐛 Debug Panel</h3>
      
      <div className="space-y-2 mb-3">
        <button
          onClick={() => testNotification('info')}
          className="w-full px-2 py-1 bg-blue-500 rounded text-xs hover:bg-blue-600"
        >
          Test Info
        </button>
        <button
          onClick={() => testNotification('success')}
          className="w-full px-2 py-1 bg-green-500 rounded text-xs hover:bg-green-600"
        >
          Test Success
        </button>
        <button
          onClick={() => testNotification('warning')}
          className="w-full px-2 py-1 bg-yellow-500 rounded text-xs hover:bg-yellow-600"
        >
          Test Warning
        </button>
        <button
          onClick={() => testNotification('reminder')}
          className="w-full px-2 py-1 bg-purple-500 rounded text-xs hover:bg-purple-600"
        >
          Test Reminder
        </button>
        <button
          onClick={testBrowserNotification}
          className="w-full px-2 py-1 bg-red-500 rounded text-xs hover:bg-red-600"
        >
          Test Browser
        </button>
        <button
          onClick={checkReminders}
          className="w-full px-2 py-1 bg-gray-500 rounded text-xs hover:bg-gray-600"
        >
          Check Reminders
        </button>
      </div>

      <div className="text-xs">
        <p>Уведомлений: {notifications.length}</p>
        <p>Непрочитанных: {notifications.filter(n => !n.read).length}</p>
        {debugInfo && <p className="text-yellow-300 mt-1">{debugInfo}</p>}
      </div>
    </div>
  )
}

export default DebugPanel
