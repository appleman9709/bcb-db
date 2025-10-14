# 🔧 Инструкция по тестированию исправления видео сна

## Шаг 1: Выполните SQL скрипт
Скопируйте и выполните этот код в Supabase SQL Editor:

```sql
-- Добавляем поле video_played в таблицу sleep_sessions
ALTER TABLE sleep_sessions 
ADD COLUMN IF NOT EXISTS video_played BOOLEAN DEFAULT FALSE;

-- Обновляем существующие записи
UPDATE sleep_sessions 
SET video_played = FALSE 
WHERE video_played IS NULL;
```

## Шаг 2: Проверьте консоль браузера
Откройте DevTools (F12) и перейдите на вкладку Console. Вы должны увидеть сообщения:
- `🌙 Video played state from DB: false` - при загрузке страницы
- `🌙 Video started playing, marking as played` - при воспроизведении видео

## Шаг 3: Тестирование
1. **Включите режим сна** - видео должно воспроизвестись один раз
2. **Перезагрузите страницу** - видео НЕ должно воспроизводиться снова
3. **Переключите вкладку и вернитесь** - видео НЕ должно воспроизводиться снова
4. **Выключите режим сна и включите снова** - видео должно воспроизвестись заново

## Шаг 4: Проверка в базе данных
Выполните запрос в Supabase SQL Editor:
```sql
SELECT id, family_id, start_time, end_time, video_played 
FROM sleep_sessions 
WHERE family_id = YOUR_FAMILY_ID 
ORDER BY start_time DESC 
LIMIT 5;
```

Поле `video_played` должно быть `true` для активных сессий сна после воспроизведения видео.

## 🐛 Если что-то не работает

### Проверьте ошибки в консоли:
- Если видите ошибки с `video_played`, значит SQL скрипт не выполнен
- Если видите ошибки с `getSleepVideoPlayedState`, проверьте подключение к БД

### Проверьте структуру таблицы:
```sql
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sleep_sessions' 
AND column_name = 'video_played';
```

### Альтернативный подход:
Если проблемы продолжаются, можно использовать localStorage как временное решение:
```javascript
// В TamagotchiPage.tsx замените логику на:
const [hasPlayedSleepVideo, setHasPlayedSleepVideo] = useState(() => {
  const sessionId = data?.currentSleepSession?.id
  if (sessionId) {
    return localStorage.getItem(`sleep_video_played_${sessionId}`) === 'true'
  }
  return false
})
```
