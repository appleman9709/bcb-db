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
  const { actualTheme, setTheme } = useTheme()
  const isDarkTheme = actualTheme === 'dark'

  const handleThemeToggle = () => {
    setTheme(isDarkTheme ? 'light' : 'dark')
  }

  return (
    <div className="space-y-3">
      <div className="text-center">
        <h1 className="text-lg font-bold text-gray-900 mb-1">Настройки</h1>
        <p className="text-xs text-gray-600">Управляйте уведомлениями и настройками</p>
      </div>

      {/* Совет дня */}
      {dailyTip && (
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/icons/sovet.png" alt="Совет" className="w-10 h-10 object-contain" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Совет дня</h3>
              <p className="text-xs text-gray-700 mb-1">{dailyTip.content}</p>
              <div className="flex flex-wrap gap-1 text-xs text-gray-500">
                <span className="bg-white px-1.5 py-0.5 rounded-2xl">📌 {dailyTip.category}</span>
                <span className="bg-white px-1.5 py-0.5 rounded-2xl">👶 {dailyTip.age_months} мес.</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>🌗</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">Темная тема</p>
              <p className="text-xs text-gray-500">Переключите оформление на ночное небо</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleThemeToggle}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDarkTheme ? 'bg-blue-600' : 'bg-gray-200'
            }`}
            aria-pressed={isDarkTheme}
            aria-label="Переключить темную тему"
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ${
                isDarkTheme ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
      {/* Дата рождения */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
        <div className="text-center mb-2">
          <h2 className="text-base font-semibold text-gray-900">Дата рождения</h2>
        </div>
        <div className="space-y-2">
          <div className="date-input-container">
            <div className="relative">
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
              <div></div>
            </div>
            <div id="birth-date-description" className="age-description text-gray-600">
              <span className="age-indicator"></span>
              <span>
                Возраст:{' '}
                <span>{calculateAgeInMonths(settings.birthDate)} месяцев</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Интервалы */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
        <div className="text-center mb-2">
          <h2 className="text-base font-semibold text-gray-900">Интервалы</h2>
        </div>
        <div className="space-y-3">
          <div className="modern-slider-card">
            <div className="slider-header">
              <div className="slider-icon-emoji">🍼</div>
              <div className="slider-info">
                <h3 className="slider-title">Кормление</h3>
              </div>
              <div className="slider-value-badge">
                <span className="value-number">{settings.feedingInterval}</span>
                <span className="value-unit">ч</span>
              </div>
            </div>

            <div className="slider-wrapper">
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
                  max="6"
                  value={settings.feedingInterval}
                  onChange={(event) => onSettingChange('feedingInterval', Number(event.target.value))}
                  className="modern-slider"
                />
              </div>
            </div>
          </div>

          <div className="modern-slider-card">
            <div className="slider-header">
              <div className="slider-icon-emoji">👶</div>
              <div className="slider-info">
                <h3 className="slider-title">Подгузники</h3>
              </div>
              <div className="slider-value-badge">
                <span className="value-number">{settings.diaperInterval}</span>
                <span className="value-unit">ч</span>
              </div>
            </div>

            <div className="slider-wrapper">
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
            </div>
          </div>

          <div className="modern-slider-card">
            <div className="slider-header">
              <div className="slider-icon-emoji">🛁</div>
              <div className="slider-info">
                <h3 className="slider-title">Купание</h3>
              </div>
              <div className="slider-value-badge">
                <span className="value-number">{settings.bathInterval}</span>
                <span className="value-unit">дн</span>
              </div>
            </div>

            <div className="slider-wrapper">
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
          </div>
        </div>
      </div>

      {/* Push уведомления */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-gray-900 text-center mb-2">🔔 Push-уведомления</h2>
        <PushNotificationManager />
      </div>

      {/* Отправить уведомление */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-gray-900 text-center mb-2">📤 Отправить уведомление</h2>
        <NotificationSender />
      </div>

      {/* Семья и профиль */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
        <div className="flex gap-2">
          <h2 className="text-base font-semibold text-gray-900 text-center mb-2">Семья и профиль</h2>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2">
            <div>
              <p className="text-xs font-medium text-gray-900">Семья</p>
              <p className="text-xs text-gray-500">Название вашей семьи</p>
            </div>
            <span className="text-xs font-medium text-gray-700">{familyName ?? 'Family'}</span>
          </div>
          <div className="flex justify-between items-center p-2">
            <div>
              <p className="text-xs font-medium text-gray-900">Ваше имя</p>
              <p className="text-xs text-gray-500">Имя участника в семье</p>
            </div>
            <span className="text-xs font-medium text-gray-700">{memberDisplayName}</span>
          </div>
          <button
            onClick={onSignOut}
            className="w-full mt-2 px-3 py-2 bg-red-500 text-white rounded-xl font-medium text-xs"
          >
          Выйти из аккаунта
          </button>
        </div>
      </div>

      {/* Сохранить настройки */}
      <button
        onClick={onSaveSettings}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-4 px-4 rounded-2xl shadow-lg text-sm"
      >
        💾 Сохранить настройки
      </button>

      {/* Отступ для нижней навигации */}
      <div className="h-32"></div>
    </div>
  )
}

export default SettingsTab
