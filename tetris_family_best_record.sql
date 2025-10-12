-- SQL скрипт для добавления функции получения лучшего рекорда семьи
-- Выполните этот скрипт в Supabase SQL Editor

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

-- Комментарий к функции
COMMENT ON FUNCTION get_family_best_tetris_record(INTEGER) IS 'Возвращает лучший рекорд семьи по счету (при равных счетах выбирается самый ранний)';

-- Пример использования:
-- SELECT * FROM get_family_best_tetris_record(1);
