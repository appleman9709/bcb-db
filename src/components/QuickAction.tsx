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
      className="group relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] p-2 sm:p-3 iphone14-quick-action text-center shadow-[0_8px_32px_-8px_rgba(15,23,42,0.85)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-300/70 focus:ring-offset-2 focus:ring-offset-slate-950 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08] hover:shadow-[0_12px_48px_-12px_rgba(79,70,229,0.65)]"
      onClick={onClick}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.1),rgba(255,255,255,0))] opacity-70 mix-blend-screen" />
        <div className="absolute -left-4 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.42),transparent_65%)] blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.35),transparent_70%)] blur-2xl opacity-60 transition-opacity duration-300 group-hover:opacity-80" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-1 sm:gap-2">
        <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-base sm:text-lg text-white shadow-[0_8px_24px_-8px_rgba(79,70,229,0.6)] ring-1 ring-white/25 transition-transform duration-300 group-hover:scale-105 ${getIconGradient(variant)}`}>
          {icon}
        </div>
        <div className="space-y-0.5 sm:space-y-1">
          <h3 className="text-xs font-semibold text-white leading-tight">{title}</h3>
          <p className="text-xs text-white/70 leading-tight">{description}</p>
        </div>
      </div>
    </button>
  )
}
