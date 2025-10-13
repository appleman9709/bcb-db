-- Функция для проверки истории и выдачи достижений всем членам семьи
-- Эта функция проверяет всю историю семьи и выдает недостающие достижения

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
        RAISE NOTICE 'Проверяем достижения для пользователя: % (ID: %)', family_member.name, family_member.user_id;
        
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
                    
                WHEN 'sleep_streak' THEN
                    -- Подсчитываем максимальную серию записей сна за день
                    WITH daily_sleep_counts AS (
                        SELECT DATE(timestamp) as sleep_date, COUNT(*) as daily_count
                        FROM sleep_records
                        WHERE family_id = family_id_param
                        GROUP BY DATE(timestamp)
                    )
                    SELECT MAX(daily_count)::INTEGER INTO new_progress
                    FROM daily_sleep_counts;
                    
                    IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                        is_completed := TRUE;
                    END IF;
                    
                WHEN 'activity_streak' THEN
                    -- Подсчитываем максимальную серию активностей за день
                    WITH daily_activity_counts AS (
                        SELECT DATE(timestamp) as activity_date, COUNT(*) as daily_count
                        FROM activities
                        WHERE family_id = family_id_param
                        GROUP BY DATE(timestamp)
                    )
                    SELECT MAX(daily_count)::INTEGER INTO new_progress
                    FROM daily_activity_counts;
                    
                    IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                        is_completed := TRUE;
                    END IF;
                    
                WHEN 'bath_streak' THEN
                    -- Подсчитываем максимальную серию купаний за день
                    WITH daily_bath_counts AS (
                        SELECT DATE(timestamp) as bath_date, COUNT(*) as daily_count
                        FROM baths
                        WHERE family_id = family_id_param
                        GROUP BY DATE(timestamp)
                    )
                    SELECT MAX(daily_count)::INTEGER INTO new_progress
                    FROM daily_bath_counts;
                    
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
                      AND ua.user_id = family_member.user_id;
                    
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
                    
                WHEN 'combo' THEN
                    -- Проверяем комбо достижения (максимальное комбо за день)
                    WITH daily_combo_counts AS (
                        SELECT DATE(timestamp) as combo_date, COUNT(*) as daily_count
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
                        GROUP BY DATE(timestamp)
                    )
                    SELECT MAX(daily_count)::INTEGER INTO new_progress
                    FROM daily_combo_counts;
                    
                    IF new_progress >= (achievement_record.criteria->>'target')::INTEGER THEN
                        is_completed := TRUE;
                    END IF;
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
    
    RAISE NOTICE 'Всего выдано достижений: %', total_awarded;
END;
$$ LANGUAGE plpgsql;

-- Сообщение об успешном создании функции
SELECT 'Функция check_family_history_and_award_achievements создана! Теперь можно проверить всю историю семьи и выдать недостающие достижения.' as message;
