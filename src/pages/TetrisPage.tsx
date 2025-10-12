import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { dataService, type TetrisRecord } from '../services/dataService'

export default function TetrisPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { family, member } = useAuth()
  const [familyBestRecord, setFamilyBestRecord] = useState<TetrisRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.src = '/tetris.html'
    }
  }, [])

  useEffect(() => {
    loadBestRecord()
  }, [family])

  const loadBestRecord = async () => {
    if (!family) return

    setLoading(true)
    try {
      const bestRecord = await dataService.getFamilyBestTetrisRecord()
      setFamilyBestRecord(bestRecord)
    } catch (error) {
      console.error('Error loading family best record:', error)
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

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'TETRIS_RECORD') {
        if (!family || !member) return

        try {
          const recordData = event.data.data
          await dataService.addTetrisRecord({
            player_name: member.name || member.role || 'Игрок',
            score: recordData.score,
            level: recordData.level,
            lines_cleared: recordData.lines_cleared,
            game_duration_seconds: recordData.game_duration_seconds,
            pieces_placed: recordData.pieces_placed,
            game_mode: recordData.game_mode || 'classic'
          })
          
          // Перезагружаем лучший рекорд семьи
          await loadBestRecord()
          
          console.log('Tetris record saved from iframe:', recordData)
        } catch (error) {
          console.error('Error saving tetris record from iframe:', error)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [family, member])

  return (
    <div className="h-full w-full flex flex-col">
      {/* Лучший рекорд семьи */}
      {!loading && familyBestRecord && (
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-yellow-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-xl">👑</div>
              <div>
                <div className="font-bold text-yellow-800 text-sm">Лучший рекорд семьи</div>
                <div className="font-semibold text-yellow-700 text-xs">{familyBestRecord.player_name}</div>
                <div className="text-xs text-yellow-600">{formatDate(familyBestRecord.created_at)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-yellow-800 text-lg">{familyBestRecord.score.toLocaleString()}</div>
              <div className="text-xs text-yellow-600">
                Ур. {familyBestRecord.level} • {familyBestRecord.lines_cleared} линий • {formatDuration(familyBestRecord.game_duration_seconds)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Игра Тетрис */}
      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          className="h-full w-full border-0"
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000
          }}
          title="Tetris Game"
        />
      </div>
    </div>
  )
}