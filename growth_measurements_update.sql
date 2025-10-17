-- SQL СЃРєСЂРёРїС‚ РґР»СЏ СЃРѕР·РґР°РЅРёСЏ С‚Р°Р±Р»РёС†С‹ РёР·РјРµСЂРµРЅРёР№ СЂРѕСЃС‚Р° Рё РІРµСЃР°
-- Р’С‹РїРѕР»РЅРёС‚Рµ СЌС‚РѕС‚ СЃРєСЂРёРїС‚ РІ Supabase SQL Editor

-- РўР°Р±Р»РёС†Р° РґР»СЏ С…СЂР°РЅРµРЅРёСЏ РёР·РјРµСЂРµРЅРёР№ СЂРѕСЃС‚Р° Рё РІРµСЃР°
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

-- РРЅРґРµРєСЃС‹ РґР»СЏ РѕРїС‚РёРјРёР·Р°С†РёРё Р·Р°РїСЂРѕСЃРѕРІ
CREATE INDEX IF NOT EXISTS idx_growth_measurements_family_id ON growth_measurements(family_id);
CREATE INDEX IF NOT EXISTS idx_growth_measurements_user_id ON growth_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_growth_measurements_type ON growth_measurements(measurement_type);
CREATE INDEX IF NOT EXISTS idx_growth_measurements_month ON growth_measurements(month);
CREATE INDEX IF NOT EXISTS idx_growth_measurements_created_at ON growth_measurements(created_at DESC);
-- Guarantee the user_id column supports UUID/text identifiers from Supabase auth
ALTER TABLE growth_measurements
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Р’РєР»СЋС‡РµРЅРёРµ Row Level Security (RLS) РґР»СЏ Р±РµР·РѕРїР°СЃРЅРѕСЃС‚Рё
ALTER TABLE growth_measurements ENABLE ROW LEVEL SECURITY;

-- РџРѕР»РёС‚РёРєР° Р±РµР·РѕРїР°СЃРЅРѕСЃС‚Рё (СЂР°Р·СЂРµС€Р°РµРј РІСЃРµ РѕРїРµСЂР°С†РёРё РґР»СЏ Р°СѓС‚РµРЅС‚РёС„РёС†РёСЂРѕРІР°РЅРЅС‹С… РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№)
CREATE POLICY "Enable all operations for authenticated users" ON growth_measurements FOR ALL USING (true);

-- РўСЂРёРіРіРµСЂ РґР»СЏ РѕР±РЅРѕРІР»РµРЅРёСЏ updated_at
CREATE TRIGGER update_growth_measurements_updated_at 
    BEFORE UPDATE ON growth_measurements 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Р¤СѓРЅРєС†РёСЏ РґР»СЏ РїРѕР»СѓС‡РµРЅРёСЏ РёР·РјРµСЂРµРЅРёР№ СЂРѕСЃС‚Р° СЃРµРјСЊРё
-- Drop legacy versions before recreating functions
DROP FUNCTION IF EXISTS get_family_growth_measurements(INTEGER, TEXT);
DROP FUNCTION IF EXISTS add_growth_measurement(INTEGER, BIGINT, TEXT, INTEGER, DECIMAL, TEXT);
DROP FUNCTION IF EXISTS add_growth_measurement(INTEGER, BIGINT, TEXT, INTEGER, DECIMAL);
DROP FUNCTION IF EXISTS add_growth_measurement(INTEGER, TEXT, TEXT, INTEGER, DECIMAL, TEXT);
DROP FUNCTION IF EXISTS add_growth_measurement(INTEGER, TEXT, TEXT, INTEGER, DECIMAL);
DROP FUNCTION IF EXISTS add_growth_measurement CASCADE;
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

-- РЈРґР°Р»РµРЅРёРµ РІСЃРµС… РІРѕР·РјРѕР¶РЅС‹С… РІРµСЂСЃРёР№ С„СѓРЅРєС†РёРё

-- Р¤СѓРЅРєС†РёСЏ РґР»СЏ РґРѕР±Р°РІР»РµРЅРёСЏ РёР·РјРµСЂРµРЅРёСЏ СЂРѕСЃС‚Р°/РІРµСЃР°
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
    -- РЎРЅР°С‡Р°Р»Р° РїС‹С‚Р°РµРјСЃСЏ РѕР±РЅРѕРІРёС‚СЊ СЃСѓС‰РµСЃС‚РІСѓСЋС‰СѓСЋ Р·Р°РїРёСЃСЊ
    UPDATE growth_measurements AS gm
    SET 
        value = p_value,
        recorded_by = p_recorded_by,
        updated_at = NOW()
    WHERE gm.family_id = p_family_id 
      AND gm.measurement_type = p_measurement_type 
      AND gm.month = p_month;
    
    -- Р•СЃР»Рё Р·Р°РїРёСЃСЊ РЅРµ Р±С‹Р»Р° РѕР±РЅРѕРІР»РµРЅР°, СЃРѕР·РґР°РµРј РЅРѕРІСѓСЋ
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
    
    -- Р’РѕР·РІСЂР°С‰Р°РµРј РґР°РЅРЅС‹Рµ РёР· С‚Р°Р±Р»РёС†С‹
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

-- Р¤СѓРЅРєС†РёСЏ РґР»СЏ СѓРґР°Р»РµРЅРёСЏ РёР·РјРµСЂРµРЅРёСЏ СЂРѕСЃС‚Р°/РІРµСЃР°
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
