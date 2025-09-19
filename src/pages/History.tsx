import { useState, useEffect } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { dataService, Feeding, Diaper, SleepSession, Activity } from '../services/dataService'

interface HistoryItem {
  id: number
  type: 'feeding' | 'diaper' | 'sleep' | 'activity'
  timestamp: string
  data: Feeding | Diaper | SleepSession | Activity
}

export default function History() {
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [historyData, setHistoryData] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    feedings: 0,
    diapers: 0,
    sleepSessions: 0,
    activities: 0
  })

  useEffect(() => {
    fetchHistoryData()
  }, [selectedPeriod])

  const fetchHistoryData = async () => {
    try {
      setLoading(true)
      const [feedings, diapers, sleepSessions, activities] = await Promise.all([
        dataService.getFeedings(50),
        dataService.getDiapers(50),
        dataService.getSleepSessions(50),
        dataService.getActivities(50)
      ])

      // Filter by period
      const now = new Date()
      let startDate = new Date()
      
      switch (selectedPeriod) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1)
          break
        case 'all':
          startDate = new Date(0) // Beginning of time
          break
      }

      const filterByDate = (items: any[]) => 
        items.filter(item => new Date(item.timestamp || item.start_time) >= startDate)

      const filteredFeedings = filterByDate(feedings)
      const filteredDiapers = filterByDate(diapers)
      const filteredSleep = filterByDate(sleepSessions)
      const filteredActivities = filterByDate(activities)

      // Combine and sort all data
      const combinedData: HistoryItem[] = [
        ...filteredFeedings.map(f => ({ id: f.id, type: 'feeding' as const, timestamp: f.timestamp, data: f })),
        ...filteredDiapers.map(d => ({ id: d.id, type: 'diaper' as const, timestamp: d.timestamp, data: d })),
        ...filteredSleep.map(s => ({ id: s.id, type: 'sleep' as const, timestamp: s.start_time, data: s })),
        ...filteredActivities.map(a => ({ id: a.id, type: 'activity' as const, timestamp: a.timestamp, data: a }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setHistoryData(combinedData)
      setStats({
        feedings: filteredFeedings.length,
        diapers: filteredDiapers.length,
        sleepSessions: filteredSleep.length,
        activities: filteredActivities.length
      })
    } catch (error) {
      console.error('Error fetching history data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeLabel = (item: HistoryItem) => {
    switch (item.type) {
      case 'feeding':
        return 'Кормление'
      case 'diaper':
        return 'Смена подгузника'
      case 'sleep':
        return 'Сон'
      case 'activity':
        return (item.data as Activity).activity_type
      default:
        return 'Неизвестно'
    }
  }

  const getTypeIcon = (item: HistoryItem) => {
    switch (item.type) {
      case 'feeding':
        return '🍼'
      case 'diaper':
        return '👶'
      case 'sleep':
        return '😴'
      case 'activity':
        return '🎯'
      default:
        return '📝'
    }
  }

  const getTypeColor = (item: HistoryItem) => {
    switch (item.type) {
      case 'feeding':
        return 'blue'
      case 'diaper':
        return 'green'
      case 'sleep':
        return 'purple'
      case 'activity':
        return 'yellow'
      default:
        return 'gray'
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

  const getItemDetails = (item: HistoryItem) => {
    switch (item.type) {
      case 'sleep':
        const sleepData = item.data as SleepSession
        return sleepData.duration_minutes 
          ? `${Math.floor(sleepData.duration_minutes / 60)}ч ${sleepData.duration_minutes % 60}м`
          : 'В процессе'
      default:
        return new Date(item.timestamp).toLocaleTimeString()
    }
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
            <div className="text-2xl font-bold text-blue-600 mb-1">{stats.feedings}</div>
            <div className="text-sm text-gray-600">Кормлений</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{stats.diapers}</div>
            <div className="text-sm text-gray-600">Смен подгузника</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">{stats.sleepSessions}</div>
            <div className="text-sm text-gray-600">Периода сна</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-yellow-600 mb-1">{stats.activities}</div>
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
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Загрузка данных...</p>
              </div>
            ) : historyData.length > 0 ? (
              historyData.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center space-x-4 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg shadow-lg bg-gradient-to-r ${
                      getTypeColor(item) === 'blue' ? 'from-blue-500 to-blue-600' :
                      getTypeColor(item) === 'green' ? 'from-green-500 to-green-600' :
                      getTypeColor(item) === 'purple' ? 'from-purple-500 to-purple-600' :
                      getTypeColor(item) === 'yellow' ? 'from-yellow-500 to-yellow-600' :
                      'from-gray-500 to-gray-600'
                    }`}>
                      {getTypeIcon(item)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">{getTypeLabel(item)}</h3>
                      <span className="text-sm font-medium text-gray-500">{getTimeAgo(item.timestamp)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{getItemDetails(item)}</p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <Button variant="secondary" size="sm">
                      ✏️
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>Нет записей за выбранный период</p>
                <p className="text-sm">Начните отслеживать активность вашего малыша!</p>
              </div>
            )}
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
