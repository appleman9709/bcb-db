import React from 'react'
import type { Tip } from '../../services/dataService'
import { calculateAgeInMonths } from '../../utils/dashboardHelpers'
import type { SettingsState } from '../../types/dashboard'
import PushNotificationManager from '../PushNotificationManager'
import NotificationSender from '../NotificationSender'
import { useTheme } from '../../contexts/ThemeContext'


interface SettingsTabProps {
  dailyTip: Tip | null
  settings: SettingsState
  onSettingChange: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
  onSaveSettings: () => void
  familyName?: string
  memberDisplayName?: string
  onSignOut: () => void
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  dailyTip,
  settings,
  onSettingChange,
  onSaveSettings,
  familyName,
  memberDisplayName,
  onSignOut
}) => {
  const { theme, actualTheme, setTheme } = useTheme()
  const themeOptions = [
    {
      value: 'system',
      label: 'Авто',
      description: 'Следовать настройкам iPhone'
    },
    { value: 'light', label: 'День', description: 'Светлая тема' },
    { value: 'dark', label: 'Ночь', description: 'Тёмная тема' }
  ] as const

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 bg-gray-50 backdrop-blur-sm text-center py-3 -mx-4 px-4">
        <h1 className="text-lg font-bold text-gray-900 mb-1">Настройки</h1>
        <p className="text-xs text-gray-600">Управляйте уведомлениями и настройками</p>
      </div>

      {/* Совет дня */}
      {dailyTip && (
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center gap-2">
          <img src="/icons/sovet.png" alt="Совет" className="w-10 h-10 object-contain" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Совет дня</h3>
            <p className="text-xs text-gray-700">{dailyTip.content}</p>
          </div>
        </div>
      )}

      {/* Оформление + Push-уведомления в сетке */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2">
          <span className="slider-icon-emoji">🌗</span>
          <p className="text-sm font-semibold text-gray-900">Оформление</p>
          <p className="text-xs text-gray-600 text-center">
          Выберите тему
        </p>
          <div className="flex flex-col items-center justify-center">
            {themeOptions.map((option) => {
              const isActive = theme === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={`flex items-center justify-center rounded-xl px-3 py-2 text-centr ${
                    isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-800'
                  }`}
                  aria-pressed={isActive}
                >
                  <span className="text-sm font-semibold leading-none">{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>
        {/* Push уведомления */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2">
          <span className="slider-icon-emoji">🔔</span>
          <p className="text-sm font-semibold text-gray-900 text-center">Уведомления</p>
          <PushNotificationManager />
        </div>
      </div>
      {/* Дата рождения */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 date-input-container">
          <h2 className="text-base font-semibold text-gray-900 text-center mb-2">Дата рождения</h2>
              <input
                type="date"
                value={settings.birthDate}
                onChange={(event) => onSettingChange('birthDate', event.target.value)}
                className="w-full text-center text-gray-800"
                inputMode="numeric"
                autoComplete="bday"
                placeholder=""
                aria-label="Дата рождения ребёнка"
                aria-describedby="birth-date-description"
              />
            <div id="birth-date-description" className="age-description text-gray-600">
              <span className="age-indicator"></span>
              <span>
                Возраст:{' '}
                <span>{calculateAgeInMonths(settings.birthDate)} месяцев</span>
              </span>
            </div>
      </div>

      {/* Интервалы */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 text-center mb-2">Интервалы</h2>
            <div className="slider-header">
            <img
                src="/icons/feeding.png"
                alt="Покакал"
                className="w-10 h-10 object-contain"
                />
              <h3 className="slider-info">Кормление</h3>
              <div className="slider-value-badge">
                <span className="value-number">{settings.feedingInterval}</span>
                <span className="value-unit">ч</span>
              </div>
            </div>

              <div className="slider-track-container">
                <div className="slider-track">
                  <div
                    className="slider-progress feeding-progress"
                    style={{ width: `${((settings.feedingInterval - 1) / 5) * 100}%` }}
                  ></div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="9"
                  value={settings.feedingInterval}
                  onChange={(event) => onSettingChange('feedingInterval', Number(event.target.value))}
                  className="modern-slider"
                />
              </div>

            <div className="slider-header">
              <img
                src="/icons/diaper.png"
                alt="Покакал"
                className="w-10 h-10 object-contain"
                />
              <h3 className="slider-info">Подгузники</h3>
              <div className="slider-value-badge">
                <span className="value-number">{settings.diaperInterval}</span>
                <span className="value-unit">ч</span>
              </div>
            </div>

              <div className="slider-track-container">
                <div className="slider-track">
                  <div
                    className="slider-progress diaper-progress"
                    style={{ width: `${((settings.diaperInterval - 1) / 5) * 100}%` }}
                  ></div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={settings.diaperInterval}
                  onChange={(event) => onSettingChange('diaperInterval', Number(event.target.value))}
                  className="modern-slider"
                />
              </div>

            <div className="slider-header">
            <img
                src="/icons/bath.png"
                alt="Покакал"
                className="w-10 h-10 object-contain"
                />
              <h3 className="slider-info">Купание</h3>
              <div className="slider-value-badge">
                <span className="value-number">{settings.bathInterval}</span>
                <span className="value-unit">дн</span>
              </div>
            </div>

              <div className="slider-track-container">
                <div className="slider-track">
                  <div
                    className="slider-progress bath-progress"
                    style={{ width: `${((settings.bathInterval - 1) / 6) * 100}%` }}
                  ></div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="7"
                  value={settings.bathInterval}
                  onChange={(event) => onSettingChange('bathInterval', Number(event.target.value))}
                  className="modern-slider"
                />
              </div>
      </div>

      {/* Отправить уведомление */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 text-center">📤 Отправить уведомление</h2>
        <NotificationSender />
      </div>

      {/* Семья и профиль */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 text-center mb-2">Семья и профиль</h2>
          <div className="flex justify-between items-center p-2">
            <p className="text-xs font-medium text-gray-900">Семья</p>
            <span className="text-xs font-medium text-gray-700">{familyName ?? 'Family'}</span>
          </div>
          <div className="flex justify-between items-center p-2">
            <p className="text-xs font-medium text-gray-900">Ваше имя</p>
            <span className="text-xs font-medium text-gray-700">{memberDisplayName}</span>
          </div>
          <button
            onClick={onSignOut}
            className="w-full mt-2 px-3 py-2 bg-red-500 text-white rounded-xl font-medium text-xs"
          >
          Выйти из семьи
          </button>
      </div>

      {/* Сохранить настройки */}
      <button
        onClick={onSaveSettings}
        className="w-full text-white font-semibold bg-green-500 py-4 px-4 rounded-2xl text-sm"
      >
        Сохранить настройки
      </button>

      {/* Отступ для нижней навигации */}
      <div className="h-40"></div>
    </div>
  )
}

export default SettingsTab
