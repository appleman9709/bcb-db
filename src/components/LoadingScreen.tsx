const dotDelays = ['0s', '0.15s', '0.3s']

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6 text-white">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 px-10 py-12 text-center shadow-2xl backdrop-blur">
        <div className="pointer-events-none absolute -inset-24 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
          <div
            className="absolute inset-0 rounded-full border-2 border-dashed border-white/40 animate-[spin_12s_linear_infinite]"
            aria-hidden="true"
          />
          <div
            className="absolute inset-4 rounded-full border border-white/30 animate-[spin_8s_linear_infinite_reverse]"
            aria-hidden="true"
          />
          <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 shadow-lg">
            <span className="text-4xl">👶</span>
          </div>
        </div>

        <div className="relative mt-8 space-y-2">
          <p className="text-xl font-semibold tracking-wide text-white/90">Подготавливаем панель ухода</p>
          <p className="text-sm text-white/60">Загружаем последние события и персональные рекомендации…</p>
        </div>

        <div className="relative mt-8 flex items-center justify-center gap-3">
          {dotDelays.map(delay => (
            <span
              key={delay}
              className="h-3 w-3 rounded-full bg-white/60 animate-bounce"
              style={{ animationDelay: delay }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
