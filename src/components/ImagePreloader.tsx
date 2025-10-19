import { useEffect, useState } from 'react'
import { useImagePreloadContext } from '../contexts/ImagePreloadContext'
import { preloadImagesByCategory } from '../lib/lazyImageLoader'

interface ImagePreloaderProps {
  onComplete?: () => void
  onProgress?: (loaded: number, total: number) => void
  category?: string // Категория изображений для предзагрузки
  priority?: 'high' | 'medium' | 'low' // Приоритет загрузки
}

export default function ImagePreloader({ 
  onComplete, 
  onProgress, 
  category,
  priority = 'medium'
}: ImagePreloaderProps) {
  const [loadedCount, setLoadedCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const { handlePreloadComplete, handlePreloadProgress, getCacheStats } = useImagePreloadContext()

  useEffect(() => {
    if (!category) {
      // Если категория не указана, просто завершаем загрузку
      setIsComplete(true)
      handlePreloadComplete()
      onComplete?.()
      return
    }

    const preloadCategoryImages = async () => {
      try {
        await preloadImagesByCategory(category)
        
        // Обновляем прогресс на основе статистики кэша
        const stats = getCacheStats()
        setLoadedCount(stats.loaded)
        handlePreloadProgress(stats.loaded, stats.total)
        onProgress?.(stats.loaded, stats.total)
        
        setIsComplete(true)
        handlePreloadComplete()
        onComplete?.()
      } catch (error) {
        console.warn(`Failed to preload images for category ${category}:`, error)
        setIsComplete(true)
        handlePreloadComplete()
        onComplete?.()
      }
    }

    preloadCategoryImages()
  }, [category, priority, onComplete, onProgress, handlePreloadComplete, handlePreloadProgress, getCacheStats])

  return null // Компонент не рендерит ничего видимого
}

// Хук для использования предзагрузки изображений
export function useImagePreloader() {
  const context = useImagePreloadContext()
  return context
}

// Компонент для предзагрузки изображений по категориям
export function CategoryImagePreloader({ 
  category, 
  priority = 'medium',
  onComplete,
  onProgress 
}: {
  category: string
  priority?: 'high' | 'medium' | 'low'
  onComplete?: () => void
  onProgress?: (loaded: number, total: number) => void
}) {
  return (
    <ImagePreloader 
      category={category}
      priority={priority}
      onComplete={onComplete}
      onProgress={onProgress}
    />
  )
}
