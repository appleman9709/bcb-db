-- Начальные данные для системы достижений BabyBot
-- Этот скрипт заполняет таблицы базовыми типами достижений и достижениями

-- Вставка типов достижений
INSERT INTO achievement_types (name, description, icon, color) VALUES
('Серии (Streaks)', 'Достижения за регулярные действия подряд', '🔥', '#FF6B6B'),
('Комбо и последовательности', 'Достижения за комбинации действий', '⚡', '#4ECDC4'),
('Окна времени', 'Достижения за действия в определенное время', '⏰', '#45B7D1'),
('Ритм и равномерность', 'Достижения за равномерный уход', '🎵', '#96CEB4'),
('Обучающие/мягкие', 'Достижения для поощрения обучения', '📚', '#FFEAA7'),
('Редкие/коллекционные', 'Особые и редкие достижения', '💎', '#DDA0DD')
ON CONFLICT (name) DO NOTHING;

-- Вставка достижений
INSERT INTO achievements (type_id, name, description, icon, color, rarity, points, coins_reward, criteria) VALUES
-- Серии кормления
(1, 'Первые шаги', 'Покормил малыша 3 раза подряд', '🍼', '#FF6B6B', 'common', 10, 5, '{"type": "feeding_streak", "target": 3, "timeframe": "day"}'),
(1, 'Регулярный уход', 'Покормил малыша 5 раз подряд', '🍼', '#FF6B6B', 'rare', 25, 15, '{"type": "feeding_streak", "target": 5, "timeframe": "day"}'),
(1, 'Мастер кормления', 'Покормил малыша 7 раз подряд', '🍼', '#FF6B6B', 'epic', 50, 30, '{"type": "feeding_streak", "target": 7, "timeframe": "day"}'),
(1, 'Легенда кормления', 'Покормил малыша 10 раз подряд', '🍼', '#FF6B6B', 'legendary', 100, 60, '{"type": "feeding_streak", "target": 10, "timeframe": "day"}'),

-- Серии смены подгузников
(1, 'Чистюля', 'Сменил подгузник 3 раза подряд', '👶', '#4ECDC4', 'common', 10, 5, '{"type": "diaper_streak", "target": 3, "timeframe": "day"}'),
(1, 'Заботливый родитель', 'Сменил подгузник 5 раз подряд', '👶', '#4ECDC4', 'rare', 25, 15, '{"type": "diaper_streak", "target": 5, "timeframe": "day"}'),
(1, 'Эксперт по подгузникам', 'Сменил подгузник 7 раз подряд', '👶', '#4ECDC4', 'epic', 50, 30, '{"type": "diaper_streak", "target": 7, "timeframe": "day"}'),
(1, 'Мастер чистоты', 'Сменил подгузник 10 раз подряд', '👶', '#4ECDC4', 'legendary', 100, 60, '{"type": "diaper_streak", "target": 10, "timeframe": "day"}'),

-- Комбо достижения
(2, 'Быстрая реакция', 'Сменил подгузник и покормил в течение 15 минут', '⚡', '#FFD700', 'common', 15, 10, '{"type": "combo", "target": 2, "timeframe": "15_minutes", "actions": ["diaper", "feeding"]}'),
(2, 'Супер комбо', 'Выполнил 3 разных действия в течение 30 минут', '⚡', '#FFD700', 'rare', 35, 25, '{"type": "combo", "target": 3, "timeframe": "30_minutes", "actions": ["diaper", "feeding", "bath"]}'),
(2, 'Мастер комбо', 'Выполнил 4 разных действия в течение 1 часа', '⚡', '#FFD700', 'epic', 75, 50, '{"type": "combo", "target": 4, "timeframe": "1_hour", "actions": ["diaper", "feeding", "bath", "activity"]}'),
(2, 'Легендарное комбо', 'Выполнил 5 разных действий в течение 2 часов', '⚡', '#FFD700', 'legendary', 150, 100, '{"type": "combo", "target": 5, "timeframe": "2_hours", "actions": ["diaper", "feeding", "bath", "activity", "sleep"]}'),

-- Окна времени
(3, 'Ранняя пташка', 'Покормил малыша до 7 утра', '🌅', '#45B7D1', 'common', 10, 5, '{"type": "time_window", "action": "feeding", "start_time": "00:00", "end_time": "07:00"}'),
(3, 'Ночной страж', 'Покормил малыша между 22:00 и 06:00', '🌙', '#45B7D1', 'rare', 25, 15, '{"type": "time_window", "action": "feeding", "start_time": "22:00", "end_time": "06:00"}'),
(3, 'Полночный герой', 'Сменил подгузник между 00:00 и 03:00', '🌙', '#45B7D1', 'epic', 50, 30, '{"type": "time_window", "action": "diaper", "start_time": "00:00", "end_time": "03:00"}'),

-- Ритм и равномерность
(4, 'Ритмичный уход', 'Кормил малыша каждые 3 часа в течение дня', '🎵', '#96CEB4', 'rare', 30, 20, '{"type": "rhythm", "action": "feeding", "interval_hours": 3, "target_count": 5}'),
(4, 'Идеальный ритм', 'Кормил малыша каждые 2.5 часа в течение дня', '🎵', '#96CEB4', 'epic', 60, 40, '{"type": "rhythm", "action": "feeding", "interval_hours": 2.5, "target_count": 6}'),
(4, 'Мастер ритма', 'Кормил малыша каждые 2 часа в течение дня', '🎵', '#96CEB4', 'legendary', 120, 80, '{"type": "rhythm", "action": "feeding", "interval_hours": 2, "target_count": 8}'),

-- Обучающие/мягкие
(5, 'Первый день', 'Записал первое кормление', '🌟', '#FFEAA7', 'common', 5, 3, '{"type": "first_action", "action": "feeding"}'),
(5, 'Начало пути', 'Записал первую смену подгузника', '🌟', '#FFEAA7', 'common', 5, 3, '{"type": "first_action", "action": "diaper"}'),
(5, 'Первое купание', 'Записал первое купание', '🌟', '#FFEAA7', 'common', 5, 3, '{"type": "first_action", "action": "bath"}'),
(5, 'Первая активность', 'Записал первую активность', '🌟', '#FFEAA7', 'common', 5, 3, '{"type": "first_action", "action": "activity"}'),
(5, 'Неделя заботы', 'Вел учет в течение 7 дней', '📅', '#FFEAA7', 'rare', 50, 30, '{"type": "consistency", "days": 7}'),
(5, 'Месяц заботы', 'Вел учет в течение 30 дней', '📅', '#FFEAA7', 'epic', 200, 120, '{"type": "consistency", "days": 30}'),

-- Редкие/коллекционные
(6, 'Золотая рука', 'Кормил малыша ровно в назначенное время 5 раз подряд', '👑', '#DDA0DD', 'legendary', 200, 150, '{"type": "perfect_timing", "action": "feeding", "tolerance_minutes": 5, "streak": 5}'),
(6, 'Кристальная чистота', 'Сменил подгузник сразу после кормления 10 раз подряд', '💎', '#DDA0DD', 'legendary', 300, 200, '{"type": "perfect_sequence", "sequence": ["feeding", "diaper"], "streak": 10}'),
(6, 'Мастер всех дел', 'Получил все достижения одного типа', '🏆', '#DDA0DD', 'legendary', 500, 300, '{"type": "collection_complete", "achievement_type": "all"}'),
(6, 'Легенда семьи', 'Получил 50 достижений', '👑', '#DDA0DD', 'legendary', 1000, 500, '{"type": "total_count", "target": 50}'),
(6, 'Император заботы', 'Получил 100 достижений', '👑', '#DDA0DD', 'legendary', 2000, 1000, '{"type": "total_count", "target": 100}');

-- Создание начальной статистики для существующих семей
INSERT INTO family_achievement_stats (family_id, total_achievements, total_points, total_coins_earned)
SELECT id, 0, 0, 0
FROM families
WHERE id NOT IN (SELECT family_id FROM family_achievement_stats)
ON CONFLICT (family_id) DO NOTHING;
