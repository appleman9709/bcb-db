-- Исправление всех функций достижений для правильных типов
-- Выполните этот скрипт в Supabase SQL Editor

-- Удаление существующих функций
DROP FUNCTION IF EXISTS check_and_award_achievements(INTEGER, BIGINT, TEXT, JSONB);
DROP FUNCTION IF EXISTS get_user_achievements(INTEGER, BIGINT);
DROP FUNCTION IF EXISTS get_family_achievement_stats(INTEGER);

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
                    SELECT COUNT(*)::INTEGER INTO new_progress
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
                    SELECT COUNT(*)::INTEGER INTO new_progress
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
                    SELECT COUNT(*)::INTEGER INTO new_progress
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
        top_achiever.achievement_count::INTEGER
    FROM family_achievement_stats fas
    LEFT JOIN (
        SELECT 
            ua.user_id,
            fm.name,
            COUNT(*)::INTEGER as achievement_count,
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

-- Сообщение об успешном исправлении
SELECT 'Все функции достижений исправлены!' as message;
