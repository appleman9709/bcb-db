const webpush = require('web-push')
const { createClient } = require('@supabase/supabase-js')

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000

const DEFAULT_TOPICS = [
  {
    key: 'feeding',
    title: 'Reminder: Feeding time',
    body: 'Log the latest feeding so everyone stays in sync.',
    icon: '/icons/feeding.png',
    badge: '/icons/icon-96x96.png',
    data: { action: 'open-feeding', screen: '/activities/feeding' }
  },
  {
    key: 'diaper',
    title: 'Reminder: Diaper check',
    body: 'Time to record the last diaper change and keep the log fresh.',
    icon: '/icons/diaper.png',
    badge: '/icons/icon-96x96.png',
    data: { action: 'open-diaper', screen: '/activities/diaper' }
  },
  {
    key: 'bath',
    title: 'Reminder: Bath routine',
    body: 'Capture bath time notes to track every splash and smile.',
    icon: '/icons/bath.png',
    badge: '/icons/icon-96x96.png',
    data: { action: 'open-bath', screen: '/activities/bath' }
  }
]

let vapidConfigured = false

function parseTargetFamilies(value) {
  if (!value) return null
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => `${entry}`.split(','))
      .map((item) => Number(item.trim()))
      .filter((id) => Number.isFinite(id) && id > 0)
  }

  return `${value}`
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((id) => Number.isFinite(id) && id > 0)
}

function getConfig(overrides = {}) {
  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_KEY,
    SUPABASE_SECRET,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
    VAPID_PRIVATE_KEY_BASE64,
    VAPID_SUBJECT,
    PUSH_NOTIFICATION_INTERVAL_MS,
    PUSH_SCHEDULER_DRY_RUN,
    PUSH_NOTIFICATION_TARGET_FAMILY
  } = process.env

  const supabaseUrl = overrides.supabaseUrl || SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceRoleKey =
    overrides.supabaseServiceRoleKey ||
    SUPABASE_SERVICE_ROLE_KEY ||
    SUPABASE_SERVICE_KEY ||
    SUPABASE_SECRET

  const vapidPublicKey = overrides.vapidPublicKey || VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY
  const vapidPrivateKey =
    overrides.vapidPrivateKey || VAPID_PRIVATE_KEY || VAPID_PRIVATE_KEY_BASE64 || process.env.VITE_VAPID_PRIVATE_KEY
  const vapidSubject = overrides.vapidSubject || VAPID_SUBJECT || 'mailto:noreply@babycare.app'

  const intervalMs =
    Number(overrides.intervalMs || PUSH_NOTIFICATION_INTERVAL_MS || DEFAULT_INTERVAL_MS) || DEFAULT_INTERVAL_MS

  const dryRun = Boolean(overrides.dryRun ?? PUSH_SCHEDULER_DRY_RUN)

  const targetFamilies =
    overrides.targetFamilies !== undefined
      ? parseTargetFamilies(overrides.targetFamilies)
      : parseTargetFamilies(PUSH_NOTIFICATION_TARGET_FAMILY)

  const topics = overrides.topics || DEFAULT_TOPICS

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    vapidPublicKey,
    vapidPrivateKey,
    vapidSubject,
    intervalMs,
    dryRun,
    targetFamilies,
    topics
  }
}

function ensureConfig(config) {
  const missing = []

  if (!config.supabaseUrl) missing.push('SUPABASE_URL')
  if (!config.supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!config.vapidPublicKey) missing.push('VAPID_PUBLIC_KEY')
  if (!config.vapidPrivateKey) missing.push('VAPID_PRIVATE_KEY')

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

function configureWebPush(config) {
  if (vapidConfigured) return
  webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey)
  vapidConfigured = true
}

function createSupabaseClient(config) {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'X-Client-Info': 'babycare-push-scheduler/2.0'
      }
    }
  })
}

function computeSlotId(timestamp, intervalMs) {
  return Math.floor(timestamp / intervalMs)
}

function pickTopic(timestamp, config) {
  const slotId = computeSlotId(timestamp, config.intervalMs)
  const topicIndex = slotId % config.topics.length
  return { slotId, topic: config.topics[topicIndex] }
}

function buildPayload(topic, subscription, now) {
  return JSON.stringify({
    title: topic.title,
    body: topic.body,
    icon: topic.icon,
    badge: topic.badge,
    tag: `babycare-${topic.key}`,
    timestamp: now,
    data: {
      ...topic.data,
      familyId: subscription.family_id,
      subscriptionId: subscription.id
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'snooze', title: 'Snooze 5 min' }
    ]
  })
}

async function fetchSubscriptions(supabase, targetFamilies) {
  let query = supabase.from('push_subscriptions').select('id, family_id, user_id, endpoint, p256dh, auth')

  if (targetFamilies && targetFamilies.length > 0) {
    query = query.in('family_id', targetFamilies)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return Array.isArray(data) ? data : []
}

async function removeSubscription(supabase, subscriptionId, logger) {
  if (!subscriptionId) return
  try {
    await supabase.from('push_subscriptions').delete().eq('id', subscriptionId)
    if (logger?.warn) {
      logger.warn(`Removed stale push subscription ${subscriptionId}`)
    }
  } catch (error) {
    if (logger?.error) {
      logger.error(`Failed to remove subscription ${subscriptionId}: ${error.message}`)
    }
  }
}

async function deliverNotification({
  subscription,
  payload,
  supabase,
  config,
  logger
}) {
  const p256dh = subscription.p256dh || subscription.keys?.p256dh
  const auth = subscription.auth || subscription.keys?.auth

  const keys = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh,
      auth
    }
  }

  if (!keys.endpoint || !keys.keys.p256dh || !keys.keys.auth) {
    if (logger?.warn) {
      logger.warn(`Subscription ${subscription.id} missing key material, pruning.`)
    }
    await removeSubscription(supabase, subscription.id, logger)
    return { sent: false, pruned: true }
  }

  if (config.dryRun) {
    if (logger?.info) {
      logger.info(
        `[dry-run] Would send ${JSON.parse(payload).tag} to subscription ${subscription.id} (family ${subscription.family_id})`
      )
    }
    return { sent: false, pruned: false }
  }

  try {
    await webpush.sendNotification(keys, payload, {
      TTL: Math.max(30, Math.round(config.intervalMs / 1000)),
      urgency: 'normal'
    })

    if (logger?.info) {
      logger.info(`Sent ${JSON.parse(payload).tag} to subscription ${subscription.id} (family ${subscription.family_id})`)
    }

    return { sent: true, pruned: false }
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      if (logger?.warn) {
        logger.warn(`Subscription ${subscription.id} expired (${error.statusCode}), pruning.`)
      }
      await removeSubscription(supabase, subscription.id, logger)
      return { sent: false, pruned: true }
    }

    if (logger?.error) {
      logger.error(`Failed to send notification to subscription ${subscription.id}: ${error.message}`)
    }

    return { sent: false, pruned: false }
  }
}

async function dispatchReminders(options = {}) {
  const now = options.now || Date.now()
  const logger = options.logger || console
  const config = {
    ...getConfig(options),
    topics: options.topics || DEFAULT_TOPICS
  }

  ensureConfig(config)
  configureWebPush(config)

  const supabase = options.supabase || createSupabaseClient(config)
  const { topic, slotId } = pickTopic(now, config)

  const subscriptions = await fetchSubscriptions(supabase, config.targetFamilies)

  if (subscriptions.length === 0) {
    if (logger?.info) {
      logger.info(`No active subscriptions found for slot ${slotId}.`)
    }
    return {
      slotId,
      topicKey: topic.key,
      total: 0,
      sent: 0,
      pruned: 0,
      dryRun: config.dryRun,
      intervalMs: config.intervalMs
    }
  }

  if (logger?.info) {
    logger.info(
      `Dispatching "${topic.key}" notifications to ${subscriptions.length} subscription(s) (slot ${slotId}).`
    )
  }

  const outcomes = await Promise.all(
    subscriptions.map(async (subscription) => {
      const payload = buildPayload(topic, subscription, now)
      const result = await deliverNotification({
        subscription,
        payload,
        supabase,
        config,
        logger
      })

      return result
    })
  )

  let sent = 0
  let pruned = 0

  outcomes.forEach((result) => {
    if (!result) return
    if (result.sent) sent += 1
    if (result.pruned) pruned += 1
  })

  return {
    slotId,
    topicKey: topic.key,
    total: subscriptions.length,
    sent,
    pruned,
    dryRun: config.dryRun,
    intervalMs: config.intervalMs
  }
}

module.exports = {
  DEFAULT_INTERVAL_MS,
  DEFAULT_TOPICS,
  buildPayload,
  computeSlotId,
  configureWebPush,
  createSupabaseClient,
  dispatchReminders,
  getConfig,
  pickTopic
}
