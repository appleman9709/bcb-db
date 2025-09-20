# Инструкции по обновлению базы данных

## Обзор

Этот документ содержит инструкции по применению обновления базы данных для добавления системы запланированных уведомлений.

## Файлы обновления

- `database_update_scheduled_notifications.sql` - SQL скрипт с обновлениями
- `supabase_schema.sql` - Полная схема базы данных (обновленная)

## Способы применения обновления

### 1. Через Supabase Dashboard

1. Откройте ваш проект в [Supabase Dashboard](https://supabase.com/dashboard)
2. Перейдите в раздел **SQL Editor**
3. Скопируйте содержимое файла `database_update_scheduled_notifications.sql`
4. Вставьте в редактор и нажмите **Run**

### 2. Через psql (PostgreSQL CLI)

```bash
# Подключение к базе данных
psql -h your-host -U your-username -d your-database

# Выполнение скрипта
\i database_update_scheduled_notifications.sql
```

### 3. Через Supabase CLI

```bash
# Если у вас настроен Supabase CLI
supabase db reset
# или
supabase db push
```

## Что добавляется

### Новая таблица: `scheduled_notifications`

```sql
CREATE TABLE scheduled_notifications (
    id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('feeding', 'diaper')),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    is_reminder_sent BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Индексы для производительности

- `idx_scheduled_notifications_family_id` - для быстрого поиска по семье
- `idx_scheduled_notifications_scheduled_time` - для сортировки по времени
- `idx_scheduled_notifications_reminder_time` - для поиска напоминаний
- `idx_scheduled_notifications_notification_type` - для фильтрации по типу
- `idx_scheduled_notifications_is_completed` - для поиска невыполненных

### Безопасность

- Включен Row Level Security (RLS)
- Создана политика безопасности для аутентифицированных пользователей

## Проверка успешного обновления

После выполнения скрипта вы должны увидеть сообщения:

```
NOTICE: Таблица scheduled_notifications успешно создана!
NOTICE: Создано 5 индексов для таблицы scheduled_notifications
NOTICE: Создано 1 политик безопасности для таблицы scheduled_notifications
```

## Проверка через SQL

Выполните следующие запросы для проверки:

```sql
-- Проверка существования таблицы
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'scheduled_notifications';

-- Проверка структуры таблицы
\d scheduled_notifications;

-- Проверка индексов
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'scheduled_notifications';

-- Проверка политик безопасности
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'scheduled_notifications';
```

## Откат изменений (если необходимо)

Если нужно удалить добавленную функциональность:

```sql
-- Удаление политик безопасности
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON scheduled_notifications;

-- Отключение RLS
ALTER TABLE scheduled_notifications DISABLE ROW LEVEL SECURITY;

-- Удаление индексов
DROP INDEX IF EXISTS idx_scheduled_notifications_family_id;
DROP INDEX IF EXISTS idx_scheduled_notifications_scheduled_time;
DROP INDEX IF EXISTS idx_scheduled_notifications_reminder_time;
DROP INDEX IF EXISTS idx_scheduled_notifications_notification_type;
DROP INDEX IF EXISTS idx_scheduled_notifications_is_completed;

-- Удаление таблицы
DROP TABLE IF EXISTS scheduled_notifications;
```

## Совместимость

- Обновление совместимо с существующими данными
- Не влияет на работу существующих функций
- Добавляет только новую функциональность

## Поддержка

Если возникнут проблемы с применением обновления:

1. Проверьте права доступа к базе данных
2. Убедитесь, что таблица `families` существует
3. Проверьте логи выполнения SQL скрипта
4. При необходимости обратитесь к документации Supabase
