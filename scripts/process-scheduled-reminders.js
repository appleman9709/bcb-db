/**
 * Скрипт для периодической обработки запланированных push-уведомлений
 * 
 * Этот скрипт должен запускаться периодически (например, каждую минуту)
 * для проверки и отправки запланированных уведомлений о кормлении и смене подгузников
 * 
 * Использование:
 * - Запуск вручную: node scripts/process-scheduled-reminders.js
 * - Настройка cron (каждую минуту): */1 * * * * node scripts/process-scheduled-reminders.js
 * - Для Vercel: настроить cron job в vercel.json или через Vercel Cron Jobs
 */

require('dotenv').config({ path: '.env' })

const PUSH_API_BASE_URL = process.env.PUSH_API_BASE_URL || ''
const apiUrl = PUSH_API_BASE_URL 
  ? `${PUSH_API_BASE_URL}/api/push/process-reminders`
  : '/api/push/process-reminders'

async function processReminders() {
  try {
    console.log(`[${new Date().toISOString()}] Processing scheduled reminders...`)
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()

    if (result.success) {
      console.log(
        `[${new Date().toISOString()}] Processed ${result.processed} reminders: ${result.sent} sent, ${result.failed} failed`
      )
      
      if (result.processed > 0) {
        console.log(`  - Sent: ${result.sent}`)
        if (result.failed > 0) {
          console.log(`  - Failed: ${result.failed}`)
        }
      }
    } else {
      console.error(`[${new Date().toISOString()}] Error processing reminders:`, result.error)
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing reminders:`, error.message)
    process.exit(1)
  }
}

// Если запускается напрямую
if (require.main === module) {
  processReminders()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

module.exports = { processReminders }

