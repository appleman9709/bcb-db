import { supabase } from '../lib/supabaseClient'

export interface PushSubscription {
  id?: number
  family_id: number
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at?: string
  updated_at?: string
}

/**
 * URL-safe base64 encode
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  
  return outputArray
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

const PUSH_API_BASE_URL = (() => {
  const override = import.meta.env.VITE_PUSH_API_BASE_URL?.trim()
  if (override) {
    return override.replace(/\/$/, '')
  }

  if (import.meta.env.PROD) {
    return ''
  }

  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    if (origin.includes('localhost:3000') || origin.includes('127.0.0.1:3000')) {
      return ''
    }
    if (origin.includes('5173') || origin.includes('5174')) {
      return 'http://localhost:3000'
    }
  }

  return 'http://localhost:3000'
})()

function buildPushApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (!PUSH_API_BASE_URL) {
    return normalizedPath
  }

  return `${PUSH_API_BASE_URL}${normalizedPath}`
}

class PushService {
  /**
   * Request permission for push notifications
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.error('This browser does not support push notifications')
      return 'denied'
    }
    
    if (Notification.permission === 'granted') {
      return 'granted'
    }
    
    if (Notification.permission === 'denied') {
      return 'denied'
    }
    
    return await Notification.requestPermission()
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(familyId: number, userId: string): Promise<PushSubscription | null> {
    // Check if notifications are supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.error('Push notifications are not supported')
      return null
    }

    // Check VAPID key
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    
    if (!vapidKey || vapidKey.trim() === '') {
      console.error('VAPID_PUBLIC_KEY is not configured.')
      console.log('Please create .env file with:')
      console.log('VITE_VAPID_PUBLIC_KEY=your_public_key_here')
      throw new Error('VAPID ключи не настроены. Создайте файл .env и добавьте VITE_VAPID_PUBLIC_KEY')
    }
    
    // Check if key is in correct format
    const keyLength = vapidKey.length
    const expectedLength = 87
    
    console.log('VAPID key info:', {
      length: keyLength,
      expectedLength,
      startsWith: vapidKey.substring(0, 3),
      firstChars: vapidKey.substring(0, 10) + '...'
    })
    
    if (keyLength !== expectedLength) {
      console.error(`Invalid VAPID key length: ${keyLength}, expected: ${expectedLength}`)
      throw new Error(`Неверная длина VAPID ключа: ${keyLength} символов (должно быть ${expectedLength}). Генерируйте новые ключи через: web-push generate-vapid-keys`)
    }
    
    // Check format (URL-safe base64)
    if (!vapidKey.match(/^[A-Za-z0-9_-]+$/)) {
      console.error('Invalid VAPID key format: contains invalid characters')
      throw new Error('VAPID ключ содержит недопустимые символы. Используйте только буквы, цифры, дефисы и подчеркивания')
    }

    // Request permission
    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      console.error('Permission denied for push notifications')
      return null
    }

    try {
      // Убеждаемся, что service worker зарегистрирован
      let registration = await navigator.serviceWorker.getRegistration()
      
      if (!registration) {
        // Если SW не зарегистрирован, регистрируем его
        registration = await navigator.serviceWorker.register('/sw.js')
        // Ждем активации
        await navigator.serviceWorker.ready
      } else {
        // Если уже зарегистрирован, ждем готовности
        registration = await navigator.serviceWorker.ready
      }

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      })

      // Extract keys
      const subscriptionData = subscription.toJSON()
      
      const pushSubscription: Omit<PushSubscription, 'id' | 'created_at' | 'updated_at'> = {
        family_id: familyId,
        user_id: userId,
        endpoint: subscriptionData.endpoint!,
        p256dh: subscriptionData.keys!.p256dh,
        auth: subscriptionData.keys!.auth!
      }

      // Save to database
      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert(pushSubscription, { onConflict: 'family_id,user_id' })
        .select()
        .single()

      if (error) {
        console.error('Error saving push subscription:', error)
        return null
      }

      console.log('Push subscription saved:', data)
      
      // Регистрируем периодическую синхронизацию для обработки напоминаний в фоне
      await this.registerPeriodicSync(registration)
      
      return data
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      return null
    }
  }

  /**
   * Регистрирует периодическую синхронизацию для обработки напоминаний в фоне
   */
  private async registerPeriodicSync(registration: ServiceWorkerRegistration): Promise<void> {
    try {
      // Проверяем поддержку Periodic Background Sync
      if ('periodicSync' in registration) {
        // @ts-ignore - периодическая синхронизация может быть не в типах
        const periodicSync = registration.periodicSync
        
        // Проверяем разрешение на периодическую синхронизацию
        // @ts-ignore
        const status = await periodicSync.getTags()
        
        // Регистрируем периодическую синхронизацию каждые 5 минут
        try {
          // @ts-ignore
          await periodicSync.register('process-reminders', {
            minInterval: 5 * 60 * 1000 // 5 минут (минимальный интервал)
          })
          console.log('✅ Periodic background sync registered for reminders')
        } catch (syncError: any) {
          // Если периодическая синхронизация не поддерживается или не разрешена
          if (syncError.name === 'NotSupportedError' || syncError.name === 'NotAllowedError') {
            console.log('ℹ️ Periodic background sync not available or not allowed')
            console.log('   Напоминания будут обрабатываться через Vercel cron job')
          } else {
            console.warn('⚠️ Failed to register periodic sync:', syncError)
          }
        }
      } else {
        console.log('ℹ️ Periodic Background Sync not supported in this browser')
        console.log('   Напоминания будут обрабатываться через Vercel cron job')
      }
    } catch (error) {
      console.warn('⚠️ Error registering periodic sync:', error)
      // Не критично, продолжаем работу
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(familyId: number, userId: string): Promise<boolean> {
    try {
      // Get local subscription
      let registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        
        if (subscription) {
          await subscription.unsubscribe()
        }
      } else {
        console.warn('Service worker not registered, skipping local unsubscribe')
      }

      // Remove from database
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('family_id', familyId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error removing push subscription:', error)
        return false
      }

      console.log('Push subscription removed successfully')
      return true
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      return false
    }
  }

  /**
   * Get push subscription for current user
   */
  async getSubscription(familyId: number, userId: string): Promise<PushSubscription | null> {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('family_id', familyId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error getting push subscription:', error)
      return null
    }

    return data
  }

  /**
   * Get all subscriptions for a family
   */
  async getFamilySubscriptions(familyId: number): Promise<PushSubscription[]> {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('family_id', familyId)

    if (error) {
      console.error('Error getting family push subscriptions:', error)
      return []
    }

    return data || []
  }

  /**
   * Get all subscriptions for specific users in a family
   */
  async getUserSubscriptions(familyId: number, userIds: string[]): Promise<PushSubscription[]> {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('family_id', familyId)
      .in('user_id', userIds)

    if (error) {
      console.error('Error getting user push subscriptions:', error)
      return []
    }

    return data || []
  }

  /**
   * Send push notification to all family members
   */
  async sendNotificationToFamily(
    familyId: number,
    title: string,
    body: string,
    icon?: string,
    url?: string
  ): Promise<number> {
    const subscriptions = await this.getFamilySubscriptions(familyId)
    
    if (subscriptions.length === 0) {
      throw new Error('Нет подписчиков для отправки уведомлений')
    }
    
    return this.sendNotifications(subscriptions, title, body, icon, url)
  }

  /**
   * Send push notification to specific users
   */
  async sendNotificationToUsers(
    familyId: number,
    userIds: string[],
    title: string,
    body: string,
    icon?: string,
    url?: string
  ): Promise<number> {
    const subscriptions = await this.getUserSubscriptions(familyId, userIds)
    
    if (subscriptions.length === 0) {
      throw new Error('Нет подписчиков для отправки уведомлений')
    }
    
    return this.sendNotifications(subscriptions, title, body, icon, url)
  }

  /**
   * Send push notifications to subscriptions
   */
  private async sendNotifications(
    subscriptions: PushSubscription[],
    title: string,
    body: string,
    icon?: string,
    url?: string
  ): Promise<number> {
    let sentCount = 0
    const errors: Error[] = []

    for (const subscription of subscriptions) {
      try {
        // API endpoint URL
        const apiUrl = buildPushApiUrl('/api/push/send')

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subscription: {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth
              }
            },
            title,
            body,
            icon: icon || '/icons/icon-192x192.png',
            tag: `family-${subscription.family_id}`,
            data: {
              url: url || '/'
            }
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorMessage = `HTTP ${response.status}`
          
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.message) {
              errorMessage = errorData.message
            }
          } catch {
            errorMessage = errorText || errorMessage
          }
          
          // Если подписка истекла (410), удаляем её из базы данных
          if (response.status === 410) {
            console.log('Subscription expired, removing from database:', subscription.endpoint)
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', subscription.endpoint)
          }
          
          throw new Error(errorMessage)
        }

        sentCount++
      } catch (error) {
        console.error('Error sending push notification:', error)
        errors.push(error instanceof Error ? error : new Error(String(error)))
        // Продолжаем отправку остальным подписчикам
      }
    }

    // Если не было отправлено ни одно уведомление, выбрасываем ошибку
    if (sentCount === 0 && errors.length > 0) {
      throw new Error(`Не удалось отправить уведомления: ${errors[0].message}`)
    }

    // Если были ошибки, но хотя бы одно уведомление отправлено, логируем предупреждение
    if (errors.length > 0 && sentCount > 0) {
      console.warn(`Отправлено ${sentCount} из ${subscriptions.length} уведомлений. Ошибки:`, errors)
    }

    return sentCount
  }
}

export const pushService = new PushService()

