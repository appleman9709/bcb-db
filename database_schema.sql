-- =====================================================
-- BCB Dashboard - Complete Database Schema
-- =====================================================
-- This file contains the complete database schema including:
-- - All table definitions
-- - All functions
-- - All triggers
-- - All RLS policies
-- - All indexes
-- - All updates and migrations
-- =====================================================

-- =====================================================
-- SECTION 1: CORE TABLES
-- =====================================================

-- Table for storing family information
CREATE TABLE IF NOT EXISTS families (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing family members
CREATE TABLE IF NOT EXISTS family_members (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);

-- Table for storing feeding records
CREATE TABLE IF NOT EXISTS feedings (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL,
    author_name TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    ounces DECIMAL(4,1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing diaper change records
CREATE TABLE IF NOT EXISTS diapers (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL,
    author_name TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    diaper_type TEXT DEFAULT 'Просто',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing bath records
CREATE TABLE IF NOT EXISTS baths (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL,
    author_name TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    bath_mood TEXT DEFAULT 'Спокойное купание',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing activity records
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL,
    author_name TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    activity_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing sleep session records
CREATE TABLE IF NOT EXISTS sleep_sessions (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL,
    author_name TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing app settings
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    wake_on_activity_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id)
);

-- Table for storing tips
CREATE TABLE IF NOT EXISTS tips (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SECTION 2: INVENTORY SYSTEM
-- =====================================================

-- Table for storing family inventory
CREATE TABLE IF NOT EXISTS family_inventory (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_type TEXT NOT NULL,
    quantity DECIMAL(8,2) NOT NULL DEFAULT 1.0,
    portion_size_ounces DECIMAL(4,1) DEFAULT 1.0,
    unit TEXT DEFAULT 'штука',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, item_name)
);

-- =====================================================
-- SECTION 3: COINS SYSTEM
-- =====================================================

-- Table for storing parent coins
CREATE TABLE IF NOT EXISTS parent_coins (
    id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    feeding_coins INTEGER DEFAULT 0,
    diaper_coins INTEGER DEFAULT 0,
    bath_coins INTEGER DEFAULT 0,
    mom_coins INTEGER DEFAULT 0,
    activity_coins INTEGER DEFAULT 0,
    sleep_coins INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);

-- =====================================================
-- SECTION 4: TETRIS SYSTEM
-- =====================================================

-- Table for storing Tetris records
CREATE TABLE IF NOT EXISTS tetris_records (
    id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    level INTEGER NOT NULL,
    lines_cleared INTEGER NOT NULL,
    game_duration_seconds INTEGER NOT NULL,
    pieces_placed INTEGER NOT NULL,
    game_mode TEXT DEFAULT 'classic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, user_id, score)
);

-- =====================================================
-- SECTION 5: DUTY SCHEDULE SYSTEM
-- =====================================================

-- Table for storing duty schedules
CREATE TABLE IF NOT EXISTS duty_schedules (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    block_duration_hours INTEGER NOT NULL DEFAULT 3 CHECK (block_duration_hours IN (1, 2, 3, 4, 6, 8)),
    start_hour_offset INTEGER NOT NULL DEFAULT 0 CHECK (start_hour_offset >= 0 AND start_hour_offset < 24),
    updated_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id)
);

-- Table for storing duty assignments
CREATE TABLE IF NOT EXISTS duty_assignments (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    block_id TEXT NOT NULL,
    parent_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, block_id)
);

-- =====================================================
-- SECTION 6: GROWTH MEASUREMENTS
-- =====================================================

-- Table for storing growth measurements
CREATE TABLE IF NOT EXISTS growth_measurements (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    measurement_type TEXT NOT NULL CHECK (measurement_type IN ('height', 'weight')),
    month INTEGER NOT NULL CHECK (month >= 0 AND month <= 12),
    value DECIMAL(5,2) NOT NULL CHECK (value > 0),
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, measurement_type, month)
);

-- Table for storing push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);

-- =====================================================
-- SECTION 7: INDEXES FOR OPTIMIZATION
-- =====================================================

-- Family and members indexes
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);

-- Feeding indexes
CREATE INDEX IF NOT EXISTS idx_feedings_family_id ON feedings(family_id);
CREATE INDEX IF NOT EXISTS idx_feedings_timestamp ON feedings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_feedings_ounces ON feedings(ounces);

-- Diaper indexes
CREATE INDEX IF NOT EXISTS idx_diapers_family_id ON diapers(family_id);
CREATE INDEX IF NOT EXISTS idx_diapers_timestamp ON diapers(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_diapers_type ON diapers(diaper_type);

-- Bath indexes
CREATE INDEX IF NOT EXISTS idx_baths_family_id ON baths(family_id);
CREATE INDEX IF NOT EXISTS idx_baths_timestamp ON baths(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_baths_mood ON baths(bath_mood);

-- Activity indexes
CREATE INDEX IF NOT EXISTS idx_activities_family_id ON activities(family_id);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);

-- Sleep indexes
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_family_id ON sleep_sessions(family_id);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_family_active ON sleep_sessions(family_id, end_time) WHERE end_time IS NULL;
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_family_start ON sleep_sessions(family_id, start_time DESC);

-- Parent coins indexes
CREATE INDEX IF NOT EXISTS idx_parent_coins_family_id ON parent_coins(family_id);
CREATE INDEX IF NOT EXISTS idx_parent_coins_user_id ON parent_coins(user_id);

-- Tetris indexes
CREATE INDEX IF NOT EXISTS idx_tetris_records_family_id ON tetris_records(family_id);
CREATE INDEX IF NOT EXISTS idx_tetris_records_user_id ON tetris_records(user_id);
CREATE INDEX IF NOT EXISTS idx_tetris_records_score ON tetris_records(score DESC);
CREATE INDEX IF NOT EXISTS idx_tetris_records_created_at ON tetris_records(created_at DESC);

-- Duty schedule indexes
CREATE INDEX IF NOT EXISTS idx_duty_schedules_family_id ON duty_schedules(family_id);
CREATE INDEX IF NOT EXISTS idx_duty_assignments_family_id ON duty_assignments(family_id);
CREATE INDEX IF NOT EXISTS idx_duty_assignments_block_id ON duty_assignments(block_id);

-- Growth measurements indexes
CREATE INDEX IF NOT EXISTS idx_growth_measurements_family_id ON growth_measurements(family_id);
CREATE INDEX IF NOT EXISTS idx_growth_measurements_user_id ON growth_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_growth_measurements_type ON growth_measurements(measurement_type);
CREATE INDEX IF NOT EXISTS idx_growth_measurements_month ON growth_measurements(month);
CREATE INDEX IF NOT EXISTS idx_growth_measurements_created_at ON growth_measurements(created_at DESC);

-- Push subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_family_id ON push_subscriptions(family_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- =====================================================
-- SECTION 8: HELPER FUNCTION
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 9: TRIGGERS
-- =====================================================

-- Triggers for updating updated_at
CREATE TRIGGER update_family_inventory_updated_at 
    BEFORE UPDATE ON family_inventory 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at 
    BEFORE UPDATE ON settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parent_coins_updated_at 
    BEFORE UPDATE ON parent_coins 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_duty_schedules_updated_at 
    BEFORE UPDATE ON duty_schedules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_duty_assignments_updated_at 
    BEFORE UPDATE ON duty_assignments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_growth_measurements_updated_at 
    BEFORE UPDATE ON growth_measurements 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_subscriptions_updated_at 
    BEFORE UPDATE ON push_subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sleep sync trigger
CREATE TRIGGER sleep_sync_trigger
    AFTER INSERT OR UPDATE ON sleep_sessions
    FOR EACH ROW
    EXECUTE FUNCTION sync_family_sleep_status();

-- Wake on activity trigger
CREATE TRIGGER wake_on_activity_trigger
    AFTER INSERT ON activities
    FOR EACH ROW
    EXECUTE FUNCTION wake_on_activity();

-- =====================================================
-- SECTION 10: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedings ENABLE ROW LEVEL SECURITY;
ALTER TABLE diapers ENABLE ROW LEVEL SECURITY;
ALTER TABLE baths ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE tetris_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for all tables
CREATE POLICY "Enable all operations for authenticated users" ON families FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON family_members FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON feedings FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON diapers FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON baths FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON activities FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON sleep_sessions FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON settings FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON tips FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON parent_coins FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON family_inventory FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON tetris_records FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON duty_schedules FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON duty_assignments FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON growth_measurements FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON push_subscriptions FOR ALL USING (true);

-- =====================================================
-- SECTION 11: SLEEP FUNCTIONS
-- =====================================================

-- Function to sync family sleep status
CREATE OR REPLACE FUNCTION sync_family_sleep_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a new sleep session (start_time filled, end_time NULL)
    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NULL THEN
        -- Notify all family members about sleep start
        PERFORM pg_notify('family_sleep_start', json_build_object(
            'family_id', NEW.family_id,
            'author_id', NEW.author_id,
            'author_name', NEW.author_name,
            'start_time', NEW.start_time
        )::text);
    END IF;
    
    -- If sleep session is completed (end_time filled)
    IF NEW.end_time IS NOT NULL AND OLD.end_time IS NULL THEN
        -- Notify all family members about sleep end
        PERFORM pg_notify('family_sleep_end', json_build_object(
            'family_id', NEW.family_id,
            'author_id', NEW.author_id,
            'author_name', NEW.author_name,
            'end_time', NEW.end_time,
            'duration_minutes', NEW.duration_minutes
        )::text);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get family sleep status
CREATE OR REPLACE FUNCTION get_family_sleep_status(family_id_param INTEGER)
RETURNS TABLE (
    is_sleeping BOOLEAN,
    sleep_session_id INTEGER,
    start_time TIMESTAMP WITH TIME ZONE,
    author_name TEXT,
    duration_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE WHEN ss.id IS NOT NULL THEN TRUE ELSE FALSE END as is_sleeping,
        ss.id as sleep_session_id,
        ss.start_time,
        ss.author_name,
        CASE 
            WHEN ss.end_time IS NOT NULL THEN ss.duration_minutes
            ELSE EXTRACT(EPOCH FROM (NOW() - ss.start_time)) / 60
        END::INTEGER as duration_minutes
    FROM sleep_sessions ss
    WHERE ss.family_id = family_id_param 
      AND ss.end_time IS NULL
    ORDER BY ss.start_time DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to end all family sleep sessions
CREATE OR REPLACE FUNCTION end_all_family_sleep_sessions(family_id_param INTEGER, end_author_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    sessions_ended INTEGER := 0;
    session_record RECORD;
BEGIN
    -- Find all active sleep sessions for the family
    FOR session_record IN 
        SELECT id, start_time 
        FROM sleep_sessions 
        WHERE family_id = family_id_param 
          AND end_time IS NULL
    LOOP
        -- End the session
        UPDATE sleep_sessions 
        SET 
            end_time = NOW(),
            duration_minutes = EXTRACT(EPOCH FROM (NOW() - session_record.start_time)) / 60,
            author_id = end_author_id
        WHERE id = session_record.id;
        
        sessions_ended := sessions_ended + 1;
    END LOOP;
    
    RETURN sessions_ended;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 12: WAKE ON ACTIVITY FUNCTIONS
-- =====================================================

-- Function to wake on activity
CREATE OR REPLACE FUNCTION wake_on_activity()
RETURNS TRIGGER AS $$
DECLARE
    wake_setting BOOLEAN;
    family_id_param INTEGER;
BEGIN
    -- Get the setting for the family
    SELECT wake_on_activity_enabled, NEW.family_id
    INTO wake_setting, family_id_param
    FROM settings
    WHERE family_id = NEW.family_id;
    
    -- If setting is enabled and this is a new activity
    IF wake_setting = TRUE AND TG_OP = 'INSERT' THEN
        -- End all active sleep sessions for the family
        PERFORM end_all_family_sleep_sessions(family_id_param, NEW.author_id);
        
        -- Notify all family members about wake up
        PERFORM pg_notify('baby_woke_up', json_build_object(
            'family_id', family_id_param,
            'author_id', NEW.author_id,
            'author_name', NEW.author_name,
            'activity_type', NEW.activity_type,
            'timestamp', NEW.timestamp
        )::text);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 13: TETRIS FUNCTIONS
-- =====================================================

-- Function to get family Tetris records
CREATE OR REPLACE FUNCTION get_family_tetris_records(family_id_param INTEGER, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id INTEGER,
    user_id BIGINT,
    player_name TEXT,
    score INTEGER,
    level INTEGER,
    lines_cleared INTEGER,
    game_duration_seconds INTEGER,
    pieces_placed INTEGER,
    game_mode TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.id,
        tr.user_id,
        tr.player_name,
        tr.score,
        tr.level,
        tr.lines_cleared,
        tr.game_duration_seconds,
        tr.pieces_placed,
        tr.game_mode,
        tr.created_at,
        ROW_NUMBER() OVER (ORDER BY tr.score DESC, tr.created_at ASC)::INTEGER as rank
    FROM tetris_records tr
    WHERE tr.family_id = family_id_param
    ORDER BY tr.score DESC, tr.created_at ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user Tetris records
CREATE OR REPLACE FUNCTION get_user_tetris_records(family_id_param INTEGER, user_id_param BIGINT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id INTEGER,
    user_id BIGINT,
    player_name TEXT,
    score INTEGER,
    level INTEGER,
    lines_cleared INTEGER,
    game_duration_seconds INTEGER,
    pieces_placed INTEGER,
    game_mode TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.id,
        tr.user_id,
        tr.player_name,
        tr.score,
        tr.level,
        tr.lines_cleared,
        tr.game_duration_seconds,
        tr.pieces_placed,
        tr.game_mode,
        tr.created_at,
        ROW_NUMBER() OVER (ORDER BY tr.score DESC, tr.created_at ASC)::INTEGER as rank
    FROM tetris_records tr
    WHERE tr.family_id = family_id_param 
      AND tr.user_id = user_id_param
    ORDER BY tr.score DESC, tr.created_at ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get family best Tetris record
CREATE OR REPLACE FUNCTION get_family_best_tetris_record(family_id_param INTEGER)
RETURNS TABLE (
    id INTEGER,
    user_id BIGINT,
    player_name TEXT,
    score INTEGER,
    level INTEGER,
    lines_cleared INTEGER,
    game_duration_seconds INTEGER,
    pieces_placed INTEGER,
    game_mode TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.id,
        tr.user_id,
        tr.player_name,
        tr.score,
        tr.level,
        tr.lines_cleared,
        tr.game_duration_seconds,
        tr.pieces_placed,
        tr.game_mode,
        tr.created_at
    FROM tetris_records tr
    WHERE tr.family_id = family_id_param
    ORDER BY tr.score DESC, tr.created_at ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get family Tetris stats
CREATE OR REPLACE FUNCTION get_family_tetris_stats(family_id_param INTEGER)
RETURNS TABLE (
    total_games INTEGER,
    total_score BIGINT,
    avg_score NUMERIC,
    best_score INTEGER,
    total_players INTEGER,
    avg_game_duration NUMERIC,
    total_pieces_placed INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_games,
        SUM(tr.score)::BIGINT as total_score,
        ROUND(AVG(tr.score), 2) as avg_score,
        MAX(tr.score)::INTEGER as best_score,
        COUNT(DISTINCT tr.user_id)::INTEGER as total_players,
        ROUND(AVG(tr.game_duration_seconds), 2) as avg_game_duration,
        SUM(tr.pieces_placed)::INTEGER as total_pieces_placed
    FROM tetris_records tr
    WHERE tr.family_id = family_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get player Tetris stats
CREATE OR REPLACE FUNCTION get_player_tetris_stats(family_id_param INTEGER, user_id_param BIGINT)
RETURNS TABLE (
    total_games INTEGER,
    total_score BIGINT,
    avg_score NUMERIC,
    best_score INTEGER,
    avg_game_duration NUMERIC,
    total_pieces_placed INTEGER,
    best_level INTEGER,
    total_lines_cleared INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_games,
        SUM(tr.score)::BIGINT as total_score,
        ROUND(AVG(tr.score), 2) as avg_score,
        MAX(tr.score)::INTEGER as best_score,
        ROUND(AVG(tr.game_duration_seconds), 2) as avg_game_duration,
        SUM(tr.pieces_placed)::INTEGER as total_pieces_placed,
        MAX(tr.level)::INTEGER as best_level,
        SUM(tr.lines_cleared)::INTEGER as total_lines_cleared
    FROM tetris_records tr
    WHERE tr.family_id = family_id_param 
      AND tr.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 14: GROWTH MEASUREMENTS FUNCTIONS
-- =====================================================

-- Function to get family growth measurements
CREATE OR REPLACE FUNCTION get_family_growth_measurements(
    family_id_param INTEGER, 
    measurement_type_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    family_id INTEGER,
    user_id TEXT,
    measurement_type TEXT,
    month INTEGER,
    value DECIMAL(5,2),
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gm.id,
        gm.family_id,
        gm.user_id,
        gm.measurement_type,
        gm.month,
        gm.value,
        gm.recorded_by,
        gm.created_at,
        gm.updated_at
    FROM growth_measurements gm
    WHERE gm.family_id = family_id_param
      AND (measurement_type_param IS NULL OR gm.measurement_type = measurement_type_param)
    ORDER BY gm.month ASC, gm.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to add growth measurement
CREATE OR REPLACE FUNCTION add_growth_measurement(
    p_family_id INTEGER,
    p_user_id TEXT,
    p_measurement_type TEXT,
    p_month INTEGER,
    p_value DECIMAL(5,2),
    p_recorded_by TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    family_id INTEGER,
    user_id TEXT,
    measurement_type TEXT,
    month INTEGER,
    value DECIMAL(5,2),
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Try to update existing record first
    UPDATE growth_measurements AS gm
    SET 
        value = p_value,
        recorded_by = p_recorded_by,
        updated_at = NOW()
    WHERE gm.family_id = p_family_id 
      AND gm.measurement_type = p_measurement_type 
      AND gm.month = p_month;
    
    -- If record was not updated, create a new one
    IF NOT FOUND THEN
        INSERT INTO growth_measurements (
            family_id,
            user_id,
            measurement_type,
            month,
            value,
            recorded_by
        )
        VALUES (
            p_family_id,
            p_user_id,
            p_measurement_type,
            p_month,
            p_value,
            p_recorded_by
        );
    END IF;
    
    -- Return the data from the table
    RETURN QUERY
    SELECT 
        gm.id,
        gm.family_id,
        gm.user_id,
        gm.measurement_type,
        gm.month,
        gm.value,
        gm.recorded_by,
        gm.created_at,
        gm.updated_at
    FROM growth_measurements gm
    WHERE gm.family_id = p_family_id 
      AND gm.measurement_type = p_measurement_type 
      AND gm.month = p_month;
END;
$$ LANGUAGE plpgsql;

-- Function to delete growth measurement
CREATE OR REPLACE FUNCTION delete_growth_measurement(
    family_id_param INTEGER,
    measurement_type_param TEXT,
    month_param INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM growth_measurements AS gm
    WHERE gm.family_id = family_id_param 
      AND gm.measurement_type = measurement_type_param 
      AND gm.month = month_param;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 15: STATISTICS FUNCTIONS
-- =====================================================

-- Function to get diaper type statistics
CREATE OR REPLACE FUNCTION get_diaper_type_stats(family_id_param INTEGER, days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    diaper_type TEXT,
    count BIGINT,
    percentage NUMERIC
) AS $$
DECLARE
    total_count BIGINT;
BEGIN
    -- Get total number of diaper changes for the specified period
    SELECT COUNT(*) INTO total_count
    FROM diapers
    WHERE family_id = family_id_param
      AND timestamp >= NOW() - INTERVAL '1 day' * days_back;
    
    -- If no data, return empty result
    IF total_count = 0 THEN
        RETURN;
    END IF;
    
    -- Return statistics by type
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

-- Function to get bath mood statistics
CREATE OR REPLACE FUNCTION get_bath_mood_stats(family_id_param INTEGER, days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    bath_mood TEXT,
    count BIGINT,
    percentage NUMERIC
) AS $$
DECLARE
    total_count BIGINT;
BEGIN
    -- Get total number of baths for the specified period
    SELECT COUNT(*) INTO total_count
    FROM baths
    WHERE family_id = family_id_param
      AND timestamp >= NOW() - INTERVAL '1 day' * days_back;
    
    -- If no data, return empty result
    IF total_count = 0 THEN
        RETURN;
    END IF;
    
    -- Return statistics by mood
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

-- Function to get feeding ounces statistics
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

-- Function to get detailed daily statistics
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
        -- Feedings
        (SELECT COUNT(*) FROM feedings WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date),
        (SELECT COUNT(*) FROM feedings WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date AND ounces IS NOT NULL),
        (SELECT COALESCE(SUM(ounces), 0) FROM feedings WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date),
        (SELECT COALESCE(AVG(ounces), 0) FROM feedings WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date AND ounces IS NOT NULL),
        
        -- Diapers
        (SELECT COUNT(*) FROM diapers WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date),
        (SELECT COUNT(*) FROM diapers WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date AND diaper_type = 'Просто'),
        (SELECT COUNT(*) FROM diapers WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date AND diaper_type = 'Покакал'),
        
        -- Baths
        (SELECT COUNT(*) FROM baths WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date),
        (SELECT COUNT(*) FROM baths WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date AND bath_mood = 'Спокойное купание'),
        (SELECT COUNT(*) FROM baths WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date AND bath_mood = 'Кричал'),
        
        -- Activities
        (SELECT COUNT(*) FROM activities WHERE family_id = family_id_param AND timestamp >= start_date AND timestamp < end_date);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 16: COMMENTS
-- =====================================================

COMMENT ON TABLE families IS 'Table for storing family information';
COMMENT ON TABLE family_members IS 'Table for storing family members';
COMMENT ON TABLE feedings IS 'Table for storing feeding records';
COMMENT ON TABLE diapers IS 'Table for storing diaper change records';
COMMENT ON TABLE baths IS 'Table for storing bath records';
COMMENT ON TABLE activities IS 'Table for storing activity records';
COMMENT ON TABLE sleep_sessions IS 'Table for storing sleep session records with family synchronization';
COMMENT ON TABLE settings IS 'Table for storing app settings';
COMMENT ON TABLE tips IS 'Table for storing tips';
COMMENT ON TABLE parent_coins IS 'Table for storing parent coins/points';
COMMENT ON TABLE family_inventory IS 'Table for storing family inventory';
COMMENT ON TABLE tetris_records IS 'Table for storing Tetris game records';
COMMENT ON TABLE duty_schedules IS 'Duty schedules for families';
COMMENT ON TABLE duty_assignments IS 'Duty assignments by time blocks';
COMMENT ON TABLE growth_measurements IS 'Table for storing growth measurements';
COMMENT ON TABLE push_subscriptions IS 'Table for storing push notification subscriptions';

COMMENT ON COLUMN family_inventory.portion_size_ounces IS 'Portion size in ounces (default 1.0)';
COMMENT ON COLUMN diapers.diaper_type IS 'Type of diaper change: Просто or Покакал';
COMMENT ON COLUMN baths.bath_mood IS 'Mood during bath: Спокойное купание or Беспокоился';
COMMENT ON COLUMN feedings.ounces IS 'Number of ounces during feeding (can be NULL)';
COMMENT ON COLUMN settings.wake_on_activity_enabled IS 'Automatically wake baby when recording any activity';
COMMENT ON COLUMN duty_schedules.block_duration_hours IS 'Duration of duty block in hours (1, 2, 3, 4, 6, 8)';
COMMENT ON COLUMN duty_schedules.start_hour_offset IS 'Start of day offset in hours (0-23)';
COMMENT ON COLUMN duty_assignments.block_id IS 'Time block identifier (format: "startHour-endHour")';
COMMENT ON COLUMN duty_assignments.parent_id IS 'ID of parent assigned to duty';
COMMENT ON COLUMN tetris_records.family_id IS 'Family ID';
COMMENT ON COLUMN tetris_records.user_id IS 'User ID (family member)';
COMMENT ON COLUMN tetris_records.player_name IS 'Player name';
COMMENT ON COLUMN tetris_records.score IS 'Game score';
COMMENT ON COLUMN tetris_records.level IS 'Reached level';
COMMENT ON COLUMN tetris_records.lines_cleared IS 'Number of cleared lines';
COMMENT ON COLUMN tetris_records.game_duration_seconds IS 'Game duration in seconds';
COMMENT ON COLUMN tetris_records.pieces_placed IS 'Number of placed pieces';
COMMENT ON COLUMN tetris_records.game_mode IS 'Game mode (classic, speed, etc.)';
COMMENT ON COLUMN tetris_records.created_at IS 'Record creation time';

COMMENT ON FUNCTION sync_family_sleep_status() IS 'Synchronizes sleep status between all family members';
COMMENT ON FUNCTION get_family_sleep_status(INTEGER) IS 'Returns current sleep status for the family';
COMMENT ON FUNCTION end_all_family_sleep_sessions(INTEGER, BIGINT) IS 'Ends all active sleep sessions for the family';
COMMENT ON FUNCTION wake_on_activity() IS 'Automatically ends sleep when recording activity, if setting is enabled';
COMMENT ON FUNCTION get_family_best_tetris_record(INTEGER) IS 'Returns best family Tetris record by score (earliest if equal scores)';

-- =====================================================
-- END OF SCHEMA
-- =====================================================

