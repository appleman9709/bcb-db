import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { dataService, type TetrisRecord } from '../services/dataService'
import TetrisLeaderboard from '../components/TetrisLeaderboard'

interface TetrisPiece {
  id: string
  name: string
  shape: number[][]
  color: string
  size: number
}

interface GameState {
  board: number[][]
  boardColors: (string | null)[][]
  score: number
  level: number
  lines: number
  gameRunning: boolean
  availablePieces: TetrisPiece[]
  gameStartTime: number
  piecesPlaced: number
}

const BOARD_SIZE = 9
const CELL_SIZE = 36

const TETRIS_PIECES: TetrisPiece[] = [
  {
    id: 'I',
    name: 'Линия',
    shape: [[1, 1, 1, 1]],
    color: '#3BA3FF',
    size: 4
  },
  {
    id: 'O',
    name: 'Квадрат',
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#31C48D',
    size: 2
  },
  {
    id: 'T',
    name: 'Т-образная',
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: '#FF8A34',
    size: 3
  },
  {
    id: 'S',
    name: 'S-образная',
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: '#7C5CFF',
    size: 3
  },
  {
    id: 'Z',
    name: 'Z-образная',
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: '#FF5A5F',
    size: 3
  },
  {
    id: 'J',
    name: 'J-образная',
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: '#FFC145',
    size: 3
  },
  {
    id: 'L',
    name: 'L-образная',
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: '#7AD53A',
    size: 3
  }
]

export default function SimpleTetrisPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { family, member } = useAuth()
  const [gameState, setGameState] = useState<GameState>({
    board: Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0)),
    boardColors: Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)),
    score: 0,
    level: 1,
    lines: 0,
    gameRunning: true,
    availablePieces: [],
    gameStartTime: Date.now(),
    piecesPlaced: 0
  })
  const [draggedPiece, setDraggedPiece] = useState<TetrisPiece | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [familyBestRecord, setFamilyBestRecord] = useState<TetrisRecord | null>(null)

  // Инициализация игры
  useEffect(() => {
    generatePieces()
    drawBoard()
  }, [])

  // Загрузка лучшего рекорда семьи
  useEffect(() => {
    loadBestRecord()
  }, [family])

  const loadBestRecord = async () => {
    if (!family) return

    try {
      const bestRecord = await dataService.getFamilyBestTetrisRecord()
      setFamilyBestRecord(bestRecord)
    } catch (error) {
      console.error('Error loading family best record:', error)
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

  // Генерация фигур
  const generatePieces = useCallback(() => {
    const pieces: TetrisPiece[] = []
    for (let i = 0; i < 3; i++) {
      const randomPiece = TETRIS_PIECES[Math.floor(Math.random() * TETRIS_PIECES.length)]
      pieces.push({
        ...randomPiece,
        id: `${randomPiece.id}_${i}_${Date.now()}`
      })
    }
    setGameState(prev => ({ ...prev, availablePieces: pieces }))
  }, [])

  // Отрисовка доски
  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Устанавливаем размер canvas
    canvas.width = BOARD_SIZE * CELL_SIZE
    canvas.height = BOARD_SIZE * CELL_SIZE

    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Рисуем фон
    ctx.fillStyle = '#FAF6EF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Рисуем сетку
    ctx.strokeStyle = '#E5DFD6'
    ctx.lineWidth = 1
    for (let i = 0; i <= BOARD_SIZE; i++) {
      const pos = i * CELL_SIZE + 0.5
      ctx.beginPath()
      ctx.moveTo(pos, 0)
      ctx.lineTo(pos, canvas.height)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(0, pos)
      ctx.lineTo(canvas.width, pos)
      ctx.stroke()
    }

    // Рисуем утолщенные линии для блоков 3x3
    ctx.lineWidth = 2
    ctx.strokeStyle = '#CFC6B8'
    for (let i = 0; i <= BOARD_SIZE; i += 3) {
      const pos = i * CELL_SIZE + 0.5
      ctx.beginPath()
      ctx.moveTo(pos, 0)
      ctx.lineTo(pos, canvas.height)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(0, pos)
      ctx.lineTo(canvas.width, pos)
      ctx.stroke()
    }

    // Рисуем заполненные клетки
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (gameState.board[y][x]) {
          const pixelX = x * CELL_SIZE
          const pixelY = y * CELL_SIZE
          const cellColor = gameState.boardColors[y][x] || '#3BA3FF'
          drawCell(ctx, pixelX, pixelY, CELL_SIZE, cellColor)
        }
      }
    }
  }, [gameState.board, gameState.boardColors])

  // Отрисовка клетки
  const drawCell = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    const radius = 8
    const padding = 1

    ctx.save()
    
    // Основная заливка
    ctx.fillStyle = color
    ctx.beginPath()
    roundRectPath(ctx, x + padding, y + padding, size - padding * 2, size - padding * 2, radius)
    ctx.fill()

    // Внутренний блик
    const innerGradient = ctx.createRadialGradient(
      x + size * 0.3, y + size * 0.3, 0,
      x + size * 0.3, y + size * 0.3, size * 0.6
    )
    innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)')
    innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    ctx.fillStyle = innerGradient
    ctx.beginPath()
    roundRectPath(ctx, x + padding, y + padding, size - padding * 2, size - padding * 2, radius)
    ctx.fill()

    // Тень
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
    ctx.shadowBlur = 2
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 1
    
    ctx.strokeStyle = color + 'CC'
    ctx.lineWidth = 1
    ctx.beginPath()
    roundRectPath(ctx, x + padding, y + padding, size - padding * 2, size - padding * 2, radius)
    ctx.stroke()
    
    ctx.restore()
  }

  // Функция для рисования скругленного прямоугольника
  const roundRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2))
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + width - r, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + r)
    ctx.lineTo(x + width, y + height - r)
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
    ctx.lineTo(x + r, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
  }

  // Проверка возможности размещения фигуры
  const canPlacePiece = (piece: TetrisPiece, x: number, y: number): boolean => {
    for (let py = 0; py < piece.shape.length; py++) {
      for (let px = 0; px < piece.shape[py].length; px++) {
        if (piece.shape[py][px]) {
          const boardX = x + px
          const boardY = y + py
          
          if (boardX < 0 || boardX >= BOARD_SIZE || 
              boardY < 0 || boardY >= BOARD_SIZE || 
              gameState.board[boardY][boardX]) {
            return false
          }
        }
      }
    }
    return true
  }

  // Размещение фигуры
  const placePiece = (piece: TetrisPiece, x: number, y: number): boolean => {
    if (!canPlacePiece(piece, x, y)) {
      return false
    }

    // Размещаем фигуру на доске
    const newBoard = gameState.board.map(row => [...row])
    const newBoardColors = gameState.boardColors.map(row => [...row])
    
    for (let py = 0; py < piece.shape.length; py++) {
      for (let px = 0; px < piece.shape[py].length; px++) {
        if (piece.shape[py][px]) {
          const boardX = x + px
          const boardY = y + py
          newBoard[boardY][boardX] = 1
          newBoardColors[boardY][boardX] = piece.color
        }
      }
    }

    // Удаляем использованную фигуру
    const newAvailablePieces = gameState.availablePieces.filter(p => p.id !== piece.id)

    setGameState(prev => ({
      ...prev,
      board: newBoard,
      boardColors: newBoardColors,
      availablePieces: newAvailablePieces,
      piecesPlaced: prev.piecesPlaced + 1
    }))

    // Проверяем заполненные линии
    checkLines(newBoard, newBoardColors)

    // Если фигуры закончились, генерируем новые
    if (newAvailablePieces.length === 0) {
      setTimeout(() => generatePieces(), 100)
    }

    // Проверяем окончание игры после размещения фигуры
    setTimeout(() => checkGameOver(), 100)

    return true
  }

  // Проверка заполненных линий
  const checkLines = (board: number[][], boardColors: (string | null)[][]) => {
    const rowsToClear: number[] = []
    const columnsToClear: number[] = []
    const regionsToClear: { startX: number; startY: number }[] = []

    // Проверяем строки
    for (let y = 0; y < BOARD_SIZE; y++) {
      if (board[y].every(cell => cell === 1)) {
        rowsToClear.push(y)
      }
    }

    // Проверяем столбцы
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board.every(row => row[x] === 1)) {
        columnsToClear.push(x)
      }
    }

    // Проверяем блоки 3x3
    const regionsToCheck = [
      { startX: 0, startY: 0 },   // Верхний левый
      { startX: 3, startY: 0 },   // Верхний центральный
      { startX: 6, startY: 0 },   // Верхний правый
      { startX: 0, startY: 3 },   // Средний левый
      { startX: 3, startY: 3 },   // Центральный
      { startX: 6, startY: 3 },   // Средний правый
      { startX: 0, startY: 6 },   // Нижний левый
      { startX: 3, startY: 6 },   // Нижний центральный
      { startX: 6, startY: 6 }    // Нижний правый
    ]

    for (let region of regionsToCheck) {
      let isFilled = true
      for (let y = region.startY; y < region.startY + 3; y++) {
        for (let x = region.startX; x < region.startX + 3; x++) {
          if (board[y][x] !== 1) {
            isFilled = false
            break
          }
        }
        if (!isFilled) break
      }
      if (isFilled) {
        regionsToClear.push(region)
      }
    }

    const linesCleared = rowsToClear.length + columnsToClear.length + regionsToClear.length

    if (linesCleared > 0) {
      // Очищаем заполненные линии
      const newBoard = board.map(row => [...row])
      const newBoardColors = boardColors.map(row => [...row])

      // Очищаем строки
      rowsToClear.forEach(y => {
        for (let x = 0; x < BOARD_SIZE; x++) {
          newBoard[y][x] = 0
          newBoardColors[y][x] = null
        }
      })

      // Очищаем столбцы
      columnsToClear.forEach(x => {
        for (let y = 0; y < BOARD_SIZE; y++) {
          newBoard[y][x] = 0
          newBoardColors[y][x] = null
        }
      })

      // Очищаем блоки
      regionsToClear.forEach(region => {
        for (let y = region.startY; y < region.startY + 3; y++) {
          for (let x = region.startX; x < region.startX + 3; x++) {
            newBoard[y][x] = 0
            newBoardColors[y][x] = null
          }
        }
      })

      // Обновляем состояние
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        boardColors: newBoardColors,
        score: prev.score + linesCleared * 10 * prev.level,
        lines: prev.lines + linesCleared,
        level: Math.floor((prev.lines + linesCleared) / 20) + 1
      }))
    }
  }

  // Обработка клика по canvas
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggedPiece) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const canvasX = event.clientX - rect.left
    const canvasY = event.clientY - rect.top
    
    const gridX = Math.floor(canvasX / CELL_SIZE)
    const gridY = Math.floor(canvasY / CELL_SIZE)
    
    if (placePiece(draggedPiece, gridX, gridY)) {
      setDraggedPiece(null)
      setIsDragging(false)
    }
  }

  // Обработка начала перетаскивания фигуры
  const handlePieceMouseDown = (piece: TetrisPiece, event: React.MouseEvent) => {
    event.preventDefault()
    setDraggedPiece(piece)
    setIsDragging(true)
    
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    setDragOffset({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    })
  }

  // Обработка движения мыши для перетаскивания
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging || !draggedPiece) return
      
      // Здесь можно добавить визуальную обратную связь при перетаскивании
      // Например, показывать полупрозрачную копию фигуры под курсором
    }

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        setDraggedPiece(null)
      }
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, draggedPiece])

  // Отрисовка фигуры в слоте
  const renderPiece = (piece: TetrisPiece) => {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="grid gap-0.5" style={{
          gridTemplateColumns: `repeat(${piece.shape[0].length}, 1fr)`,
          gridTemplateRows: `repeat(${piece.shape.length}, 1fr)`
        }}>
          {piece.shape.map((row, y) =>
            row.map((cell, x) => (
              cell ? (
                <div
                  key={`${y}-${x}`}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: piece.color }}
                />
              ) : (
                <div key={`${y}-${x}`} className="w-3 h-3" />
              )
            ))
          )}
        </div>
      </div>
    )
  }

  // Сохранение рекорда
  const saveRecord = async () => {
    if (!family || !member || gameState.score === 0) return

    try {
      const gameDuration = Math.floor((Date.now() - gameState.gameStartTime) / 1000)
      
      await dataService.addTetrisRecord({
        player_name: member.name || member.role || 'Игрок',
        score: gameState.score,
        level: gameState.level,
        lines_cleared: gameState.lines,
        game_duration_seconds: gameDuration,
        pieces_placed: gameState.piecesPlaced,
        game_mode: 'classic'
      })
      
      // Перезагружаем лучший рекорд семьи
      await loadBestRecord()
      
      console.log('Tetris record saved successfully')
    } catch (error) {
      console.error('Error saving tetris record:', error)
    }
  }

  // Проверка окончания игры
  const checkGameOver = () => {
    // Игра заканчивается, когда нет места для размещения фигур
    const canPlaceAnyPiece = gameState.availablePieces.some(piece => {
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          if (canPlacePiece(piece, x, y)) {
            return true
          }
        }
      }
      return false
    })

    if (!canPlaceAnyPiece && gameState.availablePieces.length > 0) {
      setGameOver(true)
      setGameState(prev => ({ ...prev, gameRunning: false }))
      saveRecord()
    }
  }

  // Новая игра
  const handleNewGame = () => {
    setGameState({
      board: Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0)),
      boardColors: Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)),
      score: 0,
      level: 1,
      lines: 0,
      gameRunning: true,
      availablePieces: [],
      gameStartTime: Date.now(),
      piecesPlaced: 0
    })
    setDraggedPiece(null)
    setIsDragging(false)
    setGameOver(false)
    generatePieces()
  }

  // Обновляем отрисовку при изменении состояния
  useEffect(() => {
    drawBoard()
  }, [drawBoard])

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="h-full flex flex-col">
        {/* Заголовок */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">🎮 Тетрис</h1>
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-gray-700">
                Счет: <span className="text-blue-600">{gameState.score}</span>
              </div>
              <div className="text-sm font-medium text-gray-700">
                Уровень: <span className="text-green-600">{gameState.level}</span>
              </div>
              <div className="text-sm font-medium text-gray-700">
                Линии: <span className="text-purple-600">{gameState.lines}</span>
              </div>
              <button
                onClick={() => setShowLeaderboard(true)}
                className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium"
              >
                🏆 Рекорды
              </button>
              <button
                onClick={handleNewGame}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Новая игра
              </button>
            </div>
          </div>
        </div>

        {/* Лучший рекорд семьи */}
        {familyBestRecord && (
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-yellow-200 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-lg">👑</div>
                <div>
                  <div className="font-bold text-yellow-800 text-sm">Лучший рекорд семьи</div>
                  <div className="font-semibold text-yellow-700 text-xs">{familyBestRecord.player_name}</div>
                  <div className="text-xs text-yellow-600">{formatDate(familyBestRecord.created_at)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-yellow-800 text-base">{familyBestRecord.score.toLocaleString()}</div>
                <div className="text-xs text-yellow-600">
                  Ур. {familyBestRecord.level} • {familyBestRecord.lines_cleared} линий • {formatDuration(familyBestRecord.game_duration_seconds)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Игровая область */}
        <div className="flex-1 p-4 flex flex-col items-center gap-4">
          {/* Игровое поле */}
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="cursor-pointer"
              style={{ border: '2px solid #E5DFD6', borderRadius: '8px' }}
            />
          </div>

          {/* Лоток с фигурами */}
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">Фигуры для размещения</h3>
            <div className="flex gap-4 justify-center">
              {gameState.availablePieces.map((piece, index) => (
                <div
                  key={piece.id}
                  className={`w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors ${
                    draggedPiece?.id === piece.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onMouseDown={(e) => handlePieceMouseDown(piece, e)}
                  title={`Кликните по фигуре, затем по полю для размещения`}
                >
                  {renderPiece(piece)}
                </div>
              ))}
            </div>
          </div>

          {/* Инструкции */}
          <div className="text-center text-sm text-gray-600">
            {draggedPiece ? (
              <p className="text-blue-600 font-medium">
                Выбрана фигура "{draggedPiece.name}". Кликните по игровому полю для размещения.
              </p>
            ) : (
              <p>Кликните по фигуре, затем по игровому полю для размещения</p>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно таблицы рекордов */}
      {showLeaderboard && (
        <TetrisLeaderboard onClose={() => setShowLeaderboard(false)} />
      )}

      {/* Модальное окно окончания игры */}
      {gameOver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Игра окончена!</h2>
              <div className="space-y-2 mb-6">
                <p className="text-lg">
                  <span className="font-semibold">Счет:</span> {gameState.score.toLocaleString()}
                </p>
                <p className="text-lg">
                  <span className="font-semibold">Уровень:</span> {gameState.level}
                </p>
                <p className="text-lg">
                  <span className="font-semibold">Линии:</span> {gameState.lines}
                </p>
                <p className="text-lg">
                  <span className="font-semibold">Фигур размещено:</span> {gameState.piecesPlaced}
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleNewGame}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Играть снова
                </button>
                <button
                  onClick={() => {
                    setGameOver(false)
                    setShowLeaderboard(true)
                  }}
                  className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                >
                  Посмотреть рекорды
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
