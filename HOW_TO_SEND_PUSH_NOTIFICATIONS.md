# Как отправить Push-уведомления

Есть несколько способов настроить отправку push-уведомлений с использованием приватного ключа.

## 📋 Что нужно

1. ✅ Публичный ключ уже настроен в приложении
2. ✅ База данных с таблицей `push_subscriptions`
3. ❗ **Приватный ключ:** `rduChdV8ux4sYgcjGNrfEuhU782w9f0Jb9N3agTJWfI`

## 🎯 Вариант 1: Supabase Edge Function (Рекомендуется)

Самое простое решение - использовать Supabase Edge Functions.

### Установка

1. Создайте Edge Function в Supabase Dashboard
2. Скопируйте код из `examples/supabase-edge-function-send-push.ts`
3. Добавьте приватный ключ в переменные окружения Supabase

### Использование

```typescript
// Отправка уведомления из вашего кода
const response = await fetch('https://YOUR-PROJECT.supabase.co/functions/v1/send-push-notification', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({
    familyId: 1,
    title: 'Новое уведомление',
    body: 'Текст уведомления',
    icon: '/icons/icon-192x192.png'
  })
});
```

**Плюсы:**
- ✅ Не нужен отдельный сервер
- ✅ Автоматическое масштабирование
- ✅ Простая настройка

## 🚀 Вариант 2: Node.js сервер

Для большего контроля используйте отдельный Node.js сервер.

### Установка

```bash
cd examples
npm install
```

### Настройка

1. Скопируйте `.env.example` в `.env`
2. Заполните все переменные
3. Добавьте приватный ключ в `.env`

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
VAPID_PRIVATE_KEY=rduChdV8ux4sYgcjGNrfEuhU782w9f0Jb9N3agTJWfI
```

### Запуск

```bash
npm start
# или для development
npm run dev
```

### Использование

```javascript
// API endpoint: POST http://localhost:3000/api/send-push

const response = await fetch('http://localhost:3000/api/send-push', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    familyId: 1,
    title: 'Новое уведомление',
    body: 'Текст уведомления',
    icon: '/icons/icon-192x192.png'
  })
});
```

### Тестирование

```bash
node examples/test-send-push.js
```

**Плюсы:**
- ✅ Полный контроль над отправкой
- ✅ Можно добавить свою логику
- ✅ Подходит для сложных сценариев

## 📱 Примеры использования в приложении

### Отправка при добавлении активности

```typescript
import { supabase } from './lib/supabaseClient'

async function addActivityWithNotification(familyId, activityType) {
  // Добавляем активность
  const { data, error } = await supabase
    .from('activities')
    .insert({ family_id: familyId, activity_type: activityType })
    .select()
    .single()

  if (error) return

  // Отправляем push-уведомление
  await sendPushNotification(
    familyId,
    'Новая активность',
    `Ребенок: ${activityType}`,
    '/icons/activity.png'
  )
}
```

### Отправка при изменении режима сна

```typescript
async function notifySleepChange(familyId, isSleeping, sleepDuration) {
  const title = isSleeping ? 'Ребенок уснул 💤' : 'Ребенок проснулся ☀️'
  const body = isSleeping 
    ? 'Начался период сна'
    : `Спал ${sleepDuration} минут`

  await sendPushNotification(familyId, title, body, '/icons/sleep.png')
}
```

### Отправка напоминания

```typescript
async function sendFeedingReminder(familyId) {
  await sendPushNotification(
    familyId,
    'Напоминание о кормлении',
    'Прошло уже некоторое время с последнего кормления',
    '/icons/feeding.png',
    { type: 'reminder', action: 'feeding' }
  )
}
```

## 🔒 Безопасность

### НЕ делайте так:

```typescript
// ❌ НИКОГДА не добавляйте приватный ключ в клиентский код!
const PRIVATE_KEY = 'rduChdV8ux4sYgcjGNrfEuhU782w9f0Jb9N3agTJWfI' // ❌❌❌
```

### Делайте так:

```typescript
// ✅ Храните приватный ключ только на сервере
// Используйте переменные окружения
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY // ✅
```

### .gitignore

Приватный ключ уже добавлен в `.gitignore`:
- `.vapid_private_key.txt` ✅
- `**/vapid-keys*.txt` ✅

## 🧪 Тестирование

### 1. Проверьте, что пользователь подписан

```javascript
// В консоли браузера
const { data } = await supabase
  .from('push_subscriptions')
  .select('*')
  .eq('family_id', YOUR_FAMILY_ID)

console.log('Subscriptions:', data)
```

### 2. Отправьте тестовое уведомление

```bash
# Вариант 1: Через Node.js сервер
node examples/test-send-push.js

# Вариант 2: Через Supabase Edge Function
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/send-push-notification \
  -H "Content-Type: application/json" \
  -d '{"familyId": 1, "title": "Test", "body": "Testing"}'
```

## 📊 Мониторинг

Добавьте логирование для отслеживания отправки:

```javascript
console.log('Push notification sent:', {
  familyId,
  sent,
  failed,
  total: subscriptions.length
})
```

## ❓ FAQ

**Q: Где хранить приватный ключ?**
A: На сервере, в переменных окружения. Никогда в клиентском коде.

**Q: Можно ли использовать один ключ для всех пользователей?**
A: Да! VAPID ключ один на все приложение.

**Q: Что делать, если подписка невалидна?**
A: Ошибка 410 означает, что подписка истекла. Удалите её из базы данных.

**Q: Как отправить разным пользователям разные уведомления?**
A: Фильтруйте подписки по `user_id` перед отправкой.

## 📚 Дополнительная документация

- `PUSH_NOTIFICATIONS_README.md` - полная документация
- `examples/` - примеры кода
- `database_push_notifications.sql` - структура базы данных

