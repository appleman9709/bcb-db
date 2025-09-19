import { useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'

export default function History() {
  const [selectedPeriod, setSelectedPeriod] = useState('today')

  const mockData = [
    { id: 1, type: 'feeding', time: '14:30', amount: '150 мл', icon: '🍼', color: 'blue' },
    { id: 2, type: 'diaper', time: '13:45', amount: 'Мокрый', icon: '👶', color: 'green' },
    { id: 3, type: 'sleep', time: '12:00', amount: '1ч 30м', icon: '😴', color: 'purple' },
    { id: 4, type: 'feeding', time: '11:15', amount: '120 мл', icon: '🍼', color: 'blue' },
    { id: 5, type: 'play', time: '10:30', amount: '30 мин', icon: '🎯', color: 'yellow' },
    { id: 6, type: 'diaper', time: '09:20', amount: 'Сухой', icon: '👶', color: 'green' },
  ]

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      feeding: 'Кормление',
      diaper: 'Смена подгузника',
      sleep: 'Сон',
      play: 'Игра',
      medicine: 'Лекарство',
      note: 'Заметка'
    }
    return labels[type] || type
  }

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: string } = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      purple: 'bg-purple-50 border-purple-200',
      yellow: 'bg-yellow-50 border-yellow-200',
      pink: 'bg-pink-50 border-pink-200'
    }
    return colors[color] || 'bg-gray-50 border-gray-200'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">История событий 📊</h1>
          <p className="text-gray-600">Просматривайте все записи о вашем малыше</p>
        </div>

        {/* Period Filter */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {[
              { key: 'today', label: 'Сегодня' },
              { key: 'week', label: 'Неделя' },
              { key: 'month', label: 'Месяц' },
              { key: 'all', label: 'Все время' }
            ].map((period) => (
              <Button
                key={period.key}
                variant={selectedPeriod === period.key ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedPeriod(period.key)}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">8</div>
            <div className="text-sm text-gray-600">Кормлений</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">6</div>
            <div className="text-sm text-gray-600">Смен подгузника</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">3</div>
            <div className="text-sm text-gray-600">Периода сна</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-yellow-600 mb-1">2</div>
            <div className="text-sm text-gray-600">Активности</div>
          </Card>
        </div>

        {/* Timeline */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Хронология событий</h2>
            <Button variant="secondary" size="sm">
              📥 Экспорт
            </Button>
          </div>
          
          <div className="space-y-4">
            {mockData.map((item, index) => (
              <div key={item.id} className="flex items-center space-x-4 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg shadow-lg bg-gradient-to-r ${
                    item.color === 'blue' ? 'from-blue-500 to-blue-600' :
                    item.color === 'green' ? 'from-green-500 to-green-600' :
                    item.color === 'purple' ? 'from-purple-500 to-purple-600' :
                    item.color === 'yellow' ? 'from-yellow-500 to-yellow-600' :
                    'from-gray-500 to-gray-600'
                  }`}>
                    {item.icon}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">{getTypeLabel(item.type)}</h3>
                    <span className="text-sm font-medium text-gray-500">{item.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{item.amount}</p>
                </div>
                
                <div className="flex-shrink-0">
                  <Button variant="secondary" size="sm">
                    ✏️
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">График кормлений</h3>
            <div className="h-64 bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
              <div className="text-center text-gray-600">
                <div className="text-4xl mb-2">📈</div>
                <p>График будет здесь</p>
              </div>
            </div>
          </Card>
          
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика сна</h3>
            <div className="h-64 bg-gradient-to-r from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
              <div className="text-center text-gray-600">
                <div className="text-4xl mb-2">📊</div>
                <p>Диаграмма будет здесь</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
