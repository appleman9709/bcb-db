-- Функция для отправки пуш-уведомлений о достижениях
-- Эта функция отправляет уведомления всем членам семьи о новых достижениях

CREATE OR REPLACE FUNCTION send_achievement_notifications(
    family_id_param INTEGER,
    achievement_data JSONB
)
RETURNS TABLE (
    notification_sent BOOLEAN,
    user_id BIGINT,
    user_name TEXT,
    message TEXT
) AS $$
DECLARE
    family_member RECORD;
    achievement_name TEXT;
    achievement_points INTEGER;
    achievement_coins INTEGER;
    achievement_rarity TEXT;
    notification_message TEXT;
BEGIN
    -- Извлекаем данные о достижении
    achievement_name := achievement_data->>'achievement_name';
    achievement_points := (achievement_data->>'points')::INTEGER;
    achievement_coins := (achievement_data->>'coins_reward')::INTEGER;
    achievement_rarity := achievement_data->>'rarity';
    
    -- Формируем сообщение
    notification_message := '🎉 Поздравляем! Получено достижение: ' || achievement_name || 
                          ' (' || achievement_points || ' очков, ' || achievement_coins || ' монет)';
    
    -- Проходим по всем членам семьи
    FOR family_member IN 
        SELECT fm.user_id, fm.name, fm.role
        FROM family_members fm
        WHERE fm.family_id = family_id_param
    LOOP
        -- Здесь можно добавить логику отправки пуш-уведомлений
        -- Например, через Supabase Edge Functions или внешний сервис
        
        -- Пока что просто возвращаем информацию о том, что уведомление должно быть отправлено
        notification_sent := TRUE;
        user_id := family_member.user_id;
        user_name := family_member.name;
        message := notification_message;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения уведомлений о достижениях для конкретного пользователя
CREATE OR REPLACE FUNCTION get_achievement_notifications(
    family_id_param INTEGER,
    user_id_param BIGINT,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    achievement_id INTEGER,
    achievement_name TEXT,
    achievement_description TEXT,
    icon TEXT,
    color TEXT,
    rarity TEXT,
    points INTEGER,
    coins_reward INTEGER,
    earned_at TIMESTAMP WITH TIME ZONE,
    is_new BOOLEAN
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
        ua.earned_at,
        CASE 
            WHEN ua.earned_at >= NOW() - INTERVAL '1 hour' THEN TRUE
            ELSE FALSE
        END as is_new
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.family_id = family_id_param 
      AND ua.user_id = user_id_param
    ORDER BY ua.earned_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Сообщение об успешном создании функций
SELECT 'Функции для уведомлений о достижениях созданы!' as message;
