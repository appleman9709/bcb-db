import { useRef, useCallback } from 'react'
import { dataService, type TetrisRecord } from '../services/dataService'

interface UseTetrisRecordCacheOptions {
  cacheDuration?: number // в миллисекундах
}

interface TetrisRecordCache {
  record: TetrisRecord | null
  lastLoadTime: number
}

export function useTetrisRecordCache(options: UseTetrisRecordCacheOptions = {}) {
  const { cacheDuration = 30000 } = options // 30 секунд по умолчанию
  
  const cacheRef = useRef<TetrisRecordCache>({
    record: null,
    lastLoadTime: 0
  })

  const loadBestRecord = useCallback(async (forceReload = false) => {
    // Проверяем кэш - если данные свежие и не требуется принудительная перезагрузка
    const now = Date.now()
    if (!forceReload && 
        cacheRef.current.record && 
        (now - cacheRef.current.lastLoadTime) < cacheDuration) {
      console.log('useTetrisRecordCache: Using cached best record')
      return cacheRef.current.record
    }

    try {
      const bestRecord = await dataService.getFamilyBestTetrisRecord()
      cacheRef.current = {
        record: bestRecord,
        lastLoadTime: now
      }
      return bestRecord
    } catch (error) {
      console.error('Error loading family best record:', error)
      return null
    }
  }, [cacheDuration])

  const updateCacheIfBetter = useCallback((newRecord: Omit<TetrisRecord, 'id' | 'family_id' | 'user_id' | 'created_at'>) => {
    const currentBest = cacheRef.current.record
    const shouldUpdate = !currentBest || newRecord.score > currentBest.score
    
    if (shouldUpdate) {
      console.log('useTetrisRecordCache: New record is better, updating cache')
      // Обновляем кэш с новым рекордом
      cacheRef.current = {
        record: {
          ...newRecord,
          id: Date.now(), // Временный ID для локального кэша
          family_id: 0, // Будет обновлено при следующей загрузке
          user_id: '', // Будет обновлено при следующей загрузке
          created_at: new Date().toISOString()
        },
        lastLoadTime: Date.now()
      }
      return true
    } else {
      console.log('useTetrisRecordCache: New record is not better, skipping update')
      return false
    }
  }, [])

  const clearCache = useCallback(() => {
    cacheRef.current = {
      record: null,
      lastLoadTime: 0
    }
  }, [])

  const getCachedRecord = useCallback(() => {
    return cacheRef.current.record
  }, [])

  return {
    loadBestRecord,
    updateCacheIfBetter,
    clearCache,
    getCachedRecord
  }
}
