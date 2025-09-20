import { dataService, Settings, ScheduledNotification } from './dataService'

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
  private lastNotificationTimes: Map<string, number> = new Map()

  // Устанавливаем callback для отправки уведомлений
  setNotificationCallback(callback: (type: string, title: string, message: string) => void) {
    this.onNotificationCallback = callback
  }

  // Запускаем проверку напоминаний
  startReminderChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    // Проверяем каждые 30 секунд для тестирования (в продакшене можно увеличить до 5 минут)
    this.checkInterval = setInterval(async () => {
      await this.checkReminders()
    }, 30 * 1000)

    // Первая проверка через 2 секунды после запуска
    setTimeout(() => {
      this.checkReminders()
    }, 2000)
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
      // Очищаем старые уведомления
      await dataService.cleanupOldNotifications()

      // Проверяем запланированные уведомления
      await this.checkScheduledNotifications()

      // Проверяем обычные напоминания (для купания и активности)
      const settings = await dataService.getSettings()
      if (!settings) {
        console.log('No settings found, skipping reminder check')
        return
      }

      const reminders = await this.getReminderChecks(settings)
      
      for (const reminder of reminders) {
        if (reminder.shouldNotify && this.onNotificationCallback) {
          const now = Date.now()
          const lastNotificationTime = this.lastNotificationTimes.get(reminder.type) || 0
          const timeSinceLastNotification = now - lastNotificationTime
          
          // Отправляем уведомление только если прошло больше 10 минут с последнего
          if (timeSinceLastNotification > 10 * 60 * 1000) {
            console.log('Sending reminder:', reminder.type, reminder.message)
            this.onNotificationCallback(
              'reminder',
              `Напоминание: ${this.getReminderTitle(reminder.type)}`,
              reminder.message
            )
            this.lastNotificationTimes.set(reminder.type, now)
          }
        }
      }
    } catch (error) {
      console.error('Error checking reminders:', error)
    }
  }

  // Проверяем запланированные уведомления
  private async checkScheduledNotifications() {
    try {
      const scheduledNotifications = await dataService.getScheduledNotifications()
      const now = new Date()

      for (const notification of scheduledNotifications) {
        const scheduledTime = new Date(notification.scheduled_time)
        const reminderTime = new Date(notification.reminder_time)
        
        // Проверяем, нужно ли отправить предупреждение за 5 минут
        const warningTime = new Date(scheduledTime.getTime() - 5 * 60 * 1000) // -5 минут
        if (now >= warningTime && now < scheduledTime && !notification.is_sent && this.onNotificationCallback) {
          console.log('Sending scheduled notification warning:', notification.notification_type)
          this.onNotificationCallback(
            'warning',
            `Скоро время ${this.getReminderTitle(notification.notification_type)}`,
            `Через 5 минут пора ${this.getActionText(notification.notification_type)}`
          )
          await dataService.markNotificationSent(notification.id)
        }

        // Проверяем, нужно ли отправить напоминание через 15 минут после пропущенного события
        if (now >= reminderTime && !notification.is_reminder_sent && !notification.is_completed && this.onNotificationCallback) {
          console.log('Sending reminder notification:', notification.notification_type)
          this.onNotificationCallback(
            'reminder',
            `Напоминание: ${this.getReminderTitle(notification.notification_type)}`,
            `Прошло 15 минут после запланированного времени ${this.getActionText(notification.notification_type)}`
          )
          await dataService.markReminderSent(notification.id)
        }
      }
    } catch (error) {
      console.error('Error checking scheduled notifications:', error)
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

      // Добавляем буфер в 0.5 часа, чтобы не спамить уведомлениями
      const shouldNotify = hoursSinceFeeding >= (settings.feed_interval + 0.5)

      checks.push({
        type: 'feeding',
        lastTime: lastFeedingTime,
        intervalHours: settings.feed_interval,
        shouldNotify,
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

      const shouldNotify = hoursSinceDiaper >= (settings.diaper_interval + 0.5)

      checks.push({
        type: 'diaper',
        lastTime: lastDiaperTime,
        intervalHours: settings.diaper_interval,
        shouldNotify,
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

  // Получаем текст действия для типа напоминания
  private getActionText(type: string): string {
    switch (type) {
      case 'feeding':
        return 'покормить малыша'
      case 'diaper':
        return 'сменить подгузник'
      case 'bath':
        return 'искупать малыша'
      case 'activity':
        return 'поиграть с малышом'
      default:
        return 'выполнить действие'
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

  // Отмечаем запланированное уведомление как выполненное
  async markScheduledNotificationCompleted(actionType: 'feeding' | 'diaper'): Promise<void> {
    try {
      const scheduledNotifications = await dataService.getScheduledNotifications()
      const now = new Date()
      
      // Находим ближайшее невыполненное уведомление данного типа
      const relevantNotification = scheduledNotifications.find(n => 
        n.notification_type === actionType && 
        !n.is_completed &&
        new Date(n.scheduled_time) <= now
      )

      if (relevantNotification) {
        await dataService.markNotificationCompleted(relevantNotification.id)
        console.log(`Marked ${actionType} notification as completed`)
      }
    } catch (error) {
      console.error('Error marking notification as completed:', error)
    }
  }
}

export const notificationService = new NotificationService()
