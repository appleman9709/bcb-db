const webpush = require('web-push')

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
]

function parseAllowedOrigins(value) {
  if (!value) {
    return DEFAULT_ALLOWED_ORIGINS
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const allowedOrigins = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS)

function applyCors(req, res) {
  const origin = req.headers.origin

  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

  if (!origin) {
    return
  }

  if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    return
  }

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
}

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:noreply@babycare.app'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  console.log('VAPID keys configured successfully')
} else {
  console.error('VAPID keys are missing!')
}

module.exports = async (req, res) => {
  applyCors(req, res)

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error('VAPID keys not configured')
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'VAPID keys not configured. Please check environment variables.'
    })
  }

  try {
    const { subscription, title, body, icon, tag, data } = req.body

    console.log('Received push request:', {
      hasSubscription: !!subscription,
      title,
      body
    })

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      console.error('Invalid subscription data:', subscription)
      return res.status(400).json({ error: 'Invalid subscription data' })
    }

    if (!title || !body) {
      console.error('Missing title or body')
      return res.status(400).json({ error: 'Title and body are required' })
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      tag: tag || 'babycare-notification',
      data: data || {},
      timestamp: Date.now()
    })

    console.log('Sending notification to:', subscription.endpoint)

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
        TTL: 86400,
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

    if (error.statusCode === 410) {
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
      message: error.message,
      details: error.toString()
    })
  }
}

