import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { pushService } from '../services/pushService'
import { dataService } from '../services/dataService'

export default function NotificationSender() {
  const { family, member } = useAuth()
  const [body, setBody] = useState('')
  const [targetUsers, setTargetUsers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [familyMembers, setFamilyMembers] = useState<any[]>([])

  // Load family members on mount
  useEffect(() => {
    const loadMembers = async () => {
      if (!family) return
      
      const members = await dataService.getFamilyMembers()
      setFamilyMembers(members)
    }
    
    loadMembers()
  }, [family])

  const handleSend = async () => {
    if (!family || !member) return
    if (!body.trim()) {
      setError('Заполните текст уведомления')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      let sentCount = 0
      
      if (targetUsers.length === 0) {
        // Send to all family members
        sentCount = await pushService.sendNotificationToFamily(
          family.id,
          'Уведомление',
          body
        )
      } else {
        // Send to specific users
        sentCount = await pushService.sendNotificationToUsers(
          family.id,
          targetUsers,
          'Уведомление',
          body
        )
      }
      
      setSuccess(`Уведомление отправлено ${sentCount} ${sentCount === 1 ? 'получателю' : 'получателям'}`)
      setBody('')
      setTargetUsers([])
    } catch (err) {
      console.error('Error sending notification:', err)
      
      let errorMessage = 'Произошла ошибка при отправке уведомления'
      
      if (err instanceof Error) {
        // Обработка различных ошибок
        if (err.message.includes('configuration error') || err.message.includes('VAPID keys not configured')) {
          errorMessage = '❌ Push-уведомления не настроены на сервере.\n\n📋 Добавьте VAPID ключи в Vercel:\nSettings → Environment Variables\n\n📖 См. VERCEL_VAPID_SETUP.md'
        } else if (err.message.includes('подписчиков')) {
          errorMessage = 'Нет подписчиков для отправки уведомлений. Попросите членов семьи подписаться на уведомления.'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleUser = (userId: string) => {
    if (targetUsers.includes(userId)) {
      setTargetUsers(targetUsers.filter(id => id !== userId))
    } else {
      setTargetUsers([...targetUsers, userId])
    }
  }

  return (
    <div className="mt-3">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-3xl text-sm border border-red-200 whitespace-pre-line">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-50 text-green-700 rounded-3xl text-sm border border-green-200">
          {success}
        </div>
      )}
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={targetUsers.length === 0}
                onChange={() => setTargetUsers([])}
                className="mr-2 rounded"
              />
              Всем членам семьи
            </label>
            {familyMembers
              .filter(m => m.user_id !== member?.user_id)
              .map(m => (
                <label key={m.user_id} className="flex items-center text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={targetUsers.includes(m.user_id)}
                    onChange={() => toggleUser(m.user_id)}
                    className="mr-2 rounded"
                  />
                  {m.name || m.role || m.user_id}
                </label>
              ))}
          
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Текст уведомления"
            rows={3}
            className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500"
            style={{ fontSize: '16px' }}
          />
        
        <button
          onClick={handleSend}
          disabled={isLoading || !body.trim()}
          className="w-full bg-blue-500 text-white font-semibold py-3 px-3 rounded-2xl shadow-lg text-sm"
        >
          {isLoading ? 'Отправка...' : '📤 Отправить уведомление'}
        </button>
    </div>
  )
}