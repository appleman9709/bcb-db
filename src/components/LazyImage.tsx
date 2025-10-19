import React, { useState, useRef, useEffect, memo } from 'react'

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  placeholder?: string
  fallback?: string
  threshold?: number
  rootMargin?: string
  onLoad?: () => void
  onError?: () => void
}

/**
 * Компонент для ленивой загрузки изображений
 * Оптимизирует производительность за счет загрузки изображений только при необходимости
 */
const LazyImage = memo<LazyImageProps>(({
  src,
  alt,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xMiA2VjE4TTYgMTJIMTgiIHN0cm9rZT0iIzk5YTNhZiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+',
  fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZmVmMmYyIi8+CjxwYXRoIGQ9Ik0xMiA5VjE1TTkgMTJIMTUiIHN0cm9rZT0iI2VmNDQ0NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+',
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        threshold,
        rootMargin
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [threshold, rootMargin])

  useEffect(() => {
    if (isInView && !isLoaded && !isError) {
      const img = new Image()
      
      img.onload = () => {
        setImageSrc(src)
        setIsLoaded(true)
        onLoad?.()
      }
      
      img.onerror = () => {
        setImageSrc(fallback)
        setIsError(true)
        onError?.()
      }
      
      img.src = src
    }
  }, [isInView, src, fallback, isLoaded, isError, onLoad, onError])

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      {...props}
      style={{
        transition: 'opacity 0.3s ease-in-out',
        opacity: isLoaded ? 1 : 0.7,
        ...props.style
      }}
    />
  )
})

LazyImage.displayName = 'LazyImage'

export default LazyImage

/**
 * Хук для предзагрузки изображений
 */
export function useImagePreloader(urls: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    const preloadImages = async () => {
      const promises = urls.map(url => {
        if (loadedImages.has(url) || loadingImages.has(url) || errorImages.has(url)) {
          return Promise.resolve()
        }

        setLoadingImages(prev => new Set(prev).add(url))

        return new Promise<void>((resolve) => {
          const img = new Image()
          
          img.onload = () => {
            setLoadedImages(prev => new Set(prev).add(url))
            setLoadingImages(prev => {
              const newSet = new Set(prev)
              newSet.delete(url)
              return newSet
            })
            resolve()
          }
          
          img.onerror = () => {
            setErrorImages(prev => new Set(prev).add(url))
            setLoadingImages(prev => {
              const newSet = new Set(prev)
              newSet.delete(url)
              return newSet
            })
            resolve()
          }
          
          img.src = url
        })
      })

      await Promise.all(promises)
    }

    preloadImages()
  }, [urls, loadedImages, loadingImages, errorImages])

  return {
    loadedImages,
    loadingImages,
    errorImages,
    isLoaded: (url: string) => loadedImages.has(url),
    isLoading: (url: string) => loadingImages.has(url),
    hasError: (url: string) => errorImages.has(url)
  }
}

/**
 * Компонент для отображения прогресса загрузки изображений
 */
interface ImagePreloadProgressProps {
  total: number
  loaded: number
  className?: string
}

export const ImagePreloadProgress = memo<ImagePreloadProgressProps>(({
  total,
  loaded,
  className = ''
}) => {
  const progress = total > 0 ? (loaded / total) * 100 : 0

  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
      <div className="text-xs text-gray-600 mt-1 text-center">
        {loaded} / {total} изображений загружено ({Math.round(progress)}%)
      </div>
    </div>
  )
})

ImagePreloadProgress.displayName = 'ImagePreloadProgress'
