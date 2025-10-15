РЅCREATE TRIGGER update_family_inventory_updated_at 
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

-- Таблица для хранения графиков дежурств семьи
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

-- Таблица для хранения назначений дежурств по блокам
CREATE TABLE IF NOT EXISTS duty_assignments (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    block_id TEXT NOT NULL,
    parent_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, block_id)
);

-- Триггеры для обновления updated_at
CREATE TRIGGER update_duty_schedules_updated_at 
    BEFORE UPDATE ON duty_schedules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_duty_assignments_updated_at 
    BEFORE UPDATE ON duty_assignments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_inventory_updated_at 
    BEFORE UPDATE ON family_inventory 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) РґР»СЏ Р±РµР·РѕРїР°СЃРЅРѕСЃС‚Рё
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

-- РџРѕР»РёС‚РёРєРё Р±РµР·РѕРїР°СЃРЅРѕСЃС‚Рё (СЂР°Р·СЂРµС€Р°РµРј РІСЃРµ РѕРїРµСЂР°С†РёРё РґР»СЏ Р°СѓС‚РµРЅС‚РёС„РёС†РёСЂРѕРІР°РЅРЅС‹С… РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№)
-- Р’ СЂРµР°Р»СЊРЅРѕРј РїСЂРѕРµРєС‚Рµ Р·РґРµСЃСЊ РґРѕР»Р¶РЅС‹ Р±С‹С‚СЊ Р±РѕР»РµРµ СЃС‚СЂРѕРіРёРµ РїРѕР»РёС‚РёРєРё
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

-- Р¤СѓРЅРєС†РёСЏ РґР»СЏ РїРѕР»СѓС‡РµРЅРёСЏ С‚РѕРї-10 СЂРµРєРѕСЂРґРѕРІ СЃРµРјСЊРё
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

-- Р¤СѓРЅРєС†РёСЏ РґР»СЏ РїРѕР»СѓС‡РµРЅРёСЏ Р»РёС‡РЅС‹С… СЂРµРєРѕСЂРґРѕРІ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
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

