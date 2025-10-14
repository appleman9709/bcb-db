-- Исправленная функция check_and_award_achievements без ошибок с sleep_records
-- Заменяет sleep_records на sleep_sessions и добавляет проверки существования таблиц

CREATE OR REPLACE FUNCTION check_and_award_achievements(
    family_id_param INTEGER,
    user_id_param BIGINT,
    activity_type TEXT,
    activity_data JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
    achievement_id INTEGER,
    achievement_name TEXT,
    achievement_description TEXT,
    achievement_icon TEXT,
    achievement_color TEXT,
    achievement_rarity TEXT,
    points INTEGER,
    coins_reward INTEGER
) AS $$
DECLARE
    achievement_record RECORD;
    earned_achievement RECORD;
    current_streak INTEGER;
    current_count INTEGER;
    total_count INTEGER;
    average_ounces NUMERIC;
    total_ounces NUMERIC;
    max_ounces NUMERIC;
    diaper_type TEXT;
    bath_mood TEXT;
    feeding_ounces DECIMAL(4,1);
    days_back INTEGER;
    start_date TIMESTAMP WITH TIME ZONE;
    end_date TIMESTAMP WITH TIME ZONE;
    calm_bath_percentage NUMERIC;
    diaper_type_balance NUMERIC;
    detailed_stats_count INTEGER;
    sleep_table_exists BOOLEAN;
BEGIN
    -- Проверяем существование таблицы sleep_sessions
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'sleep_sessions' AND table_schema = 'public'
    ) INTO sleep_table_exists;

    -- Получаем все активные достижения
    FOR achievement_record IN 
        SELECT a.*, at.name as type_name
        FROM achievements a
        JOIN achievement_types at ON a.type_id = at.id
        WHERE a.is_active = TRUE
    LOOP
        -- Проверяем, не получено ли уже это достижение
        IF EXISTS (
            SELECT 1 FROM user_achievements ua
            WHERE ua.family_id = family_id_param 
              AND ua.user_id = user_id_param 
              AND ua.achievement_id = achievement_record.id
        ) THEN
            CONTINUE;
        END IF;

        -- Извлекаем данные активности
        diaper_type := COALESCE(activity_data->>'diaper_type', '');
        bath_mood := COALESCE(activity_data->>'bath_mood', '');
        feeding_ounces := CASE 
            WHEN activity_data->>'ounces' IS NOT NULL AND activity_data->>'ounces' != '' 
            THEN (activity_data->>'ounces')::DECIMAL(4,1) 
            ELSE NULL 
        END;

        -- Проверяем достижения по типу
        CASE achievement_record.criteria->>'type'
            
            -- === СЕРИИ ДЛЯ ТИПОВ ПОДГУЗНИКОВ ===
            WHEN 'diaper_type_streak' THEN
                IF activity_type = 'diaper' AND diaper_type = achievement_record.criteria->>'diaper_type' THEN
                    -- Подсчитываем текущую серию
                    SELECT COUNT(*) INTO current_streak
                    FROM (
                        SELECT timestamp, ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
                        FROM diapers 
                        WHERE family_id = family_id_param 
                          AND diaper_type = achievement_record.criteria->>'diaper_type'
                        ORDER BY timestamp DESC
                    ) ranked
                    WHERE rn <= (
                        SELECT COUNT(*) FROM diapers 
                        WHERE family_id = family_id_param 
                          AND diaper_type = achievement_record.criteria->>'diaper_type'
                        ORDER BY timestamp DESC
                    );
                    
                    IF current_streak >= (achievement_record.criteria->>'target')::INTEGER THEN
                        INSERT INTO user_achievements (family_id, user_id, achievement_id, earned_at)
                        VALUES (family_id_param, user_id_param, achievement_record.id, NOW())
                        ON CONFLICT (family_id, user_id, achievement_id) DO NOTHING;
                        
                        RETURN QUERY SELECT 
                            achievement_record.id,
                            achievement_record.name,
                            achievement_record.description,
                            achievement_record.icon,
                            achievement_record.color,
                            achievement_record.rarity,
                            achievement_record.points,
                            achievement_record.coins_reward;
                    END IF;
                END IF;

            -- === СЕРИИ ДЛЯ НАСТРОЕНИЯ КУПАНИЯ ===
            WHEN 'bath_mood_streak' THEN
                IF activity_type = 'bath' AND bath_mood = achievement_record.criteria->>'bath_mood' THEN
                    -- Подсчитываем текущую серию
                    SELECT COUNT(*) INTO current_streak
                    FROM (
                        SELECT timestamp, ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
                        FROM baths 
                        WHERE family_id = family_id_param 
                          AND bath_mood = achievement_record.criteria->>'bath_mood'
                        ORDER BY timestamp DESC
                    ) ranked
                    WHERE rn <= (
                        SELECT COUNT(*) FROM baths 
                        WHERE family_id = family_id_param 
                          AND bath_mood = achievement_record.criteria->>'bath_mood'
                        ORDER BY timestamp DESC
                    );
                    
                    IF current_streak >= (achievement_record.criteria->>'target')::INTEGER THEN
                        INSERT INTO user_achievements (family_id, user_id, achievement_id, earned_at)
                        VALUES (family_id_param, user_id_param, achievement_record.id, NOW())
                        ON CONFLICT (family_id, user_id, achievement_id) DO NOTHING;
                        
                        RETURN QUERY SELECT 
                            achievement_record.id,
                            achievement_record.name,
                            achievement_record.description,
                            achievement_record.icon,
                            achievement_record.color,
                            achievement_record.rarity,
                            achievement_record.points,
                            achievement_record.coins_reward;
                    END IF;
                END IF;

            -- === ДОСТИЖЕНИЯ ДЛЯ КОРМЛЕНИЯ С УНЦИЯМИ ===
            WHEN 'feeding_with_ounces' THEN
                IF activity_type = 'feeding' AND feeding_ounces IS NOT NULL THEN
                    SELECT COUNT(*) INTO current_count
                    FROM feedings
                    WHERE family_id = family_id_param
                      AND ounces IS NOT NULL;
                    
                    IF current_count >= (achievement_record.criteria->>'target')::INTEGER THEN
                        INSERT INTO user_achievements (family_id, user_id, achievement_id, earned_at)
                        VALUES (family_id_param, user_id_param, achievement_record.id, NOW())
                        ON CONFLICT (family_id, user_id, achievement_id) DO NOTHING;
                        
                        RETURN QUERY SELECT 
                            achievement_record.id,
                            achievement_record.name,
                            achievement_record.description,
                            achievement_record.icon,
                            achievement_record.color,
                            achievement_record.rarity,
                            achievement_record.points,
                            achievement_record.coins_reward;
                    END IF;
                END IF;

            -- === ДОСТИЖЕНИЯ ПО СРЕДНЕМУ КОЛИЧЕСТВУ УНЦИЙ ===
            WHEN 'average_ounces_range' THEN
                IF activity_type = 'feeding' AND feeding_ounces IS NOT NULL THEN
                    -- Вычисляем среднее количество унций за последние дни
                    days_back := COALESCE((achievement_record.criteria->>'days_back')::INTEGER, 7);
                    start_date := NOW() - (days_back || ' days')::INTERVAL;
                    
                    SELECT AVG(ounces) INTO average_ounces
                    FROM feedings
                    WHERE family_id = family_id_param
                      AND timestamp >= start_date
                      AND ounces IS NOT NULL;
                    
                    IF average_ounces IS NOT NULL 
                       AND average_ounces >= (achievement_record.criteria->>'min_ounces')::NUMERIC
                       AND average_ounces <= (achievement_record.criteria->>'max_ounces')::NUMERIC THEN
                        INSERT INTO user_achievements (family_id, user_id, achievement_id, earned_at)
                        VALUES (family_id_param, user_id_param, achievement_record.id, NOW())
                        ON CONFLICT (family_id, user_id, achievement_id) DO NOTHING;
                        
                        RETURN QUERY SELECT 
                            achievement_record.id,
                            achievement_record.name,
                            achievement_record.description,
                            achievement_record.icon,
                            achievement_record.color,
                            achievement_record.rarity,
                            achievement_record.points,
                            achievement_record.coins_reward;
                    END IF;
                END IF;

            -- === ДОСТИЖЕНИЯ ПО ОБЩЕМУ КОЛИЧЕСТВУ УНЦИЙ ===
            WHEN 'total_ounces' THEN
                IF activity_type = 'feeding' AND feeding_ounces IS NOT NULL THEN
                    SELECT SUM(ounces) INTO total_ounces
                    FROM feedings
                    WHERE family_id = family_id_param
                      AND ounces IS NOT NULL;
                    
                    IF total_ounces IS NOT NULL 
                       AND total_ounces >= (achievement_record.criteria->>'target')::NUMERIC THEN
                        INSERT INTO user_achievements (family_id, user_id, achievement_id, earned_at)
                        VALUES (family_id_param, user_id_param, achievement_record.id, NOW())
                        ON CONFLICT (family_id, user_id, achievement_id) DO NOTHING;
                        
                        RETURN QUERY SELECT 
                            achievement_record.id,
                            achievement_record.name,
                            achievement_record.description,
                            achievement_record.icon,
                            achievement_record.color,
                            achievement_record.rarity,
                            achievement_record.points,
                            achievement_record.coins_reward;
                    END IF;
                END IF;

            -- === РЕКОРДЫ УНЦИЙ ===
            WHEN 'max_ounces_record' THEN
                IF activity_type = 'feeding' AND feeding_ounces IS NOT NULL THEN
                    IF feeding_ounces >= (achievement_record.criteria->>'target')::NUMERIC THEN
                        INSERT INTO user_achievements (family_id, user_id, achievement_id, earned_at)
                        VALUES (family_id_param, user_id_param, achievement_record.id, NOW())
                        ON CONFLICT (family_id, user_id, achievement_id) DO NOTHING;
                        
                        RETURN QUERY SELECT 
                            achievement_record.id,
                            achievement_record.name,
                            achievement_record.description,
                            achievement_record.icon,
                            achievement_record.color,
                            achievement_record.rarity,
                            achievement_record.points,
                            achievement_record.coins_reward;
                    END IF;
                END IF;

            -- === СТАТИСТИКА ДЕТАЛЬНЫХ ДАННЫХ ===
            WHEN 'detailed_stats' THEN
                IF activity_type IN ('feeding', 'diaper', 'bath') THEN
                    -- Подсчитываем записи с детальной информацией
                    detailed_stats_count := 0;
                    
                    -- Кормления с унциями
                    IF EXISTS (SELECT 1 FROM feedings WHERE family_id = family_id_param AND ounces IS NOT NULL) THEN
                        detailed_stats_count := detailed_stats_count + 1;
                    END IF;
                    
                    -- Подгузники с типом
                    IF EXISTS (SELECT 1 FROM diapers WHERE family_id = family_id_param AND diaper_type IS NOT NULL AND diaper_type != '') THEN
                        detailed_stats_count := detailed_stats_count + 1;
                    END IF;
                    
                    -- Купания с настроением
                    IF EXISTS (SELECT 1 FROM baths WHERE family_id = family_id_param AND bath_mood IS NOT NULL AND bath_mood != '') THEN
                        detailed_stats_count := detailed_stats_count + 1;
                    END IF;
                    
                    IF detailed_stats_count >= (achievement_record.criteria->>'target')::INTEGER THEN
                        INSERT INTO user_achievements (family_id, user_id, achievement_id, earned_at)
                        VALUES (family_id_param, user_id_param, achievement_record.id, NOW())
                        ON CONFLICT (family_id, user_id, achievement_id) DO NOTHING;
                        
                        RETURN QUERY SELECT 
                            achievement_record.id,
                            achievement_record.name,
                            achievement_record.description,
                            achievement_record.icon,
                            achievement_record.color,
                            achievement_record.rarity,
                            achievement_record.points,
                            achievement_record.coins_reward;
                    END IF;
                END IF;

            -- === ДОСТИЖЕНИЯ СНА (только если таблица существует) ===
            WHEN 'sleep_streak' THEN
                IF sleep_table_exists AND activity_type = 'sleep' THEN
                    -- Подсчитываем серию сна
                    SELECT COUNT(*) INTO current_streak
                    FROM (
                        SELECT start_time, ROW_NUMBER() OVER (ORDER BY start_time DESC) as rn
                        FROM sleep_sessions 
                        WHERE family_id = family_id_param 
                        ORDER BY start_time DESC
                    ) ranked
                    WHERE rn <= (
                        SELECT COUNT(*) FROM sleep_sessions 
                        WHERE family_id = family_id_param 
                        ORDER BY start_time DESC
                    );
                    
                    IF current_streak >= (achievement_record.criteria->>'target')::INTEGER THEN
                        INSERT INTO user_achievements (family_id, user_id, achievement_id, earned_at)
                        VALUES (family_id_param, user_id_param, achievement_record.id, NOW())
                        ON CONFLICT (family_id, user_id, achievement_id) DO NOTHING;
                        
                        RETURN QUERY SELECT 
                            achievement_record.id,
                            achievement_record.name,
                            achievement_record.description,
                            achievement_record.icon,
                            achievement_record.color,
                            achievement_record.rarity,
                            achievement_record.points,
                            achievement_record.coins_reward;
                    END IF;
                END IF;

            -- Обрабатываем существующие типы достижений
            WHEN 'feeding_streak' THEN
                IF activity_type = 'feeding' THEN
                    -- Подсчитываем серию кормлений за день
                    SELECT COUNT(*) INTO current_streak
                    FROM feedings
                    WHERE family_id = family_id_param
                      AND timestamp >= CURRENT_DATE
                      AND timestamp < CURRENT_DATE + INTERVAL '1 day';
                    
                    IF current_streak >= (achievement_record.criteria->>'target')::INTEGER THEN
                        INSERT INTO user_achievements (family_id, user_id, achievement_id, earned_at)
                        VALUES (family_id_param, user_id_param, achievement_record.id, NOW())
                        ON CONFLICT (family_id, user_id, achievement_id) DO NOTHING;
                        
                        RETURN QUERY SELECT 
                            achievement_record.id,
                            achievement_record.name,
                            achievement_record.description,
                            achievement_record.icon,
                            achievement_record.color,
                            achievement_record.rarity,
                            achievement_record.points,
                            achievement_record.coins_reward;
                    END IF;
                END IF;

            WHEN 'diaper_streak' THEN
                IF activity_type = 'diaper' THEN
                    -- Подсчитываем серию смен подгузников за день
                    SELECT COUNT(*) INTO current_streak
                    FROM diapers
                    WHERE family_id = family_id_param
                      AND timestamp >= CURRENT_DATE
                      AND timestamp < CURRENT_DATE + INTERVAL '1 day';
                    
                    IF current_streak >= (achievement_record.criteria->>'target')::INTEGER THEN
                        INSERT INTO user_achievements (family_id, user_id, achievement_id, earned_at)
                        VALUES (family_id_param, user_id_param, achievement_record.id, NOW())
                        ON CONFLICT (family_id, user_id, achievement_id) DO NOTHING;
                        
                        RETURN QUERY SELECT 
                            achievement_record.id,
                            achievement_record.name,
                            achievement_record.description,
                            achievement_record.icon,
                            achievement_record.color,
                            achievement_record.rarity,
                            achievement_record.points,
                            achievement_record.coins_reward;
                    END IF;
                END IF;

            WHEN 'bath_streak' THEN
                IF activity_type = 'bath' THEN
                    -- Подсчитываем серию купаний за неделю
                    SELECT COUNT(*) INTO current_streak
                    FROM baths
                    WHERE family_id = family_id_param
                      AND timestamp >= CURRENT_DATE - INTERVAL '7 days';
                    
                    IF current_streak >= (achievement_record.criteria->>'target')::INTEGER THEN
                        INSERT INTO user_achievements (family_id, user_id, achievement_id, earned_at)
                        VALUES (family_id_param, user_id_param, achievement_record.id, NOW())
                        ON CONFLICT (family_id, user_id, achievement_id) DO NOTHING;
                        
                        RETURN QUERY SELECT 
                            achievement_record.id,
                            achievement_record.name,
                            achievement_record.description,
                            achievement_record.icon,
                            achievement_record.color,
                            achievement_record.rarity,
                            achievement_record.points,
                            achievement_record.coins_reward;
                    END IF;
                END IF;

            WHEN 'combo' THEN
                IF activity_type IN ('feeding', 'diaper', 'bath', 'activity') THEN
                    -- Проверяем комбо за последние 30 минут
                    DECLARE
                        combo_count INTEGER := 0;
                        combo_target INTEGER := (achievement_record.criteria->>'target')::INTEGER;
                        combo_timeframe INTERVAL := (achievement_record.criteria->>'timeframe')::INTERVAL;
                    BEGIN
                        -- Подсчитываем разные типы активностей за указанный период
                        SELECT COUNT(DISTINCT 'feeding') INTO combo_count
                        FROM feedings
                        WHERE family_id = family_id_param
                          AND timestamp >= NOW() - combo_timeframe;
                        
                        SELECT COUNT(DISTINCT 'diaper') INTO combo_count
                        FROM diapers
                        WHERE family_id = family_id_param
                          AND timestamp >= NOW() - combo_timeframe;
                        
                        SELECT COUNT(DISTINCT 'bath') INTO combo_count
                        FROM baths
                        WHERE family_id = family_id_param
                          AND timestamp >= NOW() - combo_timeframe;
                        
                        SELECT COUNT(DISTINCT 'activity') INTO combo_count
                        FROM activities
                        WHERE family_id = family_id_param
                          AND timestamp >= NOW() - combo_timeframe;
                        
                        IF combo_count >= combo_target THEN
                            INSERT INTO user_achievements (family_id, user_id, achievement_id, earned_at)
                            VALUES (family_id_param, user_id_param, achievement_record.id, NOW())
                            ON CONFLICT (family_id, user_id, achievement_id) DO NOTHING;
                            
                            RETURN QUERY SELECT 
                                achievement_record.id,
                                achievement_record.name,
                                achievement_record.description,
                                achievement_record.icon,
                                achievement_record.color,
                                achievement_record.rarity,
                                achievement_record.points,
                                achievement_record.coins_reward;
                        END IF;
                    END;
                END IF;

            WHEN 'time_window' THEN
                IF activity_type = 'feeding' THEN
                    -- Проверяем временное окно для кормления
                    DECLARE
                        target_hour INTEGER := (achievement_record.criteria->>'hour')::INTEGER;
                        current_hour INTEGER := EXTRACT(HOUR FROM NOW());
                    BEGIN
                        IF current_hour = target_hour THEN
                            INSERT INTO user_achievements (family_id, user_id, achievement_id, earned_at)
                            VALUES (family_id_param, user_id_param, achievement_record.id, NOW())
                            ON CONFLICT (family_id, user_id, achievement_id) DO NOTHING;
                            
                            RETURN QUERY SELECT 
                                achievement_record.id,
                                achievement_record.name,
                                achievement_record.description,
                                achievement_record.icon,
                                achievement_record.color,
                                achievement_record.rarity,
                                achievement_record.points,
                                achievement_record.coins_reward;
                        END IF;
                    END;
                END IF;

        END CASE;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Сообщение об успешном создании функции
SELECT 'Функция check_and_award_achievements исправлена! Теперь она работает без ошибок с sleep_records.' as message;
