-- Исправление функции get_family_achievement_stats
-- Выполните этот скрипт в Supabase SQL Editor

DROP FUNCTION IF EXISTS get_family_achievement_stats(INTEGER);

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
        top_achiever.achievement_count::INTEGER
    FROM family_achievement_stats fas
    LEFT JOIN (
        SELECT 
            ua.user_id,
            fm.name,
            COUNT(*)::INTEGER as achievement_count,
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

-- Сообщение об успешном исправлении
SELECT 'Функция get_family_achievement_stats исправлена!' as message;
