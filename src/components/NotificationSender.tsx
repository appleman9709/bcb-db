import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { pushService } from '../services/pushService'
import { dataService } from '../services/dataService'
import Button from './Button'

export default function NotificationSender() {
  const { family, member } = useAuth()
  const [title, setTitle] = useState('')
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
    if (!title.trim() || !body.trim()) {
      setError('Заполните заголовок и текст уведомления')
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
          title,
          body
        )
      } else {
        // Send to specific users
        sentCount = await pushService.sendNotificationToUsers(
          family.id,
          targetUsers,
          title,
          body
        )
      }
      
      setSuccess(`Уведомление отправлено ${sentCount} ${sentCount === 1 ? 'получателю' : 'получателям'}`)
      setTitle('')
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
    <div className="space-y-3">
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
      
      <div className="space-y-3">
        <div>
          <div className="space-y-2 bg-gray-50 p-3 rounded-2xl">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={targetUsers.length === 0}
                onChange={() => setTargetUsers([])}
                className="mr-2 rounded"
              />
              Всем членам семьи (включая меня)
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
          </div>
        </div>
        
        <div>
          
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок уведомления"
            className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500"
            style={{ fontSize: '16px' }}
          />
        </div>
        
        <div>
          
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Текст уведомления"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500"
            style={{ fontSize: '16px' }}
          />
        </div>
        
        <Button
          onClick={handleSend}
          disabled={isLoading || !title.trim() || !body.trim()}
          className="w-full text-sm"
        >
          {isLoading ? 'Отправка...' : '📤 Отправить уведомление'}
        </Button>
      </div>
    </div>
  )
}

