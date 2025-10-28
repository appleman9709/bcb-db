/**
 * Vercel Serverless Function для отправки push-уведомлений
 * 
 * Endpoint: /api/push/send
 * Method: POST
 * 
 * Body:
 * {
 *   "subscription": {
 *     "endpoint": "...",
 *     "keys": {
 *       "p256dh": "...",
 *       "auth": "..."
 *     }
 *   },
 *   "title": "Заголовок",
 *   "body": "Текст уведомления",
 *   "icon": "/icons/icon-192x192.png",
 *   "tag": "notification-tag",
 *   "data": { "url": "/" }
 * }
 */

const webpush = require('web-push')

// Инициализация VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:noreply@babycare.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

module.exports = async (req, res) => {
  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { subscription, title, body, icon, tag, data } = req.body

    // Валидация обязательных полей
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription data' })
    }

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' })
    }

    // Подготовка payload
    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      tag: tag || 'babycare-notification',
      data: data || {},
      timestamp: Date.now()
    })

    // Отправка уведомления
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      },
      payload,
      {
        TTL: 86400, // 24 часа
        urgency: 'normal'
      }
    )

    console.log('Push notification sent successfully')
    
    return res.status(200).json({ 
      success: true,
      message: 'Notification sent successfully'
    })

  } catch (error) {
    console.error('Error sending push notification:', error)
    
    // Обработка специфичных ошибок
    if (error.statusCode === 410) {
      // Subscription expired
      return res.status(410).json({ 
        error: 'Subscription expired',
        code: 'subscription_expired'
      })
    }
    
    if (error.statusCode === 400) {
      return res.status(400).json({ 
        error: 'Invalid subscription',
        code: 'invalid_subscription'
      })
    }

    return res.status(500).json({ 
      error: 'Failed to send notification',
      message: error.message
    })
  }
}

