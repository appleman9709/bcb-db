/**
 * BabyCare Dashboard - Push Notification Scheduler
 *
 * Periodically fetches all active web push subscriptions from Supabase
 * and sends a topic-specific reminder every 5 minutes.
 *
 * Topics rotate in the following order:
 * 1. Feeding reminder
 * 2. Diaper change reminder
 * 3. Bath time reminder
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... \
 *   node scripts/push-notification-scheduler.js
 *
 * Optional environment variables:
 *   PUSH_NOTIFICATION_INTERVAL_MS   - override interval (default 300000 ms)
 *   PUSH_SCHEDULER_DRY_RUN          - when set, skip sending and only log
 *   PUSH_NOTIFICATION_TARGET_FAMILY - comma separated family ids to limit scope
 */

/* eslint-disable no-console */

const dotenv = require('dotenv')
const webpush = require('web-push')
const { createClient } = require('@supabase/supabase-js')

dotenv.config({ path: '.env' })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY_BASE64

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('Missing VAPID keys. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.')
  process.exit(1)
}

webpush.setVapidDetails('mailto:push@babycare.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'X-Client-Info': 'babycare-push-scheduler/1.0'
    }
  }
})

const NOTIFICATION_INTERVAL_MS = Number(process.env.PUSH_NOTIFICATION_INTERVAL_MS) || 5 * 60 * 1000
const DRY_RUN = Boolean(process.env.PUSH_SCHEDULER_DRY_RUN)
const targetFamilies = process.env.PUSH_NOTIFICATION_TARGET_FAMILY
  ? process.env.PUSH_NOTIFICATION_TARGET_FAMILY.split(',').map((id) => Number(id.trim())).filter(Boolean)
  : null

const TOPICS = [
  {
    key: 'feeding',
    title: 'Пора покормить малыша',
    body: 'Запланируйте очередное кормление — регулярность помогает ребёнку чувствовать себя спокойно.',
    icon: '/icons/feeding.png',
    badge: '/icons/icon-96x96.png',
    data: { action: 'open-feeding', screen: '/activities/feeding' }
  },
  {
    key: 'diaper',
    title: 'Напоминание о смене подгузника',
    body: 'Проверьте подгузник — частая смена помогает избежать раздражения.',
    icon: '/icons/diaper.png',
    badge: '/icons/icon-96x96.png',
    data: { action: 'open-diaper', screen: '/activities/diaper' }
  },
  {
    key: 'bath',
    title: 'Время для купания',
    body: 'Купание расслабляет малыша перед сном. Подготовьте всё необходимое заранее.',
    icon: '/icons/bath.png',
    badge: '/icons/icon-96x96.png',
    data: { action: 'open-bath', screen: '/activities/bath' }
  }
]

let lastTickId = null

function getCurrentSlotId() {
  return Math.floor(Date.now() / NOTIFICATION_INTERVAL_MS)
}

function getCurrentTopic() {
  const slotId = getCurrentSlotId()
  const topicIndex = slotId % TOPICS.length
  return { topic: TOPICS[topicIndex], slotId }
}

function buildPayload(topic, subscription) {
  return JSON.stringify({
    title: topic.title,
    body: topic.body,
    icon: topic.icon,
    badge: topic.badge,
    tag: `babycare-${topic.key}`,
    timestamp: Date.now(),
    data: {
      ...topic.data,
      familyId: subscription.family_id,
      subscriptionId: subscription.id
    },
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'snooze', title: 'Через 5 минут' }
    ]
  })
}

async function fetchSubscriptions() {
  const query = supabase.from('push_subscriptions').select('*')

  if (targetFamilies && targetFamilies.length > 0) {
    query.in('family_id', targetFamilies)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data || []
}

async function removeSubscriptionById(id) {
  console.warn(`Removing stale push subscription ${id}`)
  await supabase.from('push_subscriptions').delete().eq('id', id)
}

async function sendNotification(subscription, payload) {
  if (DRY_RUN) {
    console.log(
      `[dry-run] Would send ${JSON.parse(payload).tag} to subscription ${subscription.id} (family ${subscription.family_id})`
    )
    return
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys?.p256dh,
      auth: subscription.keys?.auth
    }
  }

  if (!pushSubscription.endpoint || !pushSubscription.keys.p256dh || !pushSubscription.keys.auth) {
    console.warn(`Subscription ${subscription.id} is missing key material, removing.`)
    await removeSubscriptionById(subscription.id)
    return
  }

  try {
    await webpush.sendNotification(pushSubscription, payload, {
      TTL: NOTIFICATION_INTERVAL_MS / 1000,
      urgency: 'normal'
    })

    console.log(
      `Sent ${JSON.parse(payload).tag} to subscription ${subscription.id} (family ${subscription.family_id})`
    )
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.warn(`Subscription ${subscription.id} is no longer valid (${error.statusCode}), removing.`)
      await removeSubscriptionById(subscription.id)
      return
    }

    console.error(`Failed to send notification to subscription ${subscription.id}:`, error)
  }
}

async function runScheduler() {
  const { topic, slotId } = getCurrentTopic()

  if (slotId === lastTickId) {
    return
  }

  lastTickId = slotId

  try {
    const subscriptions = await fetchSubscriptions()

    if (subscriptions.length === 0) {
      console.log('No active subscriptions found, skipping this interval.')
      return
    }

    console.log(
      `Dispatching "${topic.key}" notifications to ${subscriptions.length} subscription(s) (slot ${slotId}).`
    )

    const payloads = subscriptions.map((subscription) => ({
      subscription,
      payload: buildPayload(topic, subscription)
    }))

    await Promise.all(payloads.map(({ subscription, payload }) => sendNotification(subscription, payload)))
  } catch (error) {
    console.error('Scheduler error:', error)
  }
}

function start() {
  console.log('Starting BabyCare push notification scheduler...')
  console.log(`Interval: ${NOTIFICATION_INTERVAL_MS / 60000} minute(s)`)
  console.log(`Topics: ${TOPICS.map((topic) => topic.key).join(', ')}`)
  if (DRY_RUN) {
    console.log('Running in DRY RUN mode. Notifications will not be sent.')
  }
  if (targetFamilies) {
    console.log(`Restricted to family ids: ${targetFamilies.join(', ')}`)
  }

  runScheduler()
  setInterval(runScheduler, NOTIFICATION_INTERVAL_MS / 2)
}

start()

process.on('SIGINT', () => {
  console.log('\nGracefully shutting down scheduler.')
  process.exit(0)
})

