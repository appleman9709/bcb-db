import { useImagePreloadContext } from '../contexts/ImagePreloadContext'

interface PreloadProgressProps {
  className?: string
}

export default function PreloadProgress({ className = '' }: PreloadProgressProps) {
  const { isPreloading, preloadProgress } = useImagePreloadContext()

  if (!isPreloading) return null

  const progressPercentage = (preloadProgress.loaded / preloadProgress.total) * 100

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 font-medium min-w-[60px]">
        {preloadProgress.loaded}/{preloadProgress.total}
      </span>
    </div>
  )
}
