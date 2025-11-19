import React from 'react'
import type { Tip } from '../../services/dataService'
import { calculateAgeInMonths } from '../../utils/dashboardHelpers'
import type { SettingsState } from '../../types/dashboard'
import PushNotificationManager from '../PushNotificationManager'
import NotificationSender from '../NotificationSender'

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
  return (
    <div className="space-y-3">
      <div className="text-center">
        <h1 className="text-lg font-bold text-gray-900 mb-1">Настройки</h1>
        <p className="text-xs text-gray-600">Управляйте уведомлениями и настройками</p>
      </div>

      {/* Совет дня */}
      {dailyTip && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-2.5 shadow-sm border border-blue-100 iphone14-tip">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center iphone14-tip-icon">
              <img src="/icons/sovet.png" alt="Совет" className="w-10 h-10 object-contain" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Совет дня</h3>
              <p className="text-xs text-gray-700 mb-1">{dailyTip.content}</p>
              <div className="flex flex-wrap gap-1 text-xs text-gray-500">
                <span className="bg-white px-1.5 py-0.5 rounded-3xl">📌 {dailyTip.category}</span>
                <span className="bg-white px-1.5 py-0.5 rounded-3xl">👶 {dailyTip.age_months} мес.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Дата рождения */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 iphone14-card">
        <div className="text-center mb-2">
          <h2 className="text-base font-semibold text-gray-900">Дата рождения</h2>
        </div>
        <div className="space-y-2">
          <div className="date-input-container">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              📅 Дата рождения
            </label>
            <div className="relative">
              <input
                type="date"
                value={settings.birthDate}
                onChange={(event) => onSettingChange('birthDate', event.target.value)}
                className="w-full text-center"
                inputMode="numeric"
                autoComplete="bday"
                placeholder=""
                aria-label="Дата рождения ребёнка"
                aria-describedby="birth-date-description"
              />
              <div className="focus-ring"></div>
            </div>
            <div id="birth-date-description" className="age-description">
              <span className="age-indicator"></span>
              <span>
                Возраст:{' '}
                <span className="age-value">{calculateAgeInMonths(settings.birthDate)} месяцев</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Интервалы */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 iphone14-card">
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
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 iphone14-card">
        <h2 className="text-base font-semibold text-gray-900 mb-3">🔔 Push-уведомления</h2>
        <PushNotificationManager />
      </div>

      {/* Отправить уведомление */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 iphone14-card">
        <h2 className="text-base font-semibold text-gray-900 mb-3">📤 Отправить уведомление</h2>
        <NotificationSender />
      </div>

      {/* Семья и профиль */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 iphone14-card">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 flex items-center justify-center text-sm">
            👨‍👩‍👧‍👦
          </div>
          <h2 className="text-base font-semibold text-gray-900">Семья и профиль</h2>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded-3xl">
            <div>
              <p className="text-xs font-medium text-gray-900">Семья</p>
              <p className="text-xs text-gray-500">Название вашей семьи</p>
            </div>
            <span className="text-xs font-medium text-gray-700">{familyName ?? 'Family'}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded-3xl">
            <div>
              <p className="text-xs font-medium text-gray-900">Ваше имя</p>
              <p className="text-xs text-gray-500">Имя участника в семье</p>
            </div>
            <span className="text-xs font-medium text-gray-700">{memberDisplayName}</span>
          </div>
          <button
            onClick={onSignOut}
            className="w-full mt-2 px-3 py-1.5 bg-red-500 text-white rounded-3xl hover:bg-red-600 transition-colors font-medium text-xs"
          >
            🚪 Выйти из аккаунта
          </button>
        </div>
      </div>

      {/* Сохранить настройки */}
      <button
        onClick={onSaveSettings}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2 px-4 rounded-3xl shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-sm"
      >
        💾 Сохранить настройки
      </button>

      {/* Отступ для нижней навигации */}
      <div className="h-32"></div>
    </div>
  )
}

export default SettingsTab
