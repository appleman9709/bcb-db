-- Улучшенная функция check_and_award_achievements
-- Эта версия проверяет ВСЕ достижения независимо от activity_type

-- Удаляем старую функцию
DROP FUNCTION IF EXISTS check_and_award_achievements(INTEGER, BIGINT, TEXT, JSONB);

-- Создаем улучшенную функцию
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
                  AND ua.user_id = user_id_param;
                
                IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                    is_completed := TRUE;
                END IF;
                
            WHEN 'consistency' THEN
                -- Проверяем консистентность использования
                DECLARE
                    days_target INTEGER := (achievement_record.criteria->>'days')::INTEGER;
                BEGIN
                    -- Проверяем общее количество дней с активностью
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
                    
                    IF new_progress >= days_target THEN
                        is_completed := TRUE;
                    END IF;
                END;
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

-- Сообщение об успешном исправлении
SELECT 'Улучшенная функция check_and_award_achievements создана! Теперь она проверяет ВСЕ достижения независимо от activity_type.' as message;
