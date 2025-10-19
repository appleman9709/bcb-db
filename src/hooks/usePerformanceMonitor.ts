import { useEffect, useRef, useCallback } from 'react'

interface PerformanceMetrics {
  renderTime: number
  memoryUsage?: {
    used: number
    total: number
    limit: number
  }
  timestamp: number
}

interface PerformanceMonitorOptions {
  enableMemoryTracking?: boolean
  enableRenderTracking?: boolean
  logToConsole?: boolean
  maxEntries?: number
}

/**
 * Хук для мониторинга производительности компонентов
 * Отслеживает время рендера, использование памяти и другие метрики
 */
export function usePerformanceMonitor(
  componentName: string,
  options: PerformanceMonitorOptions = {}
) {
  const {
    enableMemoryTracking = true,
    enableRenderTracking = true,
    logToConsole = false,
    maxEntries = 100
  } = options

  const metricsRef = useRef<PerformanceMetrics[]>([])
  const renderStartRef = useRef<number>(0)
  const isFirstRenderRef = useRef(true)

  // Отслеживание начала рендера
  useEffect(() => {
    if (enableRenderTracking) {
      renderStartRef.current = performance.now()
    }
  })

  // Отслеживание окончания рендера
  useEffect(() => {
    if (enableRenderTracking && !isFirstRenderRef.current) {
      const renderTime = performance.now() - renderStartRef.current
      
      const metric: PerformanceMetrics = {
        renderTime,
        timestamp: Date.now()
      }

      // Добавляем информацию о памяти если доступно
      if (enableMemoryTracking && 'memory' in performance) {
        const memory = (performance as any).memory
        metric.memoryUsage = {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
        }
      }

      metricsRef.current.push(metric)

      // Ограничиваем количество записей
      if (metricsRef.current.length > maxEntries) {
        metricsRef.current = metricsRef.current.slice(-maxEntries)
      }

      if (logToConsole) {
        console.log(`[${componentName}] Render time: ${renderTime.toFixed(2)}ms`, metric.memoryUsage)
      }
    }
    
    isFirstRenderRef.current = false
  })

  const getMetrics = useCallback(() => {
    return metricsRef.current
  }, [])

  const getAverageRenderTime = useCallback(() => {
    const metrics = metricsRef.current
    if (metrics.length === 0) return 0
    
    const totalTime = metrics.reduce((sum, metric) => sum + metric.renderTime, 0)
    return totalTime / metrics.length
  }, [])

  const getMemoryStats = useCallback(() => {
    const metrics = metricsRef.current
    if (metrics.length === 0) return null

    const memoryMetrics = metrics.filter(m => m.memoryUsage)
    if (memoryMetrics.length === 0) return null

    const latest = memoryMetrics[memoryMetrics.length - 1]
    const average = memoryMetrics.reduce((sum, m) => {
      if (!m.memoryUsage) return sum
      return {
        used: sum.used + m.memoryUsage.used,
        total: sum.total + m.memoryUsage.total,
        limit: sum.limit + m.memoryUsage.limit
      }
    }, { used: 0, total: 0, limit: 0 })

    return {
      latest: latest.memoryUsage,
      average: {
        used: Math.round(average.used / memoryMetrics.length),
        total: Math.round(average.total / memoryMetrics.length),
        limit: Math.round(average.limit / memoryMetrics.length)
      }
    }
  }, [])

  const clearMetrics = useCallback(() => {
    metricsRef.current = []
  }, [])

  return {
    getMetrics,
    getAverageRenderTime,
    getMemoryStats,
    clearMetrics
  }
}

/**
 * Хук для отслеживания производительности асинхронных операций
 */
export function useAsyncPerformanceMonitor(operationName: string) {
  const startTimeRef = useRef<number>(0)
  const metricsRef = useRef<{ [key: string]: number[] }>({})

  const startOperation = useCallback(() => {
    startTimeRef.current = performance.now()
  }, [])

  const endOperation = useCallback((success: boolean = true) => {
    const duration = performance.now() - startTimeRef.current
    
    if (!metricsRef.current[operationName]) {
      metricsRef.current[operationName] = []
    }
    
    metricsRef.current[operationName].push(duration)
    
    console.log(`[${operationName}] ${success ? 'Success' : 'Failed'} in ${duration.toFixed(2)}ms`)
    
    return duration
  }, [operationName])

  const getOperationStats = useCallback(() => {
    const durations = metricsRef.current[operationName] || []
    if (durations.length === 0) return null

    const sorted = [...durations].sort((a, b) => a - b)
    const average = durations.reduce((sum, d) => sum + d, 0) / durations.length
    const median = sorted[Math.floor(sorted.length / 2)]
    const min = sorted[0]
    const max = sorted[sorted.length - 1]

    return {
      count: durations.length,
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100
    }
  }, [operationName])

  return {
    startOperation,
    endOperation,
    getOperationStats
  }
}

/**
 * Утилита для измерения производительности функций
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  name?: string
): T {
  return ((...args: any[]) => {
    const start = performance.now()
    const result = fn(...args)
    const end = performance.now()
    
    if (name) {
      console.log(`[${name}] Execution time: ${(end - start).toFixed(2)}ms`)
    }
    
    return result
  }) as T
}

/**
 * Утилита для измерения производительности асинхронных функций
 */
export function measureAsyncPerformance<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name?: string
): T {
  return (async (...args: any[]) => {
    const start = performance.now()
    const result = await fn(...args)
    const end = performance.now()
    
    if (name) {
      console.log(`[${name}] Async execution time: ${(end - start).toFixed(2)}ms`)
    }
    
    return result
  }) as T
}

/**
 * Глобальный мониторинг производительности приложения
 */
export class GlobalPerformanceMonitor {
  private static instance: GlobalPerformanceMonitor
  private metrics: Map<string, PerformanceMetrics[]> = new Map()
  private observers: ((metrics: Map<string, PerformanceMetrics[]>) => void)[] = []

  static getInstance(): GlobalPerformanceMonitor {
    if (!GlobalPerformanceMonitor.instance) {
      GlobalPerformanceMonitor.instance = new GlobalPerformanceMonitor()
    }
    return GlobalPerformanceMonitor.instance
  }

  addMetric(componentName: string, metric: PerformanceMetrics) {
    if (!this.metrics.has(componentName)) {
      this.metrics.set(componentName, [])
    }
    
    this.metrics.get(componentName)!.push(metric)
    
    // Уведомляем наблюдателей
    this.observers.forEach(observer => observer(this.metrics))
  }

  getMetrics(componentName?: string) {
    if (componentName) {
      return this.metrics.get(componentName) || []
    }
    return this.metrics
  }

  subscribe(observer: (metrics: Map<string, PerformanceMetrics[]>) => void) {
    this.observers.push(observer)
    
    return () => {
      const index = this.observers.indexOf(observer)
      if (index > -1) {
        this.observers.splice(index, 1)
      }
    }
  }

  clearMetrics(componentName?: string) {
    if (componentName) {
      this.metrics.delete(componentName)
    } else {
      this.metrics.clear()
    }
  }

  getSummary() {
    const summary: { [key: string]: any } = {}
    
    this.metrics.forEach((metrics, componentName) => {
      if (metrics.length === 0) return
      
      const renderTimes = metrics.map(m => m.renderTime)
      const averageRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length
      
      summary[componentName] = {
        renderCount: metrics.length,
        averageRenderTime: Math.round(averageRenderTime * 100) / 100,
        minRenderTime: Math.round(Math.min(...renderTimes) * 100) / 100,
        maxRenderTime: Math.round(Math.max(...renderTimes) * 100) / 100
      }
    })
    
    return summary
  }
}

// Экспортируем глобальный монитор
export const globalPerformanceMonitor = GlobalPerformanceMonitor.getInstance()
