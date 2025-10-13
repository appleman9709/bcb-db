-- Тестирование функции достижений
-- Этот скрипт тестирует работу функции check_and_award_achievements

-- Тестируем функцию для смены подгузника
-- Замените family_id_param и user_id_param на реальные значения из вашей базы данных
DO $$
DECLARE
    test_family_id INTEGER := 1; -- Замените на реальный ID семьи
    test_user_id BIGINT := 1;    -- Замените на реальный ID пользователя
    result RECORD;
    achievement_count INTEGER := 0;
BEGIN
    -- Вызываем функцию для тестирования достижений смены подгузника
    FOR result IN 
        SELECT * FROM check_and_award_achievements(
            test_family_id,
            test_user_id,
            'diaper',
            '{}'::JSONB
        )
    LOOP
        achievement_count := achievement_count + 1;
        RAISE NOTICE 'Получено достижение: % (ID: %, Очки: %, Монеты: %, Редкость: %)', 
            result.achievement_name, 
            result.achievement_id, 
            result.points, 
            result.coins_reward, 
            result.rarity;
    END LOOP;
    
    IF achievement_count = 0 THEN
        RAISE NOTICE 'Достижения не получены. Проверьте данные в таблицах.';
    ELSE
        RAISE NOTICE 'Всего получено достижений: %', achievement_count;
    END IF;
END $$;

-- Проверяем количество записей смены подгузников за последний день
SELECT 
    'diapers_last_day' as check_type,
    COUNT(*) as count,
    family_id
FROM diapers
WHERE timestamp >= NOW() - INTERVAL '1 day'
GROUP BY family_id;

-- Проверяем все достижения пользователя
SELECT 
    ua.achievement_id,
    a.name,
    a.description,
    a.rarity,
    a.points,
    a.coins_reward,
    ua.earned_at
FROM user_achievements ua
JOIN achievements a ON ua.achievement_id = a.id
ORDER BY ua.earned_at DESC
LIMIT 10;
