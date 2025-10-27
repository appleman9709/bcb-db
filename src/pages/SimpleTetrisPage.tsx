import React, { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { dataService, type TetrisRecord } from '../services/dataService'
import TetrisLeaderboard from '../components/TetrisLeaderboard'
import { useTetrisRecordCache } from '../hooks/useTetrisRecordCache'

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
const PREVIEW_CELL_SIZE = 20

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const adjustColor = (hex: string, amount: number) => {
  const normalized = hex.trim().replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return hex
  }

  const numeric = parseInt(normalized, 16)
  const r = (numeric >> 16) & 0xff
  const g = (numeric >> 8) & 0xff
  const b = numeric & 0xff

  const mixTarget = amount >= 0 ? 255 : 0
  const weight = clamp(Math.abs(amount), 0, 1)

  const mixChannel = (channel: number) =>
    clamp(Math.round(channel + (mixTarget - channel) * weight), 0, 255)

  const mixedR = mixChannel(r)
  const mixedG = mixChannel(g)
  const mixedB = mixChannel(b)

  return `#${((1 << 24) + (mixedR << 16) + (mixedG << 8) + mixedB).toString(16).slice(1)}`
}

const createCatStyle = (color: string): CSSProperties => ({
  '--cat-color': color,
  '--cat-light-color': adjustColor(color, 0.25),
  '--cat-shadow-color': adjustColor(color, -0.2),
  '--cat-ear-color': adjustColor(color, 0.4)
} as CSSProperties)

const TETRIS_PIECES: TetrisPiece[] = [
  {
    id: 'stretch-cat',
    name: 'Stretch Cat',
    shape: [[1, 1, 1, 1]],
    color: '#F2A5C9',
    size: 4
  },
  {
    id: 'loaf-cat',
    name: 'Loaf Cat',
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#F7C873',
    size: 2
  },
  {
    id: 'sitting-cat',
    name: 'Sitting Cat',
    shape: [
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 0]
    ],
    color: '#9EC7F2',
    size: 3
  },
  {
    id: 'playful-tail',
    name: 'Playful Tail',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 1, 0]
    ],
    color: '#B9E3A8',
    size: 3
  },
  {
    id: 'curious-kitten',
    name: 'Curious Kitten',
    shape: [
      [1, 1, 0],
      [1, 1, 1]
    ],
    color: '#F4B68C',
    size: 3
  },
  {
    id: 'crouching-cat',
    name: 'Crouching Cat',
    shape: [
      [0, 1],
      [0, 1],
      [1, 1]
    ],
    color: '#D7AFF1',
    size: 3
  },
  {
    id: 'pouncing-cat',
    name: 'Pouncing Cat',
    shape: [
      [1, 0],
      [1, 0],
      [1, 1]
    ],
    color: '#FF9F7C',
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
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)
  
  // Используем хук для кэширования рекордов
  const { loadBestRecord, updateCacheIfBetter, getCachedRecord } = useTetrisRecordCache()

  // Инициализация игры
  useEffect(() => {
    generatePieces()
    drawBoard()
  }, [])

  // Загрузка лучшего рекорда семьи
  useEffect(() => {
    const loadRecord = async () => {
      if (!family) return
      
      const record = await loadBestRecord()
      setFamilyBestRecord(record)
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

  // Проверка возможности размещения фигуры
  const canPlacePiece = useCallback((piece: TetrisPiece, x: number, y: number): boolean => {
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
  }, [gameState.board])

  // Вычисление линий, которые будут очищены при размещении фигуры (для preview)
  const calculatePreviewLines = useCallback((piece: TetrisPiece, x: number, y: number) => {
    if (!canPlacePiece(piece, x, y)) {
      return { rows: [], columns: [], regions: [] }
    }

    // Создаем временную копию доски с размещенной фигурой
    const tempBoard = gameState.board.map(row => [...row])
    
    for (let py = 0; py < piece.shape.length; py++) {
      for (let px = 0; px < piece.shape[py].length; px++) {
        if (piece.shape[py][px]) {
          const boardX = x + px
          const boardY = y + py
          tempBoard[boardY][boardX] = 1
        }
      }
    }

    // Проверяем какие линии будут очищены
    const rowsToClear: number[] = []
    const columnsToClear: number[] = []
    const regionsToClear: { startX: number; startY: number }[] = []

    // Проверяем строки
    for (let y = 0; y < BOARD_SIZE; y++) {
      if (tempBoard[y].every(cell => cell === 1)) {
        rowsToClear.push(y)
      }
    }

    // Проверяем столбцы
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (tempBoard.every(row => row[x] === 1)) {
        columnsToClear.push(x)
      }
    }

    // Проверяем блоки 3x3
    const regionsToCheck = [
      { startX: 0, startY: 0 },
      { startX: 3, startY: 0 },
      { startX: 6, startY: 0 },
      { startX: 0, startY: 3 },
      { startX: 3, startY: 3 },
      { startX: 6, startY: 3 },
      { startX: 0, startY: 6 },
      { startX: 3, startY: 6 },
      { startX: 6, startY: 6 }
    ]

    for (let region of regionsToCheck) {
      let isFilled = true
      for (let ry = region.startY; ry < region.startY + 3; ry++) {
        for (let rx = region.startX; rx < region.startX + 3; rx++) {
          if (tempBoard[ry][rx] !== 1) {
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

    return { rows: rowsToClear, columns: columnsToClear, regions: regionsToClear }
  }, [gameState.board, canPlacePiece])

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

    // Рисуем подсветку линий для preview
    if (draggedPiece && previewPosition) {
      const previewLines = calculatePreviewLines(draggedPiece, previewPosition.x, previewPosition.y)
      
      // Рисуем подсветку строк
      ctx.fillStyle = 'rgba(34, 197, 94, 0.4)'
      previewLines.rows.forEach(y => {
        ctx.fillRect(0, y * CELL_SIZE, canvas.width, CELL_SIZE)
      })

      // Рисуем подсветку столбцов
      previewLines.columns.forEach(x => {
        ctx.fillRect(x * CELL_SIZE, 0, CELL_SIZE, canvas.height)
      })

      // Рисуем подсветку блоков 3x3
      previewLines.regions.forEach(region => {
        ctx.fillRect(
          region.startX * CELL_SIZE,
          region.startY * CELL_SIZE,
          3 * CELL_SIZE,
          3 * CELL_SIZE
        )
      })
      
      // Обводим линии белым контуром для лучшей видимости
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)'
      ctx.lineWidth = 2
      previewLines.rows.forEach(y => {
        ctx.strokeRect(0, y * CELL_SIZE, canvas.width, CELL_SIZE)
      })
      previewLines.columns.forEach(x => {
        ctx.strokeRect(x * CELL_SIZE, 0, CELL_SIZE, canvas.height)
      })
      previewLines.regions.forEach(region => {
        ctx.strokeRect(
          region.startX * CELL_SIZE,
          region.startY * CELL_SIZE,
          3 * CELL_SIZE,
          3 * CELL_SIZE
        )
      })
    }
  }, [gameState.board, gameState.boardColors, draggedPiece, previewPosition, calculatePreviewLines])

  // Отрисовка клетки
  const drawCell = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    ctx.save()

    const padding = size * 0.1
    const centerX = x + size / 2
    const centerY = y + size / 2 + size * 0.05
    const faceRadius = (size / 2) - padding
    const earWidth = faceRadius * 0.85
    const earHeight = faceRadius

    const earOuterColor = adjustColor(color, -0.15)
    const earInnerColor = adjustColor(color, 0.45)
    const faceHighlight = adjustColor(color, 0.3)
    const faceShadow = adjustColor(color, -0.25)

    ctx.fillStyle = 'rgba(15, 23, 42, 0.18)'
    ctx.beginPath()
    ctx.ellipse(centerX, y + size - padding * 0.6, faceRadius * 0.85, faceRadius * 0.35, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = earOuterColor
    ctx.beginPath()
    ctx.moveTo(centerX - earWidth * 0.75, centerY - faceRadius * 0.95)
    ctx.lineTo(centerX - earWidth, centerY - faceRadius - earHeight)
    ctx.lineTo(centerX - earWidth * 0.25, centerY - faceRadius * 0.65)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(centerX + earWidth * 0.75, centerY - faceRadius * 0.95)
    ctx.lineTo(centerX + earWidth, centerY - faceRadius - earHeight)
    ctx.lineTo(centerX + earWidth * 0.25, centerY - faceRadius * 0.65)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = earInnerColor
    ctx.beginPath()
    ctx.moveTo(centerX - earWidth * 0.65, centerY - faceRadius * 0.95)
    ctx.lineTo(centerX - earWidth * 0.85, centerY - faceRadius - earHeight * 0.65)
    ctx.lineTo(centerX - earWidth * 0.2, centerY - faceRadius * 0.62)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(centerX + earWidth * 0.65, centerY - faceRadius * 0.95)
    ctx.lineTo(centerX + earWidth * 0.85, centerY - faceRadius - earHeight * 0.65)
    ctx.lineTo(centerX + earWidth * 0.2, centerY - faceRadius * 0.62)
    ctx.closePath()
    ctx.fill()

    const faceGradient = ctx.createLinearGradient(centerX, centerY - faceRadius, centerX, centerY + faceRadius)
    faceGradient.addColorStop(0, faceHighlight)
    faceGradient.addColorStop(1, color)
    ctx.fillStyle = faceGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, faceRadius, 0, Math.PI * 2)
    ctx.fill()

    const shadowGradient = ctx.createRadialGradient(
      centerX,
      centerY + faceRadius * 0.4,
      faceRadius * 0.2,
      centerX,
      centerY + faceRadius * 0.4,
      faceRadius
    )
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.08)')
    ctx.fillStyle = shadowGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, faceRadius, 0, Math.PI * 2)
    ctx.fill()

    const eyeOffsetX = faceRadius * 0.5
    const eyeOffsetY = faceRadius * 0.15
    const eyeRadius = faceRadius * 0.18
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)'
    ctx.beginPath()
    ctx.arc(centerX - eyeOffsetX, centerY - eyeOffsetY, eyeRadius, 0, Math.PI * 2)
    ctx.arc(centerX + eyeOffsetX, centerY - eyeOffsetY, eyeRadius, 0, Math.PI * 2)
    ctx.fill()

    const sparkleRadius = eyeRadius * 0.45
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.beginPath()
    ctx.arc(centerX - eyeOffsetX + sparkleRadius * 0.5, centerY - eyeOffsetY - sparkleRadius * 0.2, sparkleRadius, 0, Math.PI * 2)
    ctx.arc(centerX + eyeOffsetX + sparkleRadius * 0.5, centerY - eyeOffsetY - sparkleRadius * 0.2, sparkleRadius, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = adjustColor(color, -0.3)
    ctx.beginPath()
    ctx.moveTo(centerX, centerY + faceRadius * 0.05)
    ctx.lineTo(centerX - faceRadius * 0.12, centerY + faceRadius * 0.25)
    ctx.lineTo(centerX + faceRadius * 0.12, centerY + faceRadius * 0.25)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = faceShadow
    ctx.lineWidth = size * 0.04
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(centerX - faceRadius * 0.18, centerY + faceRadius * 0.3)
    ctx.quadraticCurveTo(centerX, centerY + faceRadius * 0.45, centerX + faceRadius * 0.18, centerY + faceRadius * 0.3)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)'
    ctx.lineWidth = size * 0.035
    ctx.beginPath()
    ctx.moveTo(centerX - faceRadius * 0.2, centerY + faceRadius * 0.05)
    ctx.lineTo(centerX - faceRadius * 0.85, centerY + faceRadius * 0.02)
    ctx.moveTo(centerX - faceRadius * 0.2, centerY + faceRadius * 0.2)
    ctx.lineTo(centerX - faceRadius * 0.9, centerY + faceRadius * 0.25)
    ctx.moveTo(centerX + faceRadius * 0.2, centerY + faceRadius * 0.05)
    ctx.lineTo(centerX + faceRadius * 0.85, centerY + faceRadius * 0.02)
    ctx.moveTo(centerX + faceRadius * 0.2, centerY + faceRadius * 0.2)
    ctx.lineTo(centerX + faceRadius * 0.9, centerY + faceRadius * 0.25)
    ctx.stroke()

    ctx.fillStyle = 'rgba(255, 182, 193, 0.45)'
    ctx.beginPath()
    ctx.ellipse(centerX - faceRadius * 0.45, centerY + faceRadius * 0.08, faceRadius * 0.25, faceRadius * 0.13, 0, 0, Math.PI * 2)
    ctx.ellipse(centerX + faceRadius * 0.45, centerY + faceRadius * 0.08, faceRadius * 0.25, faceRadius * 0.13, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
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

  // Обработка клика по canvas (резервный вариант)
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // Клик обрабатывается через handleMouseUp в useEffect
    event.preventDefault()
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
      
      // Проверяем, находимся ли мы над canvas
      const canvas = canvasRef.current
      if (!canvas) return
      
      const rect = canvas.getBoundingClientRect()
      const mouseX = event.clientX
      const mouseY = event.clientY
      
      // Проверяем, что мышь внутри canvas
      if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
        const canvasX = mouseX - rect.left
        const canvasY = mouseY - rect.top
        
        const gridX = Math.floor(canvasX / CELL_SIZE)
        const gridY = Math.floor(canvasY / CELL_SIZE)
        
        setPreviewPosition({ x: gridX, y: gridY })
      } else {
        // Если мышь вне canvas, сбрасываем preview
        setPreviewPosition(null)
      }
    }

    const handleMouseUp = (event: MouseEvent) => {
      if (!isDragging || !draggedPiece) return
      
      // Проверяем, отпустили ли мышь над canvas
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const mouseX = event.clientX
        const mouseY = event.clientY
        
        // Если мышь внутри canvas, размещаем фигуру
        if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
          const canvasX = mouseX - rect.left
          const canvasY = mouseY - rect.top
          
          const gridX = Math.floor(canvasX / CELL_SIZE)
          const gridY = Math.floor(canvasY / CELL_SIZE)
          
          // Пытаемся разместить фигуру
          placePiece(draggedPiece, gridX, gridY)
        }
      }
      
      // Сбрасываем состояние перетаскивания
        setIsDragging(false)
        setDraggedPiece(null)
      setPreviewPosition(null)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, draggedPiece, placePiece])

  // Отрисовка фигуры в слоте
  const renderPiece = (piece: TetrisPiece) => {
    const catStyle = createCatStyle(piece.color)

    return (
      <div className="w-full h-full flex items-center justify-center">
        <div
          className="grid cat-piece-preview"
          style={{
            gridTemplateColumns: `repeat(${piece.shape[0].length}, ${PREVIEW_CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${piece.shape.length}, ${PREVIEW_CELL_SIZE}px)`
          }}
        >
          {piece.shape.map((row, y) =>
            row.map((cell, x) =>
              cell ? (
                <div key={`${y}-${x}`} className="cat-cell" style={catStyle}>
                  <span className="cat-ear cat-ear-left" />
                  <span className="cat-ear cat-ear-right" />
                  <span className="cat-face">
                    <span className="cat-eye cat-eye-left" />
                    <span className="cat-eye cat-eye-right" />
                    <span className="cat-nose" />
                    <span className="cat-blush cat-blush-left" />
                    <span className="cat-blush cat-blush-right" />
                  </span>
                  <span className="cat-whiskers cat-whiskers-left" />
                  <span className="cat-whiskers cat-whiskers-right" />
                </div>
              ) : (
                <div
                  key={`${y}-${x}`}
                  className="cat-cell-placeholder"
                  style={{ width: PREVIEW_CELL_SIZE, height: PREVIEW_CELL_SIZE }}
                />
              )
            )
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
      const newRecord = {
        player_name: member.name || member.role || 'Игрок',
        score: gameState.score,
        level: gameState.level,
        lines_cleared: gameState.lines,
        game_duration_seconds: gameDuration,
        pieces_placed: gameState.piecesPlaced,
        game_mode: 'classic'
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
                className="px-3 py-1.5 bg-yellow-500 text-white rounded-3xl hover:bg-yellow-600 transition-colors text-sm font-medium"
              >
                🏆 Рекорды
              </button>
              <button
                onClick={handleNewGame}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-3xl hover:bg-blue-600 transition-colors text-sm font-medium"
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
          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="cursor-pointer"
              style={{ border: '2px solid #E5DFD6', borderRadius: '8px' }}
            />
          </div>

          {/* Лоток с фигурами */}
          <div className="bg-white rounded-3xl p-4 shadow-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">Фигуры для размещения</h3>
            <div className="flex gap-4 justify-center">
              {gameState.availablePieces.map((piece, index) => (
                <div
                  key={piece.id}
                  className={`w-16 h-16 border-2 border-dashed border-gray-300 rounded-3xl flex items-center justify-center cursor-grab hover:border-blue-400 transition-colors ${
                    draggedPiece?.id === piece.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onMouseDown={(e) => handlePieceMouseDown(piece, e)}
                  title={`Выберите фигуру, наведите на поле - подсветятся линии, которые сгорят при размещении. Кликните для размещения.`}
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
                Выбрана фигура "{draggedPiece.name}". Ведите курсор по полю - подсветятся линии, которые сгорят при размещении. Кликните для размещения.
              </p>
            ) : (
              <p>Кликните на фигуру, затем ведите курсор по полю для preview</p>
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
          <div className="bg-white rounded-3xl p-6 max-w-md w-full mx-4">
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
                  className="px-6 py-3 bg-blue-500 text-white rounded-3xl hover:bg-blue-600 transition-colors font-medium"
                >
                  Играть снова
                </button>
                <button
                  onClick={() => {
                    setGameOver(false)
                    setShowLeaderboard(true)
                  }}
                  className="px-6 py-3 bg-yellow-500 text-white rounded-3xl hover:bg-yellow-600 transition-colors font-medium"
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
