# Инструкция по тестированию кнопки "Тест уведомления"

## Шаги для проверки:

1. **Откройте приложение** в браузере (http://localhost:5175/)

2. **Откройте консоль разработчика** (F12 → Console)

3. **Включите уведомления**:
   - Перейдите в настройки приложения
   - Нажмите "Включить уведомления"
   - Разрешите уведомления в браузере

4. **Нажмите кнопку "Тест уведомления"**

5. **Проверьте консоль** - должны появиться сообщения:
   ```
   testNotification called
   isNotificationSupported: true
   notificationPermission: granted
   Checking service worker...
   Service worker registration: [объект регистрации]
   Sending test notification message to service worker
   ```

6. **Проверьте Service Worker консоль**:
   - В DevTools перейдите в Application → Service Workers
   - Должны появиться сообщения:
   ```
   Service Worker received message: {type: "TEST_NOTIFICATION"}
   Test notification requested
   showTestNotification called
   Showing test notification with options: [объект опций]
   Test notification shown successfully
   ```

## Возможные проблемы:

### Если кнопка не нажимается:
- Проверьте, что уведомления включены (статус "Включено")
- Проверьте консоль на ошибки JavaScript

### Если Service Worker не регистрируется:
- Обновите страницу (Ctrl+F5)
- Проверьте, что файл `/sw.js` доступен
- Проверьте консоль на ошибки регистрации

### Если уведомление не показывается:
- Проверьте настройки браузера для уведомлений
- Убедитесь, что сайт добавлен в исключения для уведомлений
- Проверьте, что браузер поддерживает уведомления

## Отладка:

1. **Проверьте статус Service Worker**:
   - DevTools → Application → Service Workers
   - Должен быть активный Service Worker

2. **Проверьте права на уведомления**:
   - DevTools → Application → Storage → Permissions
   - Должно быть "granted" для notifications

3. **Проверьте манифест**:
   - DevTools → Application → Manifest
   - Должны быть указаны права на уведомления
