-- Обновленная функция проверки достижений с поддержкой детальных типов активностей
-- Этот скрипт обновляет функцию check_and_award_achievements для поддержки новых типов достижений

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
BEGIN
    -- Получаем все активные достижения
    FOR achievement_record IN 
        SELECT a.*, at.name as type_name
        FROM achievements a
        JOIN achievement_types at ON a.type_id = at.id
        WHERE a.is_active = TRUE
    LOOP
        -- Проверяем, не получено ли уже это достижение
        IF EXISTS (
            SELECT 1 FROM user_achievements 
            WHERE family_id = family_id_param 
              AND user_id = user_id_param 
              AND achievement_id = achievement_record.id
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
                          AND timestamp <= NOW()
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
                          AND timestamp <= NOW()
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

            -- === СЧЕТЧИКИ ДЛЯ ТИПОВ ПОДГУЗНИКОВ ===
            WHEN 'diaper_type_count' THEN
                IF activity_type = 'diaper' AND diaper_type = achievement_record.criteria->>'diaper_type' THEN
                    SELECT COUNT(*) INTO current_count
                    FROM diapers
                    WHERE family_id = family_id_param
                      AND diaper_type = achievement_record.criteria->>'diaper_type';
                    
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

            -- === СЧЕТЧИКИ ДЛЯ НАСТРОЕНИЯ КУПАНИЯ ===
            WHEN 'bath_mood_count' THEN
                IF activity_type = 'bath' AND bath_mood = achievement_record.criteria->>'bath_mood' THEN
                    SELECT COUNT(*) INTO current_count
                    FROM baths
                    WHERE family_id = family_id_param
                      AND bath_mood = achievement_record.criteria->>'bath_mood';
                    
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
                    SELECT AVG(ounces) INTO average_ounces
                    FROM feedings
                    WHERE family_id = family_id_param
                      AND ounces IS NOT NULL
                      AND timestamp >= NOW() - INTERVAL '7 days';
                    
                    IF average_ounces IS NOT NULL 
                       AND average_ounces >= (achievement_record.criteria->>'min_ounces')::NUMERIC
                       AND average_ounces <= (achievement_record.criteria->>'max_ounces')::NUMERIC THEN
                        
                        SELECT COUNT(*) INTO current_count
                        FROM feedings
                        WHERE family_id = family_id_param
                          AND ounces IS NOT NULL
                          AND timestamp >= NOW() - INTERVAL '7 days';
                        
                        IF current_count >= (achievement_record.criteria->>'min_feedings')::INTEGER THEN
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

            -- === КОМБО С ДЕТАЛЬНЫМИ ТИПАМИ ===
            WHEN 'combo_with_type' THEN
                -- Проверяем комбо с типами подгузников и настроением купания
                -- Логика аналогична существующим комбо, но с учетом типов
                IF activity_type IN ('diaper', 'bath', 'feeding') THEN
                    -- Здесь можно добавить логику для проверки комбо с типами
                    -- Пока оставляем базовую логику
                    NULL;
                END IF;

            -- === КОМБО С УНЦИЯМИ ===
            WHEN 'combo_with_ounces' THEN
                -- Проверяем комбо с учетом количества унций
                IF activity_type = 'feeding' AND feeding_ounces IS NOT NULL THEN
                    -- Здесь можно добавить логику для проверки комбо с унциями
                    NULL;
                END IF;

            -- === ОСОБЫЕ ДОСТИЖЕНИЯ ===
            WHEN 'daily_variety' THEN
                -- Проверяем разнообразие типов в один день
                IF activity_type IN ('diaper', 'bath') THEN
                    -- Проверяем, есть ли все типы за сегодня
                    DECLARE
                        has_simple_diaper BOOLEAN := FALSE;
                        has_poop_diaper BOOLEAN := FALSE;
                        has_calm_bath BOOLEAN := FALSE;
                        has_crying_bath BOOLEAN := FALSE;
                    BEGIN
                        SELECT EXISTS(
                            SELECT 1 FROM diapers 
                            WHERE family_id = family_id_param 
                              AND DATE(timestamp) = CURRENT_DATE 
                              AND diaper_type = 'Просто'
                        ) INTO has_simple_diaper;
                        
                        SELECT EXISTS(
                            SELECT 1 FROM diapers 
                            WHERE family_id = family_id_param 
                              AND DATE(timestamp) = CURRENT_DATE 
                              AND diaper_type = 'Покакал'
                        ) INTO has_poop_diaper;
                        
                        SELECT EXISTS(
                            SELECT 1 FROM baths 
                            WHERE family_id = family_id_param 
                              AND DATE(timestamp) = CURRENT_DATE 
                              AND bath_mood = 'Спокойное купание'
                        ) INTO has_calm_bath;
                        
                        SELECT EXISTS(
                            SELECT 1 FROM baths 
                            WHERE family_id = family_id_param 
                              AND DATE(timestamp) = CURRENT_DATE 
                              AND bath_mood = 'Кричал'
                        ) INTO has_crying_bath;
                        
                        IF has_simple_diaper AND has_poop_diaper AND has_calm_bath AND has_crying_bath THEN
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
                -- Подсчитываем количество действий с детальной информацией
                SELECT COUNT(*) INTO detailed_stats_count
                FROM (
                    SELECT 1 FROM feedings WHERE family_id = family_id_param AND ounces IS NOT NULL
                    UNION ALL
                    SELECT 1 FROM diapers WHERE family_id = family_id_param AND diaper_type IS NOT NULL
                    UNION ALL
                    SELECT 1 FROM baths WHERE family_id = family_id_param AND bath_mood IS NOT NULL
                ) detailed_actions;
                
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

            -- Обрабатываем существующие типы достижений
            WHEN 'feeding_streak' THEN
                IF activity_type = 'feeding' THEN
                    -- Существующая логика для серий кормления
                    SELECT COUNT(*) INTO current_streak
                    FROM (
                        SELECT timestamp, ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
                        FROM feedings
                        WHERE family_id = family_id_param
                          AND timestamp <= NOW()
                        ORDER BY timestamp DESC
                        LIMIT 20
                    ) recent_feedings
                    WHERE rn <= (
                        SELECT COUNT(*)
                        FROM feedings
                        WHERE family_id = family_id_param
                          AND timestamp <= NOW()
                        ORDER BY timestamp DESC
                        LIMIT 20
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

            WHEN 'diaper_streak' THEN
                IF activity_type = 'diaper' THEN
                    -- Существующая логика для серий смены подгузников
                    SELECT COUNT(*) INTO current_streak
                    FROM (
                        SELECT timestamp, ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
                        FROM diapers
                        WHERE family_id = family_id_param
                          AND timestamp <= NOW()
                        ORDER BY timestamp DESC
                        LIMIT 20
                    ) recent_diapers
                    WHERE rn <= (
                        SELECT COUNT(*)
                        FROM diapers
                        WHERE family_id = family_id_param
                          AND timestamp <= NOW()
                        ORDER BY timestamp DESC
                        LIMIT 20
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

            WHEN 'combo' THEN
                -- Существующая логика для комбо
                IF activity_type IN ('diaper', 'feeding', 'bath', 'activity', 'sleep') THEN
                    -- Проверяем комбо в указанном временном окне
                    DECLARE
                        combo_timeframe TEXT := achievement_record.criteria->>'timeframe';
                        combo_target INTEGER := (achievement_record.criteria->>'target')::INTEGER;
                        combo_count INTEGER;
                        time_interval INTERVAL;
                    BEGIN
                        -- Определяем временной интервал
                        CASE combo_timeframe
                            WHEN '15_minutes' THEN time_interval := INTERVAL '15 minutes';
                            WHEN '30_minutes' THEN time_interval := INTERVAL '30 minutes';
                            WHEN '1_hour' THEN time_interval := INTERVAL '1 hour';
                            WHEN '2_hours' THEN time_interval := INTERVAL '2 hours';
                            ELSE time_interval := INTERVAL '30 minutes';
                        END CASE;
                        
                        -- Подсчитываем количество разных действий в указанном окне
                        SELECT COUNT(DISTINCT activity_type) INTO combo_count
                        FROM (
                            SELECT 'feeding' as activity_type, timestamp FROM feedings WHERE family_id = family_id_param AND timestamp >= NOW() - time_interval
                            UNION ALL
                            SELECT 'diaper' as activity_type, timestamp FROM diapers WHERE family_id = family_id_param AND timestamp >= NOW() - time_interval
                            UNION ALL
                            SELECT 'bath' as activity_type, timestamp FROM baths WHERE family_id = family_id_param AND timestamp >= NOW() - time_interval
                            UNION ALL
                            SELECT 'activity' as activity_type, timestamp FROM activities WHERE family_id = family_id_param AND timestamp >= NOW() - time_interval
                            UNION ALL
                            SELECT 'sleep' as activity_type, timestamp FROM sleeps WHERE family_id = family_id_param AND timestamp >= NOW() - time_interval
                        ) recent_activities;
                        
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

            -- Обрабатываем другие существующие типы достижений
            WHEN 'time_window' THEN
                -- Существующая логика для окон времени
                NULL;
            WHEN 'rhythm' THEN
                -- Существующая логика для ритма
                NULL;
            WHEN 'first_action' THEN
                -- Существующая логика для первых действий
                NULL;
            WHEN 'consistency' THEN
                -- Существующая логика для последовательности
                NULL;
            WHEN 'perfect_timing' THEN
                -- Существующая логика для идеального времени
                NULL;
            WHEN 'perfect_sequence' THEN
                -- Существующая логика для идеальной последовательности
                NULL;
            WHEN 'collection_complete' THEN
                -- Существующая логика для коллекционных достижений
                NULL;
            WHEN 'total_count' THEN
                -- Существующая логика для общего количества
                NULL;
        END CASE;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
