import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { dataService, type TetrisRecordWithRank } from '../services/dataService'

interface TetrisLeaderboardProps {
  onClose: () => void
}

export default function TetrisLeaderboard({ onClose }: TetrisLeaderboardProps) {
  const { family, member } = useAuth()
  const [familyRecords, setFamilyRecords] = useState<TetrisRecordWithRank[]>([])
  const [userRecords, setUserRecords] = useState<TetrisRecordWithRank[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'family' | 'personal'>('family')

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    if (!family || !member) return

    setLoading(true)
    try {
      const [familyData, userData] = await Promise.all([
        dataService.getFamilyTetrisRecords(10),
        dataService.getUserTetrisRecords(10)
      ])
      
      setFamilyRecords(familyData)
      setUserRecords(userData)
    } catch (error) {
      console.error('Error loading tetris records:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  const renderRecordRow = (record: TetrisRecordWithRank, index: number) => (
    <div key={record.id} className="flex items-center justify-between py-3 px-4 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="text-lg font-bold text-gray-700 min-w-[40px]">
          {getRankIcon(record.rank)}
        </div>
        <div>
          <div className="font-semibold text-gray-900">{record.player_name}</div>
          <div className="text-sm text-gray-500">{formatDate(record.created_at)}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold text-blue-600 text-lg">{record.score.toLocaleString()}</div>
        <div className="text-sm text-gray-500">
          Ур. {record.level} • {record.lines_cleared} линий • {formatDuration(record.game_duration_seconds)}
        </div>
      </div>
    </div>
  )


  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка рекордов...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">🏆 Таблица рекордов</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Вкладки */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('family')}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === 'family'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            👨‍👩‍👧‍👦 Семья
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === 'personal'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            👤 Личные
          </button>
        </div>

        {/* Содержимое */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'family' ? (
            <div className="p-4">
              {familyRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🎮</div>
                  <p>Пока нет рекордов семьи</p>
                  <p className="text-sm">Сыграйте в тетрис, чтобы установить первый рекорд!</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-gray-800">🏆 Топ рекордов семьи</h3>
                  </div>
                  <div>
                    {familyRecords.map((record, index) => renderRecordRow(record, index))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              {userRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🎯</div>
                  <p>У вас пока нет личных рекордов</p>
                  <p className="text-sm">Сыграйте в тетрис, чтобы установить свой первый рекорд!</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-gray-800">👤 Ваши рекорды</h3>
                  </div>
                  <div>
                    {userRecords.map((record, index) => renderRecordRow(record, index))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Подвал */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-center text-sm text-gray-600">
            <p>Рекорды синхронизируются между всеми членами семьи</p>
            <p className="mt-1">Обновляется автоматически после каждой игры</p>
          </div>
        </div>
      </div>
    </div>
  )
}
