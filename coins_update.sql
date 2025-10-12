-- Обновления для системы монеток родителей
-- Этот файл содержит только изменения, необходимые для добавления функциональности монеток

-- Создание таблицы монеток родителей
CREATE TABLE IF NOT EXISTS parent_coins (
    id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    feeding_coins INTEGER DEFAULT 0,
    diaper_coins INTEGER DEFAULT 0,
    bath_coins INTEGER DEFAULT 0,
    mom_coins INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_parent_coins_family_id ON parent_coins(family_id);
CREATE INDEX IF NOT EXISTS idx_parent_coins_user_id ON parent_coins(user_id);

-- Триггер для автоматического обновления updated_at в таблице parent_coins
CREATE TRIGGER update_parent_coins_updated_at 
    BEFORE UPDATE ON parent_coins 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Включение Row Level Security (RLS) для безопасности
ALTER TABLE parent_coins ENABLE ROW LEVEL SECURITY;

-- Политика безопасности для таблицы parent_coins
CREATE POLICY "Enable all operations for authenticated users" ON parent_coins FOR ALL USING (true);

-- Комментарии к таблице и полям
COMMENT ON TABLE parent_coins IS 'Таблица для хранения монеток каждого родителя в семье';
COMMENT ON COLUMN parent_coins.family_id IS 'ID семьи';
COMMENT ON COLUMN parent_coins.user_id IS 'ID пользователя (родителя)';
COMMENT ON COLUMN parent_coins.feeding_coins IS 'Количество монеток за кормление';
COMMENT ON COLUMN parent_coins.diaper_coins IS 'Количество монеток за смену подгузника';
COMMENT ON COLUMN parent_coins.bath_coins IS 'Количество монеток за купание';
COMMENT ON COLUMN parent_coins.mom_coins IS 'Количество обычных монеток';
COMMENT ON COLUMN parent_coins.total_score IS 'Общий счет очков (монетки * 10)';
