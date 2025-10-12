# Исправление ошибки 409 Conflict при сохранении монеток

## Проблема
При попытке сохранить монетки в базу данных возникала ошибка:
```
POST https://jzxomchnoprluccmxmpc.supabase.co/rest/v1/parent_coins?select=* 409 (Conflict)
Error updating parent coins {code: '23505', details: null, hint: null, message: 'duplicate key value violates unique constraint "parent_coins_family_id_user_id_key"'}
```

## Причина
Ошибка возникала из-за неправильного использования `upsert` в Supabase. Когда мы пытались создать новую запись, но запись с такой комбинацией `family_id` и `user_id` уже существовала, Supabase не знал, как обработать конфликт.

## Решение
Исправлен метод `updateParentCoins` в `dataService.ts`:

**Было:**
```typescript
const { data, error } = await supabase
  .from('parent_coins')
  .upsert(coinsData)
  .select()
  .single()
```

**Стало:**
```typescript
const { data, error } = await supabase
  .from('parent_coins')
  .upsert(coinsData, { 
    onConflict: 'family_id,user_id',
    ignoreDuplicates: false 
  })
  .select()
  .single()
```

## Объяснение параметров upsert

- `onConflict: 'family_id,user_id'` - указывает Supabase, какие колонки использовать для определения конфликта
- `ignoreDuplicates: false` - говорит Supabase обновить существующую запись вместо игнорирования

## Дополнительные улучшения
Добавлено логирование для лучшей отладки:
```typescript
console.log('DataService: Upserting coins data:', coinsData)
console.log('DataService: Upsert successful:', data)
```

## Результат
Теперь `upsert` корректно обрабатывает как создание новых записей, так и обновление существующих, используя уникальное ограничение `family_id,user_id`.

## Тестирование
1. Откройте консоль браузера (F12)
2. Кликайте на малыша несколько раз
3. Проверьте, что ошибки 409 больше не появляются
4. Убедитесь, что монетки корректно сохраняются и накапливаются
