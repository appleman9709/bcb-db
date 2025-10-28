# Push-уведомления для BabyCare Dashboard

## Обзор

Этот документ описывает систему push-уведомлений, реализованную в BabyCare Dashboard PWA. Система использует Service Worker + Push API + VAPID ключи + Notifications API.

## Компоненты системы

### 1. Service Worker (`public/sw.js`)
- Обрабатывает push-события
- Показывает уведомления
- Управляет кликами по уведомлениям

### 2. Push Notification Service (`src/services/pushNotificationService.ts`)
- Подписка/отписка от push-уведомлений
- Управление VAPID ключами
- Работа с базой данных

### 3. Notification Context (`src/contexts/NotificationContext.tsx`)
- React Context для управления состоянием уведомлений
- Хук `useNotification()` для доступа к функциям

### 4. Notification Settings Component (`src/components/NotificationSettings.tsx`)
- UI для включения/выключения уведомлений
- Показ статуса разрешений
- Обработка ошибок

## Установка

### 1. Настройка базы данных

Выполните миграцию базы данных:

```sql
-- Запустите содержимое файла database_push_notifications.sql
-- в вашей базе данных Supabase
```

### 2. Генерация VAPID ключей

#### Вариант 1: Использование веб-сервиса
1. Откройте https://web-push-codelab.glitch.me/
2. Скопируйте сгенерированные Public Key и Private Key

#### Вариант 2: Использование Node.js
```bash
# Установите веб-push библиотеку
npm install web-push --save-dev

# Сгенерируйте ключи
npx web-push generate-vapid-keys
```

#### Вариант 3: Использование PowerShell скрипта
```powershell
# Создайте файл generate-vapid.ps1
```

```powershell
# generate-vapid.ps1
$npxPath = "npx"
$command = "web-push generate-vapid-keys"

Write-Host "Generating VAPID keys..." -ForegroundColor Green
$output = & $npxPath $command 2>&1

if ($LASTEXITCODE -eq 0) {
    $output | Out-File -FilePath "vapid-keys.txt"
    Write-Host "`nVAPID keys saved to vapid-keys.txt" -ForegroundColor Green
    Get-Content "vapid-keys.txt"
} else {
    Write-Host "Error: $output" -ForegroundColor Red
}
```

### 3. Настройка VAPID ключей

Обновите файл `src/services/pushNotificationService.ts`:

```typescript
// Замените этот публичный ключ на ваш
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE'
```

**ВАЖНО:** Публичный ключ должен совпадать с приватным ключом на вашем сервере!

### 4. Добавление компонента в приложение

```tsx
import NotificationSettings from './components/NotificationSettings'

function SettingsPage() {
  return (
    <div>
      <h1>Настройки</h1>
      <NotificationSettings />
      {/* другие настройки */}
    </div>
  )
}
```

## Использование

### Включение уведомлений пользователем

1. Пользователь открывает настройки
2. Нажимает кнопку "Включить" в разделе "Push-уведомления"
3. Браузер запрашивает разрешение
4. Пользователь подтверждает разрешение
5. Подписка сохраняется в базе данных

### Отправка push-уведомлений

#### Пример 1: Через Supabase Edge Function

Создайте Edge Function в Supabase:

```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const VAPID_PUBLIC_KEY = "YOUR_VAPID_PUBLIC_KEY"
const VAPID_PRIVATE_KEY = "YOUR_VAPID_PRIVATE_KEY"

serve(async (req) => {
  try {
    const { familyId, title, body, icon } = await req.json()

    // Получаем подписки из базы данных
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const { data: subscriptions, error } = await supabaseClient
      .from("push_subscriptions")
      .select("*")
      .eq("family_id", familyId)

    if (error) throw error

    // Отправляем уведомления каждой подписке
    for (const subscription of subscriptions || []) {
      const { data, error: sendError } = await fetch(
        subscription.endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `vapid t=${VAPID_PUBLIC_KEY}, k=${VAPID_PRIVATE_KEY}`,
          },
          body: JSON.stringify({
            title,
            body,
            icon,
          }),
        }
      )

      if (sendError) console.error("Error sending push:", sendError)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
```

#### Пример 2: Прямая отправка с сервера

```typescript
// Используйте библиотеку web-push на вашем сервере
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

// Получите подписку из базы данных
const subscription = {
  endpoint: 'https://...',
  keys: {
    p256dh: '...',
    auth: '...'
  }
}

// Отправьте уведомление
webpush.sendNotification(subscription, JSON.stringify({
  title: 'Новое уведомление',
  body: 'Текст уведомления',
  icon: '/icons/icon-192x192.png'
}))
```

## Безопасность

### VAPID ключи
- **Приватный ключ:** Храните только на сервере, никогда не отправляйте клиенту
- **Публичный ключ:** Безопасно использовать в клиентском коде

### Row Level Security (RLS)
Все политики RLS настроены для таблицы `push_subscriptions`

### Endpoint URL
Endpoint URL содержит уникальный идентификатор пользователя. Не делитесь своим endpoint публично.

## Отладка

### Проверка поддержки push-уведомлений

```javascript
console.log('Service Worker:', 'serviceWorker' in navigator)
console.log('Push Manager:', 'PushManager' in window)
console.log('Notification:', 'Notification' in window)
```

### Проверка разрешений

```javascript
console.log('Notification permission:', Notification.permission)
```

### Проверка подписки

```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub)
  })
})
```

### Проверка Service Worker

```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker registered:', reg)
})
```

## Ограничения браузеров

### Chrome/Edge
- ✅ Полная поддержка
- ✅ Поддерживает VAPID

### Firefox
- ✅ Полная поддержка
- ✅ Поддерживает VAPID

### Safari
- ❌ Не поддерживает push-уведомления на desktop
- ✅ Поддерживает на iOS с ограничениями

### Opera
- ✅ Полная поддержка

## Часто задаваемые вопросы

### Q: Почему я не получаю уведомления?
A: Проверьте:
1. Разрешения браузера включены
2. Подписка сохранена в базе данных
3. VAPID ключи правильно настроены
4. Service Worker зарегистрирован

### Q: Как отключить уведомления для всех пользователей?
A: Используйте SQL команду в Supabase:

```sql
DELETE FROM push_subscriptions WHERE family_id = YOUR_FAMILY_ID;
```

### Q: Можно ли отправить уведомление конкретному пользователю?
A: Да, фильтруйте по `user_id` в запросе к `push_subscriptions`:

```sql
SELECT * FROM push_subscriptions WHERE family_id = ? AND user_id = ?;
```

### Q: Как обновить подписку после истечения срока?
A: Service Worker автоматически обновит подписку при необходимости.

## Полезные ресурсы

- [MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [MDN: Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [web-push library](https://github.com/web-push-libs/web-push)

## Поддержка

Если у вас возникли проблемы:
1. Проверьте консоль браузера
2. Проверьте логи Service Worker
3. Проверьте настройки базы данных
4. Убедитесь, что VAPID ключи настроены правильно

