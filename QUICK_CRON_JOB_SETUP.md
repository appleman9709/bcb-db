# Быстрая настройка cron-job.org

## Пошаговая инструкция (5 минут)

### Шаг 1: Регистрация
1. Откройте [cron-job.org](https://cron-job.org)
2. Нажмите **"Sign Up"** (бесплатно)
3. Зарегистрируйтесь и подтвердите email

### Шаг 2: Создание Cron Job
1. Нажмите **"Create cronjob"** или **"New cronjob"**

2. Заполните форму:
   - **Title:** `BabyCare Reminders`
   - **Address (URL):** `https://bcb-db.vercel.app/api/push/process-reminders`
     - ⚠️ Замените `bcb-db.vercel.app` на ваш домен Vercel!
   - **Method:** `POST`
   - **Schedule:** `*/5 * * * *` или выберите **"Every 5 minutes"**
   - **Time zone:** Ваш часовой пояс (например, `Europe/Moscow`)
   - **Activate cronjob:** ✅ Включено

3. Нажмите **"Create cronjob"** или **"Save"**

### Шаг 3: Тестовый запуск
1. В списке cron jobs найдите созданный job
2. Нажмите **"Run now"** или **▶️ Play**
3. Проверьте статус:
   - ✅ **200 OK** - работает!
   - ❌ **404/500** - проверьте URL и логи

### Шаг 4: Проверка работы
1. Создайте тестовое напоминание:
   ```javascript
   window.debugReminders.createTestReminder(1, 'diaper')
   ```

2. Подождите 5 минут (или запустите cron job вручную)

3. Уведомление должно прийти даже если приложение закрыто! ✅

## Ваш URL API endpoint

Замените `bcb-db.vercel.app` на ваш домен Vercel:

```
https://ВАШ-ДОМЕН.vercel.app/api/push/process-reminders
```

Найти ваш домен:
1. Vercel Dashboard → Ваш проект → **Deployments**
2. Скопируйте домен из последнего deployment
3. Используйте его в URL cron-job.org

## Проверка доступности API

Проверьте, что API работает:

```bash
curl -X POST https://ВАШ-ДОМЕН.vercel.app/api/push/process-reminders
```

Должен вернуться:
```json
{
  "success": true,
  "processed": 0,
  "message": "No reminders to process"
}
```

## Troubleshooting

### ❌ 404 Not Found
- Проверьте URL (должен быть `/api/push/process-reminders`)
- Проверьте, что проект задеплоен в Vercel

### ❌ 500 Internal Server Error
- Проверьте переменные окружения в Vercel:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT`

### ❌ Напоминания не обрабатываются
- Проверьте логи Vercel: Dashboard → Functions → api/push/process-reminders → View Logs
- Проверьте, что есть напоминания: `window.debugReminders.checkScheduledReminders(1)`

## Готово! ✅

После настройки cron-job.org:
- ✅ Напоминания обрабатываются каждые 5 минут
- ✅ Работает даже когда приложение закрыто
- ✅ Не зависит от браузера пользователя

Подробная инструкция: `CRON_JOB_ORG_SETUP.md`

