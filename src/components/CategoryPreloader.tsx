import { useEffect, useState } from 'react'
import { useImagePreloadContext } from '../contexts/ImagePreloadContext'
import { preloadImagesByCategory } from '../lib/lazyImageLoader'

interface CategoryPreloaderProps {
  category: string
  priority?: 'high' | 'medium' | 'low'
  delay?: number // Задержка перед началом загрузки (в мс)
}

export default function CategoryPreloader({ 
  category, 
  priority = 'medium',
  delay = 0 
}: CategoryPreloaderProps) {
  const { preloadImages } = useImagePreloadContext()

  useEffect(() => {
    const preloadCategory = async () => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      try {
        await preloadImagesByCategory(category)
      } catch (error) {
        console.warn(`Failed to preload images for category ${category}:`, error)
      }
    }

    preloadCategory()
  }, [category, priority, delay, preloadImages])

  return null // Компонент не рендерит ничего видимого
}

// Хук для предзагрузки изображений категории
export function useCategoryPreload(category: string, priority: 'high' | 'medium' | 'low' = 'medium') {
  const { preloadImages } = useImagePreloadContext()
  const [isPreloading, setIsPreloading] = useState(false)

  const preload = async () => {
    setIsPreloading(true)
    try {
      await preloadImagesByCategory(category)
    } catch (error) {
      console.warn(`Failed to preload images for category ${category}:`, error)
    } finally {
      setIsPreloading(false)
    }
  }

  return { preload, isPreloading }
}
