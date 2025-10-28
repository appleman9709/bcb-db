import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { pushService } from '../services/pushService'

export default function PushNotificationManager() {
  const { family, member } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
      setError('Произошла ошибка при подписке')
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
        <div className="p-3 bg-red-50 text-red-700 rounded-3xl text-sm border border-red-200">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-50 text-green-700 rounded-3xl text-sm border border-green-200">
          {success}
        </div>
      )}
      
      <div className="space-y-3">
        <p className="text-xs text-gray-600">
          Получайте push-уведомления о важных событиях в BabyCare Dashboard
        </p>
        
        {!isSubscribed ? (
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-3xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {isLoading ? 'Подписка...' : '🔔 Подписаться на уведомления'}
          </button>
        ) : (
          <button
            onClick={handleUnsubscribe}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-3xl hover:bg-gray-700 disabled:opacity-50 text-sm font-medium"
          >
            {isLoading ? 'Отписка...' : '🔕 Отписаться от уведомлений'}
          </button>
        )}
      </div>
    </div>
  )
}

