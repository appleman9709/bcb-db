import React, { useEffect, useRef, useState } from 'react'
import { dataService } from '../services/dataService'
import type { Feeding, Diaper } from '../services/dataService'

interface DailyData {
  day: string
  feedings: number
  diapers: number
  poo: number
}

interface WeeklyStatsChartProps {
  type: 'feedings' | 'diapers' | 'poo'
  onClose: () => void
}

export default function WeeklyStatsChart({ type, onClose }: WeeklyStatsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDailyData()
  }, [])

  useEffect(() => {
    if (canvasRef.current && dailyData.length > 0) {
      drawChart()
    }
  }, [dailyData])

  const fetchDailyData = async () => {
    try {
      setLoading(true)
      const now = new Date()
      const days: DailyData[] = []

      // Получаем данные за последние 14 дней
      for (let i = 13; i >= 0; i--) {
        // Вычисляем начало дня (i дней назад от текущего момента)
        const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        dayStart.setHours(0, 0, 0, 0)
        
        // Вычисляем конец дня
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
        
        // Этикетка для дня (формат: DD.MM для прошлых дней, "Сегодня" для текущего дня)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dayLabel = i === 0 
          ? 'Сегодня' 
          : dayStart.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
        
        // Получаем данные кормлений
        const feedings = await dataService.getFeedingsForDateRange(dayStart, dayEnd)
        
        // Получаем данные подгузников
        const diapers = await dataService.getDiapersForDateRange(dayStart, dayEnd)
        
        // Считаем покакал
        const poo = diapers.filter(d => d.diaper_type === 'Покакал').length
        
        days.push({
          day: dayLabel,
          feedings: feedings.length,
          diapers: diapers.length,
          poo: poo
        })
      }

      setDailyData(days)
    } catch (error) {
      console.error('Error fetching daily data:', error)
    } finally {
      setLoading(false)
    }
  }

  const drawChart = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const padding = 50
    const chartWidth = canvas.width - padding * 2
    const chartHeight = canvas.height - padding * 2
    const barWidth = (chartWidth / dailyData.length) * 0.6
    const barSpacing = (chartWidth / dailyData.length) * 0.4

    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Находим максимальное значение для масштабирования
    const maxValue = Math.max(...dailyData.map(d => 
      type === 'feedings' ? d.feedings : 
      type === 'diapers' ? d.diapers : d.poo
    ), 1)

    // Рисуем оси
    ctx.strokeStyle = '#ccc'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, canvas.height - padding)
    ctx.lineTo(canvas.width - padding, canvas.height - padding)
    ctx.stroke()

    // Рисуем столбцы
    dailyData.forEach((data, index) => {
      const value = type === 'feedings' ? data.feedings : type === 'diapers' ? data.diapers : data.poo
      const barHeight = (value / maxValue) * chartHeight
      const x = padding + index * (barWidth + barSpacing)
      const y = canvas.height - padding - barHeight

      // Цвет зависит от типа графика
      let color = '#3b82f6' // blue for feedings
      if (type === 'diapers') color = '#10b981' // green for diapers
      if (type === 'poo') color = '#f59e0b' // amber for poo

      // Рисуем столбец
      ctx.fillStyle = color
      ctx.fillRect(x, y, barWidth, barHeight)

      // Текст под столбцом (день)
      ctx.fillStyle = '#666'
      ctx.font = '9px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const dayLabel = data.day.length > 8 ? data.day.substring(0, 8) : data.day
      ctx.fillText(dayLabel, x + barWidth / 2, canvas.height - padding + 5)

      // Число над столбцом (только если больше 0)
      if (value > 0) {
        ctx.fillStyle = '#333'
        ctx.font = 'bold 10px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(value.toString(), x + barWidth / 2, y - 5)
      }
    })

    // Рисуем горизонтальные линии для значений
    const gridLines = 5
    for (let i = 0; i <= gridLines; i++) {
      const yPos = canvas.height - padding - (i / gridLines) * chartHeight
      const value = Math.round((i / gridLines) * maxValue)
      
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(padding - 5, yPos)
      ctx.lineTo(canvas.width - padding, yPos)
      ctx.stroke()

      ctx.fillStyle = '#999'
      ctx.font = '10px Arial'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(value.toString(), padding - 10, yPos)
    }
  }

  const getTitle = () => {
    switch (type) {
      case 'feedings': return 'Кормления за 14 дней'
      case 'diapers': return 'Смена подгузника за 14 дней'
      case 'poo': return 'Покакал за 14 дней'
      default: return 'Статистика за 14 дней'
    }
  }

  const getEmoji = () => {
    switch (type) {
      case 'feedings': return '🍼'
      case 'diapers': return '🧷'
      case 'poo': return '💩'
      default: return '📊'
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
        <div className="bg-white rounded-3xl max-w-lg w-full p-4 animate-bounce-in">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Загружаем данные...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-bounce-in">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getEmoji()}</span>
              <h2 className="text-lg font-bold text-gray-900">{getTitle()}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <canvas 
            ref={canvasRef} 
            width={600} 
            height={300}
            className="w-full h-auto"
          />
          
          {/* Легенда */}
          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center gap-2">
              {type === 'feedings' && (
                <>
                  <div className="w-4 h-4 rounded bg-blue-500"></div>
                  <span className="text-sm text-gray-600">Кормления</span>
                </>
              )}
              {type === 'diapers' && (
                <>
                  <div className="w-4 h-4 rounded bg-green-500"></div>
                  <span className="text-sm text-gray-600">Подгузники</span>
                </>
              )}
              {type === 'poo' && (
                <>
                  <div className="w-4 h-4 rounded bg-amber-500"></div>
                  <span className="text-sm text-gray-600">Покакал</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

