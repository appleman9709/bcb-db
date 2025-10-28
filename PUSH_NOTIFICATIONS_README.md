# Push Notifications Guide

## Обзор

Приложение BabyCare Dashboard теперь поддерживает push-уведомления, которые позволяют:
- Получать уведомления о важных событиях
- Отправлять уведомления членам семьи прямо из приложения
- Делиться важной информацией о ребенке между членами семьи

## Установка и настройка

### 1. Добавление таблицы в базу данных

Выполните следующие SQL-команды для создания таблицы push-уведомлений:

```sql
-- Таблица для хранения push-подписок
CREATE TABLE IF NOT EXISTS push_subscriptions (
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

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_family_id ON push_subscriptions(family_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Включение RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Политика RLS
CREATE POLICY "Enable all operations for authenticated users" ON push_subscriptions FOR ALL USING (true);

-- Триггер для обновления updated_at
CREATE TRIGGER update_push_subscriptions_updated_at 
    BEFORE UPDATE ON push_subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### 2. Настройка VAPID ключей

Для работы push-уведомлений необходимо сгенерировать VAPID ключи.

1. Установите библиотеку для генерации VAPID ключей:
```bash
npm install -g web-push
```

2. Сгенерируйте ключи:
```bash
web-push generate-vapid-keys
```

3. Добавьте публичный ключ в файл `.env`:
```env
VITE_VAPID_PUBLIC_KEY=your_public_key_here
```

**Важно:** Приватный ключ должен храниться в секрете и использоваться только на сервере для отправки уведомлений.

### 3. Настройка Service Worker

Service Worker уже настроен в файле `public/sw.js` и включает обработку:
- Событий push-уведомлений
- Кликов по уведомлениям
- Открытия приложения при клике на уведомление

### 4. API endpoint для отправки уведомлений

Вам необходимо создать API endpoint для отправки push-уведомлений на сервере. Пример реализации для Node.js:

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

### Подписка на push-уведомления

1. Откройте приложение BabyCare Dashboard
2. Перейдите в раздел "Настройки"
3. Найдите секцию "🔔 Push-уведомления"
4. Нажмите кнопку "Подписаться на уведомления"
5. Разрешите отправку уведомлений в браузере

### Отправка уведомлений членам семьи

1. Откройте раздел "Настройки"
2. Найдите секцию "📤 Отправить уведомление"
3. Выберите получателей (или оставьте "Всем членам семьи")
4. Введите заголовок и текст уведомления
5. Нажмите "Отправить уведомление"

## Компоненты

### PushNotificationManager

Компонент для управления подпиской на push-уведомления:
- Подписка на уведомления
- Отписка от уведомлений
- Отображение статуса подписки

### NotificationSender

Компонент для отправки push-уведомлений членам семьи:
- Выбор получателей (все или конкретные пользователи)
- Ввод заголовка и текста уведомления
- Отправка уведомлений

## Архитектура

### PushService

Сервис `pushService` предоставляет методы:
- `subscribe(familyId, userId)` - подписка на уведомления
- `unsubscribe(familyId, userId)` - отписка от уведомлений
- `getSubscription(familyId, userId)` - получение подписки
- `getFamilySubscriptions(familyId)` - получение всех подписок семьи
- `sendNotificationToFamily(familyId, title, body)` - отправка всем членам семьи
- `sendNotificationToUsers(familyId, userIds, title, body)` - отправка конкретным пользователям

### База данных

Таблица `push_subscriptions` хранит:
- `family_id` - ID семьи
- `user_id` - ID пользователя (члена семьи)
- `endpoint` - URL endpoint для отправки уведомлений
- `p256dh` - Ключ P256DH
- `auth` - Ключ аутентификации

### Service Worker

Обрабатывает события:
- `push` - получение push-уведомления
- `notificationclick` - клик по уведомлению

## Безопасность

1. **VAPID ключи**: Приватный ключ должен храниться в секрете
2. **HTTPS**: Push-уведомления работают только через HTTPS
3. **RLS**: Row Level Security защищает данные в базе
4. **Валидация**: Все данные проходят валидацию перед отправкой

## Ограничения

1. Push-уведомления работают только в поддерживаемых браузерах
2. Требуется HTTPS соединение (локально можно использовать localhost)
3. Пользователь должен дать разрешение на отправку уведомлений

## Поддержка браузеров

Push-уведомления поддерживаются в:
- Chrome/Edge 42+
- Firefox 44+
- Safari 16+ (macOS)
- Opera 29+
- Samsung Internet 4.0+

## Устранение неполадок

### Уведомления не приходят

1. Проверьте, разрешены ли уведомления в настройках браузера
2. Убедитесь, что используется HTTPS или localhost
3. Проверьте консоль браузера на наличие ошибок
4. Убедитесь, что VAPID ключи настроены правильно

### Ошибка при подписке

1. Проверьте, поддерживает ли браузер push-уведомления
2. Убедитесь, что Service Worker зарегистрирован
3. Проверьте настройки VAPID ключей

### Уведомления не отправляются

1. Проверьте API endpoint `/api/push/send`
2. Убедитесь, что подписки сохранены в базе данных
3. Проверьте логи сервера на наличие ошибок

