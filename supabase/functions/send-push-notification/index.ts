/**
 * Supabase Edge Function для отправки push-уведомлений
 * 
 * Deploy:
 * supabase functions deploy send-push-notification
 * 
 * Usage:
 * curl -X POST https://your-project.supabase.co/functions/v1/send-push-notification \
 *   -H "Authorization: Bearer YOUR_ANON_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"subscription": {...}, "title": "...", "body": "..."}'
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface NotificationPayload {
  subscription: PushSubscription
  title: string
  body: string
  icon?: string
  tag?: string
  data?: Record<string, any>
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, content-type'
      }
    })
  }

  try {
    const payload: NotificationPayload = await req.json()

    // Валидация
    if (!payload.subscription?.endpoint || !payload.subscription?.keys) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Получение VAPID ключей из secrets
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Для работы с web-push в Deno используем fetch напрямую
    const notificationPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      tag: payload.tag || 'babycare-notification',
      data: payload.data || {},
      timestamp: Date.now()
    }

    // Отправка через web-push API
    // В реальной реализации здесь будет вызов web-push сервиса
    // Для примера используем простой fetch к push service
    
    const response = await fetch(payload.subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400'
      },
      body: JSON.stringify(notificationPayload)
    })

    if (!response.ok) {
      throw new Error(`Failed to send notification: ${response.statusText}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})

