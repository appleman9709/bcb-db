# Диагностика проблем с напоминаниями

Если напоминания не приходят, проверьте следующие моменты:

## 1. Проверка Cron Job в Vercel

**Важно:** После добавления cron job в `vercel.json`, нужно:
1. Закоммитить и задеплоить изменения в Vercel
2. Проверить в Vercel Dashboard → Settings → Cron Jobs, что cron job активен

## 2. Проверка запланированных напоминаний в базе данных

Выполните SQL запрос из `database_check_reminders.sql` в Supabase SQL Editor:

```sql
-- Проверка запланированных напоминаний
SELECT 
    id,
    family_id,
    reminder_type,
    scheduled_time,
    event_time,
    status,
    NOW() as current_time,
    scheduled_time < NOW() as is_overdue
FROM scheduled_reminders 
WHERE status = 'pending' 
ORDER BY scheduled_time ASC;
```

**Что искать:**
- Есть ли записи со статусом `pending`?
- Если `is_overdue = true`, значит напоминание должно было быть отправлено, но не было обработано
- Если записей нет, значит напоминание не было запланировано

## 3. Проверка активных подписок

```sql
SELECT 
    id,
    family_id,
    user_id,
    created_at
FROM push_subscriptions
ORDER BY updated_at DESC;
```

**Важно:** Если нет активных подписок, уведомления не будут отправлены!

## 4. Проверка логики планирования

Напоминание НЕ будет запланировано, если:
- Следующее событие уже должно было произойти (прошло слишком много времени)
- Время напоминания уже прошло
- Нет последнего события (кормление/подгузник/купание)

**Решение:** Если событие уже должно было произойти, добавьте новое событие - тогда напоминание будет запланировано заново.

## 5. Проверка VAPID ключей

В Vercel Dashboard → Settings → Environment Variables должны быть:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

## 6. Ручная проверка обработки напоминаний

Можно вызвать API endpoint вручную для проверки:

```bash
curl -X POST https://your-domain.vercel.app/api/push/process-reminders
```

Или в браузере откройте:
```
https://your-domain.vercel.app/api/push/process-reminders
```

## 7. Частые проблемы

### Проблема: Напоминание не запланировано

**Причина:** Событие было добавлено давно, и время следующего события уже прошло.

**Решение:** Добавьте новое событие (кормление/подгузник/купание) - напоминание будет запланировано заново.

### Проблема: Напоминание запланировано, но не отправлено

**Причины:**
1. Cron job не работает (проверьте Vercel Dashboard)
2. Нет активных подписок
3. VAPID ключи не настроены
4. Ошибка при отправке (проверьте логи Vercel)

### Проблема: Уведомление пришло поздно

**Причина:** Cron job запускается каждую минуту, поэтому может быть задержка до 1 минуты.

**Решение:** Это нормально. Cron job проверяет напоминания каждую минуту.

## 8. Восстановление напоминания вручную

Если напоминание не было запланировано, можно запланировать его вручную:

```sql
-- Замените значения на ваши
INSERT INTO scheduled_reminders (
    family_id,
    reminder_type,
    scheduled_time,
    event_time,
    status
) VALUES (
    1,  -- ваш family_id
    'diaper',  -- или 'feeding', 'bath'
    NOW() + INTERVAL '5 minutes',  -- время напоминания
    NOW() + INTERVAL '10 minutes',  -- время события
    'pending'
);
```

## 9. Логи и отладка

Проверьте логи:
- **Vercel:** Dashboard → Functions → Logs
- **Supabase:** SQL Editor → выполните запросы из `database_check_reminders.sql`
- **Браузер:** Console → проверьте ошибки при планировании напоминаний

## 10. Проверка работы cron job

После деплоя в Vercel, cron job должен автоматически запускаться каждую минуту. Проверьте в Vercel Dashboard → Functions → Cron Jobs.

