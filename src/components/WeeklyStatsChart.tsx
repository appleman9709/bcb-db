import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import { dataService } from '../services/dataService'

interface DailyData {
  day: string
  feedings: number
  diapers: number
  poo: number
  date: Date
}

interface WeeklyStatsChartProps {
  type: 'feedings' | 'diapers' | 'poo'
  onClose: () => void
}

export default function WeeklyStatsChart({ type, onClose }: WeeklyStatsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDailyData()
  }, [])

  const palette = useMemo(() => {
    switch (type) {
      case 'feedings':
        return {
          gradient: 'from-blue-500 via-indigo-500 to-purple-500',
          baseColor: '#60a5fa',
          highlightColor: '#2563eb',
          legend: 'Кормления',
          emoji: '🍼'
        }
      case 'diapers':
        return {
          gradient: 'from-emerald-500 to-lime-500',
          baseColor: '#34d399',
          highlightColor: '#059669',
          legend: 'Смены подгузника',
          emoji: '🧷'
        }
      case 'poo':
      default:
        return {
          gradient: 'from-amber-500 to-orange-500',
          baseColor: '#fbbf24',
          highlightColor: '#d97706',
          legend: 'Грязные подгузники',
          emoji: '🧻'
        }
    }
  }, [type])

  const values = useMemo(() => {
    return dailyData.map((entry) => {
      if (type === 'feedings') return entry.feedings
      if (type === 'diapers') return entry.diapers
      return entry.poo
    })
  }, [dailyData, type])

  const summary = useMemo(() => {
    if (!dailyData.length) {
      return null
    }

    const total = values.reduce((acc, value) => acc + value, 0)
    const average = values.length ? total / values.length : 0
    const peakValue = Math.max(...values)
    const peakIndex = values.indexOf(peakValue)

    return {
      total,
      average: Math.round(average * 10) / 10,
      last: values[values.length - 1] ?? 0,
      peak: {
        value: peakValue,
        label: peakIndex >= 0
          ? dailyData[peakIndex].date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
          : '—'
      }
    }
  }, [dailyData, values])

  const fetchDailyData = async () => {
    try {
      setLoading(true)
      
      // Calculate date range for the last 14 days
      const now = new Date()
      const startDate = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(now)
      endDate.setHours(23, 59, 59, 999)

      // Fetch all data for the date range in one optimized call
      const { feedings, diapers } = await dataService.getWeeklyStatsData(startDate, endDate)

      // Group data by day
      const daysMap = new Map<string, { feedings: number; diapers: number; poo: number }>()
      
      // Initialize days map
      for (let i = 13; i >= 0; i--) {
        const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        dayStart.setHours(0, 0, 0, 0)
        const dayKey = dayStart.toDateString()
        
        daysMap.set(dayKey, { feedings: 0, diapers: 0, poo: 0 })
      }

      // Count feedings by day
      feedings.forEach(feeding => {
        const feedingDate = new Date(feeding.timestamp)
        feedingDate.setHours(0, 0, 0, 0)
        const dayKey = feedingDate.toDateString()
        
        const dayData = daysMap.get(dayKey)
        if (dayData) {
          dayData.feedings++
        }
      })

      // Count diapers and poo by day
      diapers.forEach(diaper => {
        const diaperDate = new Date(diaper.timestamp)
        diaperDate.setHours(0, 0, 0, 0)
        const dayKey = diaperDate.toDateString()
        
        const dayData = daysMap.get(dayKey)
        if (dayData) {
          dayData.diapers++
          if (diaper.diaper_type === 'Покакал') {
            dayData.poo++
          }
        }
      })

      // Convert map to array for display
      const days: DailyData[] = []
      for (let i = 13; i >= 0; i--) {
        const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        dayStart.setHours(0, 0, 0, 0)
        const dayKey = dayStart.toDateString()
        
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dayLabel = i === 0
          ? 'Сегодня'
          : dayStart.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
        
        const data = daysMap.get(dayKey) || { feedings: 0, diapers: 0, poo: 0 }
        
        days.push({
          day: dayLabel,
          feedings: data.feedings,
          diapers: data.diapers,
          poo: data.poo,
          date: new Date(dayStart)
        })
      }

      setDailyData(days)
    } catch (error) {
      console.error('Error fetching daily data:', error)
    } finally {
      setLoading(false)
    }
  }

  const drawRoundedBar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    const clampedRadius = Math.min(radius, width / 2, height)
    ctx.beginPath()
    ctx.moveTo(x, y + height)
    ctx.lineTo(x, y + clampedRadius)
    ctx.quadraticCurveTo(x, y, x + clampedRadius, y)
    ctx.lineTo(x + width - clampedRadius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + clampedRadius)
    ctx.lineTo(x + width, y + height)
    ctx.closePath()
    ctx.fill()
  }

  const drawChart = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!dailyData.length) return

    ctx.clearRect(0, 0, width, height)

    const padding = {
      top: 28,
      right: 20,
      bottom: 56,
      left: 46
    }

    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom
    const maxValue = Math.max(...values, 1)
    const gridLines = Math.min(5, Math.max(2, maxValue))

    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 6])

    for (let i = 0; i <= gridLines; i++) {
      const ratio = i / gridLines
      const yPosition = padding.top + chartHeight - ratio * chartHeight

      ctx.beginPath()
      ctx.moveTo(padding.left, yPosition)
      ctx.lineTo(width - padding.right, yPosition)
      ctx.stroke()

      const gridValue = Math.round(maxValue * ratio)
      ctx.setLineDash([])
      ctx.fillStyle = '#9ca3af'
      ctx.font = '500 10px "Inter", sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(gridValue.toString(), padding.left - 10, yPosition)
      ctx.setLineDash([4, 6])
    }

    ctx.setLineDash([])

    const segmentWidth = chartWidth / dailyData.length
    const barWidth = Math.min(26, segmentWidth * 0.65)
    const barOffset = (segmentWidth - barWidth) / 2
    const labelFrequency = 2
    const penultimateIndex = Math.max(dailyData.length - 2, -1)

    dailyData.forEach((entry, index) => {
      const value = values[index]
      const ratio = maxValue ? value / maxValue : 0
      const barHeight = ratio * chartHeight
      const x = padding.left + index * segmentWidth + barOffset
      const y = padding.top + chartHeight - barHeight
      const isLatest = index === dailyData.length - 1
      const shouldShowLabel = index % labelFrequency === 0 || isLatest

      ctx.fillStyle = isLatest ? palette.highlightColor : palette.baseColor
      drawRoundedBar(ctx, x, y, barWidth, barHeight, 6)

      if (value > 0) {
        ctx.fillStyle = '#0f172a'
        ctx.font = '600 11px "Inter", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(value.toString(), x + barWidth / 2, y - 6)
      }
      if (shouldShowLabel && index !== penultimateIndex) {
        ctx.fillStyle = '#6b7280'
        ctx.font = '600 10px "Inter", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(
          entry.date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
          x + barWidth / 2,
          padding.top + chartHeight + 8
        )
      }
    })
  }, [dailyData, palette.baseColor, palette.highlightColor, values])

  const renderChart = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || !dailyData.length) return

    const bounds = container.getBoundingClientRect()
    const displayWidth = Math.min(620, Math.max(bounds.width, 280))
    const displayHeight = Math.min(360, Math.max(240, displayWidth * 0.6))
    const devicePixelRatio = window.devicePixelRatio || 1

    canvas.width = displayWidth * devicePixelRatio
    canvas.height = displayHeight * devicePixelRatio
    canvas.style.width = `${displayWidth}px`
    canvas.style.height = `${displayHeight}px`

    const context = canvas.getContext('2d')
    if (!context) return

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.scale(devicePixelRatio, devicePixelRatio)

    drawChart(context, displayWidth, displayHeight)
  }, [dailyData.length, drawChart])

  useEffect(() => {
    if (!dailyData.length) return

    renderChart()

    const container = containerRef.current
    if (!container) return

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => renderChart())
      observer.observe(container)
      return () => observer.disconnect()
    }

    window.addEventListener('resize', renderChart)
    return () => window.removeEventListener('resize', renderChart)
  }, [dailyData, renderChart])

  const getTitle = () => {
    switch (type) {
      case 'feedings': return 'Кормления за 14 дней'
      case 'diapers': return 'Смены подгузника за 14 дней'
      case 'poo': return 'Грязные подгузники за 14 дней'
      default: return 'Актуальная статистика'
    }
  }

  const getLegendLabel = () => {
    switch (type) {
      case 'feedings': return 'Количество кормлений'
      case 'diapers': return 'Количество смен подгузника'
      case 'poo': return 'Количество грязных подгузников'
      default: return ''
    }
  }

  return (
    <Modal isOpen onClose={onClose} size="lg">
      {loading ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm font-medium text-gray-500">Загружаем данные...</span>
        </div>
      ) : (
        <div className="space-y-3">
          <header className={`rounded-2xl bg-gradient-to-br ${palette.gradient} p-3 text-white shadow-lg sm:p-4`}>
            <div className="flex justify-center gap-3 items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-2xl">
                {palette.emoji}
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold leading-tight sm:text-base">{getTitle()}</h2>
              </div>
            </div>
          </header>

          {summary && (
            <section className="grid grid-cols-3 gap-2 rounded-3xl border border-gray-100 p-2 text-center shadow-sm sm:gap-2 sm:p-3">
              <div className="space-y-0.5">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">Итого</span>
                <span className="text-base font-semibold text-gray-900 sm:text-lg">{summary.total}</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">В день</span>
                <span className="text-base font-semibold text-gray-900 sm:text-lg">{summary.average}</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">Пиковый день</span>
                <span className="text-base font-semibold text-gray-900 sm:text-lg">
                  {summary.peak.value}
                </span>
                <span className="text-[10px] font-medium text-emerald-600">{summary.peak.label}</span>
              </div>
            </section>
          )}

          <section ref={containerRef} className="rounded-3xl border border-gray-100 bg-white p-2 shadow-sm sm:p-3 overflow-x-hidden">
            <div className="w-full overflow-x-hidden">
              <canvas ref={canvasRef} className="w-full" />
            </div>
          </section>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-2 text-xs text-blue-700 shadow-inner sm:text-sm">
            {summary && summary.last > 0
              ? `Вчера записано ${summary.last} ${palette.legend.toLowerCase()} — отличный результат!`
              : 'За последние сутки нет новых записей — самое время добавить свежие данные.'}
          </div>
        </div>
      )}
    </Modal>
  )
}