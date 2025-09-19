import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard'
import QuickAction from '../components/QuickAction'
import QuickActionModal from '../components/QuickActionModal'
import Card from '../components/Card'
import Button from '../components/Button'
import { dataService, Feeding, Diaper } from '../services/dataService'

export default function Dashboard() {
  const [data, setData] = useState<{
    lastFeeding: Feeding | null
    lastDiaper: Diaper | null
    todayStats: any
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<'feeding' | 'diaper'>('feeding')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [lastFeeding, lastDiaper, todayStats] = await Promise.all([
        dataService.getLastFeeding(),
        dataService.getLastDiaper(),
        dataService.getTodayStats()
      ])

      setData({
        lastFeeding,
        lastDiaper,
        todayStats
      })
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} мин назад`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} ч назад`
    } else {
      return `${Math.floor(diffInMinutes / 1440)} дн назад`
    }
  }

  const handleQuickAction = (action: 'feeding' | 'diaper') => {
    setModalAction(action)
    setModalOpen(true)
  }

  const handleModalSuccess = () => {
    fetchData() // Refresh data after successful action
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Добро пожаловать! 👶</h1>
          <p className="text-gray-600">Отслеживайте важные моменты вашего малыша</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatCard
            title="Последнее кормление"
            value={data?.lastFeeding ? getTimeAgo(data.lastFeeding.timestamp) : 'Нет данных'}
            icon="🍼"
            color="blue"
            subtitle={data?.lastFeeding ? new Date(data.lastFeeding.timestamp).toLocaleString() : ''}
          />
          <StatCard
            title="Последняя смена"
            value={data?.lastDiaper ? getTimeAgo(data.lastDiaper.timestamp) : 'Нет данных'}
            icon="👶"
            color="green"
            subtitle={data?.lastDiaper ? new Date(data.lastDiaper.timestamp).toLocaleString() : ''}
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Быстрые действия</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <QuickAction
              title="Кормление"
              description="Записать время кормления"
              icon="🍼"
              onClick={() => handleQuickAction('feeding')}
              variant="primary"
            />
            <QuickAction
              title="Смена подгузника"
              description="Отметить смену подгузника"
              icon="👶"
              onClick={() => handleQuickAction('diaper')}
              variant="success"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Недавняя активность</h2>
          <Card>
            <div className="space-y-4">
              {data?.lastFeeding && (
                <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-xl">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                    🍼
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Кормление</p>
                    <p className="text-sm text-gray-600">{getTimeAgo(data.lastFeeding.timestamp)}</p>
                  </div>
                  <div className="text-sm text-gray-500">{new Date(data.lastFeeding.timestamp).toLocaleTimeString()}</div>
                </div>
              )}
              
              {data?.lastDiaper && (
                <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-xl">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                    👶
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Смена подгузника</p>
                    <p className="text-sm text-gray-600">{getTimeAgo(data.lastDiaper.timestamp)}</p>
                  </div>
                  <div className="text-sm text-gray-500">{new Date(data.lastDiaper.timestamp).toLocaleTimeString()}</div>
                </div>
              )}
              
              {(!data?.lastFeeding && !data?.lastDiaper) && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📝</div>
                  <p>Пока нет записей</p>
                  <p className="text-sm">Начните отслеживать активность вашего малыша!</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Tips */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl">
              💡
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Совет дня</h3>
              <p className="text-gray-700">
                Регулярное кормление каждые 2-3 часа помогает установить режим дня для вашего малыша. 
                Не забывайте записывать время и количество молока!
              </p>
            </div>
          </div>
        </Card>

        {/* Quick Action Modal */}
        <QuickActionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          actionType={modalAction}
          onSuccess={handleModalSuccess}
        />
      </div>
    </div>
  )
}
