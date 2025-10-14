-- Простое обновление системы сна для отслеживания воспроизведения видео
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Добавляем поле video_played в таблицу sleep_sessions
ALTER TABLE sleep_sessions 
ADD COLUMN IF NOT EXISTS video_played BOOLEAN DEFAULT FALSE;

-- 2. Обновляем существующие записи, устанавливая video_played = FALSE
UPDATE sleep_sessions 
SET video_played = FALSE 
WHERE video_played IS NULL;
