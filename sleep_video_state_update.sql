-- Обновление системы сна для отслеживания воспроизведения видео
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Добавляем поле video_played в таблицу sleep_sessions
ALTER TABLE sleep_sessions 
ADD COLUMN IF NOT EXISTS video_played BOOLEAN DEFAULT FALSE;

-- 2. Обновляем существующие записи, устанавливая video_played = FALSE
UPDATE sleep_sessions 
SET video_played = FALSE 
WHERE video_played IS NULL;

-- 3. Создаем функцию для обновления состояния воспроизведения видео
CREATE OR REPLACE FUNCTION update_sleep_video_played(session_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE sleep_sessions 
    SET video_played = TRUE 
    WHERE id = session_id AND end_time IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 4. Создаем функцию для получения состояния воспроизведения видео текущей сессии сна
CREATE OR REPLACE FUNCTION get_current_sleep_video_state(family_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    video_played_state BOOLEAN;
BEGIN
    SELECT video_played INTO video_played_state
    FROM sleep_sessions 
    WHERE family_id = family_id_param 
    AND end_time IS NULL 
    ORDER BY start_time DESC 
    LIMIT 1;
    
    RETURN COALESCE(video_played_state, FALSE);
END;
$$ LANGUAGE plpgsql;
