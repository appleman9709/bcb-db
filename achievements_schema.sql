-- Схема базы данных для системы достижений BabyBot
-- Этот скрипт создает таблицы для системы достижений и наград

-- Таблица типов достижений
CREATE TABLE IF NOT EXISTS achievement_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT DEFAULT '🏆',
    color TEXT DEFAULT '#FFD700',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица достижений
CREATE TABLE IF NOT EXISTS achievements (
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
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress_data JSONB, -- Дополнительные данные о прогрессе
    UNIQUE(family_id, user_id, achievement_id)
);

-- Таблица прогресса достижений (для отслеживания прогресса)
CREATE TABLE IF NOT EXISTS achievement_progress (
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
CREATE TABLE IF NOT EXISTS family_achievement_stats (
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE PRIMARY KEY,
    total_achievements INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    total_coins_earned INTEGER DEFAULT 0,
    last_achievement_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_achievements_type_id ON achievements(type_id);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON achievements(rarity);
CREATE INDEX IF NOT EXISTS idx_user_achievements_family_id ON user_achievements(family_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON user_achievements(earned_at);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_family_id ON achievement_progress(family_id);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_user_id ON achievement_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_achievement_id ON achievement_progress(achievement_id);

-- Включение Row Level Security (RLS) для безопасности
ALTER TABLE achievement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_achievement_stats ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON achievement_types;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON achievements;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON user_achievements;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON achievement_progress;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON family_achievement_stats;

CREATE POLICY "Enable all operations for authenticated users" ON achievement_types FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON achievements FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON user_achievements FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON achievement_progress FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON family_achievement_stats FOR ALL USING (true);

-- Триггер для автоматического обновления updated_at в таблице family_achievement_stats
DROP TRIGGER IF EXISTS update_family_achievement_stats_updated_at ON family_achievement_stats;
CREATE TRIGGER update_family_achievement_stats_updated_at 
    BEFORE UPDATE ON family_achievement_stats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Функция для проверки и выдачи достижений

-- Helper to convert timeframe strings used in achievement criteria
CREATE OR REPLACE FUNCTION resolve_timeframe_interval(
    timeframe_text TEXT,
    fallback INTERVAL DEFAULT INTERVAL '1 day'
)
RETURNS INTERVAL AS $$
DECLARE
    sanitized TEXT;
BEGIN
    IF timeframe_text IS NULL OR timeframe_text = '' THEN
        RETURN fallback;
    END IF;

    CASE timeframe_text
        WHEN 'day', '1_day' THEN RETURN INTERVAL '1 day';
        WHEN 'week', '7_days' THEN RETURN INTERVAL '7 days';
        WHEN 'month', '30_days' THEN RETURN INTERVAL '30 days';
        WHEN '15_minutes' THEN RETURN INTERVAL '15 minutes';
        WHEN '30_minutes' THEN RETURN INTERVAL '30 minutes';
        WHEN '45_minutes' THEN RETURN INTERVAL '45 minutes';
        WHEN '1_hour' THEN RETURN INTERVAL '1 hour';
        WHEN '2_hours' THEN RETURN INTERVAL '2 hours';
        WHEN '3_hours' THEN RETURN INTERVAL '3 hours';
        WHEN '6_hours' THEN RETURN INTERVAL '6 hours';
        WHEN '12_hours' THEN RETURN INTERVAL '12 hours';
        ELSE
            sanitized := REPLACE(timeframe_text, '_', ' ');
            BEGIN
                RETURN sanitized::INTERVAL;
            EXCEPTION WHEN OTHERS THEN
                RETURN fallback;
            END;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Returns timestamped events for a user and action type
CREATE OR REPLACE FUNCTION fetch_action_events(
    action_name TEXT,
    family_id_value INTEGER,
    user_id_value BIGINT,
    limit_count INTEGER DEFAULT NULL
)
RETURNS TABLE(event_timestamp TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
    IF action_name = 'feeding' THEN
        IF limit_count IS NULL THEN
            RETURN QUERY
            SELECT f.timestamp
            FROM feedings f
            WHERE f.family_id = family_id_value
              AND f.author_id = user_id_value
            ORDER BY f.timestamp DESC;
        ELSE
            RETURN QUERY
            SELECT f.timestamp
            FROM feedings f
            WHERE f.family_id = family_id_value
              AND f.author_id = user_id_value
            ORDER BY f.timestamp DESC
            LIMIT limit_count;
        END IF;
    ELSIF action_name = 'diaper' THEN
        IF limit_count IS NULL THEN
            RETURN QUERY
            SELECT d.timestamp
            FROM diapers d
            WHERE d.family_id = family_id_value
              AND d.author_id = user_id_value
            ORDER BY d.timestamp DESC;
        ELSE
            RETURN QUERY
            SELECT d.timestamp
            FROM diapers d
            WHERE d.family_id = family_id_value
              AND d.author_id = user_id_value
            ORDER BY d.timestamp DESC
            LIMIT limit_count;
        END IF;
    ELSIF action_name = 'bath' THEN
        IF limit_count IS NULL THEN
            RETURN QUERY
            SELECT b.timestamp
            FROM baths b
            WHERE b.family_id = family_id_value
              AND b.author_id = user_id_value
            ORDER BY b.timestamp DESC;
        ELSE
            RETURN QUERY
            SELECT b.timestamp
            FROM baths b
            WHERE b.family_id = family_id_value
              AND b.author_id = user_id_value
            ORDER BY b.timestamp DESC
            LIMIT limit_count;
        END IF;
    ELSIF action_name = 'activity' THEN
        IF limit_count IS NULL THEN
            RETURN QUERY
            SELECT a.timestamp
            FROM activities a
            WHERE a.family_id = family_id_value
              AND a.author_id = user_id_value
            ORDER BY a.timestamp DESC;
        ELSE
            RETURN QUERY
            SELECT a.timestamp
            FROM activities a
            WHERE a.family_id = family_id_value
              AND a.author_id = user_id_value
            ORDER BY a.timestamp DESC
            LIMIT limit_count;
        END IF;
    ELSIF action_name = 'sleep' THEN
        IF limit_count IS NULL THEN
            RETURN QUERY
            SELECT s.start_time
            FROM sleep_sessions s
            WHERE s.family_id = family_id_value
              AND s.author_id = user_id_value
            ORDER BY s.start_time DESC;
        ELSE
            RETURN QUERY
            SELECT s.start_time
            FROM sleep_sessions s
            WHERE s.family_id = family_id_value
              AND s.author_id = user_id_value
            ORDER BY s.start_time DESC
            LIMIT limit_count;
        END IF;
    ELSE
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Main achievement evaluation routine
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
    criteria_type TEXT;
    timeframe_text TEXT;
    timeframe_interval INTERVAL;
    should_award BOOLEAN;
    now_ts TIMESTAMP WITH TIME ZONE := NOW();
    action_timestamp TIMESTAMP WITH TIME ZONE;
    action_time TIME;
    start_time TIME;
    end_time TIME;
    target_count INTEGER;
    actions_performed INTEGER;
    action_name TEXT;
    actions_json JSONB;
    days_required INTEGER;
    sequence_len INTEGER;
    required_events INTEGER;
    tolerance_minutes INTEGER;
    tolerance_seconds INTEGER;
    expected_interval_hours NUMERIC;
    expected_interval_seconds NUMERIC;
    intervals_total INTEGER;
    matching_intervals INTEGER;
    total_needed INTEGER;
    user_total INTEGER;
BEGIN
    INSERT INTO family_achievement_stats (family_id)
    VALUES (family_id_param)
    ON CONFLICT (family_id) DO NOTHING;

    FOR achievement_record IN
        SELECT a.id, a.name, a.points, a.coins_reward, a.rarity, a.criteria
        FROM achievements a
        WHERE a.is_active = TRUE
    LOOP
        criteria_type := achievement_record.criteria->>'type';
        should_award := FALSE;
        action_timestamp := COALESCE((activity_data->>'timestamp')::TIMESTAMPTZ, now_ts);
        timeframe_text := NULL;
        timeframe_interval := NULL;
        target_count := NULL;
        actions_performed := 0;
        action_name := NULL;
        actions_json := NULL;
        days_required := NULL;
        sequence_len := NULL;
        required_events := NULL;
        tolerance_minutes := NULL;
        tolerance_seconds := NULL;
        expected_interval_hours := NULL;
        expected_interval_seconds := NULL;
        intervals_total := 0;
        matching_intervals := 0;
        total_needed := 0;
        user_total := 0;

        CASE criteria_type
            WHEN 'feeding_streak' THEN
                target_count := NULLIF(achievement_record.criteria->>'target', '')::INTEGER;
                IF target_count IS NULL THEN
                    CONTINUE;
                END IF;

                timeframe_text := COALESCE(achievement_record.criteria->>'timeframe', 'day');
                timeframe_interval := resolve_timeframe_interval(timeframe_text, INTERVAL '1 day');

                SELECT COUNT(*)
                INTO actions_performed
                FROM fetch_action_events('feeding', family_id_param, user_id_param)
                WHERE event_timestamp >= now_ts - timeframe_interval;

                IF COALESCE(actions_performed, 0) >= target_count THEN
                    should_award := TRUE;
                END IF;

            WHEN 'diaper_streak' THEN
                target_count := NULLIF(achievement_record.criteria->>'target', '')::INTEGER;
                IF target_count IS NULL THEN
                    CONTINUE;
                END IF;

                timeframe_text := COALESCE(achievement_record.criteria->>'timeframe', 'day');
                timeframe_interval := resolve_timeframe_interval(timeframe_text, INTERVAL '1 day');

                SELECT COUNT(*)
                INTO actions_performed
                FROM fetch_action_events('diaper', family_id_param, user_id_param)
                WHERE event_timestamp >= now_ts - timeframe_interval;

                IF COALESCE(actions_performed, 0) >= target_count THEN
                    should_award := TRUE;
                END IF;

            WHEN 'sleep_streak' THEN
                target_count := NULLIF(achievement_record.criteria->>'target', '')::INTEGER;
                IF target_count IS NULL THEN
                    CONTINUE;
                END IF;

                timeframe_text := COALESCE(achievement_record.criteria->>'timeframe', 'day');
                timeframe_interval := resolve_timeframe_interval(timeframe_text, INTERVAL '1 day');

                SELECT COUNT(*)
                INTO actions_performed
                FROM fetch_action_events('sleep', family_id_param, user_id_param)
                WHERE event_timestamp >= now_ts - timeframe_interval;

                IF COALESCE(actions_performed, 0) >= target_count THEN
                    should_award := TRUE;
                END IF;

            WHEN 'activity_streak' THEN
                target_count := NULLIF(achievement_record.criteria->>'target', '')::INTEGER;
                IF target_count IS NULL THEN
                    CONTINUE;
                END IF;

                timeframe_text := COALESCE(achievement_record.criteria->>'timeframe', 'day');
                timeframe_interval := resolve_timeframe_interval(timeframe_text, INTERVAL '1 day');

                SELECT COUNT(*)
                INTO actions_performed
                FROM fetch_action_events('activity', family_id_param, user_id_param)
                WHERE event_timestamp >= now_ts - timeframe_interval;

                IF COALESCE(actions_performed, 0) >= target_count THEN
                    should_award := TRUE;
                END IF;

            WHEN 'bath_streak' THEN
                target_count := NULLIF(achievement_record.criteria->>'target', '')::INTEGER;
                IF target_count IS NULL THEN
                    CONTINUE;
                END IF;

                timeframe_text := COALESCE(achievement_record.criteria->>'timeframe', 'day');
                timeframe_interval := resolve_timeframe_interval(timeframe_text, INTERVAL '1 day');

                SELECT COUNT(*)
                INTO actions_performed
                FROM fetch_action_events('bath', family_id_param, user_id_param)
                WHERE event_timestamp >= now_ts - timeframe_interval;

                IF COALESCE(actions_performed, 0) >= target_count THEN
                    should_award := TRUE;
                END IF;

            WHEN 'combo' THEN
                timeframe_text := COALESCE(achievement_record.criteria->>'timeframe', '30_minutes');
                timeframe_interval := resolve_timeframe_interval(timeframe_text, INTERVAL '30 minutes');
                target_count := NULLIF(achievement_record.criteria->>'target', '')::INTEGER;
                actions_json := achievement_record.criteria->'actions';

                IF actions_json IS NULL OR jsonb_typeof(actions_json) <> 'array' THEN
                    actions_json := '[]'::JSONB;
                END IF;

                IF target_count IS NULL OR target_count <= 0 THEN
                    target_count := jsonb_array_length(actions_json);
                END IF;

                actions_performed := 0;

                FOR action_name IN SELECT value FROM jsonb_array_elements_text(actions_json) LOOP
                    PERFORM 1
                    FROM fetch_action_events(action_name, family_id_param, user_id_param)
                    WHERE event_timestamp >= now_ts - timeframe_interval
                    LIMIT 1;

                    IF FOUND THEN
                        actions_performed := actions_performed + 1;
                    END IF;
                END LOOP;

                IF target_count > 0 AND actions_performed >= target_count THEN
                    should_award := TRUE;
                END IF;

            WHEN 'time_window' THEN
                action_name := achievement_record.criteria->>'action';
                IF action_name IS NOT NULL AND action_name = activity_type THEN
                    start_time := NULLIF(achievement_record.criteria->>'start_time', '')::TIME;
                    end_time := NULLIF(achievement_record.criteria->>'end_time', '')::TIME;

                    IF start_time IS NOT NULL AND end_time IS NOT NULL THEN
                        action_time := action_timestamp::TIME;

                        IF start_time <= end_time THEN
                            IF action_time >= start_time AND action_time <= end_time THEN
                                should_award := TRUE;
                            END IF;
                        ELSE
                            IF action_time >= start_time OR action_time <= end_time THEN
                                should_award := TRUE;
                            END IF;
                        END IF;
                    END IF;
                END IF;

            WHEN 'first_action' THEN
                action_name := achievement_record.criteria->>'action';

                IF action_name IS NOT NULL AND action_name = activity_type THEN
                    SELECT COUNT(*)
                    INTO actions_performed
                    FROM fetch_action_events(action_name, family_id_param, user_id_param);

                    IF COALESCE(actions_performed, 0) = 1 THEN
                        should_award := TRUE;
                    END IF;
                END IF;

            WHEN 'consistency' THEN
                days_required := NULLIF(achievement_record.criteria->>'days', '')::INTEGER;

                IF days_required IS NOT NULL AND days_required > 0 THEN
                    WITH user_events AS (
                        SELECT DISTINCT DATE(event_timestamp) AS day
                        FROM fetch_action_events('feeding', family_id_param, user_id_param)
                        WHERE DATE(event_timestamp) BETWEEN current_date - (days_required - 1) AND current_date
                        UNION
                        SELECT DISTINCT DATE(event_timestamp) AS day
                        FROM fetch_action_events('diaper', family_id_param, user_id_param)
                        WHERE DATE(event_timestamp) BETWEEN current_date - (days_required - 1) AND current_date
                        UNION
                        SELECT DISTINCT DATE(event_timestamp) AS day
                        FROM fetch_action_events('bath', family_id_param, user_id_param)
                        WHERE DATE(event_timestamp) BETWEEN current_date - (days_required - 1) AND current_date
                        UNION
                        SELECT DISTINCT DATE(event_timestamp) AS day
                        FROM fetch_action_events('activity', family_id_param, user_id_param)
                        WHERE DATE(event_timestamp) BETWEEN current_date - (days_required - 1) AND current_date
                        UNION
                        SELECT DISTINCT DATE(event_timestamp) AS day
                        FROM fetch_action_events('sleep', family_id_param, user_id_param)
                        WHERE DATE(event_timestamp) BETWEEN current_date - (days_required - 1) AND current_date
                    ),
                    required_days AS (
                        SELECT generate_series(
                            current_date - (days_required - 1),
                            current_date,
                            '1 day'
                        )::DATE AS day
                    )
                    SELECT COUNT(*)
                    INTO actions_performed
                    FROM required_days rd
                    LEFT JOIN user_events ue ON ue.day = rd.day
                    WHERE ue.day IS NOT NULL;

                    IF actions_performed = days_required THEN
                        should_award := TRUE;
                    END IF;
                END IF;

            WHEN 'total_count' THEN
                target_count := NULLIF(achievement_record.criteria->>'target', '')::INTEGER;

                IF target_count IS NOT NULL THEN
                    SELECT COUNT(*)
                    INTO actions_performed
                    FROM user_achievements ua
                    WHERE ua.family_id = family_id_param
                      AND ua.user_id = user_id_param;

                    IF COALESCE(actions_performed, 0) >= target_count THEN
                        should_award := TRUE;
                    END IF;
                END IF;

            WHEN 'collection_complete' THEN
                action_name := achievement_record.criteria->>'achievement_type';

                IF action_name IS NULL OR action_name = 'all' THEN
                    SELECT COUNT(*) INTO total_needed
                    FROM achievements a
                    WHERE a.is_active = TRUE;

                    SELECT COUNT(*) INTO user_total
                    FROM user_achievements ua
                    JOIN achievements a ON ua.achievement_id = a.id
                    WHERE ua.family_id = family_id_param
                      AND ua.user_id = user_id_param
                      AND a.is_active = TRUE;
                ELSE
                    SELECT COUNT(*)
                    INTO total_needed
                    FROM achievements a
                    JOIN achievement_types at ON a.type_id = at.id
                    WHERE a.is_active = TRUE
                      AND (at.name = action_name OR at.id::TEXT = action_name);

                    SELECT COUNT(*)
                    INTO user_total
                    FROM user_achievements ua
                    JOIN achievements a ON ua.achievement_id = a.id
                    JOIN achievement_types at ON a.type_id = at.id
                    WHERE ua.family_id = family_id_param
                      AND ua.user_id = user_id_param
                      AND a.is_active = TRUE
                      AND (at.name = action_name OR at.id::TEXT = action_name);
                END IF;

                IF total_needed > 0 AND user_total >= total_needed THEN
                    should_award := TRUE;
                END IF;

            WHEN 'rhythm' THEN
                action_name := achievement_record.criteria->>'action';
                expected_interval_hours := NULLIF(achievement_record.criteria->>'interval_hours', '')::NUMERIC;
                target_count := NULLIF(achievement_record.criteria->>'target_count', '')::INTEGER;

                IF action_name IS NOT NULL AND expected_interval_hours IS NOT NULL AND target_count IS NOT NULL AND target_count > 1 THEN
                    tolerance_minutes := NULLIF(achievement_record.criteria->>'tolerance_minutes', '')::INTEGER;
                    IF tolerance_minutes IS NULL THEN
                        tolerance_minutes := 20;
                    END IF;

                    tolerance_seconds := tolerance_minutes * 60;
                    expected_interval_seconds := expected_interval_hours * 3600;

                    WITH ordered AS (
                        SELECT event_timestamp,
                               LAG(event_timestamp) OVER (ORDER BY event_timestamp DESC) AS previous_timestamp
                        FROM fetch_action_events(action_name, family_id_param, user_id_param, target_count)
                    )
                    SELECT COUNT(*) INTO intervals_total
                    FROM ordered
                    WHERE previous_timestamp IS NOT NULL;

                    WITH ordered AS (
                        SELECT event_timestamp,
                               LAG(event_timestamp) OVER (ORDER BY event_timestamp DESC) AS previous_timestamp
                        FROM fetch_action_events(action_name, family_id_param, user_id_param, target_count)
                    )
                    SELECT COUNT(*) INTO matching_intervals
                    FROM ordered
                    WHERE previous_timestamp IS NOT NULL
                      AND ABS(EXTRACT(EPOCH FROM (previous_timestamp - event_timestamp)) - expected_interval_seconds) <= tolerance_seconds;

                    IF intervals_total = target_count - 1 AND intervals_total > 0 AND matching_intervals = intervals_total THEN
                        should_award := TRUE;
                    END IF;
                END IF;

            WHEN 'perfect_timing' THEN
                action_name := achievement_record.criteria->>'action';
                target_count := NULLIF(achievement_record.criteria->>'streak', '')::INTEGER;

                IF action_name IS NOT NULL AND target_count IS NOT NULL AND target_count > 0 THEN
                    tolerance_minutes := NULLIF(achievement_record.criteria->>'tolerance_minutes', '')::INTEGER;
                    IF tolerance_minutes IS NULL THEN
                        tolerance_minutes := 5;
                    END IF;

                    tolerance_seconds := tolerance_minutes * 60;

                    WITH ordered AS (
                        SELECT event_timestamp,
                               LAG(event_timestamp) OVER (ORDER BY event_timestamp DESC) AS previous_timestamp
                        FROM fetch_action_events(action_name, family_id_param, user_id_param, target_count)
                    )
                    SELECT COUNT(*) INTO actions_performed FROM ordered;

                    WITH ordered AS (
                        SELECT event_timestamp,
                               LAG(event_timestamp) OVER (ORDER BY event_timestamp DESC) AS previous_timestamp
                        FROM fetch_action_events(action_name, family_id_param, user_id_param, target_count)
                    )
                    SELECT COUNT(*) INTO matching_intervals
                    FROM ordered
                    WHERE previous_timestamp IS NOT NULL
                      AND ABS(EXTRACT(EPOCH FROM (previous_timestamp - event_timestamp))) <= tolerance_seconds;

                    IF target_count = 1 THEN
                        IF actions_performed >= 1 THEN
                            should_award := TRUE;
                        END IF;
                    ELSIF actions_performed = target_count AND matching_intervals = target_count - 1 THEN
                        should_award := TRUE;
                    END IF;
                END IF;

            WHEN 'perfect_sequence' THEN
                actions_json := achievement_record.criteria->'sequence';
                target_count := NULLIF(achievement_record.criteria->>'streak', '')::INTEGER;

                IF actions_json IS NOT NULL AND jsonb_typeof(actions_json) = 'array' THEN
                    sequence_len := jsonb_array_length(actions_json);
                    IF sequence_len > 0 THEN
                        IF target_count IS NULL OR target_count <= 0 THEN
                            target_count := 1;
                        END IF;

                        required_events := sequence_len * target_count;

                        WITH all_events AS (
                            SELECT 'feeding' AS action_type, event_timestamp
                            FROM fetch_action_events('feeding', family_id_param, user_id_param)
                            UNION ALL
                            SELECT 'diaper', event_timestamp FROM fetch_action_events('diaper', family_id_param, user_id_param)
                            UNION ALL
                            SELECT 'bath', event_timestamp FROM fetch_action_events('bath', family_id_param, user_id_param)
                            UNION ALL
                            SELECT 'activity', event_timestamp FROM fetch_action_events('activity', family_id_param, user_id_param)
                            UNION ALL
                            SELECT 'sleep', event_timestamp FROM fetch_action_events('sleep', family_id_param, user_id_param)
                        ),
                        recent_events AS (
                            SELECT action_type,
                                   ROW_NUMBER() OVER (ORDER BY event_timestamp DESC) AS rn
                            FROM all_events
                        ),
                        limited_events AS (
                            SELECT action_type, rn
                            FROM recent_events
                            WHERE rn <= required_events
                        ),
                        expected AS (
                            SELECT gs.rn,
                                   seq_values.action_name
                            FROM generate_series(1, required_events) AS gs(rn)
                            JOIN (
                                SELECT ROW_NUMBER() OVER () AS idx,
                                       value AS action_name
                                FROM jsonb_array_elements_text(actions_json)
                            ) seq_values
                              ON seq_values.idx = ((gs.rn - 1) % sequence_len) + 1
                        )
                        SELECT COUNT(*) INTO matching_intervals
                        FROM expected e
                        JOIN limited_events re ON re.rn = e.rn
                        WHERE re.action_type = e.action_name;

                        SELECT COUNT(*) INTO actions_performed
                        FROM limited_events;

                        IF actions_performed = required_events AND matching_intervals = required_events THEN
                            should_award := TRUE;
                        END IF;
                    END IF;
                END IF;

            ELSE
                CONTINUE;
        END CASE;

        IF should_award THEN
            IF NOT EXISTS (
                SELECT 1
                FROM user_achievements ua
                WHERE ua.family_id = family_id_param
                  AND ua.user_id = user_id_param
                  AND ua.achievement_id = achievement_record.id
            ) THEN
                INSERT INTO user_achievements (family_id, user_id, achievement_id)
                VALUES (family_id_param, user_id_param, achievement_record.id);

                UPDATE family_achievement_stats
                SET total_achievements = total_achievements + 1,
                    total_points = total_points + achievement_record.points,
                    total_coins_earned = total_coins_earned + achievement_record.coins_reward,
                    last_achievement_at = NOW()
                WHERE family_id = family_id_param;

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
