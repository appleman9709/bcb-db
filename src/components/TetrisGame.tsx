import { useCallback, useEffect, useRef, useState } from 'react'
import { MobileSudokuTetris } from '../lib/TetrisGame'
import React from 'react';


export interface GameOverStats {
  score: number
  level: number
  lines_cleared: number
  game_duration_seconds: number
  pieces_placed: number
  game_mode: string
}

interface TetrisGameProps {
  onGameOver?: (stats: GameOverStats) => void
  familyRecordScore?: number | null
}

export default function TetrisGame({ onGameOver, familyRecordScore }: TetrisGameProps) {
  const gameInstanceRef = useRef<MobileSudokuTetris | null>(null)
  const gameOverHandlerRef = useRef<typeof onGameOver>()
  const initialRecordRef = useRef<number | undefined>(familyRecordScore ?? undefined)
  const [isLoading, setIsLoading] = useState(true)

  gameOverHandlerRef.current = onGameOver

  const memoizedCallback = useCallback((stats: GameOverStats) => {
    if (gameOverHandlerRef.current) {
      gameOverHandlerRef.current(stats)
    }
  }, [])

  useEffect(() => {
    const stylesheet = document.createElement('link')
    stylesheet.rel = 'stylesheet'
    stylesheet.href = '/style.css'
    document.head.appendChild(stylesheet)

    let animationFrameId: number | null = null

    const gameInstance = new MobileSudokuTetris({
      onGameOver: memoizedCallback,
      initialRecord: initialRecordRef.current
    })
    gameInstanceRef.current = gameInstance;

    animationFrameId = requestAnimationFrame(() => setIsLoading(false))

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
      gameInstance.destroy()
      gameInstanceRef.current = null
      if (stylesheet.parentNode) {
        stylesheet.parentNode.removeChild(stylesheet)
      }
    }
  }, [memoizedCallback])

  useEffect(() => {
    if (gameInstanceRef.current && typeof familyRecordScore === 'number') {
      gameInstanceRef.current.setRecord(familyRecordScore)
    }
  }, [familyRecordScore])

  return (
    <div className="game-container">
      <header className="game-header">
          <div className="grid grid-cols-2 items-center">
          <div className="flex items-center gap-2">
            <img
              src="/new.png"
              id="newGameBtn"
              className="game-control-btn"
              style={{ width: 48, height: 48, marginLeft: 8, cursor: 'pointer' }}
              title="Новая игра"
              alt="Новая игра"
            />
            <img
              src="/update.png"
              id="undoBtn"
              className="game-control-btn"
              style={{ width: 48, height: 48, marginLeft: 8, cursor: 'pointer' }}
              title="Отменить ход"
              alt="Отменить ход"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="level-display text-[#f5865e] font-bold" title="Уровень">
              Ур. <span id="levelDisplay">1</span>
            </div>
            
            <div className="record-display text-[#f5865e] font-bold" title="Рекорд">
              Рекорд: <span id="record">0</span>
            </div>
          </div>
          </div>
          <div className="score-section">
          <div className="current-score" id="currentScore">
              0
            </div>
            <div className="inventory-actions">
              <button
                className="inventory-item"
                id="feedingInventoryBtn"
                type="button"
                draggable
                data-inventory-type="feeding"
              >
                <img src="/icons/feeding.png" alt="Кормление" className="inventory-icon" />
                <span className="inventory-count" id="feedingInventoryCount">0</span>
              </button>
              <button
                className="inventory-item"
                id="diaperInventoryBtn"
                type="button"
                draggable
                data-inventory-type="diaper"
              >
                <img src="/icons/diaper.png" alt="Пеленка" className="inventory-icon" />
                <span className="inventory-count" id="diaperInventoryCount">0</span>
              </button>
            </div>
          </div>
      </header>

      <main className="game-main">
        <section className="game-board-section">
          <div className="game-board">
            <canvas id="gameCanvas" />
          </div>
        </section>

        <section className="pieces-tray">
          <div className="pieces-container" id="piecesContainer">
            <div id="slot1" data-slot="1" />
            <div id="slot2" data-slot="2" />
            <div id="slot3" data-slot="3" />
          </div>
        </section>
      </main>

      <div className="game-over" id="gameOver" style={{ display: 'none' }} />

      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-sm">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-orange-200" />
            <div
              className="absolute inset-0 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"
              style={{ animationDuration: '1.1s' }}
            />
            <img
              src="/icons/feeding.png"
              alt="Загрузка Тетриса"
              loading="lazy"
              className="relative z-10 h-20 w-20 animate-pulse object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}