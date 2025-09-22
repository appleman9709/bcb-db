import Button from './Button'

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
    <div
      className="rounded-2xl border border-gray-700/60 bg-gray-900/80 p-6 shadow-lg transition-transform duration-200 cursor-pointer group hover:-translate-y-1 hover:shadow-xl"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
    >
      <div className="flex items-center space-x-4">
        <div className={`w-12 h-12 ${getIconGradient(variant)} rounded-xl flex items-center justify-center text-white text-xl shadow-lg group-hover:scale-110 transition-transform duration-200`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-300">{description}</p>
        </div>
        <Button variant={variant} size="sm" onClick={(event) => { event.stopPropagation(); onClick() }}>
          Добавить
        </Button>
      </div>
    </div>
  )
}
