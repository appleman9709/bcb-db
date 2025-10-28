import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { lazyImageLoader, preloadCriticalImages } from '../lib/lazyImageLoader'

interface ImagePreloadContextType {
  isPreloading: boolean
  preloadProgress: { loaded: number; total: number }
  handlePreloadComplete: () => void
  handlePreloadProgress: (loaded: number, total: number) => void
  loadImage: (url: string) => Promise<void>
  preloadImages: (urls: string[], priority?: 'high' | 'medium' | 'low') => Promise<void>
  isImageLoaded: (url: string) => boolean
  isImageLoading: (url: string) => boolean
  getImageStatus: (url: string) => 'loaded' | 'loading' | 'error' | 'not-started'
  getCacheStats: () => { total: number; loaded: number; loading: number; errors: number }
}

const ImagePreloadContext = createContext<ImagePreloadContextType | undefined>(undefined)

interface ImagePreloadProviderProps {
  children: ReactNode
}

export function ImagePreloadProvider({ children }: ImagePreloadProviderProps) {
  const [isPreloading, setIsPreloading] = useState(true)
  const [preloadProgress, setPreloadProgress] = useState({ loaded: 0, total: 10 }) // Только критические изображения

  // Загружаем только критические изображения при инициализации
  useEffect(() => {
    const initializeCriticalImages = async () => {
      try {
        await preloadCriticalImages()
        setIsPreloading(false)
        setPreloadProgress({ loaded: 10, total: 10 })
      } catch (error) {
        console.warn('Failed to preload critical images:', error)
        setIsPreloading(false)
        setPreloadProgress({ loaded: 10, total: 10 })
      }
    }

    initializeCriticalImages()
  }, [])

  const handlePreloadComplete = () => {
    setIsPreloading(false)
  }

  const handlePreloadProgress = (loaded: number, total: number) => {
    setPreloadProgress({ loaded, total })
  }

  const loadImage = (url: string) => lazyImageLoader.loadImage(url)
  const preloadImages = (urls: string[], priority?: 'high' | 'medium' | 'low') => 
    lazyImageLoader.preloadImages(urls, priority)
  const isImageLoaded = (url: string) => lazyImageLoader.isImageLoaded(url)
  const isImageLoading = (url: string) => lazyImageLoader.isImageLoading(url)
  const getImageStatus = (url: string) => lazyImageLoader.getImageStatus(url)
  const getCacheStats = () => lazyImageLoader.getCacheStats()

  return (
    <ImagePreloadContext.Provider
      value={{
        isPreloading,
        preloadProgress,
        handlePreloadComplete,
        handlePreloadProgress,
        loadImage,
        preloadImages,
        isImageLoaded,
        isImageLoading,
        getImageStatus,
        getCacheStats,
      }}
    >
      {children}
    </ImagePreloadContext.Provider>
  )
}

export function useImagePreloadContext() {
  const context = useContext(ImagePreloadContext)
  if (context === undefined) {
    throw new Error('useImagePreloadContext must be used within an ImagePreloadProvider')
  }
  return context
}
