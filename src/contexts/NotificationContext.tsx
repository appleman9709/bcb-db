import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import {
  isPushNotificationSupported,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  checkPushSubscriptionStatus,
  getNotificationPermission,
  type PushSubscription
} from '../services/pushNotificationService'

type NotificationContextValue = {
  isSupported: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  subscription: PushSubscription | null
  isLoading: boolean
  error: string | null
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
  checkStatus: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

const defaultValue: NotificationContextValue = {
  isSupported: false,
  permission: 'denied',
  isSubscribed: false,
  subscription: null,
  isLoading: false,
  error: null,
  subscribe: async () => false,
  unsubscribe: async () => false,
  checkStatus: async () => undefined
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { family, member } = useAuth()
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('denied')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if push notifications are supported
  useEffect(() => {
    setIsSupported(isPushNotificationSupported())
    setPermission(getNotificationPermission())
  }, [])

  // Check subscription status when family/member changes
  useEffect(() => {
    if (family && member) {
      checkStatus()
    } else {
      setIsSubscribed(false)
      setSubscription(null)
    }
  }, [family?.id, member?.user_id])

  const checkStatus = useCallback(async () => {
    if (!family || !member) {
      setIsSubscribed(false)
      setSubscription(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { isSubscribed: subscribed, subscription: sub } = await checkPushSubscriptionStatus(
        family.id,
        member.user_id
      )

      setIsSubscribed(subscribed)
      setSubscription(sub)
      setPermission(getNotificationPermission())
    } catch (err) {
      console.error('Error checking push subscription status:', err)
      setError('Failed to check subscription status')
    } finally {
      setIsLoading(false)
    }
  }, [family?.id, member?.user_id])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!family || !member) {
      setError('Family or member not found')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      // Request permission first
      const newPermission = await requestNotificationPermission()
      setPermission(newPermission)

      if (newPermission !== 'granted') {
        setError('Notification permission denied')
        return false
      }

      // Subscribe
      const newSubscription = await subscribeToPushNotifications(family.id, member.user_id)

      if (newSubscription) {
        setIsSubscribed(true)
        setSubscription(newSubscription)
        return true
      } else {
        setError('Failed to subscribe to push notifications')
        return false
      }
    } catch (err) {
      console.error('Error subscribing to push notifications:', err)
      setError('Failed to subscribe')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [family?.id, member?.user_id])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!family || !member) {
      setError('Family or member not found')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const success = await unsubscribeFromPushNotifications(family.id, member.user_id)

      if (success) {
        setIsSubscribed(false)
        setSubscription(null)
        return true
      } else {
        setError('Failed to unsubscribe from push notifications')
        return false
      }
    } catch (err) {
      console.error('Error unsubscribing from push notifications:', err)
      setError('Failed to unsubscribe')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [family?.id, member?.user_id])

  const value = useMemo<NotificationContextValue>(
    () => ({
      isSupported,
      permission,
      isSubscribed,
      subscription,
      isLoading,
      error,
      subscribe,
      unsubscribe,
      checkStatus
    }),
    [isSupported, permission, isSubscribed, subscription, isLoading, error, subscribe, unsubscribe, checkStatus]
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    return defaultValue
  }

  return context
}

