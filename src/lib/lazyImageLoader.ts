// Ленивый загрузчик изображений с кэшированием
// Загружает изображения только при необходимости и кэширует их

interface ImageCache {
  [url: string]: {
    loaded: boolean
    loading: boolean
    promise?: Promise<void>
    error?: boolean
  }
}

class LazyImageLoader {
  private cache: ImageCache = {}
  private loadingQueue: string[] = []
  private maxConcurrent = 3 // Ограничиваем количество одновременных загрузок

  // Загружает изображение ленивым способом
  async loadImage(url: string): Promise<void> {
    // Если изображение уже загружено или загружается
    if (this.cache[url]) {
      if (this.cache[url].loaded) {
        return Promise.resolve()
      }
      if (this.cache[url].loading && this.cache[url].promise) {
        return this.cache[url].promise!
      }
    }

    // Создаем новую загрузку
    const promise = this.loadImageInternal(url)
    this.cache[url] = {
      loaded: false,
      loading: true,
      promise
    }

    return promise
  }

  // Внутренний метод загрузки изображения
  private async loadImageInternal(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      // Устанавливаем таймаут
      const timeout = setTimeout(() => {
        this.cache[url] = {
          loaded: false,
          loading: false,
          error: true
        }
        console.warn(`Image load timeout: ${url}`)
        resolve() // Продолжаем даже при таймауте
      }, 10000)

      img.onload = () => {
        clearTimeout(timeout)
        this.cache[url] = {
          loaded: true,
          loading: false
        }
        resolve()
      }

      img.onerror = () => {
        clearTimeout(timeout)
        this.cache[url] = {
          loaded: false,
          loading: false,
          error: true
        }
        console.warn(`Failed to load image: ${url}`)
        resolve() // Продолжаем даже при ошибке
      }

      img.src = url
    })
  }

  // Предзагружает изображения по приоритету
  async preloadImages(urls: string[], priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {
    const promises = urls.map(url => this.loadImage(url))
    
    // Для высокого приоритета загружаем все сразу
    if (priority === 'high') {
      await Promise.all(promises)
    } else {
      // Для среднего и низкого приоритета загружаем батчами
      const batchSize = priority === 'medium' ? 3 : 1
      for (let i = 0; i < promises.length; i += batchSize) {
        const batch = promises.slice(i, i + batchSize)
        await Promise.all(batch)
        
        // Небольшая пауза между батчами для снижения нагрузки
        if (i + batchSize < promises.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }
  }

  // Проверяет, загружено ли изображение
  isImageLoaded(url: string): boolean {
    return this.cache[url]?.loaded === true
  }

  // Проверяет, загружается ли изображение
  isImageLoading(url: string): boolean {
    return this.cache[url]?.loading === true
  }

  // Получает статус изображения
  getImageStatus(url: string): 'loaded' | 'loading' | 'error' | 'not-started' {
    const cached = this.cache[url]
    if (!cached) return 'not-started'
    if (cached.loaded) return 'loaded'
    if (cached.loading) return 'loading'
    if (cached.error) return 'error'
    return 'not-started'
  }

  // Очищает кэш
  clearCache(): void {
    this.cache = {}
  }

  // Получает статистику кэша
  getCacheStats(): { total: number; loaded: number; loading: number; errors: number } {
    const entries = Object.values(this.cache)
    return {
      total: entries.length,
      loaded: entries.filter(e => e.loaded).length,
      loading: entries.filter(e => e.loading).length,
      errors: entries.filter(e => e.error).length
    }
  }
}

// Создаем глобальный экземпляр
export const lazyImageLoader = new LazyImageLoader()

// Хук для использования ленивого загрузчика
export function useLazyImageLoader() {
  return {
    loadImage: (url: string) => lazyImageLoader.loadImage(url),
    preloadImages: (urls: string[], priority?: 'high' | 'medium' | 'low') => 
      lazyImageLoader.preloadImages(urls, priority),
    isImageLoaded: (url: string) => lazyImageLoader.isImageLoaded(url),
    isImageLoading: (url: string) => lazyImageLoader.isImageLoading(url),
    getImageStatus: (url: string) => lazyImageLoader.getImageStatus(url),
    getCacheStats: () => lazyImageLoader.getCacheStats(),
    clearCache: () => lazyImageLoader.clearCache()
  }
}

// Утилита для предзагрузки критически важных изображений
export async function preloadCriticalImages(): Promise<void> {
  const criticalImages = [
    '/icons/baby.png',
    '/icons/feeding.png',
    '/icons/poor.png',
    '/icons/bath.png',
    '/icons/sleep.png',
    '/icons/activity.png',
    '/icons/general.svg',
    '/icons/tamagochi.svg',
    '/icons/tetris.svg',
    '/icons/settings.svg',
  ]
  
  await lazyImageLoader.preloadImages(criticalImages, 'high')
}

// Утилита для предзагрузки изображений по категориям
export async function preloadImagesByCategory(category: string): Promise<void> {
  const categoryImages: { [key: string]: string[] } = {
    actions: [
      '/icons/feeding.png',
      '/icons/poor.png',
      '/icons/bath.png',
      '/icons/sleep.png',
      '/icons/activity.png',
      '/icons/baby.png',
    ],
    tamagotchi: [
      '/icons/sponge.png',
      '/icons/mom.png',
      '/icons/bag.png',
      '/icons/diaper.png',
    ],
    charts: [
      '/icons/wight.png',
      '/icons/height.png',
      '/icons/clock.png',
    ],
    navigation: [
      '/icons/general.svg',
      '/icons/tamagochi.svg',
      '/icons/tetris.svg',
      '/icons/settings.svg',
    ],
    modals: [
      '/icons/sovet.png',
      '/icons/common.png',
      '/icons/angry.png',
      '/icons/still.png',
      '/icons/profile.png',
    ]
  }
  
  const images = categoryImages[category] || []
  if (images.length > 0) {
    await lazyImageLoader.preloadImages(images, 'medium')
  }
}
