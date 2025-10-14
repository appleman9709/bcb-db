-- Полное обновление системы достижений с поддержкой детальных активностей
-- Этот скрипт объединяет все изменения для расширенной системы достижений

-- 1. Добавляем новые достижения
\echo 'Добавляем новые достижения для детальных активностей...'
\i achievements_extended_detailed.sql

-- 2. Обновляем функцию проверки достижений
\echo 'Обновляем функцию проверки достижений...'
\i fix_achievement_function_return_type.sql

-- 3. Создаем дополнительные функции для статистики
\echo 'Создаем дополнительные функции статистики...'

-- Функция для получения статистики достижений по типам активностей
CREATE OR REPLACE FUNCTION get_achievement_stats_by_activity_type(family_id_param INTEGER, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    activity_type TEXT,
    total_actions BIGINT,
    detailed_actions BIGINT,
    detail_percentage NUMERIC,
    achievements_earned BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH activity_stats AS (
        SELECT 
            'feeding' as activity_type,
            COUNT(*) as total_actions,
            COUNT(CASE WHEN ounces IS NOT NULL THEN 1 END) as detailed_actions
        FROM feedings
        WHERE family_id = family_id_param
          AND timestamp >= NOW() - INTERVAL '1 day' * days_back
        
        UNION ALL
        
        SELECT 
            'diaper' as activity_type,
            COUNT(*) as total_actions,
            COUNT(CASE WHEN diaper_type IS NOT NULL THEN 1 END) as detailed_actions
        FROM diapers
        WHERE family_id = family_id_param
          AND timestamp >= NOW() - INTERVAL '1 day' * days_back
        
        UNION ALL
        
        SELECT 
            'bath' as activity_type,
            COUNT(*) as total_actions,
            COUNT(CASE WHEN bath_mood IS NOT NULL THEN 1 END) as detailed_actions
        FROM baths
        WHERE family_id = family_id_param
          AND timestamp >= NOW() - INTERVAL '1 day' * days_back
        
        UNION ALL
        
        SELECT 
            'activity' as activity_type,
            COUNT(*) as total_actions,
            0 as detailed_actions
        FROM activities
        WHERE family_id = family_id_param
          AND timestamp >= NOW() - INTERVAL '1 day' * days_back
    ),
    achievement_stats AS (
        SELECT 
            CASE 
                WHEN a.criteria->>'type' LIKE '%feeding%' THEN 'feeding'
                WHEN a.criteria->>'type' LIKE '%diaper%' THEN 'diaper'
                WHEN a.criteria->>'type' LIKE '%bath%' THEN 'bath'
                WHEN a.criteria->>'type' LIKE '%activity%' THEN 'activity'
                ELSE 'other'
            END as activity_type,
            COUNT(ua.id) as achievements_earned
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id 
            AND ua.family_id = family_id_param
        WHERE a.is_active = TRUE
        GROUP BY 
            CASE 
                WHEN a.criteria->>'type' LIKE '%feeding%' THEN 'feeding'
                WHEN a.criteria->>'type' LIKE '%diaper%' THEN 'diaper'
                WHEN a.criteria->>'type' LIKE '%bath%' THEN 'bath'
                WHEN a.criteria->>'type' LIKE '%activity%' THEN 'activity'
                ELSE 'other'
            END
    )
    SELECT 
        ast.activity_type,
        ast.total_actions,
        ast.detailed_actions,
        CASE 
            WHEN ast.total_actions > 0 
            THEN ROUND((ast.detailed_actions::NUMERIC / ast.total_actions::NUMERIC) * 100, 2)
            ELSE 0 
        END as detail_percentage,
        COALESCE(ach.achievements_earned, 0) as achievements_earned
    FROM activity_stats ast
    LEFT JOIN achievement_stats ach ON ast.activity_type = ach.activity_type
    ORDER BY ast.activity_type;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения прогресса по детальным достижениям
CREATE OR REPLACE FUNCTION get_detailed_achievement_progress(family_id_param INTEGER, user_id_param BIGINT)
RETURNS TABLE (
    achievement_id INTEGER,
    achievement_name TEXT,
    achievement_description TEXT,
    achievement_icon TEXT,
    achievement_color TEXT,
    achievement_rarity TEXT,
    points INTEGER,
    coins_reward INTEGER,
    is_earned BOOLEAN,
    progress_percentage NUMERIC,
    progress_text TEXT
) AS $$
DECLARE
    achievement_record RECORD;
    current_progress INTEGER;
    target_progress INTEGER;
    progress_text_result TEXT;
BEGIN
    FOR achievement_record IN 
        SELECT a.*, at.name as type_name
        FROM achievements a
        JOIN achievement_types at ON a.type_id = at.id
        WHERE a.is_active = TRUE
        ORDER BY a.rarity, a.points
    LOOP
        -- Проверяем, получено ли достижение
        DECLARE
            is_earned_result BOOLEAN := FALSE;
        BEGIN
            SELECT EXISTS(
                SELECT 1 FROM user_achievements 
                WHERE family_id = family_id_param 
                  AND user_id = user_id_param 
                  AND achievement_id = achievement_record.id
            ) INTO is_earned_result;
            
            -- Если достижение уже получено, показываем 100% прогресс
            IF is_earned_result THEN
                RETURN QUERY SELECT 
                    achievement_record.id,
                    achievement_record.name,
                    achievement_record.description,
                    achievement_record.icon,
                    achievement_record.color,
                    achievement_record.rarity,
                    achievement_record.points,
                    achievement_record.coins_reward,
                    TRUE as is_earned,
                    100.0 as progress_percentage,
                    'Получено!' as progress_text;
                CONTINUE;
            END IF;
            
            -- Вычисляем прогресс в зависимости от типа достижения
            CASE achievement_record.criteria->>'type'
                WHEN 'diaper_type_streak' THEN
                    SELECT COUNT(*) INTO current_progress
                    FROM (
                        SELECT timestamp, ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
                        FROM diapers
                        WHERE family_id = family_id_param
                          AND timestamp <= NOW()
                          AND diaper_type = achievement_record.criteria->>'diaper_type'
                        ORDER BY timestamp DESC
                        LIMIT 20
                    ) recent_diapers
                    WHERE rn <= (
                        SELECT COUNT(*)
                        FROM diapers
                        WHERE family_id = family_id_param
                          AND timestamp <= NOW()
                          AND diaper_type = achievement_record.criteria->>'diaper_type'
                        ORDER BY timestamp DESC
                        LIMIT 20
                    );
                    target_progress := (achievement_record.criteria->>'target')::INTEGER;
                    progress_text_result := current_progress::TEXT || '/' || target_progress::TEXT || ' подряд';
                
                WHEN 'bath_mood_streak' THEN
                    SELECT COUNT(*) INTO current_progress
                    FROM (
                        SELECT timestamp, ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
                        FROM baths
                        WHERE family_id = family_id_param
                          AND timestamp <= NOW()
                          AND bath_mood = achievement_record.criteria->>'bath_mood'
                        ORDER BY timestamp DESC
                        LIMIT 20
                    ) recent_baths
                    WHERE rn <= (
                        SELECT COUNT(*)
                        FROM baths
                        WHERE family_id = family_id_param
                          AND timestamp <= NOW()
                          AND bath_mood = achievement_record.criteria->>'bath_mood'
                        ORDER BY timestamp DESC
                        LIMIT 20
                    );
                    target_progress := (achievement_record.criteria->>'target')::INTEGER;
                    progress_text_result := current_progress::TEXT || '/' || target_progress::TEXT || ' подряд';
                
                WHEN 'diaper_type_count' THEN
                    SELECT COUNT(*) INTO current_progress
                    FROM diapers
                    WHERE family_id = family_id_param
                      AND diaper_type = achievement_record.criteria->>'diaper_type';
                    target_progress := (achievement_record.criteria->>'target')::INTEGER;
                    progress_text_result := current_progress::TEXT || '/' || target_progress::TEXT || ' всего';
                
                WHEN 'bath_mood_count' THEN
                    SELECT COUNT(*) INTO current_progress
                    FROM baths
                    WHERE family_id = family_id_param
                      AND bath_mood = achievement_record.criteria->>'bath_mood';
                    target_progress := (achievement_record.criteria->>'target')::INTEGER;
                    progress_text_result := current_progress::TEXT || '/' || target_progress::TEXT || ' всего';
                
                WHEN 'feeding_with_ounces' THEN
                    SELECT COUNT(*) INTO current_progress
                    FROM feedings
                    WHERE family_id = family_id_param
                      AND ounces IS NOT NULL;
                    target_progress := (achievement_record.criteria->>'target')::INTEGER;
                    progress_text_result := current_progress::TEXT || '/' || target_progress::TEXT || ' с унциями';
                
                WHEN 'total_ounces' THEN
                    SELECT COALESCE(SUM(ounces), 0) INTO current_progress
                    FROM feedings
                    WHERE family_id = family_id_param
                      AND ounces IS NOT NULL;
                    target_progress := (achievement_record.criteria->>'target')::INTEGER;
                    progress_text_result := current_progress::TEXT || '/' || target_progress::TEXT || ' унций';
                
                ELSE
                    current_progress := 0;
                    target_progress := 1;
                    progress_text_result := 'В процессе...';
            END CASE;
            
            -- Вычисляем процент прогресса
            DECLARE
                progress_percentage_result NUMERIC := 0;
            BEGIN
                IF target_progress > 0 THEN
                    progress_percentage_result := LEAST(100.0, (current_progress::NUMERIC / target_progress::NUMERIC) * 100.0);
                END IF;
                
                RETURN QUERY SELECT 
                    achievement_record.id,
                    achievement_record.name,
                    achievement_record.description,
                    achievement_record.icon,
                    achievement_record.color,
                    achievement_record.rarity,
                    achievement_record.points,
                    achievement_record.coins_reward,
                    FALSE as is_earned,
                    progress_percentage_result as progress_percentage,
                    progress_text_result as progress_text;
            END;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения топ-достижений семьи
CREATE OR REPLACE FUNCTION get_family_top_achievements(family_id_param INTEGER, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    achievement_id INTEGER,
    achievement_name TEXT,
    achievement_description TEXT,
    achievement_icon TEXT,
    achievement_color TEXT,
    achievement_rarity TEXT,
    points INTEGER,
    coins_reward INTEGER,
    earned_count BIGINT,
    last_earned TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as achievement_id,
        a.name as achievement_name,
        a.description as achievement_description,
        a.icon as achievement_icon,
        a.color as achievement_color,
        a.rarity as achievement_rarity,
        a.points,
        a.coins_reward,
        COUNT(ua.id) as earned_count,
        MAX(ua.earned_at) as last_earned
    FROM achievements a
    LEFT JOIN user_achievements ua ON a.id = ua.achievement_id 
        AND ua.family_id = family_id_param
    WHERE a.is_active = TRUE
    GROUP BY a.id, a.name, a.description, a.icon, a.color, a.rarity, a.points, a.coins_reward
    ORDER BY earned_count DESC, a.points DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_user_achievements_family_user ON user_achievements(family_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON user_achievements(earned_at);

-- Обновляем комментарии
COMMENT ON FUNCTION check_and_award_achievements(INTEGER, BIGINT, TEXT, JSONB) IS 'Проверяет и награждает достижениями с поддержкой детальных типов активностей';
COMMENT ON FUNCTION get_achievement_stats_by_activity_type(INTEGER, INTEGER) IS 'Возвращает статистику достижений по типам активностей';
COMMENT ON FUNCTION get_detailed_achievement_progress(INTEGER, BIGINT) IS 'Возвращает детальный прогресс по всем достижениям';
COMMENT ON FUNCTION get_family_top_achievements(INTEGER, INTEGER) IS 'Возвращает топ-достижения семьи';

\echo 'Система достижений успешно обновлена с поддержкой детальных активностей!'
\echo 'Добавлено 50+ новых достижений для:'
\echo '- Типов смены подгузников (Просто/Покакал)'
\echo '- Настроения купания (Спокойное/Беспокоился)'
\echo '- Количества унций при кормлении'
\echo '- Комбо достижений с детальными типами'
\echo '- Статистических достижений'
\echo '- Особых достижений за разнообразие и рекорды'
