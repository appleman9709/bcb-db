-- SQL скрипт для создания таблицы рекордов тетриса
-- Выполните этот скрипт в Supabase SQL Editor

-- Таблица рекордов тетриса
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
    UNIQUE(family_id, user_id, score) -- Предотвращает дублирование одинаковых рекордов
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_tetris_records_family_id ON tetris_records(family_id);
CREATE INDEX IF NOT EXISTS idx_tetris_records_user_id ON tetris_records(user_id);
CREATE INDEX IF NOT EXISTS idx_tetris_records_score ON tetris_records(score DESC);
CREATE INDEX IF NOT EXISTS idx_tetris_records_created_at ON tetris_records(created_at DESC);

-- Включение Row Level Security (RLS) для безопасности
ALTER TABLE tetris_records ENABLE ROW LEVEL SECURITY;

-- Политика безопасности (разрешаем все операции для аутентифицированных пользователей)
CREATE POLICY "Enable all operations for authenticated users" ON tetris_records FOR ALL USING (true);

-- Функция для получения топ-10 рекордов семьи
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

-- Функция для получения личных рекордов пользователя
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

-- Функция для получения статистики тетриса семьи
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

-- Функция для получения статистики конкретного игрока
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

-- Функция для получения лучшего рекорда семьи
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

-- Комментарии к таблице и полям
COMMENT ON TABLE tetris_records IS 'Таблица рекордов игры тетрис для семей';
COMMENT ON COLUMN tetris_records.family_id IS 'ID семьи';
COMMENT ON COLUMN tetris_records.user_id IS 'ID пользователя (члена семьи)';
COMMENT ON COLUMN tetris_records.player_name IS 'Имя игрока';
COMMENT ON COLUMN tetris_records.score IS 'Счет игры';
COMMENT ON COLUMN tetris_records.level IS 'Достигнутый уровень';
COMMENT ON COLUMN tetris_records.lines_cleared IS 'Количество очищенных линий';
COMMENT ON COLUMN tetris_records.game_duration_seconds IS 'Длительность игры в секундах';
COMMENT ON COLUMN tetris_records.pieces_placed IS 'Количество размещенных фигур';
COMMENT ON COLUMN tetris_records.game_mode IS 'Режим игры (classic, speed, etc.)';
COMMENT ON COLUMN tetris_records.created_at IS 'Время создания записи';

-- Примеры использования функций:

-- Получить топ-10 рекордов семьи с ID = 1
-- SELECT * FROM get_family_tetris_records(1, 10);

-- Получить личные рекорды пользователя
-- SELECT * FROM get_user_tetris_records(1, '123456789', 5);

-- Получить статистику семьи
-- SELECT * FROM get_family_tetris_stats(1);

-- Получить статистику игрока
-- SELECT * FROM get_player_tetris_stats(1, '123456789');

-- Получить лучший рекорд семьи
-- SELECT * FROM get_family_best_tetris_record(1);

-- Получить все рекорды семьи с рангами
-- SELECT 
--     tr.*,
--     ROW_NUMBER() OVER (ORDER BY tr.score DESC, tr.created_at ASC) as rank
-- FROM tetris_records tr
-- WHERE tr.family_id = 1
-- ORDER BY tr.score DESC, tr.created_at ASC;
