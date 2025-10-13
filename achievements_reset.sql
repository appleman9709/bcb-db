-- Скрипт для полной очистки системы достижений
-- Выполните этот скрипт, если нужно полностью пересоздать систему достижений

-- Удаление существующих функций
DROP FUNCTION IF EXISTS check_and_award_achievements(INTEGER, BIGINT, TEXT, JSONB);
DROP FUNCTION IF EXISTS get_user_achievements(INTEGER, BIGINT);
DROP FUNCTION IF EXISTS get_family_achievement_stats(INTEGER);

-- Удаление триггеров
DROP TRIGGER IF EXISTS update_family_achievement_stats_updated_at ON family_achievement_stats;

-- Удаление политик безопасности
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON achievement_types;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON achievements;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON user_achievements;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON achievement_progress;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON family_achievement_stats;

-- Удаление таблиц в правильном порядке (с учетом внешних ключей)
DROP TABLE IF EXISTS family_achievement_stats CASCADE;
DROP TABLE IF EXISTS achievement_progress CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS achievement_types CASCADE;

-- Сообщение об успешной очистке
SELECT 'Система достижений полностью очищена!' as message;
