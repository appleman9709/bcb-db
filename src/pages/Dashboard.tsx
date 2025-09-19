import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard'
import QuickAction from '../components/QuickAction'
import QuickActionModal from '../components/QuickActionModal'
import Card from '../components/Card'
import Button from '../components/Button'
import { dataService, Feeding, Diaper, Bath, Activity, Tip, Settings as DBSettings } from '../services/dataService'

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<'dashboard' | 'history' | 'settings'>('dashboard')
  const [data, setData] = useState<{
    lastFeeding: Feeding | null
    lastDiaper: Diaper | null
    lastBath: Bath | null
    recentActivities: Activity[]
    todayStats: any
    dailyTip: Tip | null
  } | null>(null)
  const [historyData, setHistoryData] = useState<{
    feedings: Feeding[]
    diapers: Diaper[]
    baths: Bath[]
    activities: Activity[]
  } | null>(null)
  const [settings, setSettings] = useState({
    babyName: 'Малыш',
    birthDate: '2024-01-01',
    feedingInterval: 3,
    diaperInterval: 2,
    bathInterval: 1,
    activityInterval: 2
  })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<'feeding' | 'diaper' | 'bath' | 'activity'>('feeding')

  useEffect(() => {
    fetchData()
    fetchSettingsData()
  }, [])

  useEffect(() => {
    if (activeSection === 'history') {
      fetchHistoryData()
    }
  }, [activeSection])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [lastFeeding, lastDiaper, lastBath, recentActivities, todayStats, settings] = await Promise.all([
        dataService.getLastFeeding(),
        dataService.getLastDiaper(),
        dataService.getLastBath(),
        dataService.getActivities(3),
        dataService.getTodayStats(),
        dataService.getSettings()
      ])

      // Получаем совет, соответствующий возрасту малыша
      const babyAgeMonths = settings?.baby_age_months || 0
      const dailyTip = await dataService.getRandomTip(babyAgeMonths)

      setData({
        lastFeeding,
        lastDiaper,
        lastBath,
        recentActivities,
        todayStats,
        dailyTip
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

  const handleQuickAction = (action: 'feeding' | 'diaper' | 'bath' | 'activity') => {
    setModalAction(action)
    setModalOpen(true)
  }

  const handleModalSuccess = () => {
    fetchData() // Refresh data after successful action
    setModalOpen(false)
  }

  const fetchHistoryData = async () => {
    try {
      const [feedings, diapers, baths, activities] = await Promise.all([
        dataService.getFeedings(50),
        dataService.getDiapers(50),
        dataService.getBaths(50),
        dataService.getActivities(50)
      ])

      setHistoryData({
        feedings,
        diapers,
        baths,
        activities
      })
    } catch (error) {
      console.error('Error fetching history data:', error)
    }
  }

  const fetchSettingsData = async () => {
    try {
      const settingsData = await dataService.getSettings()
      if (settingsData) {
        setSettings({
          babyName: 'Малыш', // TODO: Get from family data
          birthDate: settingsData.baby_birth_date || settingsData.birth_date || '2024-01-01',
          feedingInterval: settingsData.feed_interval,
          diaperInterval: settingsData.diaper_interval,
          bathInterval: settingsData.bath_reminder_period,
          activityInterval: settingsData.activity_reminder_interval
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = async () => {
    try {
      const updatedSettings = await dataService.updateSettings({
        feed_interval: settings.feedingInterval,
        diaper_interval: settings.diaperInterval,
        bath_reminder_period: settings.bathInterval,
        activity_reminder_interval: settings.activityInterval,
        baby_birth_date: settings.birthDate,
        baby_age_months: calculateAgeInMonths(settings.birthDate)
      })

      if (updatedSettings) {
        alert('Настройки сохранены успешно!')
        fetchData() // Refresh data to get updated age-based tips
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Ошибка при сохранении настроек')
    }
  }

  const calculateAgeInMonths = (birthDate: string) => {
    const birth = new Date(birthDate)
    const now = new Date()
    const diffInMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    return Math.max(0, diffInMonths)
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="mb-8">
          <div className="flex space-x-4 mb-6">
            <Button
              variant={activeSection === 'dashboard' ? 'primary' : 'secondary'}
              onClick={() => setActiveSection('dashboard')}
            >
              🏠 Главная
            </Button>
            <Button
              variant={activeSection === 'history' ? 'primary' : 'secondary'}
              onClick={() => setActiveSection('history')}
            >
              📊 История
            </Button>
            <Button
              variant={activeSection === 'settings' ? 'primary' : 'secondary'}
              onClick={() => setActiveSection('settings')}
            >
              ⚙️ Настройки
            </Button>
          </div>
        </div>

        {/* Dashboard Section */}
        {activeSection === 'dashboard' && (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Добро пожаловать! 👶</h1>
              <p className="text-gray-300">Отслеживайте важные моменты вашего малыша</p>
            </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
          <StatCard
            title="Последнее купание"
            value={data?.lastBath ? getTimeAgo(data.lastBath.timestamp) : 'Нет данных'}
            icon="🛁"
            color="yellow"
            subtitle={data?.lastBath ? new Date(data.lastBath.timestamp).toLocaleString() : ''}
          />
          <StatCard
            title="Активность сегодня"
            value={data?.todayStats ? `${data.todayStats.activities}` : '0'}
            icon="🎯"
            color="purple"
            subtitle="Активности за день"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Быстрые действия</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              title="Купание"
              description="Записать время купания"
              icon="🛁"
              onClick={() => handleQuickAction('bath')}
              variant="warning"
            />
            <QuickAction
              title="Активность"
              description="Отметить активность"
              icon="🎯"
              onClick={() => handleQuickAction('activity')}
              variant="secondary"
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

              {data?.lastBath && (
                <div className="flex items-center space-x-4 p-4 bg-yellow-50 rounded-xl">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white">
                    🛁
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Купание</p>
                    <p className="text-sm text-gray-600">{getTimeAgo(data.lastBath.timestamp)}</p>
                  </div>
                  <div className="text-sm text-gray-500">{new Date(data.lastBath.timestamp).toLocaleTimeString()}</div>
                </div>
              )}

              {data?.recentActivities.map((activity, index) => (
                <div key={activity.id} className="flex items-center space-x-4 p-4 bg-purple-50 rounded-xl">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white">
                    🎯
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.activity_type}</p>
                    <p className="text-sm text-gray-600">{getTimeAgo(activity.timestamp)}</p>
                  </div>
                  <div className="text-sm text-gray-500">{new Date(activity.timestamp).toLocaleTimeString()}</div>
                </div>
              ))}
              
              {(!data?.lastFeeding && !data?.lastDiaper && !data?.lastBath && (!data?.recentActivities || data.recentActivities.length === 0)) && (
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
                {data?.dailyTip ? (
                  <div>
                    <p className="text-gray-700 mb-2">{data.dailyTip.content}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Категория: {data.dailyTip.category}</span>
                      <span>Возраст: {data.dailyTip.age_months} мес.</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700">
                    Регулярное кормление каждые 2-3 часа помогает установить режим дня для вашего малыша. 
                    Не забывайте записывать время и количество молока!
                  </p>
                )}
              </div>
            </div>
          </Card>
          </>
        )}

        {/* History Section */}
        {activeSection === 'history' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">История событий 📊</h1>
              <p className="text-gray-300">Просматривайте все записи о вашем малыше</p>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">{historyData?.feedings.length || 0}</div>
                <div className="text-sm text-gray-600">Кормлений</div>
              </Card>
              <Card className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">{historyData?.diapers.length || 0}</div>
                <div className="text-sm text-gray-600">Смен подгузника</div>
              </Card>
              <Card className="text-center">
                <div className="text-2xl font-bold text-yellow-600 mb-1">{historyData?.baths.length || 0}</div>
                <div className="text-sm text-gray-600">Купаний</div>
              </Card>
              <Card className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">{historyData?.activities.length || 0}</div>
                <div className="text-sm text-gray-600">Активности</div>
              </Card>
            </div>

            {/* Timeline */}
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Хронология событий</h2>
              </div>
              
              <div className="space-y-4">
                {historyData ? (
                  [...(historyData.feedings || []), ...(historyData.diapers || []), ...(historyData.baths || []), ...(historyData.activities || [])]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 20)
                    .map((item, index) => (
                      <div key={`${item.id}-${index}`} className="flex items-center space-x-4 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg shadow-lg bg-gradient-to-r from-blue-500 to-blue-600">
                            {'timestamp' in item ? '🍼' : 'timestamp' in item ? '👶' : 'timestamp' in item ? '🛁' : '🎯'}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">
                              {'timestamp' in item ? 'Кормление' : 'timestamp' in item ? 'Смена подгузника' : 'timestamp' in item ? 'Купание' : 'Активность'}
                            </h3>
                            <span className="text-sm font-medium text-gray-500">{getTimeAgo(item.timestamp)}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{new Date(item.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📝</div>
                    <p>Загрузка истории...</p>
                  </div>
                )}
              </div>
            </Card>
          </>
        )}

        {/* Settings Section */}
        {activeSection === 'settings' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Настройки ⚙️</h1>
              <p className="text-gray-300">Персонализируйте приложение под ваши потребности</p>
            </div>

            {/* Baby Information */}
            <Card className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Информация о малыше</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Имя малыша
                  </label>
                  <input
                    type="text"
                    value={settings.babyName}
                    onChange={(e) => handleSettingChange('babyName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Введите имя"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата рождения
                  </label>
                  <input
                    type="date"
                    value={settings.birthDate}
                    onChange={(e) => handleSettingChange('birthDate', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
            </Card>

            {/* Interval Settings */}
            <Card className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Настройки интервалов</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Интервал кормления (часы)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={settings.feedingInterval}
                      onChange={(e) => handleSettingChange('feedingInterval', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <span className="text-lg font-semibold text-blue-600 min-w-[3rem] text-center">
                      {settings.feedingInterval}ч
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Интервал смены подгузника (часы)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={settings.diaperInterval}
                      onChange={(e) => handleSettingChange('diaperInterval', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <span className="text-lg font-semibold text-green-600 min-w-[3rem] text-center">
                      {settings.diaperInterval}ч
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Интервал купания (дни)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="7"
                      value={settings.bathInterval}
                      onChange={(e) => handleSettingChange('bathInterval', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <span className="text-lg font-semibold text-yellow-600 min-w-[3rem] text-center">
                      {settings.bathInterval}д
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Интервал активности (часы)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={settings.activityInterval}
                      onChange={(e) => handleSettingChange('activityInterval', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <span className="text-lg font-semibold text-purple-600 min-w-[3rem] text-center">
                      {settings.activityInterval}ч
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                variant="primary" 
                size="lg"
                onClick={handleSaveSettings}
              >
                💾 Сохранить настройки
              </Button>
            </div>
          </>
        )}

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
