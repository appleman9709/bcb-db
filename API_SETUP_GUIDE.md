# API Setup Guide - Push Notifications

## Вариант 1: Vercel Serverless Functions (Рекомендуется)

### Шаг 1: Создайте структуру

Создайте файл `api/push/send.js` в корне проекта.

### Шаг 2: Установите зависимости

```bash
npm install web-push
```

### Шаг 3: Настройте переменные окружения в Vercel

1. Откройте Settings проекта в Vercel
2. Перейдите в Environment Variables
3. Добавьте:

```
VAPID_PUBLIC_KEY=ваш_публичный_ключ
VAPID_PRIVATE_KEY=ваш_приватный_ключ
VAPID_SUBJECT=mailto:noreply@babycare.app
```

### Шаг 4: Деплой

```bash
vercel --prod
```

### Шаг 5: Обновите pushService

Откройте `src/services/pushService.ts` и измените:

```typescript
await fetch('/api/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({...})
})
```

На:

```typescript
const baseUrl = import.meta.env.PROD 
  ? 'https://your-domain.vercel.app' 
  : 'http://localhost:3000'

await fetch(`${baseUrl}/api/push/send`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({...})
})
```

---

## Вариант 2: Supabase Edge Functions

### Шаг 1: Установите Supabase CLI

```bash
npm install -g supabase
```

### Шаг 2: Логин

```bash
supabase login
```

### Шаг 3: Линк проекта

```bash
supabase link --project-ref your-project-ref
```

### Шаг 4: Создайте функцию

```bash
supabase functions new send-push-notification
```

### Шаг 5: Настройте секреты

```bash
supabase secrets set VAPID_PUBLIC_KEY=ваш_публичный_ключ
supabase secrets set VAPID_PRIVATE_KEY=ваш_приватный_ключ
```

### Шаг 6: Деплой

```bash
supabase functions deploy send-push-notification
```

### Шаг 7: Обновите pushService

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({...})
})
```

---

## Вариант 3: Отдельный Express сервер

### Создайте файл `server/index.js`:

```javascript
const express = require('express')
const webpush = require('web-push')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:noreply@babycare.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

app.post('/api/push/send', async (req, res) => {
  try {
    const { subscription, title, body, icon, tag, data } = req.body

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      tag: tag || 'babycare-notification',
      data: data || {},
      timestamp: Date.now()
    })

    await webpush.sendNotification(subscription, payload)

    res.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: error.message })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

### Запуск:

```bash
cd server
npm install express web-push cors
node index.js
```

---

## Генерация VAPID ключей

```bash
# Установка
npm install -g web-push

# Генерация
web-push generate-vapid-keys
```

Вы получите:
```
Public Key: ваш_публичный_ключ
Private Key: ваш_приватный_ключ
```

---

## Тестирование

### 1. Подписка на уведомления

Откройте приложение → Настройки → Подписаться на push-уведомления

### 2. Отправка тестового уведомления

```bash
curl -X POST http://localhost:3000/api/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "subscription": {...},
    "title": "Тест",
    "body": "Тестовое уведомление"
  }'
```

### 3. Проверка через приложение

Настройки → Отправить уведомление → Заполните форму → Отправить

---

## Безопасность

1. Приватный ключ храните только в секретах
2. Используйте HTTPS в production
3. Валидируйте все входящие данные
4. Логируйте ошибки но не данные подписок
5. Ограничьте количество запросов (rate limiting)

---

## Troubleshooting

### Уведомления не отправляются

1. Проверьте VAPID ключи
2. Проверьте что пользователь подписан
3. Проверьте логи в Vercel Dashboard / Supabase Logs
4. Проверьте консоль браузера

### Ошибка 410 (Gone)

Подписка устарела, пользователю нужно переподписаться.

### Ошибка 400 (Bad Request)

Неверные данные подписки, проверьте формат.

### Ошибка 500 (Internal Server Error)

Проверьте логи сервера и VAPID ключи.

