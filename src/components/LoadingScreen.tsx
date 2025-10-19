
import { useImagePreloader } from './ImagePreloader'

const features = [
  'Умные напоминания',
  'Анализ развития', 
  'Настройки профиля'
]

export default function LoadingScreen() {
  const { isPreloading, preloadProgress } = useImagePreloader()
  
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-4 sm:px-6 text-gray-900 overflow-hidden">
      {/* Фоновые элементы - оптимизированные */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-60 h-60 sm:w-80 sm:h-80 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-3xl blur-3xl loading-element-primary" />
        <div className="absolute -bottom-40 -left-40 w-60 h-60 sm:w-80 sm:h-80 bg-gradient-to-tr from-indigo-200/30 to-pink-200/30 rounded-3xl blur-3xl loading-element-secondary" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 sm:w-96 sm:h-96 bg-gradient-to-r from-blue-100/20 to-purple-100/20 rounded-3xl blur-3xl loading-decoration" />
      </div>

      <div className="relative w-full max-w-sm sm:max-w-lg overflow-hidden rounded-2xl sm:rounded-3xl border border-white/20 bg-white/80 backdrop-blur-xl px-6 py-8 sm:px-8 sm:py-10 text-center shadow-[0_25px_60px_-15px_rgba(59,130,246,0.15)]">
        {/* Верхняя граница с градиентом */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 rounded-t-2xl sm:rounded-t-3xl" />

        {/* Логотип */}
        <div className="relative inline-flex items-center gap-2 sm:gap-3 rounded-3xl border border-blue-200/50 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] sm:tracking-[0.3em] text-blue-700 shadow-sm">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-3xl loading-element-primary" />
          BabyCare
        </div>

        {/* Основной контент */}
        <div className="relative mt-6 sm:mt-8 flex flex-col items-center gap-3 sm:gap-4">
          {/* Анимированная иконка малыша */}
          <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center">
            {/* Пульсирующие кольца - оптимизированные */}
            <span className="absolute inline-flex h-full w-full loading-element-primary rounded-3xl border-2 border-blue-400/40" aria-hidden="true" />
            <span className="absolute inline-flex h-12 w-12 sm:h-16 sm:w-16 loading-element-secondary rounded-3xl border border-blue-300/30" aria-hidden="true" />
            
            {/* Основная иконка */}
            <div className="relative inline-flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
              <img 
                src="/icons/baby.png" 
                alt="Малыш" 
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain filter drop-shadow-sm"
              />
            </div>
          </div>

          {/* Текст приветствия */}
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Добро пожаловать!
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">
              {isPreloading ? `Загружаем критические ресурсы... ${preloadProgress.loaded}/${preloadProgress.total}` : 'Загружаем ваши данные...'}
            </p>
          </div>
        </div>

        {/* Прогресс-бар */}
        <div className="relative mx-auto mt-6 sm:mt-8 h-1.5 sm:h-2 w-full max-w-xs overflow-hidden rounded-3xl bg-gray-200/60">
          <div 
            className="h-full origin-left rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 shadow-sm transition-all duration-300 ease-out"
            style={{ 
              width: isPreloading 
                ? `${(preloadProgress.loaded / preloadProgress.total) * 100}%` 
                : '75%',
              animation: isPreloading ? 'none' : 'progress 2s ease-in-out infinite'
            }}
          />
        </div>

        {/* Особенности приложения */}
        <div className="relative mt-6 sm:mt-8 flex flex-wrap justify-center gap-1.5 sm:gap-2">
          {features.map((feature, index) => (
            <span 
              key={feature} 
              className="rounded-3xl border border-blue-200/50 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-medium text-blue-700 shadow-sm backdrop-blur-sm"
              style={{ 
                animationDelay: `${index * 0.2}s`,
                animation: 'fadeInUp 0.6s ease-out forwards'
              }}
            >
              {feature}
            </span>
          ))}
        </div>

        {/* Статус загрузки */}
        <div className="relative mt-4 sm:mt-6 text-xs text-gray-500 font-medium">
          <span className="loading-dots">Пожалуйста подождите</span>
        </div>

        {/* Декоративные элементы - оптимизированные */}
        <div className="absolute -bottom-1 -left-1 sm:-bottom-2 sm:-left-2 w-3 h-3 sm:w-4 sm:h-4 bg-blue-400/20 rounded-3xl loading-decoration" />
        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-2 h-2 sm:w-3 sm:h-3 bg-purple-400/20 rounded-3xl loading-decoration" />
        <div className="absolute top-1/3 -right-3 sm:-right-4 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-400/20 rounded-3xl loading-decoration" />
      </div>
    </div>
  )
}
