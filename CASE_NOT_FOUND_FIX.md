# Исправление ошибки "case not found"

## Проблема
Ошибка "case not found" возникает в SQL функциях, когда в CASE выражении не обрабатывается какой-то случай, который встречается в данных.

## Причина
В функциях достижений были CASE выражения, которые не обрабатывали все возможные типы достижений:
- `feeding_streak`, `diaper_streak`, `sleep_streak`, `activity_streak`, `bath_streak`
- `combo`, `morning_combo`, `evening_combo`
- `time_window`, `rhythm`, `consistency`
- `total_actions`, `family_achievement`, `perfect_timing`
- `perfect_sequence`, `total_count`, `collection_complete`
- `first_action`, `weekly_streak`

Когда функция встречала неизвестный тип достижения, PostgreSQL выдавал ошибку "case not found".

## Решение

### Выполните исправленный скрипт
Запустите файл `fix_case_not_found.sql` в Supabase SQL Editor.

### Что исправлено:
1. ✅ **Добавлена обработка всех типов достижений** из базы данных
2. ✅ **Добавлены ELSE ветки** для предотвращения ошибок
3. ✅ **Добавлена обработка неизвестных типов действий** в под-CASE выражениях
4. ✅ **Упрощена функция проверки истории** для стабильности

### Примеры исправлений:

#### Было (неправильно):
```sql
CASE achievement_record.criteria->>'type'
    WHEN 'feeding_streak' THEN
        -- обработка
    WHEN 'diaper_streak' THEN
        -- обработка
    -- НЕТ ELSE ветки!
END CASE;
```

#### Стало (правильно):
```sql
CASE achievement_record.criteria->>'type'
    WHEN 'feeding_streak' THEN
        -- обработка
    WHEN 'diaper_streak' THEN
        -- обработка
    WHEN 'sleep_streak' THEN
        -- обработка
    WHEN 'activity_streak' THEN
        -- обработка
    WHEN 'bath_streak' THEN
        -- обработка
    WHEN 'combo' THEN
        -- обработка
    WHEN 'time_window' THEN
        -- обработка
    WHEN 'rhythm' THEN
        -- обработка
    WHEN 'consistency' THEN
        -- обработка
    WHEN 'first_action' THEN
        -- обработка
    -- ... все остальные типы
    ELSE
        -- Неизвестный тип достижения - не обрабатываем
        is_completed := FALSE;
END CASE;
```

## Добавленные типы достижений:

### Основные серии:
- ✅ `feeding_streak` - серии кормлений
- ✅ `diaper_streak` - серии смен подгузников
- ✅ `sleep_streak` - серии записей сна
- ✅ `activity_streak` - серии активностей
- ✅ `bath_streak` - серии купаний
- ✅ `weekly_streak` - недельные серии

### Комбо достижения:
- ✅ `combo` - обычные комбо
- ✅ `morning_combo` - утренние комбо
- ✅ `evening_combo` - вечерние комбо

### Специальные достижения:
- ✅ `time_window` - временные окна
- ✅ `rhythm` - ритм действий
- ✅ `consistency` - консистентность
- ✅ `total_actions` - общее количество действий
- ✅ `family_achievement` - семейные достижения
- ✅ `perfect_timing` - идеальное время
- ✅ `perfect_sequence` - идеальная последовательность
- ✅ `total_count` - общее количество достижений
- ✅ `collection_complete` - завершение коллекции
- ✅ `first_action` - первые действия

## Проверка исправления:

После выполнения скрипта проверьте:

1. **Тестирование функции достижений:**
```sql
SELECT * FROM check_and_award_achievements(1, 1, 'diaper', '{}'::JSONB);
```

2. **Тестирование проверки истории:**
```sql
SELECT * FROM check_family_history_and_award_achievements(1);
```

3. **Проверка всех типов достижений:**
```sql
SELECT DISTINCT criteria->>'type' as achievement_type, COUNT(*) as count
FROM achievements 
WHERE is_active = TRUE
GROUP BY criteria->>'type'
ORDER BY count DESC;
```

## Ожидаемый результат:
- ✅ **Ошибки "case not found" больше не возникают**
- ✅ **Все типы достижений обрабатываются корректно**
- ✅ **Функции работают стабильно с любыми данными**
- ✅ **Система достижений функционирует без ошибок**

## Если проблема остается:
1. Проверьте, что скрипт выполнился полностью
2. Убедитесь, что старые функции были удалены
3. Проверьте логи Supabase на наличие других ошибок
4. Убедитесь, что все таблицы существуют и имеют правильную структуру
5. Проверьте, что в базе данных есть достижения с различными типами
