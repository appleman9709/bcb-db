// Динамический импорт для избежания циклических зависимостей

export interface ReminderSchedule {
  familyId: number
  reminderType: 'feeding' | 'diaper' | 'bath'
  scheduledTime: string // ISO string
  eventTime: string // ISO string (когда должно произойти событие)
}

/**
 * Сервис для планирования напоминаний о кормлении, смене подгузников и купании
 */
class ReminderService {
  private static readonly REMINDER_BEFORE_MINUTES = 5 // За 5 минут до события

  /**
   * Вычисляет время следующего события на основе последнего события и интервала
   */
  calculateNextEventTime(
    lastEventTime: Date | null,
    intervalHours: number
  ): Date | null {
    if (!lastEventTime) {
      return null
    }

    const nextEventTime = new Date(lastEventTime)
    nextEventTime.setHours(nextEventTime.getHours() + intervalHours)

    // Если следующее событие уже в прошлом, возвращаем null
    if (nextEventTime.getTime() < Date.now()) {
      return null
    }

    return nextEventTime
  }

  /**
   * Вычисляет время для отправки напоминания (за 5 минут до события)
   */
  calculateReminderTime(eventTime: Date): Date {
    const reminderTime = new Date(eventTime)
    reminderTime.setMinutes(reminderTime.getMinutes() - this.REMINDER_BEFORE_MINUTES)
    return reminderTime
  }

  /**
   * Планирует напоминание о кормлении
   */
  async scheduleFeedingReminder(familyId: number): Promise<void> {
    try {
      // Импортируем dataService динамически
      const { dataService } = await import('./dataService')
      
      // Получаем последнее кормление
      const lastFeeding = await dataService.getLastFeeding()
      
      if (!lastFeeding) {
        console.log('Нет последнего кормления для планирования напоминания')
        return
      }

      // Получаем настройки семьи
      const settings = await dataService.getSettings()
      if (!settings) {
        console.error('Не удалось получить настройки семьи')
        return
      }

      const lastFeedingTime = new Date(lastFeeding.timestamp)
      const nextFeedingTime = this.calculateNextEventTime(
        lastFeedingTime,
        settings.feed_interval
      )

      if (!nextFeedingTime) {
        console.log('Время следующего кормления уже прошло или не определено')
        return
      }

      const reminderTime = this.calculateReminderTime(nextFeedingTime)

      // Если время напоминания уже прошло, не планируем
      if (reminderTime.getTime() <= Date.now()) {
        console.log('Время напоминания о кормлении уже прошло')
        return
      }

      // Планируем напоминание через API
      await this.scheduleReminderApi({
        familyId,
        reminderType: 'feeding',
        scheduledTime: reminderTime.toISOString(),
        eventTime: nextFeedingTime.toISOString()
      })

      console.log(`Напоминание о кормлении запланировано на ${reminderTime.toISOString()}`)
    } catch (error) {
      console.error('Ошибка при планировании напоминания о кормлении:', error)
    }
  }

  /**
   * Планирует напоминание о смене подгузника
   */
  async scheduleDiaperReminder(familyId: number): Promise<void> {
    try {
      // Импортируем dataService динамически
      const { dataService } = await import('./dataService')
      
      // Получаем последнюю смену подгузника
      const lastDiaper = await dataService.getLastDiaper()
      
      if (!lastDiaper) {
        console.log('Нет последней смены подгузника для планирования напоминания')
        return
      }

      // Получаем настройки семьи
      const settings = await dataService.getSettings()
      if (!settings) {
        console.error('Не удалось получить настройки семьи')
        return
      }

      const lastDiaperTime = new Date(lastDiaper.timestamp)
      const nextDiaperTime = this.calculateNextEventTime(
        lastDiaperTime,
        settings.diaper_interval
      )

      if (!nextDiaperTime) {
        console.log('Время следующей смены подгузника уже прошло или не определено')
        return
      }

      const reminderTime = this.calculateReminderTime(nextDiaperTime)

      // Если время напоминания уже прошло, не планируем
      if (reminderTime.getTime() <= Date.now()) {
        console.log('Время напоминания о смене подгузника уже прошло')
        return
      }

      // Планируем напоминание через API
      await this.scheduleReminderApi({
        familyId,
        reminderType: 'diaper',
        scheduledTime: reminderTime.toISOString(),
        eventTime: nextDiaperTime.toISOString()
      })

      console.log(`Напоминание о смене подгузника запланировано на ${reminderTime.toISOString()}`)
    } catch (error) {
      console.error('Ошибка при планировании напоминания о смене подгузника:', error)
    }
  }

  /**
   * Планирует напоминание о купании
   */
  async scheduleBathReminder(familyId: number): Promise<void> {
    try {
      // Импортируем dataService динамически
      const { dataService } = await import('./dataService')
      
      // Получаем последнее купание
      const lastBath = await dataService.getLastBath()
      
      if (!lastBath) {
        console.log('Нет последнего купания для планирования напоминания')
        return
      }

      // Получаем настройки семьи
      const settings = await dataService.getSettings()
      if (!settings) {
        console.error('Не удалось получить настройки семьи')
        return
      }

      const lastBathTime = new Date(lastBath.timestamp)
      const nextBathTime = this.calculateNextEventTime(
        lastBathTime,
        settings.bath_reminder_period || 24 // По умолчанию 24 часа
      )

      if (!nextBathTime) {
        console.log('Время следующего купания уже прошло или не определено')
        return
      }

      const reminderTime = this.calculateReminderTime(nextBathTime)

      // Если время напоминания уже прошло, не планируем
      if (reminderTime.getTime() <= Date.now()) {
        console.log('Время напоминания о купании уже прошло')
        return
      }

      // Планируем напоминание через API
      await this.scheduleReminderApi({
        familyId,
        reminderType: 'bath',
        scheduledTime: reminderTime.toISOString(),
        eventTime: nextBathTime.toISOString()
      })

      console.log(`Напоминание о купании запланировано на ${reminderTime.toISOString()}`)
    } catch (error) {
      console.error('Ошибка при планировании напоминания о купании:', error)
    }
  }

  /**
   * Отправляет запрос на планирование напоминания через API
   */
  private async scheduleReminderApi(schedule: ReminderSchedule): Promise<void> {
    const PUSH_API_BASE_URL = (() => {
      const override = import.meta.env.VITE_PUSH_API_BASE_URL?.trim()
      if (override) {
        return override.replace(/\/$/, '')
      }

      if (import.meta.env.PROD) {
        return ''
      }

      if (typeof window !== 'undefined') {
        const origin = window.location.origin
        if (origin.includes('localhost:3000') || origin.includes('127.0.0.1:3000')) {
          return ''
        }
        if (origin.includes('5173') || origin.includes('5174')) {
          return 'http://localhost:3000'
        }
      }

      return 'http://localhost:3000'
    })()

    const apiUrl = PUSH_API_BASE_URL 
      ? `${PUSH_API_BASE_URL}/api/push/schedule-reminder`
      : '/api/push/schedule-reminder'

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(schedule)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log('Напоминание успешно запланировано:', result)
    } catch (error) {
      console.error('Ошибка при запросе на планирование напоминания:', error)
      throw error
    }
  }

  /**
   * Отменяет запланированные напоминания для события
   */
  async cancelReminders(familyId: number, reminderType: 'feeding' | 'diaper' | 'bath'): Promise<void> {
    const PUSH_API_BASE_URL = (() => {
      const override = import.meta.env.VITE_PUSH_API_BASE_URL?.trim()
      if (override) {
        return override.replace(/\/$/, '')
      }

      if (import.meta.env.PROD) {
        return ''
      }

      if (typeof window !== 'undefined') {
        const origin = window.location.origin
        if (origin.includes('localhost:3000') || origin.includes('127.0.0.1:3000')) {
          return ''
        }
        if (origin.includes('5173') || origin.includes('5174')) {
          return 'http://localhost:3000'
        }
      }

      return 'http://localhost:3000'
    })()

    const apiUrl = PUSH_API_BASE_URL 
      ? `${PUSH_API_BASE_URL}/api/push/cancel-reminders`
      : '/api/push/cancel-reminders'

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          familyId,
          reminderType
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      console.log('Напоминания успешно отменены')
    } catch (error) {
      console.error('Ошибка при отмене напоминаний:', error)
      // Не пробрасываем ошибку, так как это не критично
    }
  }
}

export const reminderService = new ReminderService()

