-- Добавление настройки "просыпаться после активности"
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Добавляем новое поле wake_on_activity_enabled в таблицу settings
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS wake_on_activity_enabled BOOLEAN DEFAULT TRUE;

-- 2. Обновляем существующие записи, устанавливая wake_on_activity_enabled = TRUE
UPDATE settings 
SET wake_on_activity_enabled = TRUE 
WHERE wake_on_activity_enabled IS NULL;

-- 3. Создаем функцию для автоматического завершения сна при записи активности
CREATE OR REPLACE FUNCTION wake_on_activity()
RETURNS TRIGGER AS $$
DECLARE
    wake_setting BOOLEAN;
    family_id_param INTEGER;
BEGIN
    -- Получаем настройку для семьи
    SELECT wake_on_activity_enabled, NEW.family_id
    INTO wake_setting, family_id_param
    FROM settings
    WHERE family_id = NEW.family_id;
    
    -- Если настройка включена и это новая активность
    IF wake_setting = TRUE AND TG_OP = 'INSERT' THEN
        -- Завершаем все активные сессии сна семьи
        PERFORM end_all_family_sleep_sessions(family_id_param, NEW.author_id);
        
        -- Уведомляем всех членов семьи о пробуждении
        PERFORM pg_notify('baby_woke_up', json_build_object(
            'family_id', family_id_param,
            'author_id', NEW.author_id,
            'author_name', NEW.author_name,
            'activity_type', NEW.activity_type,
            'timestamp', NEW.timestamp
        )::text);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Создаем триггер для автоматического пробуждения при записи активности
DROP TRIGGER IF EXISTS wake_on_activity_trigger ON activities;
CREATE TRIGGER wake_on_activity_trigger
    AFTER INSERT ON activities
    FOR EACH ROW
    EXECUTE FUNCTION wake_on_activity();

-- 5. Добавляем комментарии
COMMENT ON COLUMN settings.wake_on_activity_enabled IS 'Автоматически будить малыша при записи любой активности';
COMMENT ON FUNCTION wake_on_activity() IS 'Автоматически завершает сон при записи активности, если настройка включена';

-- Готово! Теперь при записи любой активности малыш будет автоматически просыпаться
