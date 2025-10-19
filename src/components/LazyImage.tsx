import { useEffect, useState } from 'react'
import { useImagePreloadContext } from '../contexts/ImagePreloadContext'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  fallback?: string
  priority?: 'high' | 'medium' | 'low'
  onLoad?: () => void
  onError?: () => void
}

export default function LazyImage({ 
  src, 
  alt, 
  className = '', 
  fallback = '/icons/baby.png',
  priority = 'medium',
  onLoad,
  onError 
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState(src)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const { loadImage, isImageLoaded, isImageLoading } = useImagePreloadContext()

  useEffect(() => {
    const loadImageLazy = async () => {
      try {
        setIsLoading(true)
        setHasError(false)
        
        // Проверяем, загружено ли изображение уже
        if (isImageLoaded(src)) {
          setIsLoading(false)
          onLoad?.()
          return
        }

        // Загружаем изображение с указанным приоритетом
        await loadImage(src)
        
        // Проверяем статус после загрузки
        if (isImageLoaded(src)) {
          setImageSrc(src)
          setIsLoading(false)
          onLoad?.()
        } else {
          throw new Error('Image failed to load')
        }
      } catch (error) {
        console.warn(`Failed to load image ${src}:`, error)
        setHasError(true)
        setImageSrc(fallback)
        setIsLoading(false)
        onError?.()
      }
    }

    loadImageLazy()
  }, [src, priority, loadImage, isImageLoaded, fallback, onLoad, onError])

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoading ? 'opacity-50' : 'opacity-100'} transition-opacity duration-200`}
      style={{
        filter: hasError ? 'grayscale(100%)' : 'none'
      }}
    />
  )
}

// Хук для предзагрузки изображений при необходимости
export function useLazyImagePreload(urls: string[], priority: 'high' | 'medium' | 'low' = 'medium') {
  const { preloadImages } = useImagePreloadContext()
  const [isPreloading, setIsPreloading] = useState(false)

  const preload = async () => {
    if (urls.length === 0) return
    
    setIsPreloading(true)
    try {
      await preloadImages(urls, priority)
    } catch (error) {
      console.warn('Failed to preload images:', error)
    } finally {
      setIsPreloading(false)
    }
  }

  return { preload, isPreloading }
}
