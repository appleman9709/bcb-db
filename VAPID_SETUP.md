# Настройка VAPID ключей

## Проблема

Если вы видите ошибку:
```
InvalidAccessError: The provided applicationServerKey is not valid
```

Это означает, что VAPID ключи не настроены.

## Решение

### Шаг 1: Генерация VAPID ключей

Откройте терминал и выполните:

```bash
# Установите web-push глобально
npm install -g web-push

# Сгенерируйте ключи
web-push generate-vapid-keys
```

Вы получите что-то вроде:
```
Public Key: BGxxx...xxx
Private Key: yyy...yyy
```

### Шаг 2: Добавьте ключи в проект

Создайте файл `.env` в корне проекта (если его нет):

```env
VITE_VAPID_PUBLIC_KEY=BGxxx...xxx
```

**Внимание:** Добавьте `.env` в `.gitignore`, не коммитьте приватный ключ!

### Шаг 3: Для Vercel деплоя

Добавьте переменные окружения в Vercel:

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите проект
3. Settings → Environment Variables
4. Добавьте:
   - `VITE_VAPID_PUBLIC_KEY` = ваш публичный ключ
   - `VAPID_PUBLIC_KEY` = ваш публичный ключ (для API)
   - `VAPID_PRIVATE_KEY` = ваш приватный ключ (для API)
   - `VAPID_SUBJECT` = `mailto:noreply@babycare.app`

### Шаг 4: Перезапустите проект

```bash
# Для локальной разработки
npm run dev

# Для Vercel деплоя
vercel --prod
```

## Проверка

После перезапуска:
1. Откройте приложение
2. Перейдите в Настройки → 🔔 Push-уведомления
3. Нажмите "Подписаться на уведомления"
4. Ошибка должна исчезнуть!

## Альтернативное решение

Если вы не хотите настраивать push-уведомления сейчас, вы можете:
1. Закомментировать компоненты в `SettingsTab.tsx`
2. Или просто не использовать эту функцию

Push-уведомления опциональны и приложение будет работать без них.



