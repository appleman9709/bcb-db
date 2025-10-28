import React, { useEffect, useMemo, useState } from 'react'
import { dataService, GrowthMeasurement } from '../services/dataService'
import { useAuth } from '../contexts/AuthContext'

type Measurement = {
  month: number
  value: number
}

export type GrowthCurve = {
  label: string
  color: string
  values: number[]
}

interface GrowthChartCardProps {
  measurementType: 'height' | 'weight'
  title: string
  unit: string
  description?: string
  whoCurves: GrowthCurve[]
  yAxisLabel: string
  valuePrecision?: number
  babyAgeMonths?: number
  compact?: boolean
}

const MONTH_LABELS = [
  '0 мес',
  '1 мес',
  '2 мес',
  '3 мес',
  '4 мес',
  '5 мес',
  '6 мес',
  '7 мес',
  '8 мес',
  '9 мес',
  '10 мес',
  '11 мес',
  '12 мес'
]

const MONTH_OPTIONS = MONTH_LABELS.map((label, value) => ({ label, value }))
const MAX_MONTH = MONTH_LABELS.length - 1

export const WHO_HEIGHT_CURVES: GrowthCurve[] = [
  {
    label: '3-й перцентиль (ВОЗ)',
    color: '#93c5fd',
    values: [
      46.1, 50.8, 54.4, 57.3, 59.7, 61.7, 63.3, 64.8, 66.2, 67.5, 68.7, 69.9, 71
    ]
  },
  {
    label: '50-й перцентиль (ВОЗ)',
    color: '#2563eb',
    values: [
      49.9, 54.7, 58.4, 61.4, 63.9, 65.9, 67.6, 69.2, 70.6, 72, 73.3, 74.5, 75.7
    ]
  },
  {
    label: '97-й перцентиль (ВОЗ)',
    color: '#1e3a8a',
    values: [
      53.7, 58.7, 62.4, 65.5, 68, 70.1, 71.9, 73.5, 75, 76.5, 77.9, 79.2, 80.5
    ]
  }
]

export const WHO_WEIGHT_CURVES: GrowthCurve[] = [
  {
    label: '3-й перцентиль (ВОЗ)',
    color: '#fbcfe8',
    values: [
      2.5, 3.4, 4.3, 5, 5.6, 6.1, 6.4, 6.7, 6.9, 7.1, 7.4, 7.6, 7.7
    ]
  },
  {
    label: '50-й перцентиль (ВОЗ)',
    color: '#ec4899',
    values: [
      3.3, 4.5, 5.6, 6.4, 7, 7.5, 7.9, 8.3, 8.6, 8.9, 9.2, 9.4, 9.6
    ]
  },
  {
    label: '97-й перцентиль (ВОЗ)',
    color: '#be185d',
    values: [
      4.4, 5.8, 7.1, 8, 8.7, 9.3, 9.8, 10.3, 10.7, 11, 11.4, 11.7, 12
    ]
  }
]

const DEFAULT_VALUE_PRECISION = 1

export default function GrowthChartCard({
  measurementType,
  title,
  unit,
  description,
  whoCurves,
  yAxisLabel,
  valuePrecision = DEFAULT_VALUE_PRECISION,
  babyAgeMonths,
  compact = false
}: GrowthChartCardProps) {
  const { family, member } = useAuth()
  const familyId = family?.id ?? null
  const userId = member?.user_id ?? null
  const authorName = member?.name?.trim() || member?.role?.trim() || 'Family member'
  const authorRole = member?.role?.trim() || 'Family member'
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    if (babyAgeMonths !== undefined) {
      return Math.min(MAX_MONTH, Math.max(0, babyAgeMonths))
    }
    return Math.min(MAX_MONTH, Math.max(0, new Date().getMonth()))
  })
  const [inputValue, setInputValue] = useState<string>('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [migrationChecked, setMigrationChecked] = useState(false)

  // Загружаем измерения из базы данных
  useEffect(() => {
    const loadMeasurements = async () => {
      console.log('GrowthChartCard: Loading measurements', { familyId, userId, measurementType })
      
      if (!familyId || !userId) {
        console.log('GrowthChartCard: Missing familyId or userId', { familyId, userId })
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        
        // Настраиваем DataService
        dataService.configure({
          familyId,
          authorId: userId,
          authorName,
          authorRole
        })

        // Проверяем миграцию из localStorage только один раз
        if (!migrationChecked) {
          const storageKey = `growth-tracking:${measurementType}`
          const migratedCount = await dataService.migrateGrowthDataFromLocalStorage(
            storageKey,
            measurementType
          )
          
          if (migratedCount > 0) {
            setFeedback(`Мигрировано ${migratedCount} измерений из локального хранилища`)
          }
          
          setMigrationChecked(true)
        }

        // Загружаем измерения из базы данных
        const dbMeasurements = await dataService.getGrowthMeasurements(measurementType)
        console.log('GrowthChartCard: Loaded measurements from DB', dbMeasurements)
        
        const convertedMeasurements: Measurement[] = dbMeasurements
          .map(m => ({
            month: m.month,
            value: Number(m.value)
          }))
          .filter(m => Number.isFinite(m.value))
        
        console.log('GrowthChartCard: Converted measurements', convertedMeasurements)
        setMeasurements(convertedMeasurements)
      } catch (error) {
        console.error('Error loading growth measurements:', error)
        setFeedback('Ошибка загрузки данных')
      } finally {
        setIsLoading(false)
      }
    }

    loadMeasurements()
  }, [familyId, userId, authorName, authorRole, measurementType, migrationChecked])

  useEffect(() => {
    if (!feedback) return
    const timeout = window.setTimeout(() => setFeedback(null), 2000)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  const sortedMeasurements = useMemo(
    () => [...measurements].sort((a, b) => a.month - b.month),
    [measurements]
  )

  const allValues = useMemo(() => {
    const whoValues = whoCurves.flatMap(curve => curve.values)
    const measurementValues = measurements.map(m => m.value)
    return [...whoValues, ...measurementValues]
  }, [measurements, whoCurves])

  const monthCount = whoCurves[0]?.values.length ?? 0
  const maxMonth = Math.max(monthCount - 1, 1)

  const { yMin, yMax } = useMemo(() => {
    const minValue = Math.min(...allValues)
    const maxValue = Math.max(...allValues)
    const padding = (maxValue - minValue) * 0.05 || 1
    return {
      yMin: Math.floor((minValue - padding) * 10) / 10,
      yMax: Math.ceil((maxValue + padding) * 10) / 10
    }
  }, [allValues])

  const chartDimensions = {
    width: 360,
    height: 260,
    padding: {
      top: 24,
      right: 16,
      bottom: 38,
      left: 40
    }
  }

  const chartWidth =
    chartDimensions.width - chartDimensions.padding.left - chartDimensions.padding.right
  const chartHeight =
    chartDimensions.height - chartDimensions.padding.top - chartDimensions.padding.bottom

  const xScale = (month: number) =>
    chartDimensions.padding.left + (month / maxMonth) * chartWidth

  const yScale = (value: number) =>
    chartDimensions.padding.top + ((yMax - value) / (yMax - yMin || 1)) * chartHeight

  const createPath = (values: number[]) =>
    values
      .map((value, index) => `${index === 0 ? 'M' : 'L'}${xScale(index).toFixed(2)},${yScale(value).toFixed(2)}`)
      .join(' ')

  const measurementPath = sortedMeasurements
    .map(({ value, month }, index) => `${index === 0 ? 'M' : 'L'}${xScale(month).toFixed(2)},${yScale(value).toFixed(2)}`)
    .join(' ')

  const yTicks = useMemo(() => {
    const steps = 5
    const stepValue = (yMax - yMin) / steps
    return Array.from({ length: steps + 1 }, (_, index) => yMin + stepValue * index)
  }, [yMax, yMin])

  const xTicks = useMemo(() => [0, 3, 6, 9, 12].filter(month => month <= maxMonth), [maxMonth])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedValue = Number.parseFloat(inputValue)
    if (Number.isNaN(parsedValue)) {
      setFeedback('Введите число')
      return
    }

    if (parsedValue < yMin || parsedValue > yMax) {
      setFeedback(`Значение вне диапазона ${yMin.toFixed(1)}–${yMax.toFixed(1)} ${unit}`)
      return
    }

    try {
      const result = await dataService.addGrowthMeasurement(
        measurementType,
        selectedMonth,
        Number.parseFloat(parsedValue.toFixed(valuePrecision))
      )

      if (result) {
        // Обновляем локальное состояние
        setMeasurements(prev => {
          const withoutMonth = prev.filter(item => item.month !== selectedMonth)
          return [...withoutMonth, { month: selectedMonth, value: Number(result.value) }]
        })
        setInputValue('')
        setFeedback('Сохранено')
      } else {
        setFeedback('Ошибка сохранения')
      }
    } catch (error) {
      console.error('Error saving growth measurement:', error)
      setFeedback('Ошибка сохранения')
    }
  }

  const handleRemove = async (month: number) => {
    try {
      const success = await dataService.deleteGrowthMeasurement(measurementType, month)
      
      if (success) {
        setMeasurements(prev => prev.filter(item => item.month !== month))
        setFeedback('Удалено')
      } else {
        setFeedback('Ошибка удаления')
      }
    } catch (error) {
      console.error('Error deleting growth measurement:', error)
      setFeedback('Ошибка удаления')
    }
  }

  const formatValue = (value: number) => value.toFixed(valuePrecision)

  return (
    <div className={compact ? "space-y-2 overflow-x-hidden" : "bg-white rounded-3xl p-3 shadow-sm border border-gray-100 space-y-3 iphone14-card"}>
      {!compact && (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Шкала ВОЗ
            </span>
          </div>
          {description && <p className="text-xs text-gray-600 leading-snug">{description}</p>}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-gray-500">Загрузка данных...</div>
        </div>
      ) : (
        <>
        <div className="w-full overflow-x-hidden">
          <svg
            viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
            className="h-64 w-full max-w-full"
            role="img"
            aria-label={`${title}. Шкала ${yAxisLabel}`}
            preserveAspectRatio="xMidYMid meet"
          >
          <rect
            x={chartDimensions.padding.left}
            y={chartDimensions.padding.top}
            width={chartWidth}
            height={chartHeight}
            fill="url(#chartBackgroundGradient)"
            rx="12"
          />

          <defs>
            <linearGradient id="chartBackgroundGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#f1f5f9" />
            </linearGradient>
          </defs>

          {/* Горизонтальные линии и подписи */}
          {yTicks.map((tick, index) => {
            const y = yScale(tick)
            return (
              <g key={`y-${index}`}>
                <line
                  x1={chartDimensions.padding.left}
                  x2={chartDimensions.padding.left + chartWidth}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <text
                  x={chartDimensions.padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#475569"
                >
                  {tick.toFixed(1)}
                </text>
              </g>
            )
          })}

          {/* Вертикальные метки */}
          {xTicks.map(tick => {
            const x = xScale(tick)
            return (
              <g key={`x-${tick}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={chartDimensions.padding.top}
                  y2={chartDimensions.padding.top + chartHeight}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <text
                  x={x}
                  y={chartDimensions.padding.top + chartHeight + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#475569"
                >
                  {tick}
                </text>
              </g>
            )
          })}

          {/* Оси */}
          <line
            x1={chartDimensions.padding.left}
            y1={chartDimensions.padding.top + chartHeight}
            x2={chartDimensions.padding.left + chartWidth}
            y2={chartDimensions.padding.top + chartHeight}
            stroke="#334155"
          />
          <line
            x1={chartDimensions.padding.left}
            y1={chartDimensions.padding.top}
            x2={chartDimensions.padding.left}
            y2={chartDimensions.padding.top + chartHeight}
            stroke="#334155"
          />

          <text
            x={chartDimensions.padding.left + chartWidth / 2}
            y={chartDimensions.height - 8}
            textAnchor="middle"
            fontSize="11"
            fill="#334155"
          >
            Возраст, месяцев
          </text>

          <text
            x={chartDimensions.padding.left - 30}
            y={chartDimensions.padding.top - 12}
            textAnchor="start"
            fontSize="11"
            fill="#334155"
          >
            {yAxisLabel}, {unit}
          </text>

          {/* Линии ВОЗ */}
          {whoCurves.map(curve => (
            <path
              key={curve.label}
              d={createPath(curve.values)}
              fill="none"
              stroke={curve.color}
              strokeWidth={curve.label.includes('50') ? 2.5 : 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Линия и точки измерений */}
          {measurementPath && (
            <path d={measurementPath} fill="none" stroke="#059669" strokeWidth={2} strokeLinecap="round" />
          )}

          {sortedMeasurements.map(measurement => (
            <g key={measurement.month}>
              <circle
                cx={xScale(measurement.month)}
                cy={yScale(measurement.value)}
                r={4}
                fill="#059669"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
              <text
                x={xScale(measurement.month)}
                y={yScale(measurement.value) - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#047857"
              >
                {measurement.value.toFixed(valuePrecision)}
              </text>
            </g>
          ))}
        </svg>
        </div>

        <div className="flex flex-wrap gap-2">
          {whoCurves.map(curve => (
            <span
              key={curve.label}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-[11px] text-gray-600"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: curve.color }} />
              {curve.label}
            </span>
          ))}
          {sortedMeasurements.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Ваши показатели
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex w-full flex-col text-xs font-medium text-slate-600 sm:w-auto">
            Месяц
            {babyAgeMonths !== undefined && (
              <span className="text-[10px] text-slate-500 mb-1">
                Текущий возраст: {babyAgeMonths} мес
              </span>
            )}
            <select
              value={selectedMonth}
              onChange={event => setSelectedMonth(Number.parseInt(event.target.value, 10))}
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:w-36 sm:text-base"
            >
              {MONTH_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex w-full flex-col text-xs font-medium text-slate-600 sm:w-auto">
            Значение ({unit})
            <input
              type="number"
              inputMode="decimal"
              step={valuePrecision === 0 ? 1 : `0.${'0'.repeat(valuePrecision - 1)}1`}
              value={inputValue}
              onChange={event => setInputValue(event.target.value)}
              placeholder="Введите число"
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:w-40"
            />
          </label>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-3xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-1 sm:ml-auto sm:w-auto sm:text-base"
          >
            Сохранить
          </button>
        </div>
        {feedback && <p className="text-xs text-emerald-600">{feedback}</p>}
      </form>

      {sortedMeasurements.length > 0 ? (
        <div className="space-y-2 text-xs">
          <p className="font-semibold text-slate-700">Ваши отметки:</p>
          <ul className="space-y-1">
            {sortedMeasurements.map(measurement => (
              <li
                key={measurement.month}
                className="flex items-center justify-between rounded-2xl bg-slate-100 px-3 py-2 text-slate-700"
              >
                <span>
                  {MONTH_LABELS[measurement.month]} — {formatValue(measurement.value)} {unit}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(measurement.month)}
                  className="text-rose-500 transition hover:text-rose-600 focus:outline-none focus:underline"
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-slate-500">
          Добавляйте отметки раз в месяц, чтобы отслеживать развитие малыша и сравнивать его с рекомендованной шкалой
          ВОЗ.
        </p>
      )}
      </>
    )}
    </div>
  )
}
