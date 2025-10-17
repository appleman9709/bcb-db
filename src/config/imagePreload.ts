// Конфигурация для предзагрузки изображений

export const IMAGE_PRELOAD_CONFIG = {
  // Критически важные изображения (загружаются первыми)
  critical: [
    '/icons/feeding.png',
    '/icons/poor.png',
    '/icons/bath.png',
    '/icons/sleep.png',
    '/icons/activity.png',
    '/icons/baby.png',
    '/icons/general.svg',
    '/icons/tamagochi.svg',
    '/icons/tetris.svg',
    '/icons/settings.svg',
  ],

  // Основные иконки действий
  actions: [
    '/icons/feeding.png',
    '/icons/poor.png',
    '/icons/bath.png',
    '/icons/sleep.png',
    '/icons/activity.png',
    '/icons/baby.png',
  ],

  // Иконки для тамагочи
  tamagotchi: [
    '/icons/sponge.png',
    '/icons/mom.png',
    '/icons/bag.png',
    '/icons/diaper.png',
  ],

  // Иконки для графиков и статистики
  charts: [
    '/icons/wight.png',
    '/icons/height.png',
    '/icons/clock.png',
  ],

  // SVG иконки для навигации
  navigation: [
    '/icons/general.svg',
    '/icons/tamagochi.svg',
    '/icons/tetris.svg',
    '/icons/settings.svg',
  ],

  // Иконки для модальных окон
  modals: [
    '/icons/sovet.png',
    '/icons/common.png',
    '/icons/angry.png',
    '/icons/still.png',
    '/icons/profile.png',
  ],

  // Дополнительные иконки
  additional: [
    '/icons/alarm.png',
    '/icons/all-in.gif',
    '/icons/belly.png',
    '/icons/dance.png',
    '/icons/dirty.gif',
    '/icons/eat.png',
    '/icons/family.png',
    '/icons/feeding.gif',
    '/icons/general.svg',
    '/icons/history.svg',
    '/icons/massage.png',
    '/icons/moon.png',
    '/icons/ok.gif',
    '/icons/old-bath.png',
    '/icons/old-feed.png',
    '/icons/old-pee.png',
    '/icons/poo.gif',
    '/icons/poo.png',
    '/icons/sleep3min.png',
    '/icons/sun.png',
    '/icons/tamagochi.svg',
    '/icons/tetris.svg',
    '/icons/walking.png',
  ],

  // Иконки приложения
  appIcons: [
    '/icons/icon-16x16.png',
    '/icons/icon-32x32.png',
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-180x180.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png',
    '/icons/icon.svg',
  ],
}

// Полный список всех изображений
export const ALL_IMAGES = [
  ...IMAGE_PRELOAD_CONFIG.critical,
  ...IMAGE_PRELOAD_CONFIG.actions,
  ...IMAGE_PRELOAD_CONFIG.tamagotchi,
  ...IMAGE_PRELOAD_CONFIG.charts,
  ...IMAGE_PRELOAD_CONFIG.navigation,
  ...IMAGE_PRELOAD_CONFIG.modals,
  ...IMAGE_PRELOAD_CONFIG.additional,
  ...IMAGE_PRELOAD_CONFIG.appIcons,
]

// Удаляем дубликаты
export const UNIQUE_IMAGES = [...new Set(ALL_IMAGES)]

// Настройки предзагрузки
export const PRELOAD_SETTINGS = {
  // Максимальное количество одновременных загрузок
  maxConcurrent: 10,
  
  // Таймаут для загрузки одного изображения (в миллисекундах)
  timeout: 10000,
  
  // Включить предзагрузку в продакшене
  enableInProduction: true,
  
  // Показывать прогресс в консоли
  logProgress: false,
}
