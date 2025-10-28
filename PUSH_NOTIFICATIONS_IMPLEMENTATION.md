# Push Notifications Implementation Summary

## Что было реализовано

В приложение BabyCare Dashboard была добавлена полная система push-уведомлений с возможностью:
1. Подписки пользователей на push-уведомления
2. Отправки уведомлений членам семьи из приложения
3. Управления подписками в настройках

## Изменения в базе данных

### Новая таблица: `push_subscriptions`

Добавлена таблица для хранения push-подписок членов семьи:

```sql
CREATE TABLE push_subscriptions (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);
```

## Новые компоненты

### 1. PushService (`src/services/pushService.ts`)

Сервис для управления push-уведомлениями:

- `subscribe(familyId, userId)` - Подписка на уведомления
- `unsubscribe(familyId, userId)` - Отписка от уведомлений
- `getFamilySubscriptions(familyId)` - Получение подписок семьи
- `sendNotificationToFamily(familyId, title, body)` - Отправка всем членам семьи
- `sendNotificationToUsers(familyId, userIds, title, body)` - Отправка конкретным пользователям

### 2. PushNotificationManager (`src/components/PushNotificationManager.tsx`)

Компонент для управления подпиской на push-уведомления:
- Кнопка подписки/отписки
- Индикация состояния подписки
- Обработка ошибок

### 3. NotificationSender (`src/components/NotificationSender.tsx`)

Компонент для отправки уведомлений:
- Выбор получателей (все или конкретные пользователи)
- Поля для заголовка и текста уведомления
- Отправка уведомлений

## Обновленные файлы

### 1. Service Worker (`public/sw.js`)

Добавлены обработчики:
- `push` event - Получение push-уведомлений
- `notificationclick` event - Обработка кликов по уведомлениям

### 2. Settings Tab (`src/components/dashboard/SettingsTab.tsx`)

Добавлены секции:
- "🔔 Push-уведомления" - Управление подпиской
- "📤 Отправить уведомление" - Отправка уведомлений

### 3. Database Schema (`database_schema.sql`)

Добавлены:
- Таблица push_subscriptions
- Индексы для оптимизации
- RLS политики
- Триггер для updated_at

## Настройка

### 1. VAPID ключи

Для работы push-уведомлений необходимо сгенерировать VAPID ключи:

```bash
npm install -g web-push
web-push generate-vapid-keys
```

Добавьте публичный ключ в `.env`:
```env
VITE_VAPID_PUBLIC_KEY=your_public_key_here
```

### 2. API endpoint

Создайте endpoint `/api/push/send` на сервере для отправки уведомлений.

Пример для Node.js:

```javascript
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

app.post('/api/push/send', async (req, res) => {
  const { subscription, title, body, icon, tag, data } = req.body;

  try {
    await webpush.sendNotification(subscription, JSON.stringify({
      title,
      body,
      icon,
      tag,
      data
    }));
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Использование

### Подписка на уведомления

1. Откройте раздел "Настройки"
2. Найдите секцию "🔔 Push-уведомления"
3. Нажмите "Подписаться на уведомления"
4. Разрешите отправку уведомлений в браузере

### Отправка уведомлений

1. Откройте раздел "Настройки"
2. Найдите секцию "📤 Отправить уведомление"
3. Выберите получателей
4. Введите заголовок и текст
5. Нажмите "Отправить уведомление"

## Требования

- HTTPS соединение (или localhost для разработки)
- Поддержка Service Worker браузером
- Браузер поддерживает Push API
- Пользователь дал разрешение на уведомления

## Безопасность

- VAPID ключи для аутентификации
- Row Level Security в базе данных
- Валидация всех данных
- Безопасное хранение подписок

## Дополнительная документация

Смотрите `PUSH_NOTIFICATIONS_README.md` для подробной документации по настройке и использованию.

