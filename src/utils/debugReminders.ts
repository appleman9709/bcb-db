/**
 * Утилита для отладки напоминаний
 * Используется для проверки состояния напоминаний в консоли браузера
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Проверяет запланированные напоминания для текущей семьи
 */
export async function checkScheduledReminders(familyId: number) {
  try {
    const { data: reminders, error } = await supabase
      .from('scheduled_reminders')
      .select('*')
      .eq('family_id', familyId)
      .eq('status', 'pending')
      .order('scheduled_time', { ascending: true })

    if (error) {
      console.error('❌ Error fetching reminders:', error)
      return
    }

    if (!reminders || reminders.length === 0) {
      console.log('ℹ️ Нет запланированных напоминаний')
      return
    }

    console.log(`📋 Найдено ${reminders.length} запланированных напоминаний:`)
    reminders.forEach((reminder) => {
      const scheduledTime = new Date(reminder.scheduled_time)
      const now = new Date()
      const timeUntil = scheduledTime.getTime() - now.getTime()
      const minutesUntil = Math.round(timeUntil / 1000 / 60)
      
      console.log(`  - ${reminder.reminder_type}: запланировано на ${scheduledTime.toLocaleString()}, через ${minutesUntil} минут`)
    })
  } catch (error) {
    console.error('❌ Error checking reminders:', error)
  }
}

/**
 * Проверяет активные подписки для текущей семьи
 */
export async function checkPushSubscriptions(familyId: number) {
  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('family_id', familyId)

    if (error) {
      console.error('❌ Error fetching subscriptions:', error)
      return
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.warn('⚠️ Нет активных подписок на push-уведомления!')
      console.warn('   Убедитесь, что вы подписаны на push-уведомления в настройках')
      return
    }

    console.log(`📱 Найдено ${subscriptions.length} активных подписок:`)
    subscriptions.forEach((sub) => {
      console.log(`  - User: ${sub.user_id}, создана: ${new Date(sub.created_at).toLocaleString()}`)
    })
  } catch (error) {
    console.error('❌ Error checking subscriptions:', error)
  }
}

/**
 * Создает тестовое напоминание на ближайшее время (через 1 минуту)
 */
export async function createTestReminder(familyId: number, reminderType: 'feeding' | 'diaper' | 'bath' = 'diaper') {
  try {
    const now = new Date()
    const scheduledTime = new Date(now.getTime() + 60000) // Через 1 минуту
    const eventTime = new Date(now.getTime() + 360000) // Через 6 минут (событие)

    // Отменяем предыдущие тестовые напоминания
    await supabase
      .from('scheduled_reminders')
      .delete()
      .eq('family_id', familyId)
      .eq('reminder_type', reminderType)

    const { data, error } = await supabase
      .from('scheduled_reminders')
      .insert({
        family_id: familyId,
        reminder_type: reminderType,
        scheduled_time: scheduledTime.toISOString(),
        event_time: eventTime.toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating test reminder:', error)
      return
    }

    console.log(`✅ Тестовое напоминание создано: ${reminderType}`)
    console.log(`   Время отправки: ${scheduledTime.toLocaleString()}`)
    console.log(`   Время события: ${eventTime.toLocaleString()}`)
    console.log(`   Напоминание придет через ~1 минуту`)
  } catch (error) {
    console.error('❌ Error creating test reminder:', error)
  }
}

/**
 * Создает тестовое напоминание для немедленной отправки (время уже прошло)
 */
export async function createImmediateTestReminder(familyId: number, reminderType: 'feeding' | 'diaper' | 'bath' = 'diaper') {
  try {
    const now = new Date()
    const scheduledTime = new Date(now.getTime() - 60000) // 1 минуту назад (уже пора отправить)
    const eventTime = new Date(now.getTime() + 300000) // Через 5 минут (событие)

    // Отменяем предыдущие тестовые напоминания
    await supabase
      .from('scheduled_reminders')
      .delete()
      .eq('family_id', familyId)
      .eq('reminder_type', reminderType)

    const { data, error } = await supabase
      .from('scheduled_reminders')
      .insert({
        family_id: familyId,
        reminder_type: reminderType,
        scheduled_time: scheduledTime.toISOString(),
        event_time: eventTime.toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating immediate test reminder:', error)
      return
    }

    console.log(`✅ Тестовое напоминание для немедленной отправки создано: ${reminderType}`)
    console.log(`   Время отправки: ${scheduledTime.toLocaleString()} (уже прошло)`)
    console.log(`   Время события: ${eventTime.toLocaleString()}`)
    console.log(`   Теперь вызовите: window.debugReminders.processRemindersNow()`)
  } catch (error) {
    console.error('❌ Error creating immediate test reminder:', error)
  }
}

/**
 * Вручную обрабатывает напоминания (для тестирования)
 */
export async function processRemindersNow() {
  try {
    const { reminderProcessor } = await import('../services/reminderProcessor')
    console.log('🔄 Обрабатываю напоминания вручную...')
    
    // Проверяем, доступен ли API endpoint
    const apiUrl = import.meta.env.VITE_PUSH_API_BASE_URL 
      ? `${import.meta.env.VITE_PUSH_API_BASE_URL}/api/push/process-reminders`
      : '/api/push/process-reminders'
    
    try {
      const testResponse = await fetch(apiUrl, { method: 'POST' })
      if (testResponse.status === 404) {
        console.warn('⚠️ API endpoint недоступен (локальная разработка)')
        console.warn('   Для обработки напоминаний запустите: vercel dev')
        console.warn('   Или работайте в продакшене, где API endpoints доступны')
        return
      }
    } catch (fetchError) {
      console.warn('⚠️ API endpoint недоступен (локальная разработка)')
      console.warn('   Для обработки напоминаний запустите: vercel dev')
      console.warn('   Или работайте в продакшене, где API endpoints доступны')
      return
    }
    
    await reminderProcessor.processNow()
  } catch (error) {
    console.error('❌ Error processing reminders:', error)
  }
}

/**
 * Проверяет все компоненты системы напоминаний
 */
export async function testReminderSystem(familyId: number) {
  console.log('🧪 Тестирование системы напоминаний...')
  console.log('')

  // 1. Проверка напоминаний
  console.log('1️⃣ Проверка запланированных напоминаний:')
  await checkScheduledReminders(familyId)
  console.log('')

  // 2. Проверка подписок
  console.log('2️⃣ Проверка подписок на push-уведомления:')
  await checkPushSubscriptions(familyId)
  console.log('')

  // 3. Проверка обработчика
  console.log('3️⃣ Проверка обработчика напоминаний:')
  const { reminderProcessor } = await import('../services/reminderProcessor')
  console.log(`   Обработчик ${reminderProcessor ? 'доступен' : 'не доступен'}`)
  console.log('')

  console.log('✅ Тестирование завершено')
  console.log('')
  console.log('💡 Для создания тестового напоминания:')
  console.log('   window.debugReminders.createTestReminder(familyId)')
  console.log('')
  console.log('💡 Для ручной обработки напоминаний:')
  console.log('   window.debugReminders.processRemindersNow()')
}

// Делаем функции доступными глобально для отладки в консоли
if (typeof window !== 'undefined') {
  (window as any).debugReminders = {
    checkScheduledReminders,
    checkPushSubscriptions,
    createTestReminder,
    createImmediateTestReminder,
    processRemindersNow,
    testReminderSystem
  }
  console.log('🔧 Debug utilities available:')
  console.log('   window.debugReminders.checkScheduledReminders(familyId)')
  console.log('   window.debugReminders.checkPushSubscriptions(familyId)')
  console.log('   window.debugReminders.createTestReminder(familyId, "diaper") - через 1 минуту')
  console.log('   window.debugReminders.createImmediateTestReminder(familyId, "diaper") - немедленно')
  console.log('   window.debugReminders.processRemindersNow() - обработать сейчас')
  console.log('   window.debugReminders.testReminderSystem(familyId) - полный тест')
}

