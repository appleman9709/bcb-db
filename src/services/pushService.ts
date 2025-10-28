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

    // Request permission
    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      console.error('Permission denied for push notifications')
      return null
    }

    try {
      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
        )
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
      return data
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      return null
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(familyId: number, userId: string): Promise<boolean> {
    try {
      // Get local subscription
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        await subscription.unsubscribe()
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

      console.log('Push subscription removed')
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

    for (const subscription of subscriptions) {
      try {
        // API endpoint URL (работает с относительным путем для Vercel)
        const apiUrl = '/api/push/send'
        
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
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }

        sentCount++
      } catch (error) {
        console.error('Error sending push notification:', error)
      }
    }

    return sentCount
  }
}

export const pushService = new PushService()

