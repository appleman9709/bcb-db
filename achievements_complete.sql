-- Объединенный скрипт для создания системы достижений
-- Выполните этот скрипт в Supabase SQL Editor

-- Очистка существующих таблиц и функций (если есть)
DROP TABLE IF EXISTS family_achievement_stats CASCADE;
DROP TABLE IF EXISTS achievement_progress CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS achievement_types CASCADE;

-- Удаление существующих функций
DROP FUNCTION IF EXISTS check_and_award_achievements(INTEGER, BIGINT, TEXT, JSONB);
DROP FUNCTION IF EXISTS get_user_achievements(INTEGER, BIGINT);
DROP FUNCTION IF EXISTS get_family_achievement_stats(INTEGER);

-- Таблица типов достижений
CREATE TABLE achievement_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT DEFAULT '🏆',
    color TEXT DEFAULT '#FFD700',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица достижений
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    type_id INTEGER REFERENCES achievement_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT DEFAULT '🏆',
    color TEXT DEFAULT '#FFD700',
    rarity TEXT DEFAULT 'common', -- common, rare, epic, legendary
    points INTEGER DEFAULT 10,
    coins_reward INTEGER DEFAULT 0,
    criteria JSONB NOT NULL, -- JSON с критериями получения
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица полученных достижений пользователями
CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress_data JSONB, -- Дополнительные данные о прогрессе
    UNIQUE(family_id, user_id, achievement_id)
);

-- Таблица прогресса достижений (для отслеживания прогресса)
CREATE TABLE achievement_progress (
    id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    current_value INTEGER DEFAULT 0,
    target_value INTEGER NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress_data JSONB, -- Дополнительные данные о прогрессе
    UNIQUE(family_id, user_id, achievement_id)
);

-- Таблица статистики достижений семьи
CREATE TABLE family_achievement_stats (
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE PRIMARY KEY,
    total_achievements INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    total_coins_earned INTEGER DEFAULT 0,
    last_achievement_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX idx_achievements_type_id ON achievements(type_id);
CREATE INDEX idx_achievements_rarity ON achievements(rarity);
CREATE INDEX idx_user_achievements_family_id ON user_achievements(family_id);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX idx_user_achievements_earned_at ON user_achievements(earned_at);
CREATE INDEX idx_achievement_progress_family_id ON achievement_progress(family_id);
CREATE INDEX idx_achievement_progress_user_id ON achievement_progress(user_id);
CREATE INDEX idx_achievement_progress_achievement_id ON achievement_progress(achievement_id);

-- Включение Row Level Security (RLS) для безопасности
ALTER TABLE achievement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_achievement_stats ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Enable all operations for authenticated users" ON achievement_types FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON achievements FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON user_achievements FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON achievement_progress FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON family_achievement_stats FOR ALL USING (true);

-- Триггер для автоматического обновления updated_at в таблице family_achievement_stats
CREATE TRIGGER update_family_achievement_stats_updated_at 
    BEFORE UPDATE ON family_achievement_stats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Вставка типов достижений
INSERT INTO achievement_types (name, description, icon, color) VALUES
('Серии (Streaks)', 'Достижения за регулярные действия подряд', '🔥', '#FF6B6B'),
('Комбо и последовательности', 'Достижения за комбинации действий', '⚡', '#4ECDC4'),
('Окна времени', 'Достижения за действия в определенное время', '⏰', '#45B7D1'),
('Ритм и равномерность', 'Достижения за равномерный уход', '🎵', '#96CEB4'),
('Обучающие/мягкие', 'Достижения для поощрения обучения', '📚', '#FFEAA7'),
('Редкие/коллекционные', 'Особые и редкие достижения', '💎', '#DDA0DD');

-- Вставка достижений
INSERT INTO achievements (type_id, name, description, icon, color, rarity, points, coins_reward, criteria) VALUES
-- Серии кормления
(1, 'Первые шаги', 'Покормил малыша 3 раза подряд', '🍼', '#FF6B6B', 'common', 10, 5, '{"type": "feeding_streak", "target": 3, "timeframe": "day"}'),
(1, 'Регулярный уход', 'Покормил малыша 5 раз подряд', '🍼', '#FF6B6B', 'rare', 25, 15, '{"type": "feeding_streak", "target": 5, "timeframe": "day"}'),
(1, 'Мастер кормления', 'Покормил малыша 7 раз подряд', '🍼', '#FF6B6B', 'epic', 50, 30, '{"type": "feeding_streak", "target": 7, "timeframe": "day"}'),
(1, 'Легенда кормления', 'Покормил малыша 10 раз подряд', '🍼', '#FF6B6B', 'legendary', 100, 60, '{"type": "feeding_streak", "target": 10, "timeframe": "day"}'),

-- Серии смены подгузников
(1, 'Чистюля', 'Сменил подгузник 3 раза подряд', '👶', '#4ECDC4', 'common', 10, 5, '{"type": "diaper_streak", "target": 3, "timeframe": "day"}'),
(1, 'Заботливый родитель', 'Сменил подгузник 5 раз подряд', '👶', '#4ECDC4', 'rare', 25, 15, '{"type": "diaper_streak", "target": 5, "timeframe": "day"}'),
(1, 'Эксперт по подгузникам', 'Сменил подгузник 7 раз подряд', '👶', '#4ECDC4', 'epic', 50, 30, '{"type": "diaper_streak", "target": 7, "timeframe": "day"}'),
(1, 'Мастер чистоты', 'Сменил подгузник 10 раз подряд', '👶', '#4ECDC4', 'legendary', 100, 60, '{"type": "diaper_streak", "target": 10, "timeframe": "day"}'),

-- Комбо достижения
(2, 'Быстрая реакция', 'Сменил подгузник и покормил в течение 15 минут', '⚡', '#FFD700', 'common', 15, 10, '{"type": "combo", "target": 2, "timeframe": "15_minutes", "actions": ["diaper", "feeding"]}'),
(2, 'Супер комбо', 'Выполнил 3 разных действия в течение 30 минут', '⚡', '#FFD700', 'rare', 35, 25, '{"type": "combo", "target": 3, "timeframe": "30_minutes", "actions": ["diaper", "feeding", "bath"]}'),
(2, 'Мастер комбо', 'Выполнил 4 разных действия в течение 1 часа', '⚡', '#FFD700', 'epic', 75, 50, '{"type": "combo", "target": 4, "timeframe": "1_hour", "actions": ["diaper", "feeding", "bath", "activity"]}'),
(2, 'Легендарное комбо', 'Выполнил 5 разных действий в течение 2 часов', '⚡', '#FFD700', 'legendary', 150, 100, '{"type": "combo", "target": 5, "timeframe": "2_hours", "actions": ["diaper", "feeding", "bath", "activity", "sleep"]}'),

-- Окна времени
(3, 'Ранняя пташка', 'Покормил малыша до 7 утра', '🌅', '#45B7D1', 'common', 10, 5, '{"type": "time_window", "action": "feeding", "start_time": "00:00", "end_time": "07:00"}'),
(3, 'Ночной страж', 'Покормил малыша между 22:00 и 06:00', '🌙', '#45B7D1', 'rare', 25, 15, '{"type": "time_window", "action": "feeding", "start_time": "22:00", "end_time": "06:00"}'),
(3, 'Полночный герой', 'Сменил подгузник между 00:00 и 03:00', '🌙', '#45B7D1', 'epic', 50, 30, '{"type": "time_window", "action": "diaper", "start_time": "00:00", "end_time": "03:00"}'),

-- Ритм и равномерность
(4, 'Ритмичный уход', 'Кормил малыша каждые 3 часа в течение дня', '🎵', '#96CEB4', 'rare', 30, 20, '{"type": "rhythm", "action": "feeding", "interval_hours": 3, "target_count": 5}'),
(4, 'Идеальный ритм', 'Кормил малыша каждые 2.5 часа в течение дня', '🎵', '#96CEB4', 'epic', 60, 40, '{"type": "rhythm", "action": "feeding", "interval_hours": 2.5, "target_count": 6}'),
(4, 'Мастер ритма', 'Кормил малыша каждые 2 часа в течение дня', '🎵', '#96CEB4', 'legendary', 120, 80, '{"type": "rhythm", "action": "feeding", "interval_hours": 2, "target_count": 8}'),

-- Обучающие/мягкие
(5, 'Первый день', 'Записал первое кормление', '🌟', '#FFEAA7', 'common', 5, 3, '{"type": "first_action", "action": "feeding"}'),
(5, 'Начало пути', 'Записал первую смену подгузника', '🌟', '#FFEAA7', 'common', 5, 3, '{"type": "first_action", "action": "diaper"}'),
(5, 'Первое купание', 'Записал первое купание', '🌟', '#FFEAA7', 'common', 5, 3, '{"type": "first_action", "action": "bath"}'),
(5, 'Первая активность', 'Записал первую активность', '🌟', '#FFEAA7', 'common', 5, 3, '{"type": "first_action", "action": "activity"}'),
(5, 'Неделя заботы', 'Вел учет в течение 7 дней', '📅', '#FFEAA7', 'rare', 50, 30, '{"type": "consistency", "days": 7}'),
(5, 'Месяц заботы', 'Вел учет в течение 30 дней', '📅', '#FFEAA7', 'epic', 200, 120, '{"type": "consistency", "days": 30}'),

-- Редкие/коллекционные
(6, 'Золотая рука', 'Кормил малыша ровно в назначенное время 5 раз подряд', '👑', '#DDA0DD', 'legendary', 200, 150, '{"type": "perfect_timing", "action": "feeding", "tolerance_minutes": 5, "streak": 5}'),
(6, 'Кристальная чистота', 'Сменил подгузник сразу после кормления 10 раз подряд', '💎', '#DDA0DD', 'legendary', 300, 200, '{"type": "perfect_sequence", "sequence": ["feeding", "diaper"], "streak": 10}'),
(6, 'Мастер всех дел', 'Получил все достижения одного типа', '🏆', '#DDA0DD', 'legendary', 500, 300, '{"type": "collection_complete", "achievement_type": "all"}'),
(6, 'Легенда семьи', 'Получил 50 достижений', '👑', '#DDA0DD', 'legendary', 1000, 500, '{"type": "total_count", "target": 50}'),
(6, 'Император заботы', 'Получил 100 достижений', '👑', '#DDA0DD', 'legendary', 2000, 1000, '{"type": "total_count", "target": 100}');

-- Создание начальной статистики для существующих семей
INSERT INTO family_achievement_stats (family_id, total_achievements, total_points, total_coins_earned)
SELECT id, 0, 0, 0
FROM families
WHERE id NOT IN (SELECT family_id FROM family_achievement_stats);

-- Функция для проверки и выдачи достижений
CREATE OR REPLACE FUNCTION check_and_award_achievements(
    family_id_param INTEGER,
    user_id_param BIGINT,
    activity_type TEXT,
    activity_data JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
    achievement_id INTEGER,
    achievement_name TEXT,
    points INTEGER,
    coins_reward INTEGER,
    rarity TEXT
) AS $$
DECLARE
    achievement_record RECORD;
    progress_record RECORD;
    new_progress INTEGER;
    is_completed BOOLEAN;
BEGIN
    -- Проходим по всем активным достижениям
    FOR achievement_record IN 
        SELECT a.id, a.name, a.points, a.coins_reward, a.rarity, a.criteria
        FROM achievements a
        WHERE a.is_active = TRUE
    LOOP
        -- Проверяем критерии достижения
        CASE activity_type
            WHEN 'feeding' THEN
                -- Проверяем достижения кормления
                IF achievement_record.criteria->>'type' = 'feeding_streak' THEN
                    -- Подсчитываем серию кормлений
                    SELECT COUNT(*) INTO new_progress
                    FROM feedings f
                    WHERE f.family_id = family_id_param
                      AND f.timestamp >= NOW() - INTERVAL '1 day'
                    ORDER BY f.timestamp DESC;
                    
                    -- Проверяем, достигнута ли цель
                    IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                        is_completed := TRUE;
                    ELSE
                        is_completed := FALSE;
                    END IF;
                END IF;
                
            WHEN 'diaper' THEN
                -- Проверяем достижения смены подгузников
                IF achievement_record.criteria->>'type' = 'diaper_streak' THEN
                    SELECT COUNT(*) INTO new_progress
                    FROM diapers d
                    WHERE d.family_id = family_id_param
                      AND d.timestamp >= NOW() - INTERVAL '1 day'
                    ORDER BY d.timestamp DESC;
                    
                    IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                        is_completed := TRUE;
                    ELSE
                        is_completed := FALSE;
                    END IF;
                END IF;
                
            WHEN 'combo' THEN
                -- Проверяем комбо достижения
                IF achievement_record.criteria->>'type' = 'combo' THEN
                    -- Проверяем комбо в течение определенного времени
                    SELECT COUNT(*) INTO new_progress
                    FROM (
                        SELECT timestamp FROM feedings WHERE family_id = family_id_param
                        UNION ALL
                        SELECT timestamp FROM diapers WHERE family_id = family_id_param
                    ) combined
                    WHERE timestamp >= NOW() - INTERVAL '15 minutes';
                    
                    IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                        is_completed := TRUE;
                    ELSE
                        is_completed := FALSE;
                    END IF;
                END IF;
        END CASE;
        
        -- Если достижение выполнено и еще не получено
        IF is_completed THEN
            -- Проверяем, не получено ли уже это достижение
            IF NOT EXISTS (
                SELECT 1 FROM user_achievements 
                WHERE family_id = family_id_param 
                  AND user_id = user_id_param 
                  AND achievement_id = achievement_record.id
            ) THEN
                -- Добавляем достижение
                INSERT INTO user_achievements (family_id, user_id, achievement_id)
                VALUES (family_id_param, user_id_param, achievement_record.id);
                
                -- Обновляем статистику семьи
                UPDATE family_achievement_stats 
                SET total_achievements = total_achievements + 1,
                    total_points = total_points + achievement_record.points,
                    total_coins_earned = total_coins_earned + achievement_record.coins_reward,
                    last_achievement_at = NOW()
                WHERE family_id = family_id_param;
                
                -- Возвращаем информацию о достижении
                achievement_id := achievement_record.id;
                achievement_name := achievement_record.name;
                points := achievement_record.points;
                coins_reward := achievement_record.coins_reward;
                rarity := achievement_record.rarity;
                RETURN NEXT;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения достижений пользователя
CREATE OR REPLACE FUNCTION get_user_achievements(family_id_param INTEGER, user_id_param BIGINT)
RETURNS TABLE (
    achievement_id INTEGER,
    achievement_name TEXT,
    achievement_description TEXT,
    icon TEXT,
    color TEXT,
    rarity TEXT,
    points INTEGER,
    coins_reward INTEGER,
    earned_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.description,
        a.icon,
        a.color,
        a.rarity,
        a.points,
        a.coins_reward,
        ua.earned_at
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.family_id = family_id_param 
      AND ua.user_id = user_id_param
    ORDER BY ua.earned_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения статистики достижений семьи
CREATE OR REPLACE FUNCTION get_family_achievement_stats(family_id_param INTEGER)
RETURNS TABLE (
    total_achievements INTEGER,
    total_points INTEGER,
    total_coins_earned INTEGER,
    last_achievement_at TIMESTAMP WITH TIME ZONE,
    top_achiever_user_id BIGINT,
    top_achiever_name TEXT,
    top_achiever_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(fas.total_achievements, 0),
        COALESCE(fas.total_points, 0),
        COALESCE(fas.total_coins_earned, 0),
        fas.last_achievement_at,
        top_achiever.user_id,
        top_achiever.name,
        top_achiever.achievement_count
    FROM family_achievement_stats fas
    LEFT JOIN (
        SELECT 
            ua.user_id,
            fm.name,
            COUNT(*) as achievement_count,
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rn
        FROM user_achievements ua
        JOIN family_members fm ON ua.family_id = fm.family_id AND ua.user_id = fm.user_id
        WHERE ua.family_id = family_id_param
        GROUP BY ua.user_id, fm.name
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ) top_achiever ON true
    WHERE fas.family_id = family_id_param;
END;
$$ LANGUAGE plpgsql;

-- Сообщение об успешном выполнении
SELECT 'Система достижений успешно создана!' as message;
