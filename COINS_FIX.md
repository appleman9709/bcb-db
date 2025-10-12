# Исправление проблемы с сохранением монеток

## Проблема
Монетки появлялись визуально, но в базу данных записывалась только одна монетка.

## Причина
В методе `addCoins` была логическая ошибка:
- При создании новой записи использовался динамический ключ `[coinType]: amount`
- При обновлении существующей записи использовался spread оператор `...currentCoins`
- В методе `updateParentCoins` использовался оператор `??`, который не обновлял существующие значения

## Исправления

### 1. Исправлен метод `addCoins` в `dataService.ts`

**Было:**
```typescript
const newCoins = {
  [coinType]: amount,
  total_score: amount * 10
}

const updatedCoins = {
  ...currentCoins,
  [coinType]: currentCoins[coinType] + amount,
  total_score: currentCoins.total_score + (amount * 10)
}
```

**Стало:**
```typescript
const newCoins = {
  feeding_coins: coinType === 'feeding_coins' ? amount : 0,
  diaper_coins: coinType === 'diaper_coins' ? amount : 0,
  bath_coins: coinType === 'bath_coins' ? amount : 0,
  mom_coins: coinType === 'mom_coins' ? amount : 0,
  total_score: amount * 10
}

const updatedCoins = {
  feeding_coins: coinType === 'feeding_coins' ? currentCoins.feeding_coins + amount : currentCoins.feeding_coins,
  diaper_coins: coinType === 'diaper_coins' ? currentCoins.diaper_coins + amount : currentCoins.diaper_coins,
  bath_coins: coinType === 'bath_coins' ? currentCoins.bath_coins + amount : currentCoins.bath_coins,
  mom_coins: coinType === 'mom_coins' ? currentCoins.mom_coins + amount : currentCoins.mom_coins,
  total_score: currentCoins.total_score + (amount * 10)
}
```

### 2. Добавлено логирование для отладки

В `TamagotchiPage.tsx` и `dataService.ts` добавлены console.log для отслеживания процесса сохранения монеток.

## Результат
Теперь каждая монетка должна корректно сохраняться в базу данных и накапливаться для каждого типа отдельно.

## Тестирование
1. Откройте консоль браузера (F12)
2. Кликайте на малыша несколько раз
3. Проверьте логи в консоли - должны появляться сообщения о сохранении монеток
4. Перезагрузите страницу - монетки должны сохраниться
