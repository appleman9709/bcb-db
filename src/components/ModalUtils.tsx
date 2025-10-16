import React from 'react'

// Утилиты для упрощения структуры модальных окон

/**
 * Компонент для создания компактных кнопок с иконкой и текстом
 * Убирает необходимость в дополнительных div-ах
 */
interface CompactButtonProps {
  onClick: () => void
  isActive?: boolean
  icon: string
  label: string
  activeClasses?: string
  inactiveClasses?: string
  className?: string
}

export const CompactButton: React.FC<CompactButtonProps> = ({
  onClick,
  isActive = false,
  icon,
  label,
  activeClasses = 'border-blue-500 bg-gradient-to-br from-blue-400 to-cyan-500 text-white shadow-lg',
  inactiveClasses = 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
  className = ''
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-3 rounded-3xl border-2 transition-all duration-200 flex flex-col items-center space-y-1 ${className} ${
      isActive ? activeClasses : inactiveClasses
    }`}
  >
    <img 
      src={icon} 
      alt={label} 
      className="w-8 h-8 object-contain"
    />
    <span className="text-xs font-medium text-center leading-tight">
      {label}
    </span>
  </button>
)

/**
 * Компонент для создания компактных полей ввода
 * Объединяет label и input в один элемент
 */
interface CompactFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'date' | 'time' | 'text'
  placeholder?: string
  className?: string
  icon?: React.ReactNode
}

export const CompactField: React.FC<CompactFieldProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  className = '',
  icon
}) => (
  <div className={`rounded border border-gray-200 bg-gray-50 px-2 py-1 shadow-sm hover:border-gray-300 hover:bg-gray-100 transition-all duration-200 cursor-pointer flex items-center gap-1 ${className}`}>
    <label className="text-[10px] font-medium uppercase tracking-wide text-gray-500 whitespace-nowrap">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 bg-transparent text-[9px] font-medium text-gray-700 focus:outline-none focus:ring-0 cursor-pointer"
      style={{
        colorScheme: 'light',
        WebkitAppearance: 'none',
        MozAppearance: 'textfield'
      }}
    />
    {icon}
  </div>
)

/**
 * Компонент для создания компактных информационных блоков
 * Убирает избыточные div-ы для отображения информации
 */
interface CompactInfoBlockProps {
  title: string
  value: string | React.ReactNode
  className?: string
  valueClassName?: string
}

export const CompactInfoBlock: React.FC<CompactInfoBlockProps> = ({
  title,
  value,
  className = '',
  valueClassName = ''
}) => (
  <div className={`flex items-center justify-between ${className}`}>
    <span className="text-sm font-medium text-gray-700">{title}</span>
    <span className={`text-sm text-gray-900 font-semibold ${valueClassName}`}>
      {value}
    </span>
  </div>
)

/**
 * Компонент для создания компактных заголовков с иконкой
 * Объединяет иконку и заголовок в один элемент
 */
interface CompactHeaderProps {
  icon: string
  title: string
  subtitle?: string
  className?: string
  iconClassName?: string
}

export const CompactHeader: React.FC<CompactHeaderProps> = ({
  icon,
  title,
  subtitle,
  className = '',
  iconClassName = ''
}) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <div className={`w-12 h-12 flex items-center justify-center bg-white rounded-3xl shadow-sm ${iconClassName}`}>
      <img 
        src={icon} 
        alt={title} 
        className="w-8 h-8 object-contain" 
      />
    </div>
    <div className="flex-1">
      <h2 className="text-lg font-semibold text-gray-900">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-gray-600 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  </div>
)

/**
 * Компонент для создания компактных кнопок быстрого выбора
 * Убирает избыточные div-ы для кнопок выбора времени
 */
interface QuickOptionButtonProps {
  label: string
  isActive: boolean
  onClick: () => void
  className?: string
}

export const QuickOptionButton: React.FC<QuickOptionButtonProps> = ({
  label,
  isActive,
  onClick,
  className = ''
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-3xl px-2.5 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-xs ${className} ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    {label}
  </button>
)

/**
 * Компонент для создания компактных слайдеров
 * Упрощает структуру ползунков
 */
interface CompactSliderProps {
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  labels: Array<{ value: number; text: string }>
  className?: string
}

export const CompactSlider: React.FC<CompactSliderProps> = ({
  value,
  min,
  max,
  step,
  onChange,
  labels,
  className = ''
}) => (
  <div className={`space-y-2 ${className}`}>
    <span className="text-lg font-semibold text-blue-600 text-center block">
      {value > 0 ? `${value} унций` : 'Не указано'}
    </span>
    <div className="slider-wrapper">
      <div className="slider-track-container">
        <div className="slider-track">
          <div 
            className="slider-progress feeding-progress"
            style={{ width: `${(value / max) * 100}%` }}
          ></div>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="modern-slider feeding-slider"
        />
      </div>
      
      <div className="slider-labels">
        {labels.map((label) => (
          <button 
            key={label.value}
            className="slider-label" 
            onClick={() => onChange(label.value)}
          >
            <span className="label-value">{label.value}</span>
            <span className="label-text">{label.text}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
)

/**
 * Компонент для отображения рекорда/статистики
 * Упрощает структуру блоков с рекордами
 */
interface RecordDisplayProps {
  icon: string
  title: string
  playerName: string
  date: string
  score: number
  details: string
  className?: string
}

export const RecordDisplay: React.FC<RecordDisplayProps> = ({
  icon,
  title,
  playerName,
  date,
  score,
  details,
  className = ''
}) => (
  <div className={`bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-yellow-200 p-3 flex items-center justify-between ${className}`}>
    <div className="flex items-center gap-2">
      <span className="text-xl">{icon}</span>
      <div>
        <div className="font-bold text-yellow-800 text-sm">{title}</div>
        <div className="font-semibold text-yellow-700 text-xs">{playerName}</div>
        <div className="text-xs text-yellow-600">{date}</div>
      </div>
    </div>
    <div className="text-right">
      <div className="font-bold text-yellow-800 text-lg">{score.toLocaleString()}</div>
      <div className="text-xs text-yellow-600">{details}</div>
    </div>
  </div>
)

/**
 * Компонент для отображения инвентаря в Тамагочи
 * Упрощает структуру блоков с инвентарем
 */
interface InventoryItemProps {
  icon: string
  label: string
  value: string
  isLow?: boolean
  onClick: () => void
  className?: string
}

export const InventoryItem: React.FC<InventoryItemProps> = ({
  icon,
  label,
  value,
  isLow = false,
  onClick,
  className = ''
}) => (
  <div 
    onClick={onClick}
    className={`tamagotchi-inventory-item ${className}`}
  >
    <div className="tamagotchi-inventory-icon">
      <img 
        src={icon} 
        alt={label} 
      />
    </div>
    <div className={`tamagotchi-inventory-label ${isLow ? 'text-red-500' : ''}`}>
      {value}
    </div>
  </div>
)

/**
 * Компонент для отображения стопок монеток
 * Упрощает структуру блоков с монетками
 */
interface CoinStackProps {
  icon: string
  count: number
  bgColor: string
  textColor: string
  alt: string
  className?: string
}

export const CoinStack: React.FC<CoinStackProps> = ({
  icon,
  count,
  bgColor,
  textColor,
  alt,
  className = ''
}) => (
  <div className={`flex items-center gap-1 ${bgColor} px-1.5 py-0.5 rounded-3xl ${className}`}>
    <img src={icon} alt={alt} className="w-3 h-3" />
    <span className={`text-xs font-bold ${textColor}`}>{count}</span>
  </div>
)

/**
 * Компонент для отображения полей ввода в Тамагочи
 * Упрощает структуру форм
 */
interface TamagotchiInputProps {
  id: string
  label: string
  type: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  min?: number
  step?: number
  className?: string
}

export const TamagotchiInput: React.FC<TamagotchiInputProps> = ({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  min,
  step,
  className = ''
}) => (
  <div className={`space-y-1 ${className}`}>
    <label className="block text-xs font-semibold text-gray-700" htmlFor={id}>
      {label}
    </label>
    <input
      id={id}
      type={type}
      min={min}
      step={step}
      placeholder={placeholder}
      value={value}
      onChange={event => onChange(event.target.value)}
      className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition"
    />
  </div>
)
