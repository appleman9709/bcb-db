# Синхронизация графиков роста и веса с базой данных

## Описание

Реализована полная синхронизация графиков роста и веса с базой данных Supabase. Теперь все измерения сохраняются в облаке и синхронизируются между всеми устройствами семьи.

## Что было реализовано

### 1. База данных

**Новая таблица `growth_measurements`:**
- Хранит измерения роста и веса для каждой семьи
- Поддерживает типы измерений: `height` (рост) и `weight` (вес)
- Связана с таблицей `families` через `family_id`
- Уникальная комбинация `family_id`, `measurement_type`, `month`
- Автоматическое обновление `updated_at` через триггер
- Row Level Security (RLS) для безопасности

**Структура таблицы:**
```sql
CREATE TABLE growth_measurements (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    measurement_type TEXT NOT NULL CHECK (measurement_type IN ('height', 'weight')),
    month INTEGER NOT NULL CHECK (month >= 0 AND month <= 12),
    value DECIMAL(5,2) NOT NULL CHECK (value > 0),
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, measurement_type, month)
);
```

**Функции PostgreSQL:**
- `get_family_growth_measurements()` - получение измерений семьи
- `add_growth_measurement()` - добавление/обновление измерения
- `delete_growth_measurement()` - удаление измерения

### 2. Backend (DataService)

**Новый интерфейс `GrowthMeasurement`:**
```typescript
export interface GrowthMeasurement {
  id: number
  family_id: number
  user_id: string
  measurement_type: 'height' | 'weight'
  month: number
  value: number
  recorded_by?: string
  created_at: string
  updated_at: string
}
```

**Новые методы:**
- `getGrowthMeasurements(measurementType?)` - получение измерений
- `addGrowthMeasurement(type, month, value)` - добавление измерения
- `deleteGrowthMeasurement(type, month)` - удаление измерения
- `migrateGrowthDataFromLocalStorage(storageKey, type)` - миграция из localStorage

### 3. Frontend компоненты

**Обновленный `GrowthChartCard`:**
- Использует базу данных вместо localStorage
- Автоматическая миграция существующих данных
- Индикатор загрузки
- Обработка ошибок
- Синхронизация между устройствами

**Изменения в `Dashboard.tsx`:**
- Обновлены пропсы компонента `GrowthChartCard`
- Заменен `storageKey` на `measurementType`

## Установка

### 1. Выполните SQL скрипт

Запустите файл `growth_measurements_update.sql` в Supabase SQL Editor:

```sql
-- Создание таблицы и функций
-- (содержимое файла growth_measurements_update.sql)
```

### 2. Обновление кода

Код уже обновлен и готов к использованию. Основные изменения:

- `src/services/dataService.ts` - добавлены методы для работы с измерениями
- `src/components/GrowthChartCard.tsx` - обновлен для работы с БД
- `src/pages/Dashboard.tsx` - обновлены пропсы компонента

## Использование

### Автоматическая миграция

При первом запуске приложения:
1. Система автоматически проверит наличие данных в localStorage
2. Если найдены данные, они будут мигрированы в базу данных
3. После успешной миграции localStorage будет очищен
4. Пользователь получит уведомление о количестве мигрированных записей

### Добавление измерений

```typescript
// Добавление измерения роста
const result = await dataService.addGrowthMeasurement('height', 6, 65.5)

// Добавление измерения веса
const result = await dataService.addGrowthMeasurement('weight', 6, 7.2)
```

### Получение измерений

```typescript
// Получить все измерения роста
const heightMeasurements = await dataService.getGrowthMeasurements('height')

// Получить все измерения веса
const weightMeasurements = await dataService.getGrowthMeasurements('weight')

// Получить все измерения
const allMeasurements = await dataService.getGrowthMeasurements()
```

## Преимущества

1. **Синхронизация между устройствами** - данные доступны на всех устройствах семьи
2. **Надежность** - данные хранятся в облаке, не теряются при очистке браузера
3. **История изменений** - отслеживание кто и когда добавил измерения
4. **Автоматическая миграция** - плавный переход с localStorage на БД
5. **Безопасность** - Row Level Security защищает данные семьи

## Совместимость

- Полная обратная совместимость с существующими данными
- Автоматическая миграция из localStorage
- Сохранение всех существующих функций интерфейса
- Поддержка всех типов измерений (рост и вес)

## Технические детали

- Использует PostgreSQL функции для оптимизации запросов
- Поддерживает уникальные ограничения для предотвращения дублирования
- Автоматическое обновление временных меток
- Обработка ошибок на всех уровнях
- Индикаторы загрузки для улучшения UX
