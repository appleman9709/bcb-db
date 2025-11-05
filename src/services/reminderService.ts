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
    reminderTime.setMinutes(reminderTime.getMinutes() - ReminderService.REMINDER_BEFORE_MINUTES)
    return reminderTime
  }

  /**
   * Планирует напоминание о кормлении сразу после добавления события
   * @param familyId - ID семьи
   * @param eventTimestamp - Время события (кормления)
   * @param intervalHours - Интервал кормления в часах
   */
  async scheduleFeedingReminder(familyId: number, eventTimestamp: Date, intervalHours: number): Promise<void> {
    try {
      console.log(`📅 Планирование напоминания о кормлении:`, {
        familyId,
        eventTimestamp: eventTimestamp.toISOString(),
        intervalHours
      })

      // Вычисляем время следующего события
      const nextFeedingTime = new Date(eventTimestamp)
      nextFeedingTime.setHours(nextFeedingTime.getHours() + intervalHours)

      // Вычисляем время напоминания (за 5 минут до следующего события)
      const reminderTime = this.calculateReminderTime(nextFeedingTime)

      const now = Date.now()
      const timeUntilReminder = reminderTime.getTime() - now

      console.log(`⏰ Время следующего кормления: ${nextFeedingTime.toISOString()}`)
      console.log(`⏰ Время напоминания: ${reminderTime.toISOString()}`)
      console.log(`⏰ До напоминания: ${Math.round(timeUntilReminder / 1000 / 60)} минут`)

      // Если время напоминания уже прошло, не планируем
      if (reminderTime.getTime() <= now) {
        console.warn('⚠️ Время напоминания о кормлении уже прошло, не планируем')
        return
      }

      // Планируем напоминание через API
      await this.scheduleReminderApi({
        familyId,
        reminderType: 'feeding',
        scheduledTime: reminderTime.toISOString(),
        eventTime: nextFeedingTime.toISOString()
      })

      console.log(`✅ Напоминание о кормлении запланировано на ${reminderTime.toISOString()} (следующее кормление в ${nextFeedingTime.toISOString()})`)
    } catch (error) {
      console.error('❌ Ошибка при планировании напоминания о кормлении:', error)
    }
  }

  /**
   * Планирует напоминание о смене подгузника сразу после добавления события
   * @param familyId - ID семьи
   * @param eventTimestamp - Время события (смены подгузника)
   * @param intervalHours - Интервал смены подгузника в часах
   */
  async scheduleDiaperReminder(familyId: number, eventTimestamp: Date, intervalHours: number): Promise<void> {
    try {
      console.log(`📅 Планирование напоминания о смене подгузника:`, {
        familyId,
        eventTimestamp: eventTimestamp.toISOString(),
        intervalHours
      })

      // Вычисляем время следующего события
      const nextDiaperTime = new Date(eventTimestamp)
      nextDiaperTime.setHours(nextDiaperTime.getHours() + intervalHours)

      // Вычисляем время напоминания (за 5 минут до следующего события)
      const reminderTime = this.calculateReminderTime(nextDiaperTime)

      const now = Date.now()
      const timeUntilReminder = reminderTime.getTime() - now

      console.log(`⏰ Время следующей смены: ${nextDiaperTime.toISOString()}`)
      console.log(`⏰ Время напоминания: ${reminderTime.toISOString()}`)
      console.log(`⏰ До напоминания: ${Math.round(timeUntilReminder / 1000 / 60)} минут`)

      // Если время напоминания уже прошло, не планируем
      if (reminderTime.getTime() <= now) {
        console.warn('⚠️ Время напоминания о смене подгузника уже прошло, не планируем')
        return
      }

      // Планируем напоминание через API
      await this.scheduleReminderApi({
        familyId,
        reminderType: 'diaper',
        scheduledTime: reminderTime.toISOString(),
        eventTime: nextDiaperTime.toISOString()
      })

      console.log(`✅ Напоминание о смене подгузника запланировано на ${reminderTime.toISOString()} (следующая смена в ${nextDiaperTime.toISOString()})`)
    } catch (error) {
      console.error('❌ Ошибка при планировании напоминания о смене подгузника:', error)
    }
  }

  /**
   * Планирует напоминание о купании сразу после добавления события
   * @param familyId - ID семьи
   * @param eventTimestamp - Время события (купания)
   * @param intervalHours - Интервал купания в часах
   */
  async scheduleBathReminder(familyId: number, eventTimestamp: Date, intervalHours: number): Promise<void> {
    try {
      // Вычисляем время следующего события
      const nextBathTime = new Date(eventTimestamp)
      nextBathTime.setHours(nextBathTime.getHours() + intervalHours)

      // Вычисляем время напоминания (за 5 минут до следующего события)
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

      console.log(`Напоминание о купании запланировано на ${reminderTime.toISOString()} (следующее купание в ${nextBathTime.toISOString()})`)
    } catch (error) {
      console.error('Ошибка при планировании напоминания о купании:', error)
    }
  }

  /**
   * Отправляет запрос на планирование напоминания через API или Supabase
   */
  private async scheduleReminderApi(schedule: ReminderSchedule): Promise<void> {
    // Пытаемся использовать API, если доступен
    const useApi = await this.tryScheduleViaApi(schedule)
    
    // Если API не доступен, сохраняем напрямую в Supabase
    if (!useApi) {
      await this.scheduleViaSupabase(schedule)
    }
  }

  /**
   * Пытается запланировать напоминание через API
   * @returns true если успешно, false если API недоступен
   */
  private async tryScheduleViaApi(schedule: ReminderSchedule): Promise<boolean> {
    const PUSH_API_BASE_URL = (() => {
      // @ts-ignore - import.meta.env exists in Vite
      const override = import.meta.env.VITE_PUSH_API_BASE_URL?.trim()
      if (override) {
        return override.replace(/\/$/, '')
      }

      // @ts-ignore - import.meta.env exists in Vite
      if (import.meta.env.PROD) {
        return '' // В продакшене используем относительный путь
      }

      // В локальной разработке используем относительный путь, если API не указан явно
      return ''
    })()

    const apiUrl = PUSH_API_BASE_URL 
      ? `${PUSH_API_BASE_URL}/api/push/schedule-reminder`
      : '/api/push/schedule-reminder'

    try {
      // Создаем AbortSignal с таймаутом (с fallback для старых браузеров)
      let abortSignal: AbortSignal | undefined
      if (typeof AbortSignal.timeout === 'function') {
        abortSignal = AbortSignal.timeout(5000)
      } else {
        // Fallback для старых браузеров
        const controller = new AbortController()
        setTimeout(() => controller.abort(), 5000)
        abortSignal = controller.signal
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(schedule),
        signal: abortSignal
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ Напоминание успешно запланировано через API:', result)
      return true
    } catch (error) {
      // Если API недоступен (локальная разработка без сервера), используем Supabase
      if (error instanceof TypeError && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
        console.log('ℹ️ API недоступен, используем Supabase напрямую')
        return false
      }
      // Если таймаут - тоже используем Supabase
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
        console.log('ℹ️ Таймаут при обращении к API, используем Supabase напрямую')
        return false
      }
      // Если 404 - тоже используем Supabase (API endpoint не существует)
      if (error instanceof Error && error.message.includes('HTTP 404')) {
        console.log('ℹ️ API endpoint не найден (404), используем Supabase напрямую')
        return false
      }
      // Другие ошибки пробрасываем дальше
      console.error('❌ Ошибка при запросе на планирование напоминания:', error)
      return false
    }
  }

  /**
   * Сохраняет напоминание напрямую в Supabase через существующий клиент
   * Примечание: приложение использует свою систему авторизации через family_members,
   * а не Supabase Auth, поэтому RLS политика должна быть упрощенной
   */
  private async scheduleViaSupabase(schedule: ReminderSchedule): Promise<void> {
    try {
      // Используем существующий клиент Supabase
      const { supabase } = await import('../lib/supabaseClient')

      // Отменяем предыдущие напоминания того же типа для этой семьи
      const { error: deleteError } = await supabase
        .from('scheduled_reminders')
        .delete()
        .eq('family_id', schedule.familyId)
        .eq('reminder_type', schedule.reminderType)

      if (deleteError) {
        console.warn('⚠️ Ошибка при удалении предыдущих напоминаний:', deleteError)
        // Не прерываем выполнение, продолжаем создавать новое напоминание
      }

      // Сохраняем новое напоминание
      const { data, error } = await supabase
        .from('scheduled_reminders')
        .insert({
          family_id: schedule.familyId,
          reminder_type: schedule.reminderType,
          scheduled_time: schedule.scheduledTime,
          event_time: schedule.eventTime,
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        // Если ошибка RLS, логируем и пропускаем
        if (error.code === '42501') {
          console.error('❌ RLS ошибка: нет прав на запись в scheduled_reminders.')
          console.error('   Выполните SQL миграцию database_fix_scheduled_reminders_rls.sql в Supabase SQL Editor')
          // Не пробрасываем ошибку, чтобы не блокировать добавление события
          return
        }
        throw error
      }

      console.log('✅ Напоминание успешно сохранено в Supabase:', data)
    } catch (error) {
      console.error('❌ Ошибка при сохранении напоминания в Supabase:', error)
      // Не пробрасываем ошибку, чтобы не блокировать добавление события
      // Пользователь все равно сможет добавить событие, просто напоминание не будет запланировано
    }
  }

  /**
   * Отменяет запланированные напоминания для события
   */
  async cancelReminders(familyId: number, reminderType: 'feeding' | 'diaper' | 'bath'): Promise<void> {
    const PUSH_API_BASE_URL = (() => {
      // @ts-ignore - import.meta.env exists in Vite
      const override = import.meta.env.VITE_PUSH_API_BASE_URL?.trim()
      if (override) {
        return override.replace(/\/$/, '')
      }

      // @ts-ignore - import.meta.env exists in Vite
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

