/**
 * Сервис для обработки напоминаний на клиенте
 * Используется для обхода ограничений Hobby тарифа Vercel
 */

const REMINDER_CHECK_INTERVAL = 60000 // Проверка каждую минуту (60 секунд)
const API_BASE_URL = import.meta.env.VITE_PUSH_API_BASE_URL || ''

class ReminderProcessor {
  private intervalId: number | null = null
  private isProcessing = false
  private lastCheckTime: number = 0

  /**
   * Запускает периодическую проверку напоминаний
   */
  start(): void {
    if (this.intervalId !== null) {
      console.log('Reminder processor already started')
      return
    }

    console.log('Starting reminder processor...')
    
    // Проверяем сразу при старте
    this.processReminders()

    // Затем проверяем периодически
    this.intervalId = window.setInterval(() => {
      this.processReminders()
    }, REMINDER_CHECK_INTERVAL)

    console.log(`Reminder processor started (checking every ${REMINDER_CHECK_INTERVAL / 1000} seconds)`)
  }

  /**
   * Останавливает периодическую проверку
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('Reminder processor stopped')
    }
  }

  /**
   * Обрабатывает запланированные напоминания
   */
  async processReminders(): Promise<void> {
    // Предотвращаем параллельные запросы
    if (this.isProcessing) {
      return
    }

    // Проверяем не чаще раза в 30 секунд
    const now = Date.now()
    if (now - this.lastCheckTime < 30000) {
      return
    }

    this.isProcessing = true
    this.lastCheckTime = now

    try {
      const apiUrl = API_BASE_URL 
        ? `${API_BASE_URL}/api/push/process-reminders`
        : '/api/push/process-reminders'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        // Если 404 - API endpoint недоступен (локальная разработка без Vercel dev)
        if (response.status === 404) {
          console.log('ℹ️ API endpoint недоступен (локальная разработка). Для обработки напоминаний запустите: vercel dev')
          // В локальной разработке просто пропускаем обработку без ошибки
          return
        }
        
        const errorText = await response.text()
        console.error('Error processing reminders:', response.status, errorText)
        return
      }

      const result = await response.json()

      // Логируем все результаты для диагностики
      if (result.success) {
        if (result.processed > 0) {
          console.log(
            `✅ Processed ${result.processed} reminders: ${result.sent} sent, ${result.failed} failed`
          )
        } else {
          // Логируем только иногда, чтобы не засорять консоль
          const now = Date.now()
          if (now % 300000 < REMINDER_CHECK_INTERVAL) { // Каждые 5 минут
            console.log('ℹ️ No reminders to process')
          }
        }
      } else {
        console.error('❌ Error processing reminders:', result.error || result.message)
      }
      
      // Дополнительная диагностика для отладки
      if (result.debug) {
        console.log('🔍 Debug info:', result.debug)
      }
    } catch (error) {
      // Если ошибка сети (API недоступен) - это нормально для локальной разработки
      if (error instanceof TypeError && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
        console.log('ℹ️ API endpoint недоступен (локальная разработка). Для обработки напоминаний запустите: vercel dev')
        // В локальной разработке просто пропускаем обработку без ошибки
        return
      }
      
      console.error('Error processing reminders:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Обрабатывает напоминания немедленно (для ручного вызова)
   */
  async processNow(): Promise<void> {
    // Сбрасываем ограничение по времени для немедленной обработки
    this.lastCheckTime = 0
    await this.processReminders()
  }
}

export const reminderProcessor = new ReminderProcessor()

