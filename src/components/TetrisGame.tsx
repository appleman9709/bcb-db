import { useEffect, useMemo, useRef } from 'react'
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
}

export default function TetrisGame({ onGameOver }: TetrisGameProps) {
  const gameInstanceRef = useRef<MobileSudokuTetris | null>(null)
  const gameOverHandlerRef = useRef<typeof onGameOver>()

  gameOverHandlerRef.current = onGameOver

  const memoizedCallback = useMemo(() => {
    return (stats: GameOverStats) => {
      if (gameOverHandlerRef.current) {
        gameOverHandlerRef.current(stats)
      }
    }
  }, [])

  useEffect(() => {
    const stylesheet = document.createElement('link')
    stylesheet.rel = 'stylesheet'
    stylesheet.href = '/style.css'
    document.head.appendChild(stylesheet)

    const gameInstance = new MobileSudokuTetris({ onGameOver: memoizedCallback })
    gameInstanceRef.current = gameInstance
    ;(window as any).game = gameInstance

    return () => {
      gameInstance.destroy()
      gameInstanceRef.current = null
      if (stylesheet.parentNode) {
        stylesheet.parentNode.removeChild(stylesheet)
      }
    }
  }, [memoizedCallback])

  return (
    <div className="game-container">
      <header className="game-header">
          <div className="flex items-center gap-2">
            <img
              src="/new.png"
              id="newGameBtn"
              className="game-control-btn"
              style={{ width: 34, height: 34, marginLeft: 8, cursor: 'pointer' }}
              title="Новая игра"
              alt="Новая игра"
            />
            <img
              src="/update.png"
              id="undoBtn"
              className="game-control-btn"
              style={{ width: 34, height: 34, marginLeft: 8, cursor: 'pointer' }}
              title="Отменить ход"
              alt="Отменить ход"
            />
            <img
              src="/mix.png"
              id="refreshBtn"
              className="game-control-btn"
              style={{ width: 34, height: 34, marginLeft: 8, cursor: 'pointer' }}
              title="Обновить"
              alt="Обновить"
            />
          </div>
          <div className="score-section">
            <div className="current-score" id="currentScore">
              0
            </div>
            <div className="level-display text-[#f5865e] font-bold text-sm" title="Уровень">
              Ур. <span id="levelDisplay">1</span>
            </div>
            <div className="record-display text-[#f5865e] font-bold text-sm" title="Рекорд">
              Рекорд: <span id="record">0</span>
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
    </div>
  )
}