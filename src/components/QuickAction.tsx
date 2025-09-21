import Button from './Button'

interface QuickActionProps {
  title: string
  description: string
  icon: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
}

export default function QuickAction({ title, description, icon, onClick, variant = 'primary' }: QuickActionProps) {
  return (
    <div
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 cursor-pointer group"
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
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg group-hover:scale-110 transition-transform duration-200">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <Button variant={variant} size="sm" onClick={(event) => { event.stopPropagation(); onClick() }}>
          Добавить
        </Button>
      </div>
    </div>
  )
}
