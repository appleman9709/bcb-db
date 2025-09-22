
const steps = [
  {
    title: 'Персональные настройки',
    description: 'Настройте профиль ребенка и семейные данные'
  },
  {
    title: 'Умные напоминания',
    description: 'Получайте уведомления о кормлении, сне и играх'
  },
  {
    title: 'Анализ развития',
    description: 'Отслеживайте прогресс по месяцам и вехам'
  }
]

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-6 py-12 text-gray-100">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-gray-900/80 px-10 py-12 text-center shadow-[0_25px_60px_-15px_rgba(15,23,42,0.75)] backdrop-blur-xl">
        <div className="pointer-events-none absolute -inset-28 bg-gradient-to-br from-blue-500/15 via-purple-500/15 to-emerald-500/15 blur-3xl" aria-hidden="true" />

        <div className="relative inline-flex items-center gap-3 rounded-full border border-white/10 bg-gray-900/70 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-gray-300">
          BabyCare
        </div>

        <div className="relative mt-8 flex flex-col items-center gap-4">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full border-2 border-blue-500/60" aria-hidden="true" />
            <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 text-4xl">
              👶
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-white">Добро пожаловать, родители!</h1>
            <p className="text-base text-gray-300">Мы загружаем ваши данные, чтобы помочь вам лучше заботиться о малыше.</p>
          </div>
        </div>

        <div className="relative mx-auto mt-10 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 origin-left animate-[pulse_1.8s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-400" />
        </div>

        <div className="relative mt-10 grid gap-4 text-left text-sm text-gray-300 sm:grid-cols-3">
          {steps.map(step => (
            <div key={step.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white/90">{step.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-10 text-sm text-gray-400">
          <span className="loading-dots">Пожалуйста подождите, загружаем данные</span>
        </div>
      </div>
    </div>
  )
}
