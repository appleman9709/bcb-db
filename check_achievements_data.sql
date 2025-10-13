-- Проверка данных в таблице достижений
-- Этот скрипт проверяет, есть ли достижения в базе данных

-- Проверяем количество достижений
SELECT 
    'achievements' as table_name,
    COUNT(*) as count
FROM achievements
WHERE is_active = TRUE;

-- Проверяем достижения для смены подгузников
SELECT 
    id,
    name,
    description,
    criteria,
    rarity,
    points,
    coins_reward
FROM achievements
WHERE is_active = TRUE 
  AND criteria->>'type' = 'diaper_streak'
ORDER BY points;

-- Проверяем типы достижений
SELECT 
    id,
    name,
    description,
    icon,
    color
FROM achievement_types
ORDER BY id;

-- Проверяем, есть ли записи в таблице diapers
SELECT 
    'diapers' as table_name,
    COUNT(*) as count,
    MAX(timestamp) as latest_record
FROM diapers;

-- Проверяем последние записи смены подгузников
SELECT 
    id,
    family_id,
    timestamp,
    created_at
FROM diapers
ORDER BY timestamp DESC
LIMIT 5;
