-- Таблица для хранения запланированных push-уведомлений
CREATE TABLE IF NOT EXISTS scheduled_reminders (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('feeding', 'diaper')),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    event_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_family ON scheduled_reminders(family_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_type ON scheduled_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_status ON scheduled_reminders(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_time ON scheduled_reminders(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_pending ON scheduled_reminders(status, scheduled_time) 
    WHERE status = 'pending';

-- Композитный индекс для часто используемых запросов
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_family_type ON scheduled_reminders(family_id, reminder_type);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_scheduled_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scheduled_reminders_updated_at
    BEFORE UPDATE ON scheduled_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduled_reminders_updated_at();

-- RLS политики
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть напоминания только для своей семьи
CREATE POLICY "Users can view reminders for their family"
    ON scheduled_reminders
    FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM family_members 
            WHERE user_id::TEXT = auth.uid()::TEXT
        )
    );

-- Политика: пользователи могут создавать напоминания только для своей семьи
CREATE POLICY "Users can create reminders for their family"
    ON scheduled_reminders
    FOR INSERT
    WITH CHECK (
        family_id IN (
            SELECT family_id FROM family_members 
            WHERE user_id::TEXT = auth.uid()::TEXT
        )
    );

-- Политика: пользователи могут обновлять напоминания только для своей семьи
CREATE POLICY "Users can update reminders for their family"
    ON scheduled_reminders
    FOR UPDATE
    USING (
        family_id IN (
            SELECT family_id FROM family_members 
            WHERE user_id::TEXT = auth.uid()::TEXT
        )
    );

-- Политика: пользователи могут удалять напоминания только для своей семьи
CREATE POLICY "Users can delete reminders for their family"
    ON scheduled_reminders
    FOR DELETE
    USING (
        family_id IN (
            SELECT family_id FROM family_members 
            WHERE user_id::TEXT = auth.uid()::TEXT
        )
    );

-- Комментарии к таблице и столбцам
COMMENT ON TABLE scheduled_reminders IS 'Таблица для хранения запланированных push-уведомлений о кормлении и смене подгузников';
COMMENT ON COLUMN scheduled_reminders.family_id IS 'ID семьи, для которой запланировано напоминание';
COMMENT ON COLUMN scheduled_reminders.reminder_type IS 'Тип напоминания: feeding (кормление) или diaper (смена подгузника)';
COMMENT ON COLUMN scheduled_reminders.scheduled_time IS 'Время, когда должно быть отправлено напоминание (за 15 минут до события)';
COMMENT ON COLUMN scheduled_reminders.event_time IS 'Время, когда должно произойти событие (кормление или смена подгузника)';
COMMENT ON COLUMN scheduled_reminders.status IS 'Статус напоминания: pending (ожидает), sent (отправлено), cancelled (отменено)';
COMMENT ON COLUMN scheduled_reminders.sent_at IS 'Время отправки напоминания';
COMMENT ON COLUMN scheduled_reminders.sent_count IS 'Количество получателей, которым было отправлено напоминание';

