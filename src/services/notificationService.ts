import { dataService, Settings } from './dataService'

export interface ReminderCheck {
  type: 'feeding' | 'diaper' | 'bath' | 'activity'
  lastTime: Date | null
  intervalHours: number
  shouldNotify: boolean
  message: string
}

class NotificationService {
  private checkInterval: NodeJS.Timeout | null = null
  private onNotificationCallback: ((type: string, title: string, message: string) => void) | null = null

  // Устанавливаем callback для отправки уведомлений
  setNotificationCallback(callback: (type: string, title: string, message: string) => void) {
    this.onNotificationCallback = callback
  }

  // Запускаем проверку напоминаний
  startReminderChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    // Проверяем каждые 5 минут
    this.checkInterval = setInterval(async () => {
      await this.checkReminders()
    }, 5 * 60 * 1000)

    // Первая проверка сразу
    this.checkReminders()
  }

  // Останавливаем проверку напоминаний
  stopReminderChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  // Проверяем все напоминания
  private async checkReminders() {
    try {
      const settings = await dataService.getSettings()
      if (!settings) return

      const reminders = await this.getReminderChecks(settings)
      
      for (const reminder of reminders) {
        if (reminder.shouldNotify && this.onNotificationCallback) {
          this.onNotificationCallback(
            'reminder',
            `Напоминание: ${this.getReminderTitle(reminder.type)}`,
            reminder.message
          )
        }
      }
    } catch (error) {
      console.error('Error checking reminders:', error)
    }
  }

  // Получаем проверки напоминаний
  async getReminderChecks(settings: Settings): Promise<ReminderCheck[]> {
    const now = new Date()
    
    const [lastFeeding, lastDiaper, lastBath, lastActivity] = await Promise.all([
      dataService.getLastFeeding(),
      dataService.getLastDiaper(),
      dataService.getLastBath(),
      dataService.getActivities(1)
    ])

    const checks: ReminderCheck[] = []

    // Проверка кормления
    if (settings.feed_interval > 0) {
      const lastFeedingTime = lastFeeding ? new Date(lastFeeding.timestamp) : null
      const hoursSinceFeeding = lastFeedingTime 
        ? (now.getTime() - lastFeedingTime.getTime()) / (1000 * 60 * 60)
        : Infinity

      checks.push({
        type: 'feeding',
        lastTime: lastFeedingTime,
        intervalHours: settings.feed_interval,
        shouldNotify: hoursSinceFeeding >= settings.feed_interval,
        message: lastFeedingTime 
          ? `Прошло ${Math.floor(hoursSinceFeeding)} часов с последнего кормления`
          : 'Пора покормить малыша!'
      })
    }

    // Проверка смены подгузника
    if (settings.diaper_interval > 0) {
      const lastDiaperTime = lastDiaper ? new Date(lastDiaper.timestamp) : null
      const hoursSinceDiaper = lastDiaperTime 
        ? (now.getTime() - lastDiaperTime.getTime()) / (1000 * 60 * 60)
        : Infinity

      checks.push({
        type: 'diaper',
        lastTime: lastDiaperTime,
        intervalHours: settings.diaper_interval,
        shouldNotify: hoursSinceDiaper >= settings.diaper_interval,
        message: lastDiaperTime 
          ? `Прошло ${Math.floor(hoursSinceDiaper)} часов с последней смены подгузника`
          : 'Пора сменить подгузник!'
      })
    }

    // Проверка купания
    if (settings.bath_reminder_enabled && settings.bath_reminder_period > 0) {
      const lastBathTime = lastBath ? new Date(lastBath.timestamp) : null
      const daysSinceBath = lastBathTime 
        ? (now.getTime() - lastBathTime.getTime()) / (1000 * 60 * 60 * 24)
        : Infinity

      checks.push({
        type: 'bath',
        lastTime: lastBathTime,
        intervalHours: settings.bath_reminder_period * 24,
        shouldNotify: daysSinceBath >= settings.bath_reminder_period,
        message: lastBathTime 
          ? `Прошло ${Math.floor(daysSinceBath)} дней с последнего купания`
          : 'Пора искупать малыша!'
      })
    }

    // Проверка активности
    if (settings.activity_reminder_enabled && settings.activity_reminder_interval > 0) {
      const lastActivityTime = lastActivity.length > 0 ? new Date(lastActivity[0].timestamp) : null
      const hoursSinceActivity = lastActivityTime 
        ? (now.getTime() - lastActivityTime.getTime()) / (1000 * 60 * 60)
        : Infinity

      checks.push({
        type: 'activity',
        lastTime: lastActivityTime,
        intervalHours: settings.activity_reminder_interval,
        shouldNotify: hoursSinceActivity >= settings.activity_reminder_interval,
        message: lastActivityTime 
          ? `Прошло ${Math.floor(hoursSinceActivity)} часов с последней активности`
          : 'Пора поиграть с малышом!'
      })
    }

    return checks
  }

  // Получаем заголовок для типа напоминания
  private getReminderTitle(type: string): string {
    switch (type) {
      case 'feeding':
        return 'Кормление'
      case 'diaper':
        return 'Смена подгузника'
      case 'bath':
        return 'Купание'
      case 'activity':
        return 'Активность'
      default:
        return 'Напоминание'
    }
  }

  // Создаем уведомление об успешном действии
  createSuccessNotification(action: string): { type: 'success'; title: string; message: string } {
    const messages = {
      feeding: {
        title: 'Кормление записано!',
        message: 'Время кормления успешно добавлено в журнал'
      },
      diaper: {
        title: 'Подгузник сменен!',
        message: 'Смена подгузника записана в журнал'
      },
      bath: {
        title: 'Купание записано!',
        message: 'Время купания добавлено в журнал'
      },
      activity: {
        title: 'Активность записана!',
        message: 'Активность успешно добавлена в журнал'
      }
    }

    return {
      type: 'success',
      ...messages[action as keyof typeof messages] || {
        title: 'Действие выполнено!',
        message: 'Данные успешно сохранены'
      }
    }
  }

  // Создаем уведомление об ошибке
  createErrorNotification(error: string): { type: 'error'; title: string; message: string } {
    return {
      type: 'error',
      title: 'Ошибка',
      message: error
    }
  }

  // Создаем информационное уведомление
  createInfoNotification(title: string, message: string): { type: 'info'; title: string; message: string } {
    return {
      type: 'info',
      title,
      message
    }
  }
}

export const notificationService = new NotificationService()
