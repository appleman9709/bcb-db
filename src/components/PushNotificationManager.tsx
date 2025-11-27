import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { pushService } from '../services/pushService'
import Button from './Button'
import React from 'react'

export default function PushNotificationManager() {
  const { family, member } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Проверяем существующую подписку при загрузке
  useEffect(() => {
    const checkSubscription = async () => {
      if (!family || !member) return

      try {
        const subscription = await pushService.getSubscription(family.id, member.user_id)
        setIsSubscribed(!!subscription)
      } catch (err) {
        console.error('Error checking subscription:', err)
      }
    }

    checkSubscription()
  }, [family, member])

  const handleSubscribe = async () => {
    if (!family || !member) return

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const subscription = await pushService.subscribe(family.id, member.user_id)
      
      if (subscription) {
        setIsSubscribed(true)
        setSuccess('Вы успешно подписались на push-уведомления!')
      } else {
        setError('Не удалось подписаться на уведомления')
      }
    } catch (err) {
      console.error('Error subscribing:', err)
      let errorMessage = 'Произошла ошибка при подписке'
      
      if (err instanceof Error) {
        errorMessage = err.message
        // Более понятные сообщения об ошибках
        if (err.message.includes('VAPID')) {
          errorMessage = 'VAPID ключи не настроены. Проверьте настройки сервера.'
        } else if (err.message.includes('Permission')) {
          errorMessage = 'Разрешение на уведомления было отклонено. Разрешите уведомления в настройках браузера.'
        } else if (err.message.includes('serviceWorker')) {
          errorMessage = 'Service Worker не поддерживается или не зарегистрирован. Обновите страницу.'
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    if (!family || !member) return

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const success = await pushService.unsubscribe(family.id, member.user_id)
      
      if (success) {
        setIsSubscribed(false)
        setSuccess('Вы отписались от push-уведомлений')
      } else {
        setError('Не удалось отписаться от уведомлений')
      }
    } catch (err) {
      console.error('Error unsubscribing:', err)
      setError('Произошла ошибка при отписке')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-2xl text-sm border border-red-200">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-50 text-green-700 rounded-2xl text-sm border border-green-200">
          {success}
        </div>
      )}
      
      <div className="space-y-3">
        <p className="text-xs text-gray-600">
          Получайте push-уведомления о важных событиях от Николы
        </p>
        
        {!isSubscribed ? (
          <Button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full text-sm"
          >
            {isLoading ? 'Подписка...' : '🔔 Подписаться на уведомления'}
          </Button>
        ) : (
          <Button
            onClick={handleUnsubscribe}
            disabled={isLoading}
            className="w-full text-sm"
          >
            {isLoading ? 'Отписка...' : '🔕 Отписаться от уведомлений'}
          </Button>
        )}
      </div>
    </div>
  )
}

