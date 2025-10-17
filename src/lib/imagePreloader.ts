import { useEffect, useState } from 'react'
import { IMAGE_PRELOAD_CONFIG } from '../config/imagePreload'

// Утилита для предзагрузки изображений в фоновом режиме
export function preloadImages(imageUrls: string[]): Promise<void[]> {
  const preloadPromises = imageUrls.map((url) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => resolve()
      img.onerror = () => {
        console.warn(`Failed to preload image: ${url}`)
        resolve() // Продолжаем даже если изображение не загрузилось
      }
      
      img.src = url
    })
  })
  
  return Promise.all(preloadPromises)
}

// Хук для предзагрузки изображений с состоянием
export function useImagePreload(imageUrls: string[]) {
  const [isLoading, setIsLoading] = useState(true)
  const [loadedCount, setLoadedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (imageUrls.length === 0) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadedCount(0)
    setError(null)

    let loaded = 0
    const total = imageUrls.length

    const preloadImage = (url: string): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image()
        
        img.onload = () => {
          loaded++
          setLoadedCount(loaded)
          resolve()
        }
        
        img.onerror = () => {
          console.warn(`Failed to preload image: ${url}`)
          loaded++
          setLoadedCount(loaded)
          resolve()
        }
        
        img.src = url
      })
    }

    Promise.all(imageUrls.map(preloadImage))
      .then(() => {
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [imageUrls])

  return {
    isLoading,
    loadedCount,
    totalCount: imageUrls.length,
    progress: imageUrls.length > 0 ? (loadedCount / imageUrls.length) * 100 : 100,
    error
  }
}

// Компонент для предзагрузки критически важных изображений
export function CriticalImagePreloader() {
  const { isLoading, progress } = useImagePreload(IMAGE_PRELOAD_CONFIG.critical)

  // Этот компонент не рендерит ничего видимого
  return null
}
