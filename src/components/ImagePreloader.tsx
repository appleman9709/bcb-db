import { useEffect, useState } from 'react'
import { UNIQUE_IMAGES, PRELOAD_SETTINGS } from '../config/imagePreload'
import { useImagePreloadContext } from '../contexts/ImagePreloadContext'

interface ImagePreloaderProps {
  onComplete?: () => void
  onProgress?: (loaded: number, total: number) => void
}

export default function ImagePreloader({ onComplete, onProgress }: ImagePreloaderProps) {
  const [loadedCount, setLoadedCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const { handlePreloadComplete, handlePreloadProgress } = useImagePreloadContext()

  useEffect(() => {
    let loaded = 0
    const total = UNIQUE_IMAGES.length

    const preloadImage = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        
        // Устанавливаем таймаут для загрузки
        const timeout = setTimeout(() => {
          loaded++
          setLoadedCount(loaded)
          handlePreloadProgress(loaded, total)
          onProgress?.(loaded, total)
          
          if (loaded === total) {
            setIsComplete(true)
            handlePreloadComplete()
            onComplete?.()
          }
          resolve()
        }, PRELOAD_SETTINGS.timeout)
        
        img.onload = () => {
          clearTimeout(timeout)
          loaded++
          setLoadedCount(loaded)
          handlePreloadProgress(loaded, total)
          onProgress?.(loaded, total)
          
          if (loaded === total) {
            setIsComplete(true)
            handlePreloadComplete()
            onComplete?.()
          }
          resolve()
        }
        
        img.onerror = () => {
          clearTimeout(timeout)
          loaded++
          setLoadedCount(loaded)
          handlePreloadProgress(loaded, total)
          onProgress?.(loaded, total)
          
          if (loaded === total) {
            setIsComplete(true)
            handlePreloadComplete()
            onComplete?.()
          }
          resolve() // Продолжаем даже если изображение не загрузилось
        }
        
        img.src = src
      })
    }

    // Предзагружаем изображения с ограничением по количеству одновременных загрузок
    const preloadInBatches = async () => {
      const batches = []
      for (let i = 0; i < UNIQUE_IMAGES.length; i += PRELOAD_SETTINGS.maxConcurrent) {
        const batch = UNIQUE_IMAGES.slice(i, i + PRELOAD_SETTINGS.maxConcurrent)
        batches.push(batch)
      }

      for (const batch of batches) {
        await Promise.all(batch.map(preloadImage))
      }
    }

    preloadInBatches()

    // Очистка при размонтировании компонента
    return () => {
      // Очистка не требуется, так как изображения остаются в кэше браузера
    }
  }, [onComplete, onProgress, handlePreloadComplete, handlePreloadProgress])

  return null // Компонент не рендерит ничего видимого
}

// Хук для использования предзагрузки изображений
export function useImagePreloader() {
  const context = useImagePreloadContext()
  return context
}
