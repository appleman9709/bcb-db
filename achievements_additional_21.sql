-- Дополнительные 21 достижение для системы BabyBot
-- Выполните этот скрипт в Supabase SQL Editor после achievements_data.sql

-- Вставка дополнительных достижений
INSERT INTO achievements (type_id, name, description, icon, color, rarity, points, coins_reward, criteria) VALUES

-- Серии (Streaks) 🔥 - 4 новых достижения
(1, 'Сонный ритм', 'Уложил малыша спать 3 раза подряд', '😴', '#FF6B6B', 'common', 15, 8, '{"type": "sleep_streak", "target": 3, "timeframe": "day"}'),
(1, 'Активный день', 'Записал активность 5 раз подряд', '🏃', '#FF6B6B', 'rare', 20, 12, '{"type": "activity_streak", "target": 5, "timeframe": "day"}'),
(1, 'Купальный мастер', 'Искупал малыша 3 раза подряд', '🛁', '#FF6B6B', 'rare', 25, 15, '{"type": "bath_streak", "target": 3, "timeframe": "day"}'),
(1, 'Недельная серия', 'Выполнял одно действие каждый день недели', '📅', '#FF6B6B', 'epic', 100, 60, '{"type": "weekly_streak", "target": 7, "timeframe": "week"}'),

-- Комбо и последовательности ⚡ - 4 новых достижения
(2, 'Тройное комбо', 'Кормление → Подгузник → Сон за 30 минут', '⚡', '#4ECDC4', 'rare', 40, 25, '{"type": "combo", "target": 3, "timeframe": "30_minutes", "actions": ["feeding", "diaper", "sleep"]}'),
(2, 'Утренний ритуал', 'Кормление → Активность → Купание утром', '🌅', '#4ECDC4', 'rare', 35, 20, '{"type": "morning_combo", "target": 3, "timeframe": "2_hours", "actions": ["feeding", "activity", "bath"], "time_window": "06:00-12:00"}'),
(2, 'Вечерний ритуал', 'Купание → Кормление → Сон вечером', '🌙', '#4ECDC4', 'rare', 45, 30, '{"type": "evening_combo", "target": 3, "timeframe": "2_hours", "actions": ["bath", "feeding", "sleep"], "time_window": "18:00-24:00"}'),
(2, 'Экспресс-уход', '4 действия за 45 минут', '⚡', '#4ECDC4', 'epic', 80, 50, '{"type": "combo", "target": 4, "timeframe": "45_minutes", "actions": ["feeding", "diaper", "bath", "activity"]}'),

-- Окна времени ⏰ - 4 новых достижения
(3, 'Дневной сон', 'Уложил спать между 12:00 и 15:00', '😴', '#45B7D1', 'common', 15, 8, '{"type": "time_window", "action": "sleep", "start_time": "12:00", "end_time": "15:00"}'),
(3, 'Вечерняя прогулка', 'Активность между 18:00 и 20:00', '🚶', '#45B7D1', 'common', 20, 12, '{"type": "time_window", "action": "activity", "start_time": "18:00", "end_time": "20:00"}'),
(3, 'Завтрак чемпион', 'Первое кормление до 8:00', '🍳', '#45B7D1', 'rare', 25, 15, '{"type": "time_window", "action": "feeding", "start_time": "00:00", "end_time": "08:00", "first_of_day": true}'),
(3, 'Полуночный перекус', 'Кормление в 00:00-02:00', '🌙', '#45B7D1', 'epic', 60, 40, '{"type": "time_window", "action": "feeding", "start_time": "00:00", "end_time": "02:00"}'),

-- Ритм и равномерность 🎵 - 3 новых достижения
(4, 'Идеальные интервалы', 'Кормления каждые 2.5 часа 6 раз', '⏰', '#96CEB4', 'epic', 70, 45, '{"type": "rhythm", "action": "feeding", "interval_hours": 2.5, "target_count": 6, "tolerance_minutes": 15}'),
(4, 'Ритм сна', 'Укладывал спать каждые 4 часа 4 раза', '😴', '#96CEB4', 'rare', 50, 30, '{"type": "rhythm", "action": "sleep", "interval_hours": 4, "target_count": 4, "tolerance_minutes": 30}'),
(4, 'Равномерная активность', 'Активности каждые 3 часа 5 раз', '🏃', '#96CEB4', 'rare', 40, 25, '{"type": "rhythm", "action": "activity", "interval_hours": 3, "target_count": 5, "tolerance_minutes": 20}'),

-- Обучающие/мягкие 📚 - 3 новых достижения
(5, 'Первая неделя', 'Записывал действия 7 дней подряд', '📅', '#FFEAA7', 'rare', 75, 45, '{"type": "consistency", "days": 7, "consecutive": true}'),
(5, 'Дневник заботы', 'Записал 50 действий', '📝', '#FFEAA7', 'epic', 100, 60, '{"type": "total_actions", "target": 50}'),
(5, 'Семейный рекорд', 'Все члены семьи получили достижение', '👨‍👩‍👧‍👦', '#FFEAA7', 'epic', 150, 90, '{"type": "family_achievement", "all_members": true}'),

-- Редкие/коллекционные 💎 - 3 новых достижения
(6, 'Мастер времени', 'Все кормления в идеальное время 10 раз', '⏰', '#DDA0DD', 'legendary', 250, 150, '{"type": "perfect_timing", "action": "feeding", "tolerance_minutes": 5, "streak": 10}'),
(6, 'Коллекционер', 'Получил 25 достижений', '🏆', '#DDA0DD', 'legendary', 400, 250, '{"type": "total_count", "target": 25}'),
(6, 'Легенда ухода', 'Получил все достижения серий', '👑', '#DDA0DD', 'legendary', 500, 300, '{"type": "collection_complete", "achievement_type": "streaks"}');

-- Сообщение об успешном добавлении
SELECT '21 дополнительных достижения успешно добавлены!' as message;
