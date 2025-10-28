# Quick Start - API для Push-уведомлений

## Шаги для запуска

### 1. Сгенерируйте VAPID ключи

```bash
npm install -g web-push
web-push generate-vapid-keys
```

Сохраните ключи!

### 2. Примените миграцию в базе данных

```bash
# В Supabase Dashboard → SQL Editor вставьте содержимое:
# push_notifications_migration.sql
```

Или через psql:

```bash
psql -U your_username -d your_database -f push_notifications_migration.sql
```

### 3. Добавьте переменные окружения в Vercel

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите проект BabyCare Dashboard
3. Settings → Environment Variables
4. Добавьте:
   - `VAPID_PUBLIC_KEY` = ваш публичный ключ
   - `VAPID_PRIVATE_KEY` = ваш приватный ключ
   - `VAPID_SUBJECT` = `mailto:noreply@babycare.app`

### 4. Задеплойте проект

```bash
vercel --prod
```

Готово! API будет доступен на `https://your-domain.vercel.app/api/push/send`

---

## Тестирование

### 1. Подписка

1. Откройте приложение
2. Настройки → 🔔 Push-уведомления
3. Нажмите "Подписаться"
4. Разрешите уведомления в браузере

### 2. Отправка теста

1. Настройки → 📤 Отправить уведомление
2. Выберите "Всем членам семьи"
3. Заголовок: "Тест"
4. Текст: "Это тестовое уведомление"
5. Нажмите "Отправить"

---

## Проверка логов

Если что-то не работает, проверьте логи:

```bash
vercel logs
```

Или в Vercel Dashboard → Functions → Logs

---

## Troubleshooting

### Не приходят уведомления?

1. ✅ Проверьте, что миграция применена
2. ✅ Проверьте VAPID ключи в Vercel
3. ✅ Проверьте, что пользователь подписан
4. ✅ Проверьте разрешения браузера
5. ✅ Откройте консоль браузера (F12)

### Ошибка 500?

1. Проверьте логи в Vercel Dashboard
2. Проверьте переменные окружения
3. Убедитесь, что ключи правильные

### Ошибка "VAPID keys not configured"?

Проверьте переменные окружения в Vercel:
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY

---

## Следующие шаги

После того как API работает:

1. Используйте планировщик для автоматических напоминаний
2. Интегрируйте отправку при событиях (кормление, сон, и т.д.)
3. Добавьте групповые уведомления

Подробности в `API_SETUP_GUIDE.md` и `PUSH_NOTIFICATIONS_README.md`

