-- Обновление базы данных для поддержки монет активности
-- Выполните этот скрипт в Supabase SQL Editor

-- Добавляем поле activity_coins в таблицу parent_coins
ALTER TABLE parent_coins 
ADD COLUMN IF NOT EXISTS activity_coins INTEGER DEFAULT 0;

-- Обновляем существующие записи, устанавливая activity_coins = 0 для тех, у кого это поле NULL
UPDATE parent_coins 
SET activity_coins = 0 
WHERE activity_coins IS NULL;

-- Устанавливаем NOT NULL ограничение для поля activity_coins
ALTER TABLE parent_coins 
ALTER COLUMN activity_coins SET NOT NULL;

-- Обновляем функцию check_and_award_achievements для поддержки активности
-- Сначала удаляем существующую функцию
DROP FUNCTION IF EXISTS check_and_award_achievements(INTEGER, BIGINT, TEXT, JSONB);

-- Создаем обновленную функцию с поддержкой активности
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
    current_time_var TIME;
    current_hour INTEGER;
    family_member_count INTEGER;
    achieved_members INTEGER;
BEGIN
    -- Получаем текущее время
    current_time_var := CURRENT_TIME;
    current_hour := EXTRACT(HOUR FROM current_time_var);
    
    -- Проходим по всем активным достижениям
    FOR achievement_record IN 
        SELECT a.id, a.name, a.points, a.coins_reward, a.rarity, a.criteria
        FROM achievements a
        WHERE a.is_active = TRUE
    LOOP
        is_completed := FALSE;
        
        -- Проверяем критерии достижения
        CASE achievement_record.criteria->>'type'
            WHEN 'feeding_streak' THEN
                -- Подсчитываем серию кормлений
                SELECT COUNT(*)::INTEGER INTO new_progress
                FROM feedings f
                WHERE f.family_id = family_id_param
                  AND f.timestamp >= NOW() - INTERVAL '1 day'
                ORDER BY f.timestamp DESC;
                
                IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'diaper_streak' THEN
                SELECT COUNT(*)::INTEGER INTO new_progress
                FROM diapers d
                WHERE d.family_id = family_id_param
                  AND d.timestamp >= NOW() - INTERVAL '1 day'
                ORDER BY d.timestamp DESC;
                
                IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'sleep_streak' THEN
                SELECT COUNT(*)::INTEGER INTO new_progress
                FROM sleep_records s
                WHERE s.family_id = family_id_param
                  AND s.timestamp >= NOW() - INTERVAL '1 day'
                ORDER BY s.timestamp DESC;
                
                IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'activity_streak' THEN
                SELECT COUNT(*)::INTEGER INTO new_progress
                FROM activities a
                WHERE a.family_id = family_id_param
                  AND a.timestamp >= NOW() - INTERVAL '1 day'
                ORDER BY a.timestamp DESC;
                
                IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'bath_streak' THEN
                SELECT COUNT(*)::INTEGER INTO new_progress
                FROM baths b
                WHERE b.family_id = family_id_param
                  AND b.timestamp >= NOW() - INTERVAL '1 day'
                ORDER BY b.timestamp DESC;
                
                IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'weekly_streak' THEN
                -- Проверяем выполнение действия каждый день недели
                SELECT COUNT(DISTINCT DATE(timestamp))::INTEGER INTO new_progress
                FROM (
                    SELECT timestamp FROM feedings WHERE family_id = family_id_param
                    UNION ALL
                    SELECT timestamp FROM diapers WHERE family_id = family_id_param
                    UNION ALL
                    SELECT timestamp FROM sleep_records WHERE family_id = family_id_param
                    UNION ALL
                    SELECT timestamp FROM activities WHERE family_id = family_id_param
                    UNION ALL
                    SELECT timestamp FROM baths WHERE family_id = family_id_param
                ) combined
                WHERE timestamp >= NOW() - INTERVAL '7 days';
                
                IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'combo' THEN
                -- Проверяем комбо в течение определенного времени
                SELECT COUNT(*)::INTEGER INTO new_progress
                FROM (
                    SELECT timestamp FROM feedings WHERE family_id = family_id_param
                    UNION ALL
                    SELECT timestamp FROM diapers WHERE family_id = family_id_param
                    UNION ALL
                    SELECT timestamp FROM sleep_records WHERE family_id = family_id_param
                    UNION ALL
                    SELECT timestamp FROM activities WHERE family_id = family_id_param
                    UNION ALL
                    SELECT timestamp FROM baths WHERE family_id = family_id_param
                ) combined
                WHERE timestamp >= NOW() - INTERVAL '15 minutes';
                
                IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'morning_combo' THEN
                -- Проверяем утреннее комбо (06:00-12:00)
                SELECT COUNT(*)::INTEGER INTO new_progress
                FROM (
                    SELECT timestamp FROM feedings WHERE family_id = family_id_param
                    UNION ALL
                    SELECT timestamp FROM activities WHERE family_id = family_id_param
                    UNION ALL
                    SELECT timestamp FROM baths WHERE family_id = family_id_param
                ) combined
                WHERE timestamp >= NOW() - INTERVAL '2 hours'
                  AND EXTRACT(HOUR FROM timestamp) BETWEEN 6 AND 12;
                
                IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'evening_combo' THEN
                -- Проверяем вечернее комбо (18:00-24:00)
                SELECT COUNT(*)::INTEGER INTO new_progress
                FROM (
                    SELECT timestamp FROM baths WHERE family_id = family_id_param
                    UNION ALL
                    SELECT timestamp FROM feedings WHERE family_id = family_id_param
                    UNION ALL
                    SELECT timestamp FROM sleep_records WHERE family_id = family_id_param
                ) combined
                WHERE timestamp >= NOW() - INTERVAL '2 hours'
                  AND EXTRACT(HOUR FROM timestamp) BETWEEN 18 AND 23;
                
                IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'time_window' THEN
                -- Проверяем временные окна
                DECLARE
                    start_time_str TEXT := achievement_record.criteria->>'start_time';
                    end_time_str TEXT := achievement_record.criteria->>'end_time';
                    action_type TEXT := achievement_record.criteria->>'action';
                    start_hour INTEGER := EXTRACT(HOUR FROM start_time_str::TIME);
                    end_hour INTEGER := EXTRACT(HOUR FROM end_time_str::TIME);
                BEGIN
                    -- Проверяем последнее действие в указанном временном окне
                    CASE action_type
                        WHEN 'sleep' THEN
                            SELECT COUNT(*)::INTEGER INTO new_progress
                            FROM sleep_records s
                            WHERE s.family_id = family_id_param
                              AND EXTRACT(HOUR FROM s.timestamp) BETWEEN start_hour AND end_hour
                              AND s.timestamp >= NOW() - INTERVAL '1 day';
                        WHEN 'activity' THEN
                            SELECT COUNT(*)::INTEGER INTO new_progress
                            FROM activities a
                            WHERE a.family_id = family_id_param
                              AND EXTRACT(HOUR FROM a.timestamp) BETWEEN start_hour AND end_hour
                              AND a.timestamp >= NOW() - INTERVAL '1 day';
                        WHEN 'feeding' THEN
                            SELECT COUNT(*)::INTEGER INTO new_progress
                            FROM feedings f
                            WHERE f.family_id = family_id_param
                              AND EXTRACT(HOUR FROM f.timestamp) BETWEEN start_hour AND end_hour
                              AND f.timestamp >= NOW() - INTERVAL '1 day';
                    END CASE;
                    
                    IF new_progress > 0 THEN
                        is_completed := TRUE;
                    END IF;
                END;
                
            WHEN 'rhythm' THEN
                -- Проверяем ритм действий
                DECLARE
                    action_type TEXT := achievement_record.criteria->>'action';
                    interval_hours DECIMAL := (achievement_record.criteria->>'interval_hours')::DECIMAL;
                    target_count INTEGER := (achievement_record.criteria->>'target_count')::INTEGER;
                    tolerance_minutes INTEGER := COALESCE((achievement_record.criteria->>'tolerance_minutes')::INTEGER, 15);
                BEGIN
                    -- Подсчитываем действия с правильными интервалами
                    CASE action_type
                        WHEN 'feeding' THEN
                            WITH feeding_times AS (
                                SELECT timestamp, 
                                       LAG(timestamp) OVER (ORDER BY timestamp) as prev_timestamp
                                FROM feedings 
                                WHERE family_id = family_id_param
                                  AND timestamp >= NOW() - INTERVAL '1 day'
                                ORDER BY timestamp
                            )
                            SELECT COUNT(*)::INTEGER INTO new_progress
                            FROM feeding_times
                            WHERE prev_timestamp IS NOT NULL
                              AND EXTRACT(EPOCH FROM (timestamp - prev_timestamp))/3600 
                                  BETWEEN interval_hours - tolerance_minutes/60.0 
                                  AND interval_hours + tolerance_minutes/60.0;
                        WHEN 'sleep' THEN
                            WITH sleep_times AS (
                                SELECT timestamp, 
                                       LAG(timestamp) OVER (ORDER BY timestamp) as prev_timestamp
                                FROM sleep_records 
                                WHERE family_id = family_id_param
                                  AND timestamp >= NOW() - INTERVAL '1 day'
                                ORDER BY timestamp
                            )
                            SELECT COUNT(*)::INTEGER INTO new_progress
                            FROM sleep_times
                            WHERE prev_timestamp IS NOT NULL
                              AND EXTRACT(EPOCH FROM (timestamp - prev_timestamp))/3600 
                                  BETWEEN interval_hours - tolerance_minutes/60.0 
                                  AND interval_hours + tolerance_minutes/60.0;
                        WHEN 'activity' THEN
                            WITH activity_times AS (
                                SELECT timestamp, 
                                       LAG(timestamp) OVER (ORDER BY timestamp) as prev_timestamp
                                FROM activities 
                                WHERE family_id = family_id_param
                                  AND timestamp >= NOW() - INTERVAL '1 day'
                                ORDER BY timestamp
                            )
                            SELECT COUNT(*)::INTEGER INTO new_progress
                            FROM activity_times
                            WHERE prev_timestamp IS NOT NULL
                              AND EXTRACT(EPOCH FROM (timestamp - prev_timestamp))/3600 
                                  BETWEEN interval_hours - tolerance_minutes/60.0 
                                  AND interval_hours + tolerance_minutes/60.0;
                    END CASE;
                    
                    IF new_progress >= target_count THEN
                        is_completed := TRUE;
                    END IF;
                END;
                
            WHEN 'consistency' THEN
                -- Проверяем консистентность использования
                DECLARE
                    days_target INTEGER := (achievement_record.criteria->>'days')::INTEGER;
                    consecutive BOOLEAN := COALESCE((achievement_record.criteria->>'consecutive')::BOOLEAN, FALSE);
                BEGIN
                    IF consecutive THEN
                        -- Проверяем последовательные дни
                        WITH daily_activity AS (
                            SELECT DATE(timestamp) as activity_date
                            FROM (
                                SELECT timestamp FROM feedings WHERE family_id = family_id_param
                                UNION ALL
                                SELECT timestamp FROM diapers WHERE family_id = family_id_param
                                UNION ALL
                                SELECT timestamp FROM sleep_records WHERE family_id = family_id_param
                                UNION ALL
                                SELECT timestamp FROM activities WHERE family_id = family_id_param
                                UNION ALL
                                SELECT timestamp FROM baths WHERE family_id = family_id_param
                            ) combined
                            WHERE timestamp >= NOW() - INTERVAL '30 days'
                            GROUP BY DATE(timestamp)
                        ),
                        consecutive_days AS (
                            SELECT activity_date,
                                   ROW_NUMBER() OVER (ORDER BY activity_date DESC) as day_rank,
                                   activity_date - INTERVAL '1 day' * ROW_NUMBER() OVER (ORDER BY activity_date DESC) as expected_date
                            FROM daily_activity
                        )
                        SELECT COUNT(*)::INTEGER INTO new_progress
                        FROM consecutive_days
                        WHERE activity_date = expected_date
                          AND day_rank <= days_target;
                    ELSE
                        -- Проверяем общее количество дней
                        SELECT COUNT(DISTINCT DATE(timestamp))::INTEGER INTO new_progress
                        FROM (
                            SELECT timestamp FROM feedings WHERE family_id = family_id_param
                            UNION ALL
                            SELECT timestamp FROM diapers WHERE family_id = family_id_param
                            UNION ALL
                            SELECT timestamp FROM sleep_records WHERE family_id = family_id_param
                            UNION ALL
                            SELECT timestamp FROM activities WHERE family_id = family_id_param
                            UNION ALL
                            SELECT timestamp FROM baths WHERE family_id = family_id_param
                        ) combined
                        WHERE timestamp >= NOW() - INTERVAL '30 days';
                    END IF;
                    
                    IF new_progress >= days_target THEN
                        is_completed := TRUE;
                    END IF;
                END;
                
            WHEN 'total_actions' THEN
                -- Подсчитываем общее количество действий
                SELECT COUNT(*)::INTEGER INTO new_progress
                FROM (
                    SELECT timestamp FROM feedings WHERE family_id = family_id_param
                    UNION ALL
                    SELECT timestamp FROM diapers WHERE family_id = family_id_param
                    UNION ALL
                    SELECT timestamp FROM sleep_records WHERE family_id = family_id_param
                    UNION ALL
                    SELECT timestamp FROM activities WHERE family_id = family_id_param
                    UNION ALL
                    SELECT timestamp FROM baths WHERE family_id = family_id_param
                ) combined;
                
                IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'family_achievement' THEN
                -- Проверяем, получили ли все члены семьи достижение
                SELECT COUNT(*)::INTEGER INTO family_member_count
                FROM family_members fm
                WHERE fm.family_id = family_id_param;
                
                SELECT COUNT(DISTINCT ua.user_id)::INTEGER INTO achieved_members
                FROM user_achievements ua
                WHERE ua.family_id = family_id_param
                  AND ua.achievement_id = achievement_record.id;
                
                IF achieved_members >= family_member_count THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'perfect_timing' THEN
                -- Проверяем идеальное время выполнения действий
                DECLARE
                    action_type TEXT := achievement_record.criteria->>'action';
                    tolerance_minutes INTEGER := (achievement_record.criteria->>'tolerance_minutes')::INTEGER;
                    streak_target INTEGER := (achievement_record.criteria->>'streak')::INTEGER;
                BEGIN
                    -- Здесь можно добавить логику проверки идеального времени
                    -- Пока что упрощенная версия
                    CASE action_type
                        WHEN 'feeding' THEN
                            SELECT COUNT(*)::INTEGER INTO new_progress
                            FROM feedings f
                            WHERE f.family_id = family_id_param
                              AND f.timestamp >= NOW() - INTERVAL '7 days';
                    END CASE;
                    
                    IF new_progress >= streak_target THEN
                        is_completed := TRUE;
                    END IF;
                END;
                
            WHEN 'total_count' THEN
                -- Подсчитываем общее количество достижений пользователя
                SELECT COUNT(*)::INTEGER INTO new_progress
                FROM user_achievements ua
                WHERE ua.family_id = family_id_param
                  AND ua.user_id = user_id_param;
                
                IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'collection_complete' THEN
                -- Проверяем завершение коллекции достижений
                DECLARE
                    achievement_type TEXT := achievement_record.criteria->>'achievement_type';
                BEGIN
                    IF achievement_type = 'streaks' THEN
                        -- Проверяем все достижения серий
                        SELECT COUNT(*)::INTEGER INTO new_progress
                        FROM user_achievements ua
                        JOIN achievements a ON ua.achievement_id = a.id
                        JOIN achievement_types at ON a.type_id = at.id
                        WHERE ua.family_id = family_id_param
                          AND ua.user_id = user_id_param
                          AND at.name = 'Серии (Streaks)';
                        
                        -- Подсчитываем общее количество достижений серий
                        DECLARE
                            total_streak_achievements INTEGER;
                        BEGIN
                            SELECT COUNT(*)::INTEGER INTO total_streak_achievements
                            FROM achievements a
                            JOIN achievement_types at ON a.type_id = at.id
                            WHERE at.name = 'Серии (Streaks)';
                            
                            IF new_progress >= total_streak_achievements THEN
                                is_completed := TRUE;
                            END IF;
                        END;
                    END IF;
                END;
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

-- Сообщение об успешном обновлении
SELECT 'База данных обновлена для поддержки активности! Поле activity_coins добавлено в parent_coins.' as message;
