import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { dataService, type TetrisRecord } from '../services/dataService'
import BottomNavigation from '../components/BottomNavigation'
import { useTetrisRecordCache } from '../hooks/useTetrisRecordCache'
import TetrisGame, { type GameOverStats } from '../components/TetrisGame'

export default function TetrisPage() {

  const { family, member } = useAuth()
  const [familyBestRecord, setFamilyBestRecord] = useState<TetrisRecord | null>(null)
  
  // Используем хук для кэширования рекордов
  const { loadBestRecord, updateCacheIfBetter, getCachedRecord } = useTetrisRecordCache()

  const handleTabChange = (tab: 'home' | 'history' | 'settings' | 'tamagotchi' | 'tetris') => {
    window.dispatchEvent(new CustomEvent('tetris-navigation', {
      detail: { tab }
    }))
  }

  useEffect(() => {
    if (!family) return
    loadBestRecord().then(record => {
      setFamilyBestRecord(record)
    })
  }, [family, loadBestRecord])

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
      {/* Игра Тетрис */}
      <div className="flex-1 relative pb-20">
        <TetrisGame
          onGameOver={handleGameOver}
          familyRecordScore={familyBestRecord?.score ?? null}
        />
      </div>

      {/* Панель навигации */}
      <BottomNavigation 
        activeTab="tetris" 
        onTabChange={handleTabChange} 
      />
    </div>
  )
}