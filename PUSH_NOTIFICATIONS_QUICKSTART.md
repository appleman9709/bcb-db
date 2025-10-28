# Push-уведомления - Быстрый старт

## Шаг 1: Генерация VAPID ключей

```powershell
# Запустите PowerShell скрипт
cd scripts
.\generate-vapid.ps1
```

Или вручную:
```bash
npx --yes web-push generate-vapid-keys
```

## Шаг 2: Настройка публичного ключа

Скопируйте публичный ключ из вывода шага 1 и вставьте в:
```
src/services/pushNotificationService.ts
```
Замените строку:
```typescript
const VAPID_PUBLIC_KEY = 'BLmLJzS61XJKbUFHjkP8bBaSgDCVZWuLGNs0mVxqtJYW8l1IHn-Q5V0FVpRmKWtFMYGOyWQ4EOJz4i5l-CcUVk8'
```

## Шаг 3: Применение миграции базы данных

В Supabase SQL Editor выполните:
```sql
-- Содержимое файла database_push_notifications.sql
```

## Шаг 4: Добавление в настройки

Добавьте компонент `NotificationSettings` в вашу страницу настроек:

```tsx
import NotificationSettings from '../components/NotificationSettings'

function Settings() {
  return (
    <div>
      <h1>Настройки</h1>
      <NotificationSettings />
    </div>
  )
}
```

## Шаг 5: Тестирование

1. Откройте приложение
2. Перейдите в настройки
3. Включите push-уведомления
4. Подтвердите разрешение в браузере

## Отправка уведомлений

### Из вашего кода

```typescript
import { supabase } from './lib/supabaseClient'

async function sendPushNotification(familyId: number, title: string, body: string) {
  // Получаем все подписки для семьи
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('family_id', familyId)

  // Отправляем уведомления через ваш сервер
  // (используйте web-push библиотеку с приватным VAPID ключом)
  
  await fetch('/api/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscriptions,
      notification: { title, body }
    })
  })
}
```

### Пример отправки для конкретного действия

```typescript
// После добавления активности
await dataService.addActivity('feeding')
await sendPushNotification(
  family.id,
  'Новое кормление',
  `${authorName} покормил ребенка`
)
```

## Проверка работы

```javascript
// В консоли браузера
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub)
  })
})
```

## Готово! 🎉

Теперь у вас работают push-уведомления. Для подробной документации см. `PUSH_NOTIFICATIONS_README.md`.

