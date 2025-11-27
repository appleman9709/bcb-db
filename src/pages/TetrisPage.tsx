import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { dataService, type TetrisRecord } from '../services/dataService'
import BottomNavigation from '../components/BottomNavigation'
import { RecordDisplay } from '../components/ModalUtils'
import { useTetrisRecordCache } from '../hooks/useTetrisRecordCache'
import CategoryPreloader from '../components/CategoryPreloader'
import TetrisGame, { type GameOverStats } from '../components/TetrisGame'

export default function TetrisPage() {

  const { family, member } = useAuth()
  const [familyBestRecord, setFamilyBestRecord] = useState<TetrisRecord | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Используем хук для кэширования рекордов
  const { loadBestRecord, updateCacheIfBetter, getCachedRecord } = useTetrisRecordCache()

  const handleTabChange = (tab: 'home' | 'history' | 'settings' | 'tamagotchi' | 'tetris') => {
    console.log('TetrisPage: Switching to tab:', tab)
    // Отправляем событие для переключения вкладки в родительском компоненте
    window.dispatchEvent(new CustomEvent('tetris-navigation', { 
      detail: { tab } 
    }))
  }

  useEffect(() => {
    const loadRecord = async () => {
      if (!family) return
      
      setLoading(true)
      const record = await loadBestRecord()
      setFamilyBestRecord(record)
      setLoading(false)
    }
    
    loadRecord()
  }, [family, loadBestRecord])

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

  const handleGameOver = useCallback(async (stats: GameOverStats) => {
    if (!family || !member) return

    try {
      const newRecord = {
        player_name: member.name || member.role || 'Игрок',
        score: stats.score,
        level: stats.level,
        lines_cleared: stats.lines_cleared,
        game_duration_seconds: stats.game_duration_seconds,
        pieces_placed: stats.pieces_placed,
        game_mode: stats.game_mode || 'classic'
      }

      await dataService.addTetrisRecord(newRecord)

      const wasUpdated = updateCacheIfBetter(newRecord)

      if (wasUpdated) {
        const updatedRecord = getCachedRecord()
        if (updatedRecord) {
          setFamilyBestRecord(updatedRecord)
        }
      
      }

      console.log('Tetris record saved from React game:', stats)
    } catch (error) {
      console.error('Error saving tetris record:', error)
    }
  }, [family, member, getCachedRecord, updateCacheIfBetter])

  return (
    <div className="h-full w-full flex flex-col">
      {/* Предзагрузка изображений для навигации */}
      <CategoryPreloader category="navigation" priority="medium" delay={200} />
      
      {/* Лучший рекорд семьи */}
      {!loading && familyBestRecord && (
        <RecordDisplay
          icon="👑"
          title="Лучший рекорд семьи"
          playerName={familyBestRecord.player_name}
          date={formatDate(familyBestRecord.created_at)}
          score={familyBestRecord.score}
          details={`Ур. ${familyBestRecord.level} • ${familyBestRecord.lines_cleared} линий • ${formatDuration(familyBestRecord.game_duration_seconds)}`}
        />
      )}

      {/* Игра Тетрис */}
      <div className="flex-1 relative pb-20">
        <TetrisGame onGameOver={handleGameOver} />
      </div>

      {/* Панель навигации */}
      <BottomNavigation 
        activeTab="tetris" 
        onTabChange={handleTabChange} 
      />
    </div>
  )
}