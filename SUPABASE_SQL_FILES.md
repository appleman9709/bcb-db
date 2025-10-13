# SQL файлы для выполнения в Supabase

## Обязательные файлы (выполнить в порядке):

### 1. Основная функция достижений
**`fix_case_not_found.sql`**
- Исправляет все ошибки "case not found"
- Добавляет обработку всех типов достижений
- Включает функции `check_and_award_achievements` и `check_family_history_and_award_achievements`

### 2. Функции уведомлений
**`achievement_notifications.sql`**
- Добавляет функцию `get_achievement_notifications`
- Добавляет функцию `send_achievement_notifications`

## Дополнительные файлы (если нужно):

### 3. Полная схема достижений (если таблицы не созданы)
**`achievements_complete.sql`**
- Создает все таблицы достижений
- Добавляет данные достижений
- Создает индексы и политики безопасности

### 4. Данные достижений (если нужно больше достижений)
**`achievements_data.sql`**
- Добавляет дополнительные достижения

## Порядок выполнения:

1. **Сначала выполните `fix_case_not_found.sql`**
2. **Затем выполните `achievement_notifications.sql`**
3. **Если таблицы не созданы, выполните `achievements_complete.sql`**

## Проверка работы:

После выполнения файлов проверьте:

```sql
-- Проверка функций
SELECT * FROM check_and_award_achievements(1, 1, 'diaper', '{}'::JSONB);

-- Проверка истории
SELECT * FROM check_family_history_and_award_achievements(1);

-- Проверка уведомлений
SELECT * FROM get_achievement_notifications(1, 1, 5);
```

## Результат:
После выполнения всех файлов система достижений будет полностью функциональна! 🎉
