interface QuickActionProps {
  title: string
  description: string
  icon: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
}

export default function QuickAction({ title, description, icon, onClick, variant = 'primary' }: QuickActionProps) {
  const getIconGradient = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-emerald-600'
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500'
      case 'danger':
        return 'bg-gradient-to-r from-red-500 to-pink-600'
      case 'secondary':
        return 'bg-gradient-to-r from-gray-500 to-gray-600'
      default:
        return 'bg-gradient-to-r from-blue-500 to-purple-600'
    }
  }

  return (
    <button
      type="button"
      className="group relative flex w-full items-stretch overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-left shadow-[0_18px_60px_-28px_rgba(15,23,42,0.85)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-300/70 focus:ring-offset-2 focus:ring-offset-slate-950 hover:-translate-y-2 hover:border-white/20 hover:bg-white/[0.08] hover:shadow-[0_26px_88px_-36px_rgba(79,70,229,0.65)] sm:p-6"
      onClick={onClick}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.1),rgba(255,255,255,0))] opacity-70 mix-blend-screen" />
        <div className="absolute -left-12 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.42),transparent_65%)] blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute -bottom-16 -right-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.35),transparent_70%)] blur-3xl opacity-60 transition-opacity duration-300 group-hover:opacity-80" />
      </div>
      <div className="relative z-10 flex flex-1 items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl text-white shadow-[0_18px_38px_-16px_rgba(79,70,229,0.6)] ring-1 ring-white/25 transition-transform duration-300 group-hover:scale-105 ${getIconGradient(variant)}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="mb-1 text-base font-semibold text-white sm:text-lg">{title}</h3>
          <p className="text-sm text-white/70">{description}</p>
        </div>
      </div>
      <div className="relative z-10 ml-4 flex items-center justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-base font-semibold text-white/70 transition-all duration-300 group-hover:translate-x-1 group-hover:border-white/30 group-hover:text-white group-hover:bg-white/10">
          &gt;
        </div>
      </div>
    </button>
  )
}
