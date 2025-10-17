import { createContext, useContext, useState, ReactNode } from 'react'
import { UNIQUE_IMAGES } from '../config/imagePreload'

interface ImagePreloadContextType {
  isPreloading: boolean
  preloadProgress: { loaded: number; total: number }
  handlePreloadComplete: () => void
  handlePreloadProgress: (loaded: number, total: number) => void
}

const ImagePreloadContext = createContext<ImagePreloadContextType | undefined>(undefined)

interface ImagePreloadProviderProps {
  children: ReactNode
}

export function ImagePreloadProvider({ children }: ImagePreloadProviderProps) {
  const [isPreloading, setIsPreloading] = useState(true)
  const [preloadProgress, setPreloadProgress] = useState({ loaded: 0, total: UNIQUE_IMAGES.length })

  const handlePreloadComplete = () => {
    setIsPreloading(false)
  }

  const handlePreloadProgress = (loaded: number, total: number) => {
    setPreloadProgress({ loaded, total })
  }

  return (
    <ImagePreloadContext.Provider
      value={{
        isPreloading,
        preloadProgress,
        handlePreloadComplete,
        handlePreloadProgress,
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
