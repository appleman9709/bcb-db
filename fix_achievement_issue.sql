-- Скрипт для проверки и исправления проблемы с достижением "Рекордсмен унций"
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Проверяем, существует ли достижение "Рекордсмен унций"
SELECT 
    'Проверка достижения "Рекордсмен унций"' as check_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Достижение существует'
        ELSE '❌ Достижение НЕ найдено'
    END as status,
    COUNT(*) as count
FROM achievements 
WHERE name ILIKE '%рекордсмен%' AND criteria->>'type' = 'max_ounces_record';

-- 2. Если достижение не найдено, добавляем его
INSERT INTO achievements (type_id, name, description, icon, color, rarity, points, coins_reward, criteria, is_active)
SELECT 
    6, -- type_id для детальных достижений
    'Рекордсмен унций',
    'Покормил 8 унций за одно кормление',
    '🏆',
    '#DDA0DD',
    'rare',
    50,
    30,
    '{"type": "max_ounces_record", "target": 8}',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM achievements 
    WHERE name = 'Рекордсмен унций' AND criteria->>'type' = 'max_ounces_record'
);

-- 3. Проверяем функцию check_and_award_achievements
SELECT 
    'Проверка функции check_and_award_achievements' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'check_and_award_achievements'
        ) THEN '✅ Функция существует'
        ELSE '❌ Функция НЕ найдена'
    END as status;

-- 4. Тестируем функцию с данными кормления (замените family_id и user_id на ваши)
-- SELECT * FROM check_and_award_achievements(
--     1,  -- ваш family_id
--     1,  -- ваш user_id  
--     'feeding',
--     '{"ounces": 8}'::JSONB
-- );

-- 5. Проверяем все достижения типа max_ounces_record
SELECT 
    id,
    name,
    description,
    criteria,
    points,
    coins_reward,
    rarity,
    is_active
FROM achievements 
WHERE criteria->>'type' = 'max_ounces_record'
ORDER BY id;
