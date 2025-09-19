import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import StatCard from '../components/StatCard'
import QuickAction from '../components/QuickAction'
import Card from '../components/Card'
import Button from '../components/Button'

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const familyId = 1 // TODO: заменить на актуальный ID семьи
        const { data: feed } = await supabase
          .from('feedings')
          .select('timestamp')
          .eq('family_id', familyId)
          .order('timestamp', { ascending: false })
          .limit(1)
        const { data: diaper } = await supabase
          .from('diapers')
          .select('timestamp')
          .eq('family_id', familyId)
          .order('timestamp', { ascending: false })
          .limit(1)
        setData({ feed: feed?.[0], diaper: diaper?.[0] })
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

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

  const handleQuickAction = (action: string) => {
    console.log(`Quick action: ${action}`)
    // TODO: Implement quick actions
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Последнее кормление"
            value={data?.feed ? getTimeAgo(data.feed.timestamp) : 'Нет данных'}
            icon="🍼"
            color="blue"
            subtitle={data?.feed ? new Date(data.feed.timestamp).toLocaleString() : ''}
          />
          <StatCard
            title="Последняя смена"
            value={data?.diaper ? getTimeAgo(data.diaper.timestamp) : 'Нет данных'}
            icon="👶"
            color="green"
            subtitle={data?.diaper ? new Date(data.diaper.timestamp).toLocaleString() : ''}
          />
          <StatCard
            title="Сон сегодня"
            value="2ч 30м"
            icon="😴"
            color="purple"
            subtitle="3 периода сна"
          />
          <StatCard
            title="Активность"
            value="1ч 15м"
            icon="🎯"
            color="pink"
            subtitle="Игры и развитие"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Быстрые действия</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <QuickAction
              title="Сон"
              description="Записать время сна"
              icon="😴"
              onClick={() => handleQuickAction('sleep')}
              variant="purple"
            />
            <QuickAction
              title="Игра"
              description="Отметить активность"
              icon="🎯"
              onClick={() => handleQuickAction('play')}
              variant="warning"
            />
            <QuickAction
              title="Лекарство"
              description="Записать прием лекарств"
              icon="💊"
              onClick={() => handleQuickAction('medicine')}
              variant="danger"
            />
            <QuickAction
              title="Заметка"
              description="Добавить заметку"
              icon="📝"
              onClick={() => handleQuickAction('note')}
              variant="secondary"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Недавняя активность</h2>
          <Card>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                  🍼
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Кормление</p>
                  <p className="text-sm text-gray-600">2 часа назад</p>
                </div>
                <div className="text-sm text-gray-500">150 мл</div>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-xl">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                  👶
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Смена подгузника</p>
                  <p className="text-sm text-gray-600">3 часа назад</p>
                </div>
                <div className="text-sm text-gray-500">Мокрый</div>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-purple-50 rounded-xl">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white">
                  😴
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Сон</p>
                  <p className="text-sm text-gray-600">4 часа назад</p>
                </div>
                <div className="text-sm text-gray-500">1ч 30м</div>
              </div>
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
      </div>
    </div>
  )
}
