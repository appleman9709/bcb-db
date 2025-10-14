-- Обновление системы сна для синхронизации между членами семьи
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Добавляем поле sleep_coins в таблицу parent_coins (если его еще нет)
ALTER TABLE parent_coins 
ADD COLUMN IF NOT EXISTS sleep_coins INTEGER DEFAULT 0;

-- 2. Обновляем существующие записи, устанавливая sleep_coins = 0
UPDATE parent_coins 
SET sleep_coins = 0 
WHERE sleep_coins IS NULL;

-- 3. Создаем функцию для синхронизации состояния сна семьи
CREATE OR REPLACE FUNCTION sync_family_sleep_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Если это новая сессия сна (start_time заполнено, end_time NULL)
    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NULL THEN
        -- Уведомляем всех членов семьи о начале сна
        PERFORM pg_notify('family_sleep_start', json_build_object(
            'family_id', NEW.family_id,
            'author_id', NEW.author_id,
            'author_name', NEW.author_name,
            'start_time', NEW.start_time
        )::text);
    END IF;
    
    -- Если сессия сна завершена (end_time заполнено)
    IF NEW.end_time IS NOT NULL AND OLD.end_time IS NULL THEN
        -- Уведомляем всех членов семьи о завершении сна
        PERFORM pg_notify('family_sleep_end', json_build_object(
            'family_id', NEW.family_id,
            'author_id', NEW.author_id,
            'author_name', NEW.author_name,
            'end_time', NEW.end_time,
            'duration_minutes', NEW.duration_minutes
        )::text);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Создаем триггер для автоматической синхронизации сна
DROP TRIGGER IF EXISTS sleep_sync_trigger ON sleep_sessions;
CREATE TRIGGER sleep_sync_trigger
    AFTER INSERT OR UPDATE ON sleep_sessions
    FOR EACH ROW
    EXECUTE FUNCTION sync_family_sleep_status();

-- 5. Создаем функцию для получения текущего состояния сна семьи
CREATE OR REPLACE FUNCTION get_family_sleep_status(family_id_param INTEGER)
RETURNS TABLE (
    is_sleeping BOOLEAN,
    sleep_session_id INTEGER,
    start_time TIMESTAMP WITH TIME ZONE,
    author_name TEXT,
    duration_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE WHEN ss.id IS NOT NULL THEN TRUE ELSE FALSE END as is_sleeping,
        ss.id as sleep_session_id,
        ss.start_time,
        ss.author_name,
        CASE 
            WHEN ss.end_time IS NOT NULL THEN ss.duration_minutes
            ELSE EXTRACT(EPOCH FROM (NOW() - ss.start_time)) / 60
        END::INTEGER as duration_minutes
    FROM sleep_sessions ss
    WHERE ss.family_id = family_id_param 
      AND ss.end_time IS NULL
    ORDER BY ss.start_time DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 6. Создаем функцию для принудительного завершения всех активных сессий сна семьи
CREATE OR REPLACE FUNCTION end_all_family_sleep_sessions(family_id_param INTEGER, end_author_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    sessions_ended INTEGER := 0;
    session_record RECORD;
BEGIN
    -- Находим все активные сессии сна семьи
    FOR session_record IN 
        SELECT id, start_time 
        FROM sleep_sessions 
        WHERE family_id = family_id_param 
          AND end_time IS NULL
    LOOP
        -- Завершаем сессию
        UPDATE sleep_sessions 
        SET 
            end_time = NOW(),
            duration_minutes = EXTRACT(EPOCH FROM (NOW() - session_record.start_time)) / 60,
            author_id = end_author_id
        WHERE id = session_record.id;
        
        sessions_ended := sessions_ended + 1;
    END LOOP;
    
    RETURN sessions_ended;
END;
$$ LANGUAGE plpgsql;

-- 7. Создаем функцию для проверки и выдачи достижений за сон
CREATE OR REPLACE FUNCTION check_sleep_achievements(
    family_id_param INTEGER,
    user_id_param BIGINT,
    sleep_duration_minutes INTEGER DEFAULT 0
)
RETURNS TABLE (
    achievement_id INTEGER,
    achievement_name TEXT,
    achievement_description TEXT,
    rarity TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH sleep_stats AS (
        SELECT 
            COUNT(*) as total_sleep_sessions,
            AVG(duration_minutes) as avg_duration,
            MAX(duration_minutes) as max_duration,
            COUNT(CASE WHEN duration_minutes >= 480 THEN 1 END) as long_sleeps -- 8+ часов
        FROM sleep_sessions 
        WHERE family_id = family_id_param 
          AND author_id = user_id_param
          AND end_time IS NOT NULL
    )
    SELECT 
        a.id as achievement_id,
        a.name as achievement_name,
        a.description as achievement_description,
        a.rarity
    FROM achievements a
    WHERE a.family_id = family_id_param
      AND a.user_id = user_id_param
      AND a.name LIKE '%сон%'
      AND NOT EXISTS (
          SELECT 1 FROM user_achievements ua 
          WHERE ua.achievement_id = a.id 
            AND ua.user_id = user_id_param
      )
      AND (
          -- Достижения за количество сессий сна
          (a.name = 'Первые сны' AND (SELECT total_sleep_sessions FROM sleep_stats) >= 1) OR
          (a.name = 'Регулярный сон' AND (SELECT total_sleep_sessions FROM sleep_stats) >= 10) OR
          (a.name = 'Мастер сна' AND (SELECT total_sleep_sessions FROM sleep_stats) >= 50) OR
          -- Достижения за длительность сна
          (a.name = 'Долгий сон' AND sleep_duration_minutes >= 480) OR
          (a.name = 'Очень долгий сон' AND sleep_duration_minutes >= 720) OR
          -- Достижения за среднюю длительность
          (a.name = 'Качественный сон' AND (SELECT avg_duration FROM sleep_stats) >= 360) OR
          (a.name = 'Отличный сон' AND (SELECT avg_duration FROM sleep_stats) >= 480)
      );
END;
$$ LANGUAGE plpgsql;

-- 8. Обновляем политики безопасности для sleep_sessions
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON sleep_sessions;
CREATE POLICY "Enable all operations for authenticated users" ON sleep_sessions FOR ALL USING (true);

-- 9. Создаем индексы для оптимизации запросов сна
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_family_active 
ON sleep_sessions(family_id, end_time) 
WHERE end_time IS NULL;

CREATE INDEX IF NOT EXISTS idx_sleep_sessions_family_start 
ON sleep_sessions(family_id, start_time DESC);

-- 10. Добавляем комментарии к таблице и функциям
COMMENT ON TABLE sleep_sessions IS 'Сессии сна малыша с синхронизацией между членами семьи';
COMMENT ON FUNCTION sync_family_sleep_status() IS 'Синхронизирует состояние сна между всеми членами семьи';
COMMENT ON FUNCTION get_family_sleep_status(INTEGER) IS 'Возвращает текущее состояние сна семьи';
COMMENT ON FUNCTION end_all_family_sleep_sessions(INTEGER, BIGINT) IS 'Завершает все активные сессии сна семьи';
COMMENT ON FUNCTION check_sleep_achievements(INTEGER, BIGINT, INTEGER) IS 'Проверяет и выдает достижения за сон';

-- Готово! Теперь система сна синхронизируется между всеми членами семьи
