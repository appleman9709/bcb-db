-- =====================================================
-- SECTION: ILLNESSES AND MEDICATIONS SYSTEM
-- =====================================================

-- Table for storing illnesses
CREATE TABLE IF NOT EXISTS illnesses (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    author_name TEXT,
    name TEXT NOT NULL,
    doctor_appointment_date TIMESTAMP WITH TIME ZONE,
    doctor_appointment_time TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing medications
CREATE TABLE IF NOT EXISTS medications (
    id SERIAL PRIMARY KEY,
    illness_id INTEGER NOT NULL REFERENCES illnesses(id) ON DELETE CASCADE,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    timing_type TEXT NOT NULL CHECK (timing_type IN ('before_meal', 'after_meal', 'during_meal', 'anytime')),
    times_per_day INTEGER NOT NULL CHECK (times_per_day > 0 AND times_per_day <= 10),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing medication reminders (extends scheduled_reminders concept)
CREATE TABLE IF NOT EXISTS medication_reminders (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    illness_id INTEGER NOT NULL REFERENCES illnesses(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'completed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for optimization
CREATE INDEX IF NOT EXISTS idx_illnesses_family_id ON illnesses(family_id);
CREATE INDEX IF NOT EXISTS idx_illnesses_is_active ON illnesses(is_active);
CREATE INDEX IF NOT EXISTS idx_illnesses_created_at ON illnesses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_illnesses_family_active ON illnesses(family_id, is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_medications_illness_id ON medications(illness_id);
CREATE INDEX IF NOT EXISTS idx_medications_family_id ON medications(family_id);
CREATE INDEX IF NOT EXISTS idx_medications_start_date ON medications(start_date);
CREATE INDEX IF NOT EXISTS idx_medications_end_date ON medications(end_date);

CREATE INDEX IF NOT EXISTS idx_medication_reminders_family ON medication_reminders(family_id);
CREATE INDEX IF NOT EXISTS idx_medication_reminders_medication ON medication_reminders(medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_reminders_status ON medication_reminders(status);
CREATE INDEX IF NOT EXISTS idx_medication_reminders_time ON medication_reminders(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_medication_reminders_pending ON medication_reminders(status, scheduled_time) 
    WHERE status = 'pending';

-- Triggers for automatic updated_at
CREATE OR REPLACE FUNCTION update_illnesses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_illnesses_updated_at
    BEFORE UPDATE ON illnesses
    FOR EACH ROW
    EXECUTE FUNCTION update_illnesses_updated_at();

CREATE OR REPLACE FUNCTION update_medications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_medications_updated_at
    BEFORE UPDATE ON medications
    FOR EACH ROW
    EXECUTE FUNCTION update_medications_updated_at();

CREATE OR REPLACE FUNCTION update_medication_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_medication_reminders_updated_at
    BEFORE UPDATE ON medication_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_medication_reminders_updated_at();

-- RLS policies
ALTER TABLE illnesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_reminders ENABLE ROW LEVEL SECURITY;

-- Simplified policies (same as other tables)
CREATE POLICY "Enable all operations for authenticated users" 
    ON illnesses 
    FOR ALL 
    USING (true);

CREATE POLICY "Enable all operations for authenticated users" 
    ON medications 
    FOR ALL 
    USING (true);

CREATE POLICY "Enable all operations for authenticated users" 
    ON medication_reminders 
    FOR ALL 
    USING (true);

-- Comments
COMMENT ON TABLE illnesses IS 'Таблица для хранения болезней/проблем малыша';
COMMENT ON COLUMN illnesses.family_id IS 'ID семьи';
COMMENT ON COLUMN illnesses.name IS 'Название заболевания';
COMMENT ON COLUMN illnesses.doctor_appointment_date IS 'Дата записи к врачу';
COMMENT ON COLUMN illnesses.doctor_appointment_time IS 'Время записи к врачу';
COMMENT ON COLUMN illnesses.is_active IS 'Активна ли болезнь (можно иметь несколько одновременно)';

COMMENT ON TABLE medications IS 'Таблица для хранения лекарств/мазей для лечения болезней';
COMMENT ON COLUMN medications.illness_id IS 'ID болезни, для которой назначено лекарство';
COMMENT ON COLUMN medications.name IS 'Название лекарства/мази';
COMMENT ON COLUMN medications.timing_type IS 'Время приема: before_meal (перед едой), after_meal (после еды), during_meal (во время еды), anytime (неважно)';
COMMENT ON COLUMN medications.times_per_day IS 'Количество раз в день';
COMMENT ON COLUMN medications.duration_days IS 'Количество дней приема';
COMMENT ON COLUMN medications.start_date IS 'Дата начала приема';
COMMENT ON COLUMN medications.end_date IS 'Дата окончания приема';

COMMENT ON TABLE medication_reminders IS 'Таблица для хранения запланированных напоминаний о приеме лекарств';
COMMENT ON COLUMN medication_reminders.scheduled_time IS 'Время, когда должно быть отправлено напоминание';
COMMENT ON COLUMN medication_reminders.status IS 'Статус напоминания: pending (ожидает), sent (отправлено), cancelled (отменено), completed (выполнено)';

