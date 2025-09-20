# Система запланированных уведомлений

## Обзор

Добавлена новая система уведомлений, которая автоматически планирует и отправляет уведомления для кормления и смены подгузников.

## Функциональность

### 1. Автоматическое планирование
- При добавлении кормления или смены подгузника автоматически создается запланированное уведомление для следующего события
- Время следующего события рассчитывается на основе интервалов, установленных в настройках

### 2. Предупреждения за 5 минут
- За 5 минут до запланированного времени отправляется предупреждающее уведомление
- Тип уведомления: `warning`
- Пример: "Скоро время Кормления - Через 5 минут пора покормить малыша"

### 3. Напоминания через 15 минут
- Если событие не было выполнено в течение 15 минут после запланированного времени, отправляется напоминание
- Тип уведомления: `reminder`
- Пример: "Напоминание: Кормление - Прошло 15 минут после запланированного времени покормить малыша"

## Структура базы данных

### Новая таблица: `scheduled_notifications`

```sql
CREATE TABLE IF NOT EXISTS scheduled_notifications (
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

### Поля:
- `notification_type`: Тип уведомления ('feeding' или 'diaper')
- `scheduled_time`: Запланированное время события
- `reminder_time`: Время для отправки напоминания (scheduled_time + 15 минут)
- `is_sent`: Отправлено ли предупреждение за 5 минут
- `is_reminder_sent`: Отправлено ли напоминание через 15 минут
- `is_completed`: Выполнено ли событие

## API методы

### DataService

#### `createScheduledNotification(notificationType, scheduledTime)`
Создает новое запланированное уведомление.

#### `getScheduledNotifications()`
Получает все невыполненные запланированные уведомления для семьи.

#### `markNotificationSent(id)`
Отмечает предупреждение как отправленное.

#### `markReminderSent(id)`
Отмечает напоминание как отправленное.

#### `markNotificationCompleted(id)`
Отмечает уведомление как выполненное.

#### `markCurrentNotificationCompleted(notificationType)`
Отмечает текущее уведомление данного типа как выполненное.

#### `cleanupOldNotifications()`
Очищает старые уведомления (старше 1 дня).

### NotificationService

#### `checkScheduledNotifications()`
Проверяет и отправляет запланированные уведомления.

#### `markScheduledNotificationCompleted(actionType)`
Отмечает запланированное уведомление как выполненное.

## Логика работы

### 1. Создание уведомления
```typescript
// При добавлении кормления
const nextFeedingTime = new Date()
nextFeedingTime.setHours(nextFeedingTime.getHours() + settings.feed_interval)
await dataService.createScheduledNotification('feeding', nextFeedingTime)
```

### 2. Проверка уведомлений
Система проверяет уведомления каждые 30 секунд:

```typescript
// Предупреждение за 5 минут
const warningTime = new Date(scheduledTime.getTime() - 5 * 60 * 1000)
if (now >= warningTime && now < scheduledTime && !notification.is_sent) {
  // Отправить предупреждение
}

// Напоминание через 15 минут
if (now >= reminderTime && !notification.is_reminder_sent && !notification.is_completed) {
  // Отправить напоминание
}
```

### 3. Отметка как выполненное
```typescript
// При добавлении нового кормления/подгузника
await dataService.markCurrentNotificationCompleted('feeding')
```

## Тестирование

В разделе "Настройки" добавлены кнопки для тестирования:

1. **Тест кормления (через 1 мин)** - создает тестовое уведомление о кормлении через 1 минуту
2. **Тест подгузника (через 1 мин)** - создает тестовое уведомление о смене подгузника через 1 минуту

### Последовательность тестирования:
1. Нажмите кнопку тестирования
2. Через 1 минуту должно прийти предупреждение за 5 минут до события
3. Через 6 минут должно прийти напоминание через 15 минут после пропуска
4. При добавлении кормления/подгузника уведомление отмечается как выполненное

## Настройки

Система использует существующие настройки интервалов:
- `feed_interval`: Интервал кормления в часах
- `diaper_interval`: Интервал смены подгузника в часах

## Безопасность

- Все операции защищены Row Level Security (RLS)
- Уведомления привязаны к family_id
- Автоматическая очистка старых уведомлений

## Производительность

- Индексы на ключевых полях для быстрого поиска
- Проверка уведомлений каждые 30 секунд (можно настроить)
- Очистка старых уведомлений при каждой проверке
