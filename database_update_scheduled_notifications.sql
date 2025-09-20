-- Обновление базы данных для системы запланированных уведомлений
-- Выполните этот скрипт для добавления новой функциональности

-- Создание таблицы запланированных уведомлений
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('feeding', 'diaper')),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    is_reminder_sent BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_family_id ON scheduled_notifications(family_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_time ON scheduled_notifications(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_reminder_time ON scheduled_notifications(reminder_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_notification_type ON scheduled_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_is_completed ON scheduled_notifications(is_completed);

-- Включение Row Level Security (RLS) для безопасности
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Политика безопасности (разрешаем все операции для аутентифицированных пользователей)
-- В реальном проекте здесь должны быть более строгие политики
CREATE POLICY "Enable all operations for authenticated users" ON scheduled_notifications FOR ALL USING (true);

-- Комментарии к таблице и полям
COMMENT ON TABLE scheduled_notifications IS 'Таблица для хранения запланированных уведомлений о кормлении и смене подгузников';
COMMENT ON COLUMN scheduled_notifications.notification_type IS 'Тип уведомления: feeding (кормление) или diaper (смена подгузника)';
COMMENT ON COLUMN scheduled_notifications.scheduled_time IS 'Запланированное время события';
COMMENT ON COLUMN scheduled_notifications.reminder_time IS 'Время для отправки напоминания (scheduled_time + 15 минут)';
COMMENT ON COLUMN scheduled_notifications.is_sent IS 'Отправлено ли предупреждение за 5 минут до события';
COMMENT ON COLUMN scheduled_notifications.is_reminder_sent IS 'Отправлено ли напоминание через 15 минут после пропуска';
COMMENT ON COLUMN scheduled_notifications.is_completed IS 'Выполнено ли событие';

-- Проверка успешного создания таблицы
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_notifications') THEN
        RAISE NOTICE 'Таблица scheduled_notifications успешно создана!';
    ELSE
        RAISE EXCEPTION 'Ошибка при создании таблицы scheduled_notifications';
    END IF;
END $$;

-- Проверка индексов
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE tablename = 'scheduled_notifications';
    
    RAISE NOTICE 'Создано % индексов для таблицы scheduled_notifications', index_count;
END $$;

-- Проверка политик безопасности
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'scheduled_notifications';
    
    RAISE NOTICE 'Создано % политик безопасности для таблицы scheduled_notifications', policy_count;
END $$;
