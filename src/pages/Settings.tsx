import { useState, useEffect } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { dataService, Settings as DBSettings } from '../services/dataService'

export default function Settings() {
  const [settings, setSettings] = useState({
    babyName: 'Малыш',
    birthDate: '2024-01-01',
    feedingInterval: 3,
    diaperInterval: 2,
    bathInterval: 1,
    activityInterval: 2
  })
  const [dbSettings, setDbSettings] = useState<DBSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const settingsData = await dataService.getSettings()
      if (settingsData) {
        setDbSettings(settingsData)
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
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
        const updatedSettings = await dataService.updateSettings({
          feed_interval: settings.feedingInterval,
          diaper_interval: settings.diaperInterval,
          bath_reminder_period: settings.bathInterval,
          activity_reminder_interval: settings.activityInterval,
          baby_birth_date: settings.birthDate,
          baby_age_months: calculateAgeInMonths(settings.birthDate)
        })

      if (updatedSettings) {
        setDbSettings(updatedSettings)
        // Show success message
        alert('Настройки сохранены успешно!')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Ошибка при сохранении настроек')
    } finally {
      setSaving(false)
    }
  }

  const calculateAgeInMonths = (birthDate: string) => {
    const birth = new Date(birthDate)
    const now = new Date()
    const diffInMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    return Math.max(0, diffInMonths)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Настройки ⚙️</h1>
          <p className="text-gray-600">Персонализируйте приложение под ваши потребности</p>
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
              <p className="text-sm text-gray-500 mt-2">
                Рекомендуется каждые 2-3 часа
              </p>
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
              <p className="text-sm text-gray-500 mt-2">
                Рекомендуется каждые 2-3 часа
              </p>
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
              <p className="text-sm text-gray-500 mt-2">
                Рекомендуется каждый день
              </p>
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
              <p className="text-sm text-gray-500 mt-2">
                Рекомендуется каждые 2-3 часа
              </p>
            </div>
          </div>
        </Card>



        {/* Export/Import */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Данные</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="secondary" className="w-full">
              📤 Экспорт данных
            </Button>
            <Button variant="secondary" className="w-full">
              📥 Импорт данных
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Экспортируйте ваши данные для резервного копирования или импортируйте из другого устройства
          </p>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            variant="primary" 
            size="lg"
            onClick={handleSaveSettings}
            disabled={saving || loading}
          >
            {saving ? 'Сохранение...' : '💾 Сохранить настройки'}
          </Button>
        </div>
      </div>
    </div>
  )
}
