import { useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'

export default function Settings() {
  const [settings, setSettings] = useState({
    babyName: 'Малыш',
    birthDate: '2024-01-01',
    feedingInterval: 3,
    reminderEnabled: true,
    notifications: true,
    theme: 'light'
  })

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
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

        {/* Feeding Settings */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Настройки кормления</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Интервал между кормлениями (часы)
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
                Рекомендуется кормить каждые 2-3 часа
              </p>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Уведомления</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                  🔔
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Напоминания о кормлении</h3>
                  <p className="text-sm text-gray-600">Получать уведомления каждые {settings.feedingInterval} часа</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.reminderEnabled}
                  onChange={(e) => handleSettingChange('reminderEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                  📱
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Push-уведомления</h3>
                  <p className="text-sm text-gray-600">Получать уведомления на устройство</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        </Card>

        {/* Theme Settings */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Внешний вид</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: 'light', label: 'Светлая', icon: '☀️', description: 'Классическая светлая тема' },
              { key: 'dark', label: 'Темная', icon: '🌙', description: 'Темная тема для глаз' },
              { key: 'auto', label: 'Авто', icon: '🔄', description: 'Следует системным настройкам' }
            ].map((theme) => (
              <div
                key={theme.key}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  settings.theme === theme.key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleSettingChange('theme', theme.key)}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">{theme.icon}</div>
                  <h3 className="font-medium text-gray-900 mb-1">{theme.label}</h3>
                  <p className="text-sm text-gray-600">{theme.description}</p>
                </div>
              </div>
            ))}
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
          <Button variant="primary" size="lg">
            💾 Сохранить настройки
          </Button>
        </div>
      </div>
    </div>
  )
}
