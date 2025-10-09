
const features = [
  'Настройки профиля',
  'Умные напоминания', 
  'Анализ развития'
]

export default function LoadingScreen() {
  return (
    <div className="h-screen bg-gray-900 flex items-center justify-center px-6 text-gray-100 overflow-hidden">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-gray-900/80 px-8 py-8 text-center shadow-[0_25px_60px_-15px_rgba(15,23,42,0.75)] backdrop-blur-xl">
        <div className="pointer-events-none absolute -inset-20 bg-gradient-to-br from-blue-500/15 via-purple-500/15 to-emerald-500/15 blur-3xl" aria-hidden="true" />

        <div className="relative inline-flex items-center gap-3 rounded-full border border-white/10 bg-gray-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-gray-300">
          BabyCare
        </div>

        <div className="relative mt-6 flex flex-col items-center gap-3">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full border-2 border-blue-500/60" aria-hidden="true" />
            <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 text-3xl">
              👶
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-white">Добро пожаловать!</h1>
            <p className="text-sm text-gray-300">Загружаем ваши данные...</p>
          </div>
        </div>

        <div className="relative mx-auto mt-6 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 origin-left animate-[pulse_1.8s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-400" />
        </div>

        <div className="relative mt-6 flex justify-center gap-3 text-xs text-gray-300">
          {features.map((feature, index) => (
            <span key={feature} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {feature}
            </span>
          ))}
        </div>

        <div className="relative mt-4 text-xs text-gray-400">
          <span className="loading-dots">Пожалуйста подождите</span>
        </div>
      </div>
    </div>
  )
}
