import React, { useState, useEffect, memo } from 'react'
import { globalPerformanceMonitor } from '../hooks/usePerformanceMonitor'

interface PerformanceStatsProps {
  className?: string
  showMemory?: boolean
  showRenderTime?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

/**
 * Компонент для отображения статистики производительности
 * Показывает метрики рендера, использование памяти и другую информацию
 */
const PerformanceStats = memo<PerformanceStatsProps>(({
  className = '',
  showMemory = true,
  showRenderTime = true,
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [stats, setStats] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updateStats = () => {
      const summary = globalPerformanceMonitor.getSummary()
      setStats(summary)
    }

    if (autoRefresh) {
      updateStats()
      const interval = setInterval(updateStats, refreshInterval)
      return () => clearInterval(interval)
    } else {
      updateStats()
    }
  }, [autoRefresh, refreshInterval])

  // Показываем статистику только в development режиме
  useEffect(() => {
    setIsVisible(process.env.NODE_ENV === 'development')
  }, [])

  if (!isVisible || !stats) {
    return null
  }

  const tamagotchiStats = stats.TamagotchiPage

  return (
    <div className={`fixed bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-3 rounded-lg font-mono z-50 ${className}`}>
      <div className="mb-2 font-bold text-green-400">Performance Stats</div>
      
      {showRenderTime && tamagotchiStats && (
        <div className="mb-1">
          <span className="text-blue-400">Render:</span> {tamagotchiStats.averageRenderTime}ms
          <span className="text-gray-400 ml-2">({tamagotchiStats.renderCount} renders)</span>
        </div>
      )}
      
      {showMemory && 'memory' in performance && (
        <div className="mb-1">
          <span className="text-yellow-400">Memory:</span> {Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB
          <span className="text-gray-400 ml-2">/ {Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)}MB</span>
        </div>
      )}
      
      <div className="text-gray-400 text-xs mt-1">
        FPS: {Math.round(1000 / (tamagotchiStats?.averageRenderTime || 16))}
      </div>
    </div>
  )
})

PerformanceStats.displayName = 'PerformanceStats'

export default PerformanceStats

/**
 * Хук для получения статистики производительности
 */
export function usePerformanceStats() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const updateStats = () => {
      const summary = globalPerformanceMonitor.getSummary()
      setStats(summary)
    }

    updateStats()
    const interval = setInterval(updateStats, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const getTamagotchiStats = () => {
    return stats?.TamagotchiPage || null
  }

  const getMemoryUsage = () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      }
    }
    return null
  }

  const getFPS = () => {
    const tamagotchiStats = getTamagotchiStats()
    if (tamagotchiStats?.averageRenderTime) {
      return Math.round(1000 / tamagotchiStats.averageRenderTime)
    }
    return null
  }

  return {
    stats,
    getTamagotchiStats,
    getMemoryUsage,
    getFPS
  }
}

/**
 * Компонент для отображения предупреждений о производительности
 */
interface PerformanceWarningProps {
  threshold?: {
    renderTime?: number
    memoryUsage?: number
    fps?: number
  }
  onWarning?: (type: string, value: number) => void
}

export const PerformanceWarning = memo<PerformanceWarningProps>(({
  threshold = {
    renderTime: 50,
    memoryUsage: 100,
    fps: 30
  },
  onWarning
}) => {
  const { getTamagotchiStats, getMemoryUsage, getFPS } = usePerformanceStats()

  useEffect(() => {
    const tamagotchiStats = getTamagotchiStats()
    const memoryUsage = getMemoryUsage()
    const fps = getFPS()

    if (tamagotchiStats?.averageRenderTime > (threshold.renderTime || 50)) {
      onWarning?.('renderTime', tamagotchiStats.averageRenderTime)
    }

    if (memoryUsage?.used && memoryUsage.used > (threshold.memoryUsage || 100)) {
      onWarning?.('memoryUsage', memoryUsage.used)
    }

    if (fps && fps < (threshold.fps || 30)) {
      onWarning?.('fps', fps)
    }
  }, [getTamagotchiStats, getMemoryUsage, getFPS, threshold, onWarning])

  return null
})

PerformanceWarning.displayName = 'PerformanceWarning'
