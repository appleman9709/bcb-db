import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { dataService, type TetrisRecord } from '../services/dataService'
import BottomNavigation from '../components/BottomNavigation'
import { RecordDisplay } from '../components/ModalUtils'
import { useTetrisRecordCache } from '../hooks/useTetrisRecordCache'
import CategoryPreloader from '../components/CategoryPreloader'

export default function TetrisPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
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
    if (iframeRef.current) {
      iframeRef.current.src = '/tetris.html'
    }
  }, [])

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

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'TETRIS_RECORD') {
        if (!family || !member) return

        try {
          const recordData = event.data.data
          const newRecord = {
            player_name: member.name || member.role || 'Игрок',
            score: recordData.score,
            level: recordData.level,
            lines_cleared: recordData.lines_cleared,
            game_duration_seconds: recordData.game_duration_seconds,
            pieces_placed: recordData.pieces_placed,
            game_mode: recordData.game_mode || 'classic'
          }
          
          await dataService.addTetrisRecord(newRecord)
          
          // Проверяем, действительно ли новый рекорд лучше текущего
          const wasUpdated = updateCacheIfBetter(newRecord)
          
          if (wasUpdated) {
            // Обновляем состояние с новым рекордом из кэша
            const updatedRecord = getCachedRecord()
            if (updatedRecord) {
              setFamilyBestRecord(updatedRecord)
            }
          }
          
          console.log('Tetris record saved from iframe:', recordData)
        } catch (error) {
          console.error('Error saving tetris record from iframe:', error)
        }
      } else if (event.data?.type === 'NAVIGATION') {
        // Обработка навигации из iframe
        const tab = event.data.tab
        console.log('Navigation from iframe:', tab)
        
        // Отправляем событие для переключения вкладки
        window.dispatchEvent(new CustomEvent('tetris-navigation', { 
          detail: { tab } 
        }))
      } else if (event.data?.type === 'TETRIS_BACK') {
        // Обработка кнопки "Назад" из iframe
        console.log('Back button pressed in tetris iframe')
        
        // Отправляем событие для переключения на главную вкладку
        window.dispatchEvent(new CustomEvent('tetris-navigation', { 
          detail: { tab: 'home' } 
        }))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [family, member])

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
      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          className="absolute inset-0 w-full h-full"
          style={{ 
            bottom: '80px', // Оставляем место для панели навигации
            zIndex: 10
          }}
          title="Tetris Game"
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