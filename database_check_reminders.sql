-- Диагностический SQL запрос для проверки напоминаний
-- Используйте этот запрос в Supabase SQL Editor для проверки состояния напоминаний

-- 1. Проверка запланированных напоминаний (ожидающих отправки)
SELECT 
    id,
    family_id,
    reminder_type,
    scheduled_time,
    event_time,
    status,
    NOW() as current_time,
    scheduled_time < NOW() as is_overdue,
    EXTRACT(EPOCH FROM (scheduled_time - NOW())) / 60 as minutes_until_reminder
FROM scheduled_reminders 
WHERE status = 'pending' 
ORDER BY scheduled_time ASC;

-- 2. Проверка последних отправленных напоминаний
SELECT 
    id,
    family_id,
    reminder_type,
    scheduled_time,
    event_time,
    status,
    sent_at,
    sent_count,
    EXTRACT(EPOCH FROM (sent_at - scheduled_time)) / 60 as delay_minutes
FROM scheduled_reminders 
WHERE status = 'sent' 
ORDER BY sent_at DESC 
LIMIT 10;

-- 3. Проверка активных подписок на push-уведомления
SELECT 
    id,
    family_id,
    user_id,
    created_at,
    updated_at
FROM push_subscriptions
ORDER BY updated_at DESC;

-- 4. Проверка напоминаний для конкретной семьи (замените YOUR_FAMILY_ID на реальный ID)
-- SELECT 
--     id,
--     reminder_type,
--     scheduled_time,
--     event_time,
--     status,
--     NOW() as current_time,
--     scheduled_time < NOW() as is_overdue
-- FROM scheduled_reminders 
-- WHERE family_id = YOUR_FAMILY_ID
-- ORDER BY scheduled_time DESC;

