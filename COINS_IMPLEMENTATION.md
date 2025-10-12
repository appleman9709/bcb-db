# Реализация системы монеток в базе данных

## Что было реализовано

### 1. Обновление схемы базы данных (`supabase_schema.sql`)

Добавлена новая таблица `parent_coins` для хранения монеток каждого родителя:

```sql
CREATE TABLE IF NOT EXISTS parent_coins (
    id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    feeding_coins INTEGER DEFAULT 0,
    diaper_coins INTEGER DEFAULT 0,
    bath_coins INTEGER DEFAULT 0,
    mom_coins INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);
```

**Особенности:**
- Уникальная комбинация `family_id` и `user_id` для каждого родителя
- Отдельные счетчики для каждого типа монеток
- Общий счетчик очков (`total_score`)
- Автоматическое обновление `updated_at` через триггер
- Индексы для оптимизации запросов
- Row Level Security (RLS) для безопасности

### 2. Обновление DataService (`src/services/dataService.ts`)

Добавлен новый интерфейс `ParentCoins` и методы для работы с монетками:

```typescript
export interface ParentCoins {
  id: number
  family_id: number
  user_id: string
  feeding_coins: number
  diaper_coins: number
  bath_coins: number
  mom_coins: number
  total_score: number
  created_at: string
  updated_at: string
}
```

**Новые методы:**
- `getParentCoins()` - получение монеток текущего пользователя
- `updateParentCoins(coins)` - обновление монеток пользователя
- `addCoins(coinType, amount)` - добавление монеток определенного типа

### 3. Обновление TamagotchiPage (`src/pages/TamagotchiPage.tsx`)

**Основные изменения:**
- Загрузка данных монеток из БД при инициализации
- Синхронизация локального состояния с данными из БД
- Сохранение монеток в БД при клике на малыша
- Обработка ошибок с fallback на локальное состояние

**Логика работы:**
1. При загрузке страницы монетки загружаются из БД
2. При клике на малыша монетка сохраняется в БД
3. Локальное состояние обновляется данными из БД
4. В случае ошибки БД используется локальное состояние для UX

## Типы монеток

- **feeding_coins** - монетки за кормление (когда малыш голоден)
- **diaper_coins** - монетки за смену подгузника (когда малыш в грязном подгузнике)
- **bath_coins** - монетки за купание (когда малыш грязный)
- **mom_coins** - обычные монетки (когда малыш в порядке или нужна общая забота)

## Система очков

- Каждая монетка дает 1 очко
- Общий счетчик очков (`total_score`) автоматически обновляется
- Очки влияют на разнообразие фраз малыша

## Безопасность

- Row Level Security (RLS) включен для таблицы `parent_coins`
- Каждый пользователь может видеть и изменять только свои монетки
- Политики безопасности разрешают все операции для аутентифицированных пользователей

## Тестирование

Проект успешно собирается без ошибок. Для полного тестирования необходимо:

1. Применить изменения схемы БД в Supabase
2. Запустить приложение и протестировать функциональность
3. Проверить сохранение монеток при перезагрузке страницы
4. Проверить работу с разными пользователями в одной семье
