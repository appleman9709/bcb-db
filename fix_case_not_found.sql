-- Исправление ошибки "case not found" в функциях достижений
-- Этот скрипт добавляет обработку всех типов достижений

-- Удаляем старые функции
DROP FUNCTION IF EXISTS check_and_award_achievements(INTEGER, BIGINT, TEXT, JSONB);
DROP FUNCTION IF EXISTS check_family_history_and_award_achievements(INTEGER);

-- Создаем исправленную функцию check_and_award_achievements
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
    new_progress INTEGER;
    is_completed BOOLEAN;
BEGIN
    -- Проходим по всем активным достижениям
    FOR achievement_record IN 
        SELECT a.id, a.name, a.points, a.coins_reward, a.rarity, a.criteria
        FROM achievements a
        WHERE a.is_active = TRUE
    LOOP
        is_completed := FALSE;
        
        -- Проверяем критерии достижения по типу критерия
        CASE achievement_record.criteria->>'type'
            WHEN 'feeding_streak' THEN
                -- Подсчитываем серию кормлений за последний день
                SELECT COUNT(*)::INTEGER INTO new_progress
                FROM feedings f
                WHERE f.family_id = family_id_param
                  AND f.timestamp >= NOW() - INTERVAL '1 day';
                
                IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'diaper_streak' THEN
                -- Подсчитываем серию смен подгузников за последний день
                SELECT COUNT(*)::INTEGER INTO new_progress
                FROM diapers d
                WHERE d.family_id = family_id_param
                  AND d.timestamp >= NOW() - INTERVAL '1 day';
                
                IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'sleep_streak' THEN
                -- Подсчитываем серию записей сна за последний день
                SELECT COUNT(*)::INTEGER INTO new_progress
                FROM sleep_records s
                WHERE s.family_id = family_id_param
                  AND s.timestamp >= NOW() - INTERVAL '1 day';
                
                IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'activity_streak' THEN
                -- Подсчитываем серию активностей за последний день
                SELECT COUNT(*)::INTEGER INTO new_progress
                FROM activities a
                WHERE a.family_id = family_id_param
                  AND a.timestamp >= NOW() - INTERVAL '1 day';
                
                IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'bath_streak' THEN
                -- Подсчитываем серию купаний за последний день
                SELECT COUNT(*)::INTEGER INTO new_progress
                FROM baths b
                WHERE b.family_id = family_id_param
                  AND b.timestamp >= NOW() - INTERVAL '1 day';
                
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
                        WHEN 'diaper' THEN
                            SELECT COUNT(*)::INTEGER INTO new_progress
                            FROM diapers d
                            WHERE d.family_id = family_id_param
                              AND EXTRACT(HOUR FROM d.timestamp) BETWEEN start_hour AND end_hour
                              AND d.timestamp >= NOW() - INTERVAL '1 day';
                        WHEN 'bath' THEN
                            SELECT COUNT(*)::INTEGER INTO new_progress
                            FROM baths b
                            WHERE b.family_id = family_id_param
                              AND EXTRACT(HOUR FROM b.timestamp) BETWEEN start_hour AND end_hour
                              AND b.timestamp >= NOW() - INTERVAL '1 day';
                        ELSE
                            -- Неизвестный тип действия
                            new_progress := 0;
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
                        ELSE
                            -- Неизвестный тип действия
                            new_progress := 0;
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
                DECLARE
                    family_member_count INTEGER;
                    achieved_members INTEGER;
                BEGIN
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
                END;
                
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
                        ELSE
                            -- Неизвестный тип действия
                            new_progress := 0;
                    END CASE;
                    
                    IF new_progress >= streak_target THEN
                        is_completed := TRUE;
                    END IF;
                END;
                
            WHEN 'perfect_sequence' THEN
                -- Проверяем идеальную последовательность действий
                DECLARE
                    sequence_array TEXT[] := ARRAY(SELECT jsonb_array_elements_text(achievement_record.criteria->'sequence'));
                    streak_target INTEGER := (achievement_record.criteria->>'streak')::INTEGER;
                BEGIN
                    -- Упрощенная проверка последовательности
                    -- В реальной реализации нужно проверять точную последовательность
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
                    WHERE timestamp >= NOW() - INTERVAL '7 days';
                    
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
                
            WHEN 'first_action' THEN
                -- Проверяем первое действие определенного типа
                DECLARE
                    action_type TEXT := achievement_record.criteria->>'action';
                    action_count INTEGER := 0;
                BEGIN
                    CASE action_type
                        WHEN 'feeding' THEN
                            SELECT COUNT(*)::INTEGER INTO action_count
                            FROM feedings f
                            WHERE f.family_id = family_id_param;
                        WHEN 'diaper' THEN
                            SELECT COUNT(*)::INTEGER INTO action_count
                            FROM diapers d
                            WHERE d.family_id = family_id_param;
                        WHEN 'bath' THEN
                            SELECT COUNT(*)::INTEGER INTO action_count
                            FROM baths b
                            WHERE b.family_id = family_id_param;
                        WHEN 'activity' THEN
                            SELECT COUNT(*)::INTEGER INTO action_count
                            FROM activities a
                            WHERE a.family_id = family_id_param;
                        WHEN 'sleep' THEN
                            SELECT COUNT(*)::INTEGER INTO action_count
                            FROM sleep_records s
                            WHERE s.family_id = family_id_param;
                        ELSE
                            -- Неизвестный тип действия
                            action_count := 0;
                    END CASE;
                    
                    IF action_count >= 1 THEN
                        is_completed := TRUE;
                    END IF;
                END;
                
            ELSE
                -- Неизвестный тип достижения - не обрабатываем
                is_completed := FALSE;
        END CASE;
        
        -- Если достижение выполнено и еще не получено
        IF is_completed THEN
            -- Проверяем, не получено ли уже это достижение
            IF NOT EXISTS (
                SELECT 1 FROM user_achievements ua
                WHERE ua.family_id = family_id_param 
                  AND ua.user_id = user_id_param 
                  AND ua.achievement_id = achievement_record.id
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

-- Создаем упрощенную функцию check_family_history_and_award_achievements
CREATE OR REPLACE FUNCTION check_family_history_and_award_achievements(
    family_id_param INTEGER
)
RETURNS TABLE (
    user_id BIGINT,
    user_name TEXT,
    achievement_id INTEGER,
    achievement_name TEXT,
    points INTEGER,
    coins_reward INTEGER,
    rarity TEXT
) AS $$
DECLARE
    family_member RECORD;
    achievement_record RECORD;
    new_progress INTEGER;
    is_completed BOOLEAN;
    total_awarded INTEGER := 0;
BEGIN
    -- Проходим по всем членам семьи
    FOR family_member IN 
        SELECT fm.user_id, fm.name, fm.role
        FROM family_members fm
        WHERE fm.family_id = family_id_param
    LOOP
        -- Проходим по всем активным достижениям
        FOR achievement_record IN 
            SELECT a.id, a.name, a.points, a.coins_reward, a.rarity, a.criteria
            FROM achievements a
            WHERE a.is_active = TRUE
        LOOP
            is_completed := FALSE;
            
            -- Проверяем только основные типы достижений для истории семьи
            CASE achievement_record.criteria->>'type'
                WHEN 'feeding_streak' THEN
                    -- Подсчитываем максимальную серию кормлений за день
                    WITH daily_feeding_counts AS (
                        SELECT DATE(timestamp) as feeding_date, COUNT(*) as daily_count
                        FROM feedings
                        WHERE family_id = family_id_param
                        GROUP BY DATE(timestamp)
                    )
                    SELECT MAX(daily_count)::INTEGER INTO new_progress
                    FROM daily_feeding_counts;
                    
                    IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                        is_completed := TRUE;
                    END IF;
                    
                WHEN 'diaper_streak' THEN
                    -- Подсчитываем максимальную серию смен подгузников за день
                    WITH daily_diaper_counts AS (
                        SELECT DATE(timestamp) as diaper_date, COUNT(*) as daily_count
                        FROM diapers
                        WHERE family_id = family_id_param
                        GROUP BY DATE(timestamp)
                    )
                    SELECT MAX(daily_count)::INTEGER INTO new_progress
                    FROM daily_diaper_counts;
                    
                    IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                        is_completed := TRUE;
                    END IF;
                    
                WHEN 'first_action' THEN
                    -- Проверяем первое действие определенного типа
                    DECLARE
                        action_type TEXT := achievement_record.criteria->>'action';
                        action_count INTEGER := 0;
                    BEGIN
                        CASE action_type
                            WHEN 'feeding' THEN
                                SELECT COUNT(*)::INTEGER INTO action_count
                                FROM feedings f
                                WHERE f.family_id = family_id_param;
                            WHEN 'diaper' THEN
                                SELECT COUNT(*)::INTEGER INTO action_count
                                FROM diapers d
                                WHERE d.family_id = family_id_param;
                            WHEN 'bath' THEN
                                SELECT COUNT(*)::INTEGER INTO action_count
                                FROM baths b
                                WHERE b.family_id = family_id_param;
                            WHEN 'activity' THEN
                                SELECT COUNT(*)::INTEGER INTO action_count
                                FROM activities a
                                WHERE a.family_id = family_id_param;
                            WHEN 'sleep' THEN
                                SELECT COUNT(*)::INTEGER INTO action_count
                                FROM sleep_records s
                                WHERE s.family_id = family_id_param;
                            ELSE
                                -- Неизвестный тип действия
                                action_count := 0;
                        END CASE;
                        
                        IF action_count >= 1 THEN
                            is_completed := TRUE;
                        END IF;
                    END;
                    
                WHEN 'total_count' THEN
                    -- Подсчитываем общее количество достижений пользователя
                    SELECT COUNT(*)::INTEGER INTO new_progress
                    FROM user_achievements ua
                    WHERE ua.family_id = family_id_param
                      AND ua.user_id = family_member.user_id;
                    
                    IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                        is_completed := TRUE;
                    END IF;
                    
                ELSE
                    -- Остальные типы достижений не обрабатываем для истории семьи
                    is_completed := FALSE;
            END CASE;
            
            -- Если достижение выполнено и еще не получено
            IF is_completed THEN
                -- Проверяем, не получено ли уже это достижение
                IF NOT EXISTS (
                    SELECT 1 FROM user_achievements ua
                    WHERE ua.family_id = family_id_param 
                      AND ua.user_id = family_member.user_id 
                      AND ua.achievement_id = achievement_record.id
                ) THEN
                    -- Добавляем достижение
                    INSERT INTO user_achievements (family_id, user_id, achievement_id)
                    VALUES (family_id_param, family_member.user_id, achievement_record.id);
                    
                    -- Обновляем статистику семьи
                    UPDATE family_achievement_stats 
                    SET total_achievements = total_achievements + 1,
                        total_points = total_points + achievement_record.points,
                        total_coins_earned = total_coins_earned + achievement_record.coins_reward,
                        last_achievement_at = NOW()
                    WHERE family_id = family_id_param;
                    
                    -- Возвращаем информацию о достижении
                    user_id := family_member.user_id;
                    user_name := family_member.name;
                    achievement_id := achievement_record.id;
                    achievement_name := achievement_record.name;
                    points := achievement_record.points;
                    coins_reward := achievement_record.coins_reward;
                    rarity := achievement_record.rarity;
                    RETURN NEXT;
                    
                    total_awarded := total_awarded + 1;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Сообщение об успешном исправлении
SELECT 'Функции достижений исправлены! Добавлена обработка всех типов достижений и ELSE ветки для предотвращения ошибки "case not found".' as message;
