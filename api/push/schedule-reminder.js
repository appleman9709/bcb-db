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
        'X-Client-Info': 'babycare-reminder-scheduler/1.0'
      }
    }
  })
}

module.exports = async (req, res) => {
  applyCors(req, res)

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { familyId, reminderType, scheduledTime, eventTime } = req.body

    if (!familyId || !reminderType || !scheduledTime || !eventTime) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['familyId', 'reminderType', 'scheduledTime', 'eventTime']
      })
    }

    if (!['feeding', 'diaper'].includes(reminderType)) {
      return res.status(400).json({
        error: 'Invalid reminderType. Must be "feeding" or "diaper"'
      })
    }

    const scheduledTimeDate = new Date(scheduledTime)
    const eventTimeDate = new Date(eventTime)

    if (Number.isNaN(scheduledTimeDate.getTime()) || Number.isNaN(eventTimeDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format'
      })
    }

    // Проверяем, что время планирования в будущем
    if (scheduledTimeDate.getTime() <= Date.now()) {
      return res.status(400).json({
        error: 'Scheduled time must be in the future'
      })
    }

    const supabase = createSupabaseClient()

    // Отменяем предыдущие напоминания того же типа для этой семьи
    await supabase
      .from('scheduled_reminders')
      .delete()
      .eq('family_id', familyId)
      .eq('reminder_type', reminderType)

    // Сохраняем новое напоминание
    const { data, error } = await supabase
      .from('scheduled_reminders')
      .insert({
        family_id: familyId,
        reminder_type: reminderType,
        scheduled_time: scheduledTimeDate.toISOString(),
        event_time: eventTimeDate.toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error scheduling reminder:', error)
      return res.status(500).json({
        error: 'Failed to schedule reminder',
        message: error.message
      })
    }

    console.log(`Reminder scheduled: ${reminderType} for family ${familyId} at ${scheduledTime}`)

    return res.status(200).json({
      success: true,
      reminder: data
    })
  } catch (error) {
    console.error('Error in schedule-reminder endpoint:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}

