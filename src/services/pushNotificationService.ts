import { supabase } from '../lib/supabaseClient'

export interface PushSubscription {
  id?: number
  family_id: number
  user_id: string
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  created_at?: string
}

// VAPID public key (must match your server's private key)
const VAPID_PUBLIC_KEY = 'BC4vcf_6Ze_7AUPAL23NDpfPZkq64wlSKcVWwKFdnAP6qgzsBU45kb-gbA_eP-rvoXIp2EEz_o2i-r65XdtsZF8'

/**
 * Converts base64 string to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

/**
 * Check if browser supports push notifications
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }

  if (Notification.permission === 'default') {
    return await Notification.requestPermission()
  }

  return Notification.permission
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(
  familyId: number,
  userId: string
): Promise<PushSubscription | null> {
  try {
    // Check if supported
    if (!isPushNotificationSupported()) {
      console.error('Push notifications are not supported in this browser')
      return null
    }

    // Check permission
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      console.error('Notification permission denied')
      return null
    }

    // Register service worker
    const registration = await navigator.serviceWorker.ready

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })

    // Get subscription data
    const subscriptionData = subscription.toJSON()

    if (!subscriptionData.keys || !subscriptionData.endpoint) {
      console.error('Failed to get subscription data')
      return null
    }

    const pushSubscription: PushSubscription = {
      family_id: familyId,
      user_id: userId,
      endpoint: subscriptionData.endpoint,
      keys: {
        p256dh: subscriptionData.keys.p256dh!,
        auth: subscriptionData.keys.auth!
      }
    }

    // Save to database
    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert(pushSubscription)
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
export async function unsubscribeFromPushNotifications(
  familyId: number,
  userId: string
): Promise<boolean> {
  try {
    // Get current subscription
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Unsubscribe from push service
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
 * Check if user is subscribed to push notifications
 */
export async function checkPushSubscriptionStatus(
  familyId: number,
  userId: string
): Promise<{ isSubscribed: boolean; subscription: PushSubscription | null }> {
  try {
    // Check database
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('family_id', familyId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !data) {
      return { isSubscribed: false, subscription: null }
    }

    // Check actual browser subscription
    const registration = await navigator.serviceWorker.ready
    const browserSubscription = await registration.pushManager.getSubscription()

    if (!browserSubscription) {
      // Database has subscription but browser doesn't - cleanup
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('family_id', familyId)
        .eq('user_id', userId)

      return { isSubscribed: false, subscription: null }
    }

    return { isSubscribed: true, subscription: data }

  } catch (error) {
    console.error('Error checking push subscription status:', error)
    return { isSubscribed: false, subscription: null }
  }
}

/**
 * Get notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied'
  }

  return Notification.permission
}

