-- Обновление схемы базы данных для добавления детальной информации к действиям
-- Добавляем новые поля для более информативного отслеживания

-- Добавляем поле для типа смены подгузника
ALTER TABLE diapers ADD COLUMN IF NOT EXISTS diaper_type TEXT DEFAULT 'Просто';
-- Возможные значения: 'Просто', 'Покакал'

-- Добавляем поле для настроения во время купания
ALTER TABLE baths ADD COLUMN IF NOT EXISTS bath_mood TEXT DEFAULT 'Спокойное купание';
-- Возможные значения: 'Спокойное купание', 'Беспокоился'

-- Добавляем поле для количества унций при кормлении
ALTER TABLE feedings ADD COLUMN IF NOT EXISTS ounces DECIMAL(4,1) DEFAULT NULL;
-- Количество унций (может быть NULL если не указано)

-- Создаем индексы для новых полей для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_diapers_type ON diapers(diaper_type);
CREATE INDEX IF NOT EXISTS idx_baths_mood ON baths(bath_mood);
CREATE INDEX IF NOT EXISTS idx_feedings_ounces ON feedings(ounces);

-- Обновляем комментарии к таблицам
COMMENT ON COLUMN diapers.diaper_type IS 'Тип смены подгузника: Просто или Покакал';
COMMENT ON COLUMN baths.bath_mood IS 'Настроение во время купания: Спокойное купание или Беспокоился';
COMMENT ON COLUMN feedings.ounces IS 'Количество унций при кормлении (может быть NULL)';

-- Функция для получения статистики по типам подгузников
CREATE OR REPLACE FUNCTION get_diaper_type_stats(family_id_param INTEGER, days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    diaper_type TEXT,
    count BIGINT,
    percentage NUMERIC
) AS $$
DECLARE
    total_count BIGINT;
BEGIN
    -- Получаем общее количество смен подгузников за указанный период
    SELECT COUNT(*) INTO total_count
    FROM diapers
    WHERE family_id = family_id_param
      AND timestamp >= NOW() - INTERVAL '1 day' * days_back;
    
    -- Если нет данных, возвращаем пустой результат
    IF total_count = 0 THEN
        RETURN;
    END IF;
    
    -- Возвращаем статистику по типам
    RETURN QUERY
    SELECT 
        d.diaper_type,
        COUNT(*) as count,
        ROUND((COUNT(*)::NUMERIC / total_count::NUMERIC) * 100, 2) as percentage
    FROM diapers d
    WHERE d.family_id = family_id_param
      AND d.timestamp >= NOW() - INTERVAL '1 day' * days_back
    GROUP BY d.diaper_type
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения статистики по настроению во время купания
CREATE OR REPLACE FUNCTION get_bath_mood_stats(family_id_param INTEGER, days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    bath_mood TEXT,
    count BIGINT,
    percentage NUMERIC
) AS $$
DECLARE
    total_count BIGINT;
BEGIN
    -- Получаем общее количество купаний за указанный период
    SELECT COUNT(*) INTO total_count
    FROM baths
    WHERE family_id = family_id_param
      AND timestamp >= NOW() - INTERVAL '1 day' * days_back;
    
    -- Если нет данных, возвращаем пустой результат
    IF total_count = 0 THEN
        RETURN;
    END IF;
    
    -- Возвращаем статистику по настроению
    RETURN QUERY
    SELECT 
        b.bath_mood,
        COUNT(*) as count,
        ROUND((COUNT(*)::NUMERIC / total_count::NUMERIC) * 100, 2) as percentage
    FROM baths b
    WHERE b.family_id = family_id_param
      AND b.timestamp >= NOW() - INTERVAL '1 day' * days_back
    GROUP BY b.bath_mood
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения статистики по кормлениям с унциями
CREATE OR REPLACE FUNCTION get_feeding_ounces_stats(family_id_param INTEGER, days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    total_feedings BIGINT,
    feedings_with_ounces BIGINT,
    average_ounces NUMERIC,
    total_ounces NUMERIC,
    min_ounces DECIMAL(4,1),
    max_ounces DECIMAL(4,1)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_feedings,
        COUNT(ounces) as feedings_with_ounces,
        ROUND(AVG(ounces), 2) as average_ounces,
        ROUND(SUM(ounces), 2) as total_ounces,
        MIN(ounces) as min_ounces,
        MAX(ounces) as max_ounces
    FROM feedings
    WHERE family_id = family_id_param
      AND timestamp >= NOW() - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения детальной статистики за день
CREATE OR REPLACE FUNCTION get_detailed_daily_stats(family_id_param INTEGER, target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    feedings_count BIGINT,
    feedings_with_ounces BIGINT,
    total_ounces NUMERIC,
    average_ounces NUMERIC,
    diapers_count BIGINT,
    diapers_simple_count BIGINT,
    diapers_poop_count BIGINT,
    baths_count BIGINT,
    baths_calm_count BIGINT,
    baths_crying_count BIGINT,
    activities_count BIGINT
) AS $$
DECLARE
    start_date TIMESTAMP WITH TIME ZONE;
    end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    start_date := target_date::TIMESTAMP WITH TIME ZONE;
    end_date := (target_date + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE;
    
    RETURN QUERY
    SELECT 
        -- Кормления
        (SELECT COUNT(*) FROM feedings WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date),
        (SELECT COUNT(*) FROM feedings WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date AND ounces IS NOT NULL),
        (SELECT COALESCE(SUM(ounces), 0) FROM feedings WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date),
        (SELECT COALESCE(AVG(ounces), 0) FROM feedings WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date AND ounces IS NOT NULL),
        
        -- Подгузники
        (SELECT COUNT(*) FROM diapers WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date),
        (SELECT COUNT(*) FROM diapers WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date AND diaper_type = 'Просто'),
        (SELECT COUNT(*) FROM diapers WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date AND diaper_type = 'Покакал'),
        
        -- Купания
        (SELECT COUNT(*) FROM baths WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date),
        (SELECT COUNT(*) FROM baths WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date AND bath_mood = 'Спокойное купание'),
        (SELECT COUNT(*) FROM baths WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date AND bath_mood = 'Кричал'),
        
        -- Активности
        (SELECT COUNT(*) FROM activities WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date);
END;
$$ LANGUAGE plpgsql;
