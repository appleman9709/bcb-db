const dotenv = require('dotenv')

const {
  DEFAULT_INTERVAL_MS,
  dispatchReminders,
  getConfig,
  pickTopic
} = require('../lib/push/scheduler')

dotenv.config({ path: '.env' })

/* eslint-disable no-console */

async function main() {
  const baseConfig = getConfig()

  console.log('Starting BabyCare push notification scheduler...')
  console.log(`Interval: ${(baseConfig.intervalMs || DEFAULT_INTERVAL_MS) / 60000} minute(s)`)
  console.log(`Topics: ${(baseConfig.topics || []).map((topic) => topic.key).join(', ') || 'n/a'}`)
  if (baseConfig.dryRun) {
    console.log('Running in DRY RUN mode. Notifications will not be sent.')
  }
  if (baseConfig.targetFamilies && baseConfig.targetFamilies.length > 0) {
    console.log(`Restricted to family ids: ${baseConfig.targetFamilies.join(', ')}`)
  }

  let lastSlotId = null

  const tick = async () => {
    const now = Date.now()
    const { slotId } = pickTopic(now, baseConfig)

    if (slotId === lastSlotId) {
      return
    }

    lastSlotId = slotId

    try {
      const result = await dispatchReminders({
        now,
        intervalMs: baseConfig.intervalMs,
        dryRun: baseConfig.dryRun,
        targetFamilies: baseConfig.targetFamilies,
        topics: baseConfig.topics
      })

      const summary = `[${new Date(now).toISOString()}] slot ${result.slotId} (${result.topicKey}) - sent ${result.sent}/${result.total}${
        result.pruned ? `, pruned ${result.pruned}` : ''
      }${result.dryRun ? ' [dry-run]' : ''}`

      console.log(summary)
    } catch (error) {
      console.error('Scheduler error:', error)
    }
  }

  await tick()
  const interval = Math.max(15000, Math.round((baseConfig.intervalMs || DEFAULT_INTERVAL_MS) / 2))
  setInterval(tick, interval)
}

main().catch((error) => {
  console.error('Failed to start scheduler:', error)
  process.exit(1)
})

process.on('SIGINT', () => {
  console.log('\nGracefully shutting down scheduler.')
  process.exit(0)
})
