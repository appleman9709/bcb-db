-- Скрипт для обновления базы данных с поддержкой синхронизации дежурств
-- Выполните этот скрипт в Supabase SQL Editor

-- Создание таблицы для хранения графиков дежурств семьи
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

-- Создание таблицы для хранения назначений дежурств по блокам
CREATE TABLE IF NOT EXISTS duty_assignments (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    block_id TEXT NOT NULL,
    parent_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, block_id)
);

-- Включение RLS для новых таблиц
ALTER TABLE duty_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_assignments ENABLE ROW LEVEL SECURITY;

-- Создание политик безопасности
CREATE POLICY "Enable all operations for authenticated users" ON duty_schedules FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON duty_assignments FOR ALL USING (true);

-- Создание триггеров для обновления updated_at
CREATE TRIGGER update_duty_schedules_updated_at 
    BEFORE UPDATE ON duty_schedules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_duty_assignments_updated_at 
    BEFORE UPDATE ON duty_assignments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_duty_schedules_family_id ON duty_schedules(family_id);
CREATE INDEX IF NOT EXISTS idx_duty_assignments_family_id ON duty_assignments(family_id);
CREATE INDEX IF NOT EXISTS idx_duty_assignments_block_id ON duty_assignments(block_id);

-- Комментарии для документации
COMMENT ON TABLE duty_schedules IS 'Графики дежурств для семей';
COMMENT ON TABLE duty_assignments IS 'Назначения дежурств по временным блокам';

COMMENT ON COLUMN duty_schedules.block_duration_hours IS 'Длительность блока дежурства в часах (1, 2, 3, 4, 6, 8)';
COMMENT ON COLUMN duty_schedules.start_hour_offset IS 'Смещение начала суток в часах (0-23)';
COMMENT ON COLUMN duty_assignments.block_id IS 'Идентификатор блока времени (формат: "startHour-endHour")';
COMMENT ON COLUMN duty_assignments.parent_id IS 'ID родителя, назначенного на дежурство';
