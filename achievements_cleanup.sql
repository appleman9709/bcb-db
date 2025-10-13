-- Скрипт для проверки и очистки таблиц достижений
-- Выполните этот скрипт, если возникли проблемы с существующими таблицами

-- Проверяем существование таблиц
DO $$
BEGIN
    -- Удаляем таблицы в правильном порядке (с учетом внешних ключей)
    DROP TABLE IF EXISTS family_achievement_stats CASCADE;
    DROP TABLE IF EXISTS achievement_progress CASCADE;
    DROP TABLE IF EXISTS user_achievements CASCADE;
    DROP TABLE IF EXISTS achievements CASCADE;
    DROP TABLE IF EXISTS achievement_types CASCADE;
    
    RAISE NOTICE 'Таблицы достижений удалены (если существовали)';
END $$;

-- Теперь выполните achievements_schema.sql
-- Затем achievements_data.sql
