# Настройка переменных окружения в Vercel

## Проблема

Ошибка: `Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`

API endpoint `/api/push/process-reminders` требует переменные окружения для доступа к Supabase.

## Решение

### Шаг 1: Откройте Vercel Dashboard

1. Перейдите на [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите ваш проект `bcb-dashboard`
3. Перейдите в **Settings → Environment Variables**

### Шаг 2: Добавьте переменные окружения

Добавьте следующие переменные для **Production**, **Preview**, и **Development** (для каждой среды отдельно):

#### Обязательные переменные для Supabase:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Где найти эти значения:

1. **SUPABASE_URL:**
   - Откройте [Supabase Dashboard](https://app.supabase.com)
   - Выберите ваш проект
   - Перейдите в **Settings → API**
   - Найдите **Project URL** - это и есть `SUPABASE_URL`

2. **SUPABASE_SERVICE_ROLE_KEY:**
   - В том же месте (Settings → API)
   - Найдите **service_role key** (секретный ключ)
   - **⚠️ Внимание:** Это секретный ключ! Не публикуйте его в открытом доступе
   - Скопируйте значение - это и есть `SUPABASE_SERVICE_ROLE_KEY`

#### Дополнительные переменные (если еще не добавлены):

```
VITE_VAPID_PUBLIC_KEY=BBlLbSe_SjJlSQnW8o_aZy-POYWSaXLxVb9nvqQsjlTnlRVROpteO4KV4QfcmICNewtJwHYClDirrEA3hFMujnw
VAPID_PUBLIC_KEY=BBlLbSe_SjJlSQnW8o_aZy-POYWSaXLxVb9nvqQsjlTnlRVROpteO4KV4QfcmICNewtJwHYClDirrEA3hFMujnw
VAPID_PRIVATE_KEY=kj6IO74-o_4WSvMbh3WkdithcN026OBosGIk4zgrEYM
VAPID_SUBJECT=mailto:noreply@babycare.app
```

### Шаг 3: Убедитесь, что переменные добавлены для всех сред

Для каждой переменной нужно выбрать:
- ✅ **Production**
- ✅ **Preview**
- ✅ **Development**

Или используйте **"Add to all environments"** при добавлении.

### Шаг 4: Перезапустите deployment

После добавления переменных:

1. Перейдите в **Deployments**
2. Найдите последний deployment
3. Нажмите **••• → Redeploy**
4. Или сделайте новый commit и push для автоматического деплоя

### Шаг 5: Проверка

После перезапуска проверьте:

1. Откройте приложение в продакшене
2. Попробуйте обработать напоминания:
```javascript
window.debugReminders.processRemindersNow()
```

3. В консоли должно быть:
```
✅ Processed X reminders: X sent, 0 failed
```

## Полный список переменных для напоминаний

Для полноценной работы системы напоминаний нужны:

### Для API endpoints (Vercel Functions):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VAPID_PUBLIC_KEY=BBlLbSe_SjJlSQnW8o_aZy-POYWSaXLxVb9nvqQsjlTnlRVROpteO4KV4QfcmICNewtJwHYClDirrEA3hFMujnw
VAPID_PRIVATE_KEY=kj6IO74-o_4WSvMbh3WkdithcN026OBosGIk4zgrEYM
VAPID_SUBJECT=mailto:noreply@babycare.app
```

### Для клиентской части (Vite):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_VAPID_PUBLIC_KEY=BBlLbSe_SjJlSQnW8o_aZy-POYWSaXLxVb9nvqQsjlTnlRVROpteO4KV4QfcmICNewtJwHYClDirrEA3hFMujnw
```

## Проверка переменных

После добавления переменных можно проверить логи в Vercel:

1. Vercel Dashboard → **Deployments**
2. Выберите deployment → **Functions → api/push/process-reminders**
3. Нажмите **View Logs**
4. Проверьте, что ошибки `Missing SUPABASE_URL` больше нет

## Безопасность

⚠️ **Важно:** 
- `SUPABASE_SERVICE_ROLE_KEY` - это секретный ключ, который обходит RLS политики
- Никогда не публикуйте его в открытом доступе
- Не коммитьте его в git
- Используйте только в Vercel Environment Variables

## Troubleshooting

### Ошибка все еще появляется?

1. **Проверьте, что переменные добавлены для нужной среды:**
   - Если тестируете в Production - добавьте для Production
   - Если тестируете Preview - добавьте для Preview

2. **Убедитесь, что deployment перезапущен:**
   - Переменные окружения применяются только при новом deployment
   - Старые deployments не получат новые переменные

3. **Проверьте правильность значений:**
   - `SUPABASE_URL` должен начинаться с `https://`
   - `SUPABASE_SERVICE_ROLE_KEY` должен быть длинным строковым значением

4. **Проверьте логи Vercel:**
   - Vercel Dashboard → Deployments → Functions → View Logs
   - Там должны быть детали ошибки


