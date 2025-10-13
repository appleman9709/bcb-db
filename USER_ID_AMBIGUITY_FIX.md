# Исправление ошибки "column reference user_id is ambiguous"

## Проблема
Ошибка возникает в SQL запросах, когда есть неоднозначность в ссылке на колонку `user_id` из разных таблиц в JOIN запросах.

## Причина
В некоторых функциях достижений используются запросы типа:
```sql
SELECT * FROM user_achievements 
WHERE family_id = family_id_param 
  AND user_id = user_id_param  -- Неоднозначно!
```

Когда в запросе участвуют несколько таблиц с колонкой `user_id`, PostgreSQL не может определить, к какой таблице относится ссылка.

## Решение

### Выполните исправленный скрипт
Запустите файл `fix_user_id_ambiguity.sql` в Supabase SQL Editor.

### Что исправлено:
1. ✅ **Добавлены алиасы таблиц** во всех запросах
2. ✅ **Указаны префиксы** для всех ссылок на колонки
3. ✅ **Исправлены все JOIN запросы** с неоднозначными ссылками

### Примеры исправлений:

#### Было (неправильно):
```sql
SELECT 1 FROM user_achievements 
WHERE family_id = family_id_param 
  AND user_id = user_id_param
```

#### Стало (правильно):
```sql
SELECT 1 FROM user_achievements ua
WHERE ua.family_id = family_id_param 
  AND ua.user_id = user_id_param
```

#### Было (неправильно):
```sql
JOIN family_members fm ON ua.family_id = fm.family_id AND ua.user_id = fm.user_id
```

#### Стало (правильно):
```sql
JOIN family_members fm ON ua.family_id = fm.family_id AND ua.user_id = fm.user_id
```

## Исправленные функции:

1. **`check_and_award_achievements`** - основная функция проверки достижений
2. **`check_family_history_and_award_achievements`** - проверка истории семьи
3. **`get_achievement_notifications`** - получение уведомлений

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

3. **Тестирование уведомлений:**
```sql
SELECT * FROM get_achievement_notifications(1, 1, 5);
```

## Ожидаемый результат:
- ✅ **Ошибки "user_id is ambiguous" больше не возникают**
- ✅ **Все функции достижений работают корректно**
- ✅ **Приложение работает без ошибок базы данных**
- ✅ **Система достижений функционирует стабильно**

## Если проблема остается:
1. Проверьте, что скрипт выполнился полностью
2. Убедитесь, что старые функции были удалены
3. Проверьте логи Supabase на наличие других ошибок
4. Убедитесь, что все таблицы существуют и имеют правильную структуру
