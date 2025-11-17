const webpush = require('web-push')
const { createClient } = require('@supabase/supabase-js')

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
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

  // Если нет origin (например, запрос от cron-job.org), разрешаем запрос
  // Это нормально для серверных запросов от внешних cron сервисов
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

function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'X-Client-Info': 'babycare-reminder-processor/1.0'
      }
    }
  })
}

function configureWebPush() {
  const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:noreply@babycare.app'

  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    return true
  }

  return false
}

const REMINDER_MESSAGES = {
  feeding: {
    title: '🍼 Я проголодался',
    body: 'Через 5 минут пора покормить меня',
    icon: '/icons/feeding.png',
    badge: '/icons/icon-96x96.png'
  },
  diaper: {
    title: '🩲 Я промочился',
    body: 'Через 5 минут пора сменить подгузник',
    icon: '/icons/diaper.png',
    badge: '/icons/icon-96x96.png'
  }
}

module.exports = async (req, res) => {
  applyCors(req, res)

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    if (!configureWebPush()) {
      return res.status(500).json({
        error: 'VAPID keys not configured'
      })
    }

    const supabase = createSupabaseClient()
    const now = new Date().toISOString()

    // Получаем все напоминания, которые нужно отправить сейчас
    const { data: reminders, error: fetchError } = await supabase
      .from('scheduled_reminders')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_time', now)

    // Получаем все напоминания о лекарствах, которые нужно отправить сейчас
    const { data: medicationReminders, error: medicationFetchError } = await supabase
      .from('medication_reminders')
      .select(`
        *,
        medications (
          name,
          timing_type,
          times_per_day
        ),
        illnesses (
          name
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_time', now)

    if (fetchError) {
      console.error('Error fetching reminders:', fetchError)
      return res.status(500).json({
        error: 'Failed to fetch reminders',
        message: fetchError.message
      })
    }

    if (medicationFetchError) {
      console.error('Error fetching medication reminders:', medicationFetchError)
      // Не прерываем выполнение, продолжаем обработку обычных напоминаний
    }

    const totalReminders = (reminders?.length || 0) + (medicationReminders?.length || 0)

    if (totalReminders === 0) {
      console.log('[process-reminders] No reminders to process')
      
      // Проверяем, есть ли вообще напоминания в будущем для диагностики
      const { data: futureReminders } = await supabase
        .from('scheduled_reminders')
        .select('id, reminder_type, scheduled_time, status, family_id')
        .eq('status', 'pending')
        .gt('scheduled_time', now)
        .order('scheduled_time', { ascending: true })
        .limit(5)
      
      const debugInfo = {
        now: now,
        futureRemindersCount: futureReminders?.length || 0,
        nextReminder: futureReminders && futureReminders.length > 0 
          ? {
              id: futureReminders[0].id,
              type: futureReminders[0].reminder_type,
              scheduledTime: futureReminders[0].scheduled_time,
              timeUntil: new Date(futureReminders[0].scheduled_time).getTime() - new Date(now).getTime(),
              minutesUntil: Math.round((new Date(futureReminders[0].scheduled_time).getTime() - new Date(now).getTime()) / 1000 / 60)
            }
          : null
      }
      
      return res.status(200).json({
        success: true,
        processed: 0,
        message: 'No reminders to process',
        debug: debugInfo
      })
    }

    console.log(`[process-reminders] Found ${reminders?.length || 0} reminder(s) and ${medicationReminders?.length || 0} medication reminder(s) to process`)
    
    // Детальное логирование каждого напоминания
    if (reminders) {
      reminders.forEach((reminder) => {
        const scheduledTime = new Date(reminder.scheduled_time)
        const timeDiff = scheduledTime.getTime() - new Date(now).getTime()
        const minutesDiff = Math.round(timeDiff / 1000 / 60)
        console.log(`  - Reminder ${reminder.id}: ${reminder.reminder_type} for family ${reminder.family_id}, scheduled: ${scheduledTime.toISOString()}, ${minutesDiff} minutes ${minutesDiff >= 0 ? 'ago' : 'from now'}`)
      })
    }

    // Получаем все подписки для семей (включая семьи с напоминаниями о лекарствах)
    const reminderFamilyIds = reminders ? [...new Set(reminders.map((r) => r.family_id))] : []
    const medicationFamilyIds = medicationReminders ? [...new Set(medicationReminders.map((r) => r.family_id))] : []
    const familyIds = [...new Set([...reminderFamilyIds, ...medicationFamilyIds])]
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('family_id', familyIds)

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      return res.status(500).json({
        error: 'Failed to fetch subscriptions',
        message: subError.message
      })
    }

    // Группируем подписки по family_id
    const subscriptionsByFamily = {}
    for (const sub of subscriptions || []) {
      if (!subscriptionsByFamily[sub.family_id]) {
        subscriptionsByFamily[sub.family_id] = []
      }
      subscriptionsByFamily[sub.family_id].push(sub)
    }

    let sentCount = 0
    let failedCount = 0

    // Отправляем уведомления для каждого напоминания
    for (const reminder of reminders || []) {
      // Пропускаем напоминания о купании
      if (reminder.reminder_type === 'bath') {
        console.log(`[process-reminders] Skipping bath reminder ${reminder.id} (bath reminders disabled)`)
        // Помечаем как отправленное, чтобы не обрабатывать повторно
        await supabase
          .from('scheduled_reminders')
          .update({ status: 'sent', sent_at: now })
          .eq('id', reminder.id)
        continue
      }
      
      const message = REMINDER_MESSAGES[reminder.reminder_type]
      if (!message) {
        console.warn(`Unknown reminder type: ${reminder.reminder_type}`)
        continue
      }

      const familySubscriptions = subscriptionsByFamily[reminder.family_id] || []

      if (familySubscriptions.length === 0) {
        console.log(`[process-reminders] ⚠️ No subscriptions for family ${reminder.family_id}, skipping reminder ${reminder.id}`)
        // Помечаем как отправленное, даже если нет подписок
        await supabase
          .from('scheduled_reminders')
          .update({ status: 'sent', sent_at: now })
          .eq('id', reminder.id)
        continue
      }

      console.log(`[process-reminders] Processing reminder ${reminder.id} (${reminder.reminder_type}) for family ${reminder.family_id} with ${familySubscriptions.length} subscription(s)`)

      // Отправляем уведомление всем подписчикам семьи
      let familySentCount = 0
      let familyFailedCount = 0

      for (const subscription of familySubscriptions) {
        try {
          const payload = JSON.stringify({
            title: message.title,
            body: message.body,
            icon: message.icon,
            badge: message.badge,
            tag: `reminder-${reminder.reminder_type}-${reminder.family_id}`,
            data: {
              type: reminder.reminder_type,
              familyId: reminder.family_id,
              reminderId: reminder.id,
              screen: reminder.reminder_type === 'feeding' 
                ? '/activities/feeding' 
                : '/activities/diaper'
            },
            timestamp: Date.now()
          })

          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth
              }
            },
            payload,
            {
              TTL: 86400,
              urgency: 'normal'
            }
          )

          familySentCount++
          sentCount++
        } catch (error) {
          console.error(`Error sending notification to subscription ${subscription.id}:`, error)
          familyFailedCount++
          failedCount++

          // Удаляем недействительные подписки
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', subscription.id)
          }
        }
      }

      // Помечаем напоминание как отправленное
      await supabase
        .from('scheduled_reminders')
        .update({
          status: 'sent',
          sent_at: now,
          sent_count: familySentCount
        })
        .eq('id', reminder.id)

      console.log(
        `Reminder ${reminder.id} (${reminder.reminder_type}) sent to ${familySentCount}/${familySubscriptions.length} subscribers`
      )
    }

    // Обрабатываем напоминания о лекарствах
    if (medicationReminders && medicationReminders.length > 0) {
      console.log(`[process-reminders] Processing ${medicationReminders.length} medication reminder(s)`)
      
      for (const reminder of medicationReminders) {
        const medication = reminder.medications
        const illness = reminder.illnesses

        if (!medication || !illness) {
          console.warn(`Medication reminder ${reminder.id} missing medication or illness data`)
          // Помечаем как отправленное, чтобы не обрабатывать повторно
          await supabase
            .from('medication_reminders')
            .update({ status: 'sent', sent_at: now })
            .eq('id', reminder.id)
          continue
        }

        const familySubscriptions = subscriptionsByFamily[reminder.family_id] || []

        if (familySubscriptions.length === 0) {
          console.log(`[process-reminders] ⚠️ No subscriptions for family ${reminder.family_id}, skipping medication reminder ${reminder.id}`)
          // Помечаем как отправленное, даже если нет подписок
          await supabase
            .from('medication_reminders')
            .update({ status: 'sent', sent_at: now })
            .eq('id', reminder.id)
          continue
        }

        const timingLabels = {
          before_meal: 'перед едой',
          after_meal: 'после еды',
          during_meal: 'во время еды',
          anytime: 'неважно'
        }

        const message = {
          title: '💊 Пора принять лекарство',
          body: `${medication.name} (${illness.name}) - ${timingLabels[medication.timing_type] || 'прием лекарства'}`,
          icon: '/icons/feeding.png',
          badge: '/icons/icon-96x96.png'
        }

        console.log(`[process-reminders] Processing medication reminder ${reminder.id} for family ${reminder.family_id} with ${familySubscriptions.length} subscription(s)`)

        let familySentCount = 0
        let familyFailedCount = 0

        for (const subscription of familySubscriptions) {
          try {
            const payload = JSON.stringify({
              title: message.title,
              body: message.body,
              icon: message.icon,
              badge: message.badge,
              tag: `medication-reminder-${reminder.id}`,
              data: {
                type: 'medication',
                familyId: reminder.family_id,
                reminderId: reminder.id,
                medicationId: reminder.medication_id,
                illnessId: reminder.illness_id,
                screen: '/tamagotchi'
              },
              timestamp: Date.now()
            })

            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.p256dh,
                  auth: subscription.auth
                }
              },
              payload,
              {
                TTL: 86400,
                urgency: 'normal'
              }
            )

            familySentCount++
            sentCount++
          } catch (error) {
            console.error(`Error sending medication notification to subscription ${subscription.id}:`, error)
            familyFailedCount++
            failedCount++

            // Удаляем недействительные подписки
            if (error.statusCode === 410 || error.statusCode === 404) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('id', subscription.id)
            }
          }
        }

        // Помечаем напоминание как отправленное
        await supabase
          .from('medication_reminders')
          .update({
            status: 'sent',
            sent_at: now
          })
          .eq('id', reminder.id)

        console.log(
          `Medication reminder ${reminder.id} sent to ${familySentCount}/${familySubscriptions.length} subscribers`
        )
      }
    }

    const totalProcessed = (reminders?.length || 0) + (medicationReminders?.length || 0)

    return res.status(200).json({
      success: true,
      processed: totalProcessed,
      sent: sentCount,
      failed: failedCount,
      debug: {
        now: now,
        remindersProcessed: reminders?.map(r => ({
          id: r.id,
          type: r.reminder_type,
          familyId: r.family_id,
          scheduledTime: r.scheduled_time,
          subscriptionsCount: subscriptionsByFamily[r.family_id]?.length || 0
        })) || [],
        medicationRemindersProcessed: medicationReminders?.length || 0
      }
    })
  } catch (error) {
    console.error('Error in process-reminders endpoint:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}

