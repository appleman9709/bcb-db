# Примеры отправки Push-уведомлений

## 📦 Установка

```bash
npm install
```

## ⚙️ Настройка

Создайте файл `.env` в папке `examples/`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Server
PORT=3000

# VAPID Keys (из .vapid_private_key.txt)
VAPID_PUBLIC_KEY=BC4vcf_6Ze_7AUPAL23NDpfPZkq64wlSKcVWwKFdnAP6qgzsBU45kb-gbA_eP-rvoXIp2EEz_o2i-r65XdtsZF8
VAPID_PRIVATE_KEY=rduChdV8ux4sYgcjGNrfEuhU782w9f0Jb9N3agTJWfI
```

## 🚀 Запуск

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🧪 Тестирование

```bash
node test-send-push.js
```

## 📚 Документация

Полная документация в:
- `../HOW_TO_SEND_PUSH_NOTIFICATIONS.md` - руководство по отправке
- `../PUSH_NOTIFICATIONS_README.md` - общая документация

