const {
  dispatchReminders,
  getConfig,
  pickTopic
} = require('../../lib/push/scheduler')

function parseBoolean(value) {
  if (value === undefined || value === null) return undefined
  const normalized = `${value}`.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return undefined
}

function parseFamilies(value) {
  if (!value) return undefined
  return `${value}`
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isFinite(id) && id > 0)
}

function createLogger(requestId = Date.now().toString()) {
  const prefix = `[push-reminders][${requestId}]`
  return {
    info: (message) => console.log(`${prefix} ${message}`),
    warn: (message) => console.warn(`${prefix} ${message}`),
    error: (message) => console.error(`${prefix} ${message}`)
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const requestId = req.headers['x-request-id'] || Date.now().toString()
  const logger = createLogger(requestId)

  try {
    const config = getConfig()

    const dryRun =
      parseBoolean(req.query.dry) ??
      parseBoolean(req.body?.dry) ??
      config.dryRun

    const intervalMs = Number(req.query.intervalMs || req.body?.intervalMs) || config.intervalMs
    const targetFamilies =
      parseFamilies(req.query.family || req.body?.family) || config.targetFamilies

    const now = Date.now()
    const { slotId } = pickTopic(now, { ...config, intervalMs })

    const result = await dispatchReminders({
      now,
      intervalMs,
      dryRun,
      targetFamilies,
      topics: config.topics,
      logger
    })

    return res.status(200).json({
      ok: true,
      requestId,
      triggeredAt: new Date(now).toISOString(),
      slotId,
      ...result
    })
  } catch (error) {
    logger.error(error.stack || error.message)
    return res.status(500).json({
      ok: false,
      error: error.message || 'Unexpected error'
    })
  }
}
