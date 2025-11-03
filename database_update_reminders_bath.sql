-- Миграция для добавления поддержки напоминаний о купании
-- Обновляет таблицу scheduled_reminders для поддержки типа 'bath'

-- Удаляем старый CHECK constraint
ALTER TABLE scheduled_reminders 
DROP CONSTRAINT IF EXISTS scheduled_reminders_reminder_type_check;

-- Добавляем новый CHECK constraint с поддержкой 'bath'
ALTER TABLE scheduled_reminders 
ADD CONSTRAINT scheduled_reminders_reminder_type_check 
CHECK (reminder_type IN ('feeding', 'diaper', 'bath'));

-- Обновляем комментарии
COMMENT ON TABLE scheduled_reminders IS 'Таблица для хранения запланированных push-уведомлений о кормлении, смене подгузников и купании';
COMMENT ON COLUMN scheduled_reminders.reminder_type IS 'Тип напоминания: feeding (кормление), diaper (смена подгузника) или bath (купание)';
COMMENT ON COLUMN scheduled_reminders.scheduled_time IS 'Время, когда должно быть отправлено напоминание (за 5 минут до события)';

