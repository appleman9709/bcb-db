import { useState, useEffect, useCallback } from 'react'

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  key: string
}

/**
 * Хук для кэширования данных с автоматическим обновлением
 * Оптимизирует производительность за счет уменьшения запросов к БД
 */
export function useCachedData<T>(
  fetcher: () => Promise<T>,
  options: CacheOptions
) {
  const { ttl = 300000, key } = options // По умолчанию 5 минут
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await fetcher()
      setData(result)
      
      // Сохраняем в localStorage с временной меткой
      localStorage.setItem(key, JSON.stringify(result))
      localStorage.setItem(`${key}_time`, Date.now().toString())
      
    } catch (err) {
      setError(err as Error)
      console.error(`Error fetching cached data for ${key}:`, err)
    } finally {
      setLoading(false)
    }
  }, [fetcher, key])

  useEffect(() => {
    const loadData = async () => {
      try {
        // Проверяем кэш
        const cached = localStorage.getItem(key)
        const cachedTime = localStorage.getItem(`${key}_time`)
        
        if (cached && cachedTime) {
          const age = Date.now() - parseInt(cachedTime)
          
          if (age < ttl) {
            // Данные свежие, используем кэш
            setData(JSON.parse(cached))
            setLoading(false)
            return
          }
        }
        
        // Кэш устарел или отсутствует, загружаем новые данные
        await fetchData()
        
      } catch (err) {
        setError(err as Error)
        setLoading(false)
      }
    }

    loadData()
  }, [key, ttl, fetchData])

  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  const clearCache = useCallback(() => {
    localStorage.removeItem(key)
    localStorage.removeItem(`${key}_time`)
  }, [key])

  return {
    data,
    loading,
    error,
    refresh,
    clearCache
  }
}

/**
 * Хук для кэширования данных с зависимостями
 * Автоматически обновляет кэш при изменении зависимостей
 */
export function useCachedDataWithDeps<T>(
  fetcher: (deps: any[]) => Promise<T>,
  dependencies: any[],
  options: CacheOptions
) {
  const { ttl = 300000, key } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Создаем уникальный ключ кэша на основе зависимостей
  const cacheKey = `${key}_${dependencies.map(dep => 
    typeof dep === 'object' ? JSON.stringify(dep) : String(dep)
  ).join('_')}`

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await fetcher(dependencies)
      setData(result)
      
      // Сохраняем в localStorage с временной меткой
      localStorage.setItem(cacheKey, JSON.stringify(result))
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString())
      
    } catch (err) {
      setError(err as Error)
      console.error(`Error fetching cached data for ${cacheKey}:`, err)
    } finally {
      setLoading(false)
    }
  }, [fetcher, dependencies, cacheKey])

  useEffect(() => {
    const loadData = async () => {
      try {
        // Проверяем кэш
        const cached = localStorage.getItem(cacheKey)
        const cachedTime = localStorage.getItem(`${cacheKey}_time`)
        
        if (cached && cachedTime) {
          const age = Date.now() - parseInt(cachedTime)
          
          if (age < ttl) {
            // Данные свежие, используем кэш
            setData(JSON.parse(cached))
            setLoading(false)
            return
          }
        }
        
        // Кэш устарел или отсутствует, загружаем новые данные
        await fetchData()
        
      } catch (err) {
        setError(err as Error)
        setLoading(false)
      }
    }

    loadData()
  }, [cacheKey, ttl, fetchData])

  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  const clearCache = useCallback(() => {
    localStorage.removeItem(cacheKey)
    localStorage.removeItem(`${cacheKey}_time`)
  }, [cacheKey])

  return {
    data,
    loading,
    error,
    refresh,
    clearCache
  }
}

/**
 * Утилита для очистки всего кэша приложения
 */
export function clearAllCache() {
  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.includes('_time') || key.startsWith('cache_')) {
      localStorage.removeItem(key)
    }
  })
}

/**
 * Утилита для получения статистики кэша
 */
export function getCacheStats() {
  const keys = Object.keys(localStorage)
  const cacheKeys = keys.filter(key => !key.includes('_time'))
  const timeKeys = keys.filter(key => key.includes('_time'))
  
  const stats = cacheKeys.map(key => {
    const timeKey = `${key}_time`
    const cachedTime = localStorage.getItem(timeKey)
    
    if (cachedTime) {
      const age = Date.now() - parseInt(cachedTime)
      return {
        key,
        age: Math.round(age / 1000), // возраст в секундах
        size: localStorage.getItem(key)?.length || 0
      }
    }
    
    return null
  }).filter(Boolean)

  return {
    totalEntries: stats.length,
    totalSize: stats.reduce((sum, stat) => sum + (stat?.size || 0), 0),
    entries: stats
  }
}
