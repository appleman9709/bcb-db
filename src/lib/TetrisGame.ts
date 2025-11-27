// @ts-nocheck

export class MobileSudokuTetris {
    constructor(options = {}) {
        this.onGameOver = options.onGameOver;
        this.cleanupFns = [];
        this.gameStartTime = Date.now();
        this.piecesPlaced = 0;
        console.log('Создаем экземпляр игры...');
        this.root = options.root || document;
        this.document = this.root instanceof Document ? this.root : this.root.ownerDocument;
        this.canvas = this.root.getElementById('gameCanvas');
        if (!this.canvas) {
            throw new Error('Canvas с id="gameCanvas" не найден!');
        }
        console.log('Canvas найден:', this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('Не удалось получить контекст canvas!');
        }
        console.log('Контекст canvas получен');
        
        this.piecesContainer = this.root.getElementById('piecesContainer');
        if (!this.piecesContainer) {
            throw new Error('Контейнер фигур с id="piecesContainer" не найден!');
        }
        console.log('Контейнер фигур найден:', this.piecesContainer);
        
        this.BOARD_SIZE = 9;
        this.CELL_SIZE = 36; // Адаптивный размер для мобильных устройств
        
        // Устанавливаем размер canvas
        this.canvas.width = this.BOARD_SIZE * this.CELL_SIZE;
        this.canvas.height = this.BOARD_SIZE * this.CELL_SIZE;
        
        this.board = Array(this.BOARD_SIZE).fill().map(() => Array(this.BOARD_SIZE).fill(0));
        this.boardColors = Array(this.BOARD_SIZE).fill().map(() => Array(this.BOARD_SIZE).fill(null));
        
        this.MAX_BLOCKS_PER_PIECE = 4;
        this.CLEAR_ANIMATION_DURATION = 520;
        this.clearAnimations = [];
        this.placementAnimations = [];
        this.animationFrameId = null;
        
        // Анимация очков
        this.pointsAnimations = [];
        this.POINTS_ANIMATION_DURATION = 1500; // 1.5 секунды
        
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameRunning = true;
        this.record = this.loadRecord();
        
        // История ходов для отмены
        this.moveHistory = [];
        this.maxHistorySize = 50; // Ограничиваем размер истории
        
        // Система комбо
        this.comboCount = 0;
        this.lastClearTime = 0;
        this.COMBO_TIMEOUT = 2000; // Комбо сбрасывается через 2 секунды
        
        // Состояние перетаскивания
        this.draggedPiece = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isDragging = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchMoved = false;
        this.isTouchDragging = false;
        this.TOUCH_LIFT_BASE = this.CELL_SIZE * 0.85;
        this.MIN_TOUCH_LIFT = this.CELL_SIZE * 0.3;
        this.touchLiftOffset = this.TOUCH_LIFT_BASE;

        // Плавающий canvas для превью фигуры под/над пальцем
        this.dragCanvas = this.document.createElement('canvas');
        this.dragCanvasCtx = this.dragCanvas.getContext('2d');
        this.previewOffsetY = Math.max(80, Math.round(this.CELL_SIZE * 2.5));
        this.previewCenterX = 0;
        this.previewCenterY = 0;
        this.dragCanvas.style.position = 'fixed';
        this.dragCanvas.style.left = '0px';
        this.dragCanvas.style.top = '0px';
        this.dragCanvas.style.pointerEvents = 'none';
        this.dragCanvas.style.display = 'none';
        this.dragCanvas.style.zIndex = '9999';
        this.document.body.appendChild(this.dragCanvas);
        
        // Состояние выбранной фигуры
        this.selectedPiece = null;
        this.selectedPieceElement = null;
        
        // Разнообразные фигуры с уникальной цветовой схемой для каждого типа
        this.tetrisPieces = [
            // Классические фигуры тетриса
            {
                id: 'I',
                name: 'Линия',
                shape: [[1, 1, 1, 1]],
                color: '#06B6D4', // Циановый (классический цвет I)
                size: 4
            },
            {
                id: 'O',
                name: 'Квадрат',
                shape: [
                    [1, 1],
                    [1, 1]
                ],
                color: '#FACC15', // Жёлтый (классический цвет O)
                size: 2,
            },
            {
                id: 'T',
                name: 'Т-образная',
                shape: [
                    [0, 1, 0],
                    [1, 1, 1]
                ],
                color: '#A855F7', // Фиолетовый (классический цвет T)
                size: 3
            },
            {
                id: 'S',
                name: 'S-образная',
                shape: [
                    [0, 1, 1],
                    [1, 1, 0]
                ],
                color: '#22C55E', // Зелёный (классический цвет S)
                size: 3
            },
            {
                id: 'Z',
                name: 'Z-образная',
                shape: [
                    [1, 1, 0],
                    [0, 1, 1]
                ],
                color: '#EF4444', // Красный (классический цвет Z)
                size: 3
            },
            {
                id: 'J',
                name: 'J-образная',
                shape: [
                    [1, 0, 0],
                    [1, 1, 1]
                ],
                color: '#3B82F6', // Синий (классический цвет J)
                size: 3
            },
            {
                id: 'L',
                name: 'L-образная',
                shape: [
                    [0, 0, 1],
                    [1, 1, 1]
                ],
                color: '#F97316', // Оранжевый (классический цвет L)
                size: 3
            },
            // Дополнительные фигуры с уникальными цветами
            {
                id: 'CROSS',
                name: 'Крест',
                shape: [
                    [0, 1, 0],
                    [1, 1, 1],
                    [0, 1, 0]
                ],
                color: '#60A5FA', // Голубой (светлый синий)
                size: 3
            },
            {
                id: 'CORNER',
                name: 'Уголок',
                shape: [
                    [1, 1],
                    [1, 0]
                ],
                color: '#10B981', // Изумрудный (светлый зеленый)
                size: 2
            },
            {
                id: 'LINE3',
                name: 'Тройка',
                shape: [[1, 1, 1]],
                color: '#FB923C', // Светло-оранжевый
                size: 3
            },
            {
                id: 'LINE2',
                name: 'Двойка',
                shape: [[1, 1]],
                color: '#A78BFA', // Лавандовый (светлый фиолетовый)
                size: 2
            },
            {
                id: 'DOT',
                name: 'Точка',
                shape: [[1]],
                color: '#F87171', // Коралловый (светлый красный)
                size: 1
            },
            {
                id: 'LONG',
                name: 'Длинная',
                shape: [[1, 1, 1, 1, 1]],
                color: '#FBBF24', // Желтый (светлый янтарный)
                size: 5
            },
            {
                id: 'STAIRS',
                name: 'Лестница',
                shape: [
                    [1, 0, 0],
                    [1, 1, 0],
                    [1, 1, 1]
                ],
                color: '#84CC16', // Лайм (светлый лаймовый)
                size: 3
            },
            {
                id: 'SMALLT',
                name: 'Маленькая Т',
                shape: [
                    [0, 1, 0],
                    [1, 1, 1]
                ],
                color: '#2563EB', // Темно-синий
                size: 3
            },
            {
                id: 'PLUS',
                name: 'Плюс',
                shape: [
                    [0, 1, 0],
                    [1, 1, 1],
                    [0, 1, 0]
                ],
                color: '#059669', // Темно-зеленый
                size: 3
            },
            {
                id: 'L_SHAPE',
                name: 'L-форма',
                shape: [
                    [1, 0],
                    [1, 0],
                    [1, 1]
                ],
                color: '#EA580C', // Темно-оранжевый
                size: 3
            },
            {
                id: 'LINE4',
                name: 'Четверка',
                shape: [[1, 1, 1, 1]],
                color: '#6D28D9', // Темно-фиолетовый
                size: 4
            },
            {
                id: 'CORNER3',
                name: 'Уголок 3',
                shape: [
                    [1, 1],
                    [1, 0],
                    [1, 0]
                ],
                color: '#DC2626', // Темно-красный
                size: 3
            },
            {
                id: 'ZIGZAG',
                name: 'Зигзаг',
                shape: [
                    [1, 1, 0],
                    [0, 1, 1],
                    [0, 0, 1]
                ],
                color: '#D97706', // Темно-янтарный
                size: 3
            },
            {
                id: 'HOOK',
                name: 'Крючок',
                shape: [
                    [1, 1],
                    [1, 0],
                    [1, 1]
                ],
                color: '#65A30D', // Темно-лаймовый
                size: 3
            },
            {
                id: 'DIAMOND',
                name: 'Ромб',
                shape: [
                    [0, 1, 0],
                    [1, 1, 1],
                    [0, 1, 0]
                ],
                color: '#0284C7', // Циан (бирюзовый)
                size: 3
            },
            {
                id: 'CROSS2',
                name: 'Крест 2',
                shape: [
                    [1, 0, 1],
                    [0, 1, 0],
                    [1, 0, 1]
                ],
                color: '#14B8A6', // Бирюзовый
                size: 3
            },
            {
                id: 'LONG4',
                name: 'Длинная 4',
                shape: [[1, 1, 1, 1]],
                color: '#F59E0B', // Янтарный (темнее)
                size: 4
            },
            {
                id: 'BLOCK',
                name: 'Блок',
                shape: [
                    [1, 1],
                    [1, 1],
                    [1, 0]
                ],
                color: '#8B5CF6', // Индиго (темнее фиолетового)
                size: 3,
            }
        ];
        
        this.tetrisPieces = this.tetrisPieces.filter(piece => this.countCubes(piece.shape) <= this.MAX_BLOCKS_PER_PIECE);
        
        this.availablePieces = [];
        
        // Комплименты для жены
        this.compliments = [
            "Ты самая красивая жена на свете! 💕",
            "Твоя улыбка делает мой день лучше! 😊",
            "Ты невероятно умная и талантливая! 🧠✨",
            "С тобой каждый день - это праздник! 🎉",
            "Ты моя самая любимая и дорогая! 💖",
            "Твоя доброта согревает мое сердце! ❤️",
            "Ты самая лучшая мама и жена! 👩‍👧‍👦",
            "Твоя красота завораживает! 🌟",
            "С тобой я чувствую себя самым счастливым! 😍",
            "Ты мой ангел-хранитель! 👼",
            "Твоя мудрость помогает мне во всем! 🦉",
            "Ты самая заботливая и нежная! 🤗",
            "Твоя любовь - это мой дом! 🏠💕",
            "Ты вдохновляешь меня каждый день! 💫",
            "Твоя красота не только внешняя, но и внутренняя! 🌸",
            "С тобой я могу все! 💪❤️",
            "Ты мое солнышко в пасмурный день! ☀️",
            "Твоя поддержка значит для меня все! 🤝",
            "Ты самая терпеливая и понимающая! 🙏",
            "Твоя любовь делает меня лучше! 💝"
        ];
        
        this.init();
        this.startComplimentRotation();
    }

    addEventListenerWithCleanup(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        this.cleanupFns.push(() => target.removeEventListener(type, handler, options));
    }
    
    // Функция для ротации комплиментов
    startComplimentRotation() {
        const complimentElement = this.root.getElementById('complimentText');
        if (!complimentElement) return;
        
        let currentIndex = 0;
        
        // Меняем комплимент каждые 5 секунд
        setInterval(() => {
            currentIndex = (currentIndex + 1) % this.compliments.length;
            complimentElement.textContent = this.compliments[currentIndex];
            
            // Добавляем анимацию смены
            complimentElement.style.opacity = '0.5';
            setTimeout(() => {
                complimentElement.style.opacity = '1';
            }, 200);
        }, 5000);
    }
    
    // Функция для подсчета кубиков в фигуре
    countCubes(shape) {
        let count = 0;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) count++;
            }
        }
        return count;
    }
    
    // Методы для управления выбранной фигурой
    selectPiece(piece, element) {
        // Убираем выделение с предыдущей фигуры
        this.clearSelection();
        
        // Выделяем новую фигуру
        this.selectedPiece = piece;
        this.selectedPieceElement = element;
        element.classList.add('selected');
        
        // Выделяем соответствующий слот
        const slot = element.closest('[id^="slot"]');
        if (slot) {
            slot.classList.add('active');
        }
    }
    
    clearSelection() {
        if (this.selectedPieceElement) {
            this.selectedPieceElement.classList.remove('selected');
        }
        
        // Убираем выделение со всех слотов
        const slots = this.root.querySelectorAll('[id^="slot"]');
        slots.forEach(slot => {
            slot.classList.remove('active');
        });
        
        this.selectedPiece = null;
        this.selectedPieceElement = null;
    }
    
    // Функции для работы с рекордом
    loadRecord() {
        const saved = localStorage.getItem('sudokuTetrisRecord');
        return saved ? parseInt(saved) : 0;
    }
    
    saveRecord(score) {
        if (score > this.record) {
            this.record = score;
            localStorage.setItem('sudokuTetrisRecord', score.toString());
            return true; // Новый рекорд
        }
        return false;
    }
    
    // Функции для сохранения и загрузки состояния игры
    saveGameState() {
        const gameState = {
            board: this.board,
            boardColors: this.boardColors,
            score: this.score,
            level: this.level,
            lines: this.lines,
            availablePieces: this.availablePieces,
            gameRunning: this.gameRunning,
            timestamp: Date.now(),
            piecesPlaced: this.piecesPlaced,
            gameStartTime: this.gameStartTime
        };
        
        try {
            localStorage.setItem('sudokuTetrisGameState', JSON.stringify(gameState));
            console.log('Игра сохранена');
        } catch (error) {
            console.error('Ошибка при сохранении игры:', error);
        }
    }
    
    
    loadGameState() {
        try {
            const saved = localStorage.getItem('sudokuTetrisGameState');
            if (saved) {
                const gameState = JSON.parse(saved);
                
                // Проверяем, что сохранение не слишком старое (например, не старше 7 дней)
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 дней в миллисекундах
                if (Date.now() - gameState.timestamp > maxAge) {
                    console.log('Сохранение слишком старое, начинаем новую игру');
                    return false;
                }
                
                this.board = gameState.board;
                this.boardColors = gameState.boardColors || Array(this.BOARD_SIZE).fill().map(() => Array(this.BOARD_SIZE).fill(null));
                this.score = gameState.score;
                this.level = gameState.level;
                this.lines = gameState.lines;
                this.availablePieces = gameState.availablePieces;
                this.gameRunning = gameState.gameRunning;
                this.piecesPlaced = gameState.piecesPlaced || 0;
                this.gameStartTime = gameState.gameStartTime || Date.now();
                
                console.log('Игра загружена');
                return true;
            }
        } catch (error) {
            console.error('Ошибка при загрузке игры:', error);
        }
        return false;
    }
    
    clearGameState() {
        try {
            localStorage.removeItem('sudokuTetrisGameState');
            console.log('Сохранение игры очищено');
        } catch (error) {
            console.error('Ошибка при очистке сохранения:', error);
        }
    }
    
    // Функция для поворота фигуры на 90 градусов
    rotateShape(shape) {
        const rows = shape.length;
        const cols = shape[0].length;
        const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                rotated[j][rows - 1 - i] = shape[i][j];
            }
        }
        
        return rotated;
    }
    
    // Функция для создания всех поворотов фигуры
    createShapeVariants(originalPiece) {
        const variants = [];
        let currentShape = originalPiece.shape;
        
        // Добавляем оригинальную фигуру
        variants.push({
            ...originalPiece,
            variant: 0,
            shape: currentShape
        });
        
        // Создаем повороты (максимум 3 поворота, чтобы избежать дубликатов)
        for (let i = 1; i < 4; i++) {
            currentShape = this.rotateShape(currentShape);
            
            // Проверяем, не является ли этот поворот идентичным оригиналу
            const isDuplicate = variants.some(variant => 
                JSON.stringify(variant.shape) === JSON.stringify(currentShape)
            );
            
            if (!isDuplicate) {
                variants.push({
                    ...originalPiece,
                    variant: i,
                    shape: currentShape,
                    name: `${originalPiece.name} (${i * 90}°)`
                });
            } else {
                break; // Если поворот дублирует существующий, прекращаем
            }
        }
        
        return variants;
    }
    
    init() {
        // Пытаемся загрузить сохраненную игру
        const gameLoaded = this.loadGameState();
        
        if (!gameLoaded) {
            // Если игра не загружена, начинаем новую
            this.generatePieces();
        } else {
            // Если игра загружена, обновляем интерфейс без анимации
            this.renderPieces(false);
        }
        
        this.draw();
        this.setupEventListeners();
        this.updateUI();
    }
    
    generatePieces() {
        this.availablePieces = [];
        const piecesToGenerate = 3; // Показываем только 3 фигуры как на картинке
        
        const allVariants = [];
        this.tetrisPieces.forEach(piece => {
            const variants = this.createShapeVariants(piece);
            allVariants.push(...variants);
        });
        
        for (let i = 0; i < piecesToGenerate; i++) {
            if (allVariants.length === 0) {
                break;
            }
            const randomIndex = Math.floor(Math.random() * allVariants.length);
            const piece = JSON.parse(JSON.stringify(allVariants[randomIndex]));
            piece.uniqueId = `piece_${i}_${Date.now()}`;
            
            // Убеждаемся, что цвет фигуры сохранен правильно
            this.ensurePieceColor(piece);
            
            this.availablePieces.push(piece);
        }

        this.renderPieces(true); // С анимацией для новых фигур
        
        // Проверяем условия окончания игры после генерации новых фигур
        this.checkGameOver();
    }
    
    renderPieces(animate = false) {
        // Очищаем все слоты
        const slots = this.root.querySelectorAll('[id^="slot"]');
        slots.forEach(slot => {
            slot.innerHTML = '';
            slot.classList.remove('active', 'empty');
        });
        
        this.availablePieces.forEach((piece, index) => {
            // Убеждаемся, что цвет фигуры правильный перед отрисовкой
            this.ensurePieceColor(piece);
            
            const slot = this.root.getElementById(`slot${index + 1}`);
            if (!slot) return;
            
            const pieceElement = this.document.createElement('div');
            pieceElement.className = 'piece-item';
            pieceElement.draggable = true;
            pieceElement.dataset.pieceId = piece.uniqueId;
            
            // Добавляем атрибут цвета для CSS стилизации
            const colorName = this.getColorName(piece.color);
            pieceElement.dataset.color = colorName;
            
            const canvas = this.document.createElement('canvas');
            canvas.className = 'piece-canvas';
            
            // Вычисляем размеры фигуры для правильного масштабирования
            const pieceWidth = piece.shape[0].length;
            const pieceHeight = piece.shape.length;
            const maxDimension = Math.max(pieceWidth, pieceHeight);
            
            // Размер клетки 75% от размера на игровом поле (27px)
            const cellSize = this.CELL_SIZE * 0.75;
            const gap = 2; // Зазор между клетками
            
            // Рассчитываем размер canvas с учетом зазоров
            const canvasWidth = pieceWidth * cellSize + (pieceWidth - 1) * gap;
            const canvasHeight = pieceHeight * cellSize + (pieceHeight - 1) * gap;
            
            // Добавляем небольшой отступ для лучшего отображения
            const padding = 4;
            const finalCanvasWidth = canvasWidth + padding * 2;
            const finalCanvasHeight = canvasHeight + padding * 2;
            
            // Устанавливаем размеры canvas
            canvas.width = finalCanvasWidth;
            canvas.height = finalCanvasHeight;
            
            const ctx = canvas.getContext('2d');
            // Отрисовываем фигуру с реальным размером клеток и отступом
            this.drawPieceOnCanvas(ctx, piece, cellSize, padding);
            
            pieceElement.appendChild(canvas);
            slot.appendChild(pieceElement);
            
            // Добавляем анимацию появления только если animate = true
            if (animate) {
                setTimeout(() => {
                    pieceElement.classList.add('appearing');
                    
                    // Убираем класс анимации после завершения
                    setTimeout(() => {
                        pieceElement.classList.remove('appearing');
                    }, 120); // Длительность анимации согласно спецификации
                }, index * 100); // Задержка между фигурами
            }
        });
        
        // Помечаем пустые слоты
        for (let i = this.availablePieces.length; i < 3; i++) {
            const slot = this.root.getElementById(`slot${i + 1}`);
            if (slot) {
                slot.classList.add('empty');
            }
        }
    }
    
    // Метод для получения имени цвета из hex значения
    getColorName(hexColor) {
        const colorMap = {
            // Базовые цвета (классические тетромино)
            '#06B6D4': 'cyan', // I
            '#FACC15': 'yellow', // O
            '#A855F7': 'purple', // T
            '#22C55E': 'green', // S
            '#EF4444': 'red', // Z
            '#3B82F6': 'blue', // J
            '#F97316': 'orange', // L
            
            // Старые базовые (для обратной совместимости других фигур)
            '#3BA3FF': 'blue-alt',
            '#31C48D': 'green-alt', 
            '#FF8A34': 'orange-alt',
            '#7C5CFF': 'purple-alt',
            '#FF5A5F': 'red-alt',
            '#FFC145': 'amber',
            '#7AD53A': 'lime',
            // Дополнительные цвета
            '#60A5FA': 'blue-light', // Голубой
            '#10B981': 'green-light', // Изумрудный
            '#FB923C': 'orange-light', // Светло-оранжевый
            '#A78BFA': 'purple-light', // Лавандовый
            '#F87171': 'red-light', // Коралловый
            '#FBBF24': 'amber-light', // Желтый
            '#84CC16': 'lime-light', // Лайм
            '#2563EB': 'blue-dark', // Темно-синий
            '#059669': 'green-dark', // Темно-зеленый
            '#EA580C': 'orange-dark', // Темно-оранжевый
            '#6D28D9': 'purple-dark', // Темно-фиолетовый
            '#DC2626': 'red-dark', // Темно-красный
            '#D97706': 'amber-dark', // Темно-янтарный
            '#65A30D': 'lime-dark', // Темно-лаймовый
            '#0284C7': 'cyan', // Циан
            '#14B8A6': 'teal', // Бирюзовый
            '#F59E0B': 'amber-alt', // Янтарный альт
            '#8B5CF6': 'indigo' // Индиго
        };
        return colorMap[hexColor] || 'blue';
    }
    
    // Метод для обеспечения правильного цвета фигуры
    ensurePieceColor(piece) {
        // Если у фигуры нет цвета или цвет неправильный, восстанавливаем его
        if (!piece.color || !this.isValidColor(piece.color)) {
            // Находим оригинальную фигуру по ID и восстанавливаем цвет
            const originalPiece = this.tetrisPieces.find(p => p.id === piece.id);
            if (originalPiece) {
                piece.color = originalPiece.color;
                console.log(`Восстановлен цвет для фигуры ${piece.id}: ${piece.color}`);
            } else {
                // Fallback цвет
                piece.color = '#3BA3FF';
                console.log(`Установлен fallback цвет для фигуры ${piece.id}: ${piece.color}`);
            }
        }
    }
    
    // Проверяет, является ли цвет валидным
    isValidColor(color) {
        if (!color || typeof color !== 'string') return false;
        // Проверяем, что цвет существует в списке всех фигур
        const allColors = this.tetrisPieces.map(p => p.color);
        return allColors.includes(color);
    }
    
    // Анимация размещения фигуры: scale from 0.96 → 1.0 (120ms), затем короткая вспышка (inner-glow) 80ms
    animatePiecePlacement(x, y, piece) {
        // Создаем временные элементы для анимации
        const cells = [];
        for (let py = 0; py < piece.shape.length; py++) {
            for (let px = 0; px < piece.shape[py].length; px++) {
                if (piece.shape[py][px]) {
                    cells.push({
                        x: x + px,
                        y: y + py,
                        startTime: performance.now()
                    });
                }
            }
        }
        
        // Добавляем анимацию масштабирования
        this.placementAnimations = cells;
        this.draw();
        
        // Запускаем анимацию
        const animate = (timestamp) => {
            let hasActiveAnimations = false;
            
            this.placementAnimations = this.placementAnimations.filter(cell => {
                const elapsed = timestamp - cell.startTime;
                const progress = Math.min(elapsed / 120, 1); // 120ms для масштабирования
                
                if (progress < 1) {
                    hasActiveAnimations = true;
                    cell.progress = progress;
                } else {
                    // После завершения масштабирования добавляем вспышку
                    cell.flashStartTime = timestamp;
                    cell.flashProgress = 0;
                }
                
                return elapsed < 200; // Общая длительность анимации
            });
            
            if (hasActiveAnimations || this.placementAnimations.length > 0) {
                this.draw();
                requestAnimationFrame(animate);
            } else {
                this.placementAnimations = [];
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    drawPieceOnCanvas(ctx, piece, cellSize, padding = 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Используем цвет фигуры из новой цветовой схемы
        const baseColor = piece.color || '#3BA3FF';
        
        // Межблочный зазор 2px согласно спецификации
        const gap = 2;
        
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const pixelX = x * (cellSize + gap) + padding;
                    const pixelY = y * (cellSize + gap) + padding;
                    this.drawPieceCell(ctx, pixelX, pixelY, cellSize, baseColor);
                }
            }
        }
    }
    
    // Новый метод для отрисовки современной клетки согласно спецификации
    drawModernCell(ctx, x, y, size, baseColor) {
        const radius = 8; // Скругление 8px согласно спецификации
        const padding = 1;
        
        ctx.save();
        
        // Основная заливка сплошным цветом фигуры
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        this.roundRectPath(ctx, x + padding, y + padding, size - padding * 2, size - padding * 2, radius);
        ctx.fill();
        
        // Лёгкий внутренний блик (радиальный градиент 8-12% непрозрачности) для "soft 3D"
        const innerGradient = ctx.createRadialGradient(
            x + size * 0.3, y + size * 0.3, 0,
            x + size * 0.3, y + size * 0.3, size * 0.6
        );
        innerGradient.addColorStop(0, this.addAlpha('#ffffff', 0.1));
        innerGradient.addColorStop(1, this.addAlpha('#ffffff', 0));
        
        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        this.roundRectPath(ctx, x + padding, y + padding, size - padding * 2, size - padding * 2, radius);
        ctx.fill();
        
        // Тонкая внутренняя тень для "кирпичикового" эффекта
        ctx.shadowColor = this.addAlpha('#000000', 0.1);
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        
        ctx.strokeStyle = this.addAlpha(baseColor, 0.8);
        ctx.lineWidth = 1;
        ctx.beginPath();
        this.roundRectPath(ctx, x + padding, y + padding, size - padding * 2, size - padding * 2, radius);
        ctx.stroke();
        
        ctx.restore();
    }
    
    // Метод для отрисовки клеток фигур в лотке с плоским дизайном + "soft 3D" эффектом
    drawPieceCell(ctx, x, y, size, baseColor) {
        const radius = 8; // Скругление 8px согласно спецификации
        const padding = 1;
        
        ctx.save();
        
        // Основная заливка сплошным цветом фигуры
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        this.roundRectPath(ctx, x + padding, y + padding, size - padding * 2, size - padding * 2, radius);
        ctx.fill();
        
        // Лёгкий внутренний блик (радиальный градиент 8-12% непрозрачности) для "soft 3D"
        const innerGradient = ctx.createRadialGradient(
            x + size * 0.3, y + size * 0.3, 0,
            x + size * 0.3, y + size * 0.3, size * 0.6
        );
        innerGradient.addColorStop(0, this.addAlpha('#ffffff', 0.1));
        innerGradient.addColorStop(1, this.addAlpha('#ffffff', 0));
        
        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        this.roundRectPath(ctx, x + padding, y + padding, size - padding * 2, size - padding * 2, radius);
        ctx.fill();
        
        // Тонкая внутренняя тень для "кирпичикового" эффекта
        ctx.shadowColor = this.addAlpha('#000000', 0.1);
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        
        ctx.strokeStyle = this.addAlpha(baseColor, 0.8);
        ctx.lineWidth = 1;
        ctx.beginPath();
        this.roundRectPath(ctx, x + padding, y + padding, size - padding * 2, size - padding * 2, radius);
        ctx.stroke();
        
        ctx.restore();
    }
    
    // Функция для рисования искр вокруг блока
    drawSparkles(ctx, x, y, size, baseColor) {
        ctx.save();
        
        // Создаем случайные искры вокруг блока
        const sparkleCount = 3 + Math.floor(Math.random() * 3);
        const sparklePositions = [
            { x: x - 8, y: y - 8 },
            { x: x + size + 4, y: y - 6 },
            { x: x - 6, y: y + size + 4 },
            { x: x + size + 6, y: y + size + 6 },
            { x: x + size / 2, y: y - 10 },
            { x: x - 10, y: y + size / 2 },
            { x: x + size + 8, y: y + size / 2 },
            { x: x + size / 2, y: y + size + 8 }
        ];
        
        for (let i = 0; i < sparkleCount; i++) {
            const pos = sparklePositions[i % sparklePositions.length];
            const sparkleSize = 2 + Math.random() * 3;
            const alpha = 0.6 + Math.random() * 0.4;
            
            // Создаем градиент для искры
            const sparkleGradient = ctx.createRadialGradient(
                pos.x, pos.y, 0,
                pos.x, pos.y, sparkleSize
            );
            sparkleGradient.addColorStop(0, this.addAlpha('#ffffff', alpha));
            sparkleGradient.addColorStop(0.7, this.addAlpha('#ffffff', alpha * 0.5));
            sparkleGradient.addColorStop(1, this.addAlpha('#ffffff', 0));
            
            ctx.fillStyle = sparkleGradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, sparkleSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Добавляем маленький блик
            ctx.fillStyle = this.addAlpha('#ffffff', alpha * 0.8);
            ctx.beginPath();
            ctx.arc(pos.x - sparkleSize * 0.3, pos.y - sparkleSize * 0.3, sparkleSize * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    // Метод для отрисовки предварительного просмотра согласно спецификации
    drawModernCellPreview(ctx, x, y, size, baseColor) {
        const radius = 8; // Скругление 8px согласно спецификации
        const padding = 1;
        
        ctx.save();
        
        // Превью-призрак при наведении на поле: заливка 30–40% прозрачности
        ctx.globalAlpha = 0.35;
        
        // Основная заливка сплошным цветом
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        this.roundRectPath(ctx, x + padding, y + padding, size - padding * 2, size - padding * 2, radius);
        ctx.fill();
        
        // Лёгкий внутренний блик для "soft 3D" эффекта
        const innerGradient = ctx.createRadialGradient(
            x + size * 0.3, y + size * 0.3, 0,
            x + size * 0.3, y + size * 0.3, size * 0.6
        );
        innerGradient.addColorStop(0, this.addAlpha('#ffffff', 0.05));
        innerGradient.addColorStop(1, this.addAlpha('#ffffff', 0));
        
        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        this.roundRectPath(ctx, x + padding, y + padding, size - padding * 2, size - padding * 2, radius);
        ctx.fill();
        
        ctx.restore();
    }

    calculatePieceHeight(piece) {
        if (!piece || !piece.shape) {
            return 0;
        }

        let firstRow = -1;
        let lastRow = -1;

        for (let y = 0; y < piece.shape.length; y++) {
            if (piece.shape[y].some(cell => cell)) {
                if (firstRow === -1) {
                    firstRow = y;
                }
                lastRow = y;
            }
        }

        if (firstRow === -1) {
            return 0;
        }

        return lastRow - firstRow + 1;
    }

    computeTouchLiftOffset(piece) {
        const height = Math.max(1, this.calculatePieceHeight(piece));
        const gap = this.CELL_SIZE * 0.2;
        const rawLift = height * this.CELL_SIZE - gap;
        const minLift = this.CELL_SIZE * 0.8;
        const maxLift = this.CELL_SIZE * 2.2;
        const clamped = Math.max(minLift, Math.min(rawLift, maxLift));
        const sizedLift = Math.max(this.TOUCH_LIFT_BASE, clamped);
        return Math.max(this.MIN_TOUCH_LIFT, sizedLift);
    }

    getEffectiveTouchLift(touchClientY, canvasRect) {
        const fullLift = this.touchLiftOffset;
        const distanceToBottom = this.canvas.height - (touchClientY - canvasRect.top);
        const safeBuffer = this.CELL_SIZE * 0.25;
        const minLift = this.MIN_TOUCH_LIFT;

        if (distanceToBottom <= fullLift + safeBuffer) {
            const maxLiftBySpace = Math.max(0, distanceToBottom - safeBuffer);
            return Math.max(minLift, Math.min(fullLift, maxLiftBySpace));
        }

        return Math.max(minLift, fullLift);
    }


    setupEventListeners() {
        // События для canvas
        this.addEventListenerWithCleanup(this.canvas, 'touchstart', (e) => this.handleTouchStart(e), { passive: true });
        this.addEventListenerWithCleanup(this.canvas, 'touchmove', (e) => this.handleTouchMove(e), { passive: true });
        this.addEventListenerWithCleanup(this.canvas, 'touchend', (e) => this.handleTouchEnd(e), { passive: true });
        
        // События для фигур - touch события
        this.addEventListenerWithCleanup(this.piecesContainer, 'touchstart', (e) => this.handlePieceTouchStart(e), { passive: false });
        this.addEventListenerWithCleanup(this.piecesContainer, 'touchmove', (e) => this.handlePieceTouchMove(e), { passive: false });
        this.addEventListenerWithCleanup(this.piecesContainer, 'touchend', (e) => this.handlePieceTouchEnd(e), { passive: false });
        
        // События для фигур - mouse события (для тестирования на ПК)
        this.addEventListenerWithCleanup(this.piecesContainer, 'mousedown', (e) => this.handlePieceMouseStart(e));
        this.addEventListenerWithCleanup(this.piecesContainer, 'mousemove', (e) => this.handlePieceMouseMove(e));
        this.addEventListenerWithCleanup(this.piecesContainer, 'mouseup', (e) => this.handlePieceMouseEnd(e));
        
        // Кнопки управления
        const newGameBtn = this.root.getElementById('newGameBtn');
        const undoBtn = this.root.getElementById('undoBtn');
        const refreshBtn = this.root.getElementById('refreshBtn');
        
        if (newGameBtn) {
            this.addEventListenerWithCleanup(newGameBtn, 'click', () => this.restart());
        }
        
        if (undoBtn) {
            this.addEventListenerWithCleanup(undoBtn, 'click', () => this.undoMove());
        }
        
        if (refreshBtn) {
            this.addEventListenerWithCleanup(refreshBtn, 'click', () => this.refreshPieces());
        }
        
        // Предотвращаем скролл страницы при перетаскивании
        this.addEventListenerWithCleanup(this.document, 'touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Предотвращаем контекстное меню
        this.addEventListenerWithCleanup(this.piecesContainer, 'contextmenu', (e) => e.preventDefault());
        
        // Глобальные mouse события для перетаскивания
        this.addEventListenerWithCleanup(this.document, 'mousemove', (e) => this.handlePieceMouseMove(e));
        this.addEventListenerWithCleanup(this.document, 'mouseup', (e) => this.handlePieceMouseEnd(e));
    }

    // Управление плавающим превью фигуры (над пальцем)
    showDragPreview(piece) {
        if (!piece) return;
        const pieceWidth = piece.shape[0].length;
        const pieceHeight = piece.shape.length;
        const cellSize = Math.max(20, Math.min(44, this.CELL_SIZE));
        const gap = 2;
        const padding = 4;
        const canvasWidth = pieceWidth * cellSize + (pieceWidth - 1) * gap + padding * 2;
        const canvasHeight = pieceHeight * cellSize + (pieceHeight - 1) * gap + padding * 2;
        this.dragCanvas.width = canvasWidth;
        this.dragCanvas.height = canvasHeight;
        const ctx = this.dragCanvasCtx;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        this.drawPieceOnCanvas(ctx, piece, cellSize, padding);
        this.dragCanvas.style.display = 'block';
    }

    moveDragPreview(clientX, clientY) {
        if (this.dragCanvas.style.display === 'none') return;
        // Смещение чуть выше пальца, чтобы видно было фигуру
        const offsetY = this.previewOffsetY;
        const left = Math.round(clientX - this.dragCanvas.width / 2);
        const top = Math.round(clientY - this.dragCanvas.height / 2 - offsetY);
        this.dragCanvas.style.left = left + 'px';
        this.dragCanvas.style.top = top + 'px';
        // Центр превью для синхронизации с тенью на поле
        this.previewCenterX = clientX;
        this.previewCenterY = clientY - offsetY;
    }

    hideDragPreview() {
        if (this.dragCanvasCtx) {
            this.dragCanvasCtx.clearRect(0, 0, this.dragCanvas.width, this.dragCanvas.height);
        }
        this.dragCanvas.style.display = 'none';
        this.previewCenterX = 0;
        this.previewCenterY = 0;
    }
    
    handlePieceTouchStart(e) {
        const pieceElement = e.target.closest('.piece-item');
        if (!pieceElement) return;
        
        const pieceId = pieceElement.dataset.pieceId;
        const piece = this.availablePieces.find(p => p.uniqueId === pieceId);
        
        if (piece) {
            this.selectPiece(piece, pieceElement);
            
            this.draggedPiece = piece;
            this.isDragging = true;
            this.isTouchDragging = true;
            this.touchLiftOffset = this.computeTouchLiftOffset(piece);
            pieceElement.classList.add('dragging');
            
            // Скрываем фигуру из лотка во время перетаскивания
            pieceElement.style.opacity = '0';
            pieceElement.style.pointerEvents = 'none';
            
            const touch = e.touches[0];
            const rect = pieceElement.getBoundingClientRect();
            this.dragOffset = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
            
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchMoved = false;

            // Включаем плавающий превью-канвас и позиционируем его
            this.showDragPreview(piece);
            this.moveDragPreview(touch.clientX, touch.clientY);
            
            e.preventDefault();
        }
    }
    
    handlePieceTouchMove(e) {
        if (!this.isDragging || !this.draggedPiece) return;
        
        const touch = e.touches[0];
        const canvasRect = this.canvas.getBoundingClientRect();
        
        const deltaX = Math.abs(touch.clientX - this.touchStartX);
        const deltaY = Math.abs(touch.clientY - this.touchStartY);
        if (deltaX > 5 || deltaY > 5) {
            this.touchMoved = true;
        }
        
        // Обновляем позицию плавающего превью
        this.moveDragPreview(touch.clientX, touch.clientY);

        // Центрируем тень под визуальной фигурой (центр превью)
        const pieceWidth = this.draggedPiece.shape[0].length;
        const pieceHeight = this.draggedPiece.shape.length;
        const previewCanvasX = this.previewCenterX - canvasRect.left;
        // Ограничиваем previewCanvasY для корректного отображения превью на нижних строках
        const previewCanvasY = Math.min(this.previewCenterY - canvasRect.top, this.canvas.height);
        let gridX = Math.round(previewCanvasX / this.CELL_SIZE) - Math.floor(pieceWidth / 2);
        let gridY = Math.round(previewCanvasY / this.CELL_SIZE) - Math.floor(pieceHeight / 2);
        gridX = Math.max(0, Math.min(this.BOARD_SIZE - pieceWidth, gridX));
        gridY = Math.max(0, Math.min(this.BOARD_SIZE - pieceHeight, gridY));
        
        this.drawWithPreview(gridX, gridY, this.canPlacePiece(this.draggedPiece, gridX, gridY));
        
        e.preventDefault();
    }
    
    handlePieceTouchEnd(e) {
        if (!this.isDragging || !this.draggedPiece) return;
        
        const touch = e.changedTouches[0];
        const canvasRect = this.canvas.getBoundingClientRect();
        
        let piecePlaced = false;
        
        // Проверяем, был ли touch в области canvas
        const marginX = 10; // Горизонтальный запас
        const marginYTop = 10; // Верхний запас
        const marginYBottom = 60; // Увеличенный нижний запас для удобного размещения на нижних строках
        if (touch.clientX >= canvasRect.left - marginX && touch.clientX <= canvasRect.right + marginX &&
            touch.clientY >= canvasRect.top - marginYTop && touch.clientY <= canvasRect.bottom + marginYBottom) {
            
            // Размещение по центрированной тени под превью
            const pieceWidth = this.draggedPiece.shape[0].length;
            const pieceHeight = this.draggedPiece.shape.length;
            const previewCanvasX = this.previewCenterX - canvasRect.left;
            // Ограничиваем previewCanvasY для корректного размещения на нижних строках
            const previewCanvasY = Math.min(this.previewCenterY - canvasRect.top, this.canvas.height);
            let gridX = Math.round(previewCanvasX / this.CELL_SIZE) - Math.floor(pieceWidth / 2);
            let gridY = Math.round(previewCanvasY / this.CELL_SIZE) - Math.floor(pieceHeight / 2);
            gridX = Math.max(0, Math.min(this.BOARD_SIZE - pieceWidth, gridX));
            gridY = Math.max(0, Math.min(this.BOARD_SIZE - pieceHeight, gridY));
            
            if (this.touchMoved && this.canPlacePiece(this.draggedPiece, gridX, gridY)) {
                this.placePiece(this.draggedPiece, gridX, gridY);
                piecePlaced = true;
            }
        }
        
        // Если фигура не была размещена, возвращаем её в лоток
        if (!piecePlaced) {
            const pieceElement = this.root.querySelector(`[data-piece-id="${this.draggedPiece.uniqueId}"]`);
            if (pieceElement) {
                pieceElement.style.opacity = '1';
                pieceElement.style.pointerEvents = 'auto';
            }
        }
        
        this.isDragging = false;
        this.draggedPiece = null;
        this.touchMoved = false;
        this.isTouchDragging = false;
        this.touchLiftOffset = this.TOUCH_LIFT_BASE;

        // Скрываем плавающее превью
        this.hideDragPreview();
        
        this.root.querySelectorAll('.piece-item').forEach(el => {
            el.classList.remove('dragging');
        });
        
        this.clearSelection();
        
        this.draw();
        e.preventDefault();
    }
    
    handleTouchStart(e) {
        // Обработка тачей по canvas (для будущих функций)
        e.preventDefault();
    }
    
    handleTouchMove(e) {
        e.preventDefault();
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
    }
    
    // Mouse события для тестирования на ПК
    handlePieceMouseStart(e) {
        const pieceElement = e.target.closest('.piece-item');
        if (!pieceElement) return;
        
        const pieceId = pieceElement.dataset.pieceId;
        const piece = this.availablePieces.find(p => p.uniqueId === pieceId);
        
        if (piece) {
            // Выбираем фигуру при клике
            this.selectPiece(piece, pieceElement);
            
            // Устанавливаем как перетаскиваемую фигуру
            this.draggedPiece = piece;
            this.isDragging = true;
            pieceElement.classList.add('dragging');
            
            // Скрываем фигуру из лотка во время перетаскивания
            pieceElement.style.opacity = '0';
            pieceElement.style.pointerEvents = 'none';
            
            this.dragOffset = {
                x: e.offsetX,
                y: e.offsetY
            };

            // Показать превью при перетаскивании мышью
            this.showDragPreview(piece);
            this.moveDragPreview(e.clientX, e.clientY);
            
            e.preventDefault();
        }
    }
    
    handlePieceMouseMove(e) {
        if (!this.isDragging || !this.draggedPiece) return;
        
        this.moveDragPreview(e.clientX, e.clientY);

        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Центрируем тень под превью и удерживаем фигуру в поле
        const pieceWidth = this.draggedPiece.shape[0].length;
        const pieceHeight = this.draggedPiece.shape.length;
        const previewCanvasX = this.previewCenterX - canvasRect.left;
        // Ограничиваем previewCanvasY для корректного отображения превью на нижних строках
        const previewCanvasY = Math.min(this.previewCenterY - canvasRect.top, this.canvas.height);
        let gridX = Math.round(previewCanvasX / this.CELL_SIZE) - Math.floor(pieceWidth / 2);
        let gridY = Math.round(previewCanvasY / this.CELL_SIZE) - Math.floor(pieceHeight / 2);
        gridX = Math.max(0, Math.min(this.BOARD_SIZE - pieceWidth, gridX));
        gridY = Math.max(0, Math.min(this.BOARD_SIZE - pieceHeight, gridY));
        
        // Показываем призрак только если можно поставить
        this.drawWithPreview(gridX, gridY, this.canPlacePiece(this.draggedPiece, gridX, gridY));
        
        e.preventDefault();
    }
    
    handlePieceMouseEnd(e) {
        if (!this.isDragging || !this.draggedPiece) return;
        
        const canvasRect = this.canvas.getBoundingClientRect();
        
        let piecePlaced = false;
        
        // Проверяем, был ли клик над canvas (с небольшим запасом для лучшего UX)
        const marginX = 10; // Горизонтальный запас
        const marginYTop = 10; // Верхний запас
        const marginYBottom = 60; // Увеличенный нижний запас для удобного размещения на нижних строках
        if (e.clientX >= canvasRect.left - marginX && e.clientX <= canvasRect.right + marginX &&
            e.clientY >= canvasRect.top - marginYTop && e.clientY <= canvasRect.bottom + marginYBottom) {
            
            // Размещение по центрированной тени под превью
            const pieceWidth = this.draggedPiece.shape[0].length;
            const pieceHeight = this.draggedPiece.shape.length;
            const previewCanvasX = this.previewCenterX - canvasRect.left;
            // Ограничиваем previewCanvasY для корректного размещения на нижних строках
            const previewCanvasY = Math.min(this.previewCenterY - canvasRect.top, this.canvas.height);
            let gridX = Math.round(previewCanvasX / this.CELL_SIZE) - Math.floor(pieceWidth / 2);
            let gridY = Math.round(previewCanvasY / this.CELL_SIZE) - Math.floor(pieceHeight / 2);
            gridX = Math.max(0, Math.min(this.BOARD_SIZE - pieceWidth, gridX));
            gridY = Math.max(0, Math.min(this.BOARD_SIZE - pieceHeight, gridY));
            
            if (this.canPlacePiece(this.draggedPiece, gridX, gridY)) {
                this.placePiece(this.draggedPiece, gridX, gridY);
                piecePlaced = true;
            }
        }
        
        // Если фигура не была размещена, возвращаем её в лоток
        if (!piecePlaced) {
            const pieceElement = this.root.querySelector(`[data-piece-id="${this.draggedPiece.uniqueId}"]`);
            if (pieceElement) {
                pieceElement.style.opacity = '1';
                pieceElement.style.pointerEvents = 'auto';
            }
        }
        
        // Сбрасываем состояние
        this.isDragging = false;
        this.draggedPiece = null;

        // Скрыть превью
        this.hideDragPreview();
        
        // Убираем класс dragging со всех элементов
        this.root.querySelectorAll('.piece-item').forEach(el => {
            el.classList.remove('dragging');
        });
        
        // Убираем выделение с фигуры
        this.clearSelection();
        
        this.draw();
        e.preventDefault();
    }
    
    canPlacePiece(piece, x, y) {
        for (let py = 0; py < piece.shape.length; py++) {
            for (let px = 0; px < piece.shape[py].length; px++) {
                if (piece.shape[py][px]) {
                    const boardX = x + px;
                    const boardY = y + py;
                    
                    if (boardX < 0 || boardX >= this.BOARD_SIZE || 
                        boardY < 0 || boardY >= this.BOARD_SIZE || 
                        this.board[boardY][boardX]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    placePiece(piece, x, y) {
        if (!this.canPlacePiece(piece, x, y)) {
            return false;
        }
        
        // Сохраняем состояние перед ходом для возможности отмены
        this.saveMoveState();
        
        // Размещаем фигуру на доске
        for (let py = 0; py < piece.shape.length; py++) {
            for (let px = 0; px < piece.shape[py].length; px++) {
                if (piece.shape[py][px]) {
                    const boardX = x + px;
                    const boardY = y + py;
                    this.board[boardY][boardX] = 1;
                    this.boardColors[boardY][boardX] = piece.color;
                }
            }
        }

        this.piecesPlaced += 1;
        
        // Удаляем использованную фигуру
        this.availablePieces = this.availablePieces.filter(p => p.uniqueId !== piece.uniqueId);
        
        // Убираем выделение с размещенной фигуры
        this.clearSelection();
        
        // Добавляем анимацию размещения фигуры (отключена для корректного отображения цветов)
        // this.animatePiecePlacement(x, y, piece);
        
        // Проверяем заполненные линии
        this.checkLines();
        
        // Если фигуры закончились, генерируем новые
        if (this.availablePieces.length === 0) {
            this.generatePieces();
        } else {
            this.renderPieces(false); // Без анимации при обновлении панели
        }
        
        this.isDragging = false;
        this.draggedPiece = null;
        this.touchMoved = false;

        this.draw();
        this.updateUI();
        
        // Автоматически сохраняем игру после каждого размещения фигуры
        this.saveGameState();
        
        // Проверяем условия окончания игры
        this.checkGameOver();
        
        return true;
    }
    
    checkLines() {
        const rowsToClear = [];
        const columnsToClear = [];
        const regionsToClear = [];
        const size = this.BOARD_SIZE;

        for (let y = 0; y < size; y++) {
            if (this.board[y].every(cell => cell === 1)) {
                rowsToClear.push(y);
            }
        }

        for (let x = 0; x < size; x++) {
            if (this.board.every(row => row[x] === 1)) {
                columnsToClear.push(x);
            }
        }

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
        ];
        for (let region of regionsToCheck) {
            if (this.isRegionFilled(region.startX, region.startY)) {
                regionsToClear.push(region);
            }
        }

        const linesCleared = rowsToClear.length + columnsToClear.length + regionsToClear.length;

        if (linesCleared === 0) {
            return;
        }

        const cellsMap = new Map();
        const rememberCell = (x, y) => {
            const key = `${x},${y}`;
            if (!cellsMap.has(key)) {
                cellsMap.set(key, { x, y });
            }
        };

        rowsToClear.forEach(y => {
            for (let x = 0; x < size; x++) {
                if (this.board[y][x] === 1) {
                    rememberCell(x, y);
                }
            }
        });

        columnsToClear.forEach(x => {
            for (let y = 0; y < size; y++) {
                if (this.board[y][x] === 1) {
                    rememberCell(x, y);
                }
            }
        });

        regionsToClear.forEach(region => {
            for (let y = region.startY; y < region.startY + 3; y++) {
                for (let x = region.startX; x < region.startX + 3; x++) {
                    if (this.board[y][x] === 1) {
                        rememberCell(x, y);
                    }
                }
            }
        });

        const clearedCells = Array.from(cellsMap.values());
        clearedCells.forEach(({ x, y }) => {
            this.board[y][x] = 0;
            this.boardColors[y][x] = null;
        });

        if (clearedCells.length) {
            this.triggerClearAnimation(clearedCells);
        }

        // Новая система подсчета очков
        const currentTime = Date.now();
        
        // Проверяем, не истекло ли комбо (если прошло больше 2 секунд с последней очистки)
        if (currentTime - this.lastClearTime > this.COMBO_TIMEOUT) {
            this.comboCount = 0;
        }
        
        // Если что-то очистилось, увеличиваем комбо
        if (clearedCells.length > 0) {
            // Базовое увеличение комбо на 1
            this.comboCount++;
            
            // Дополнительный бонус комбо за одновременное удаление нескольких линий
            // Если удалено 2+ линии одновременно, добавляем +1 к комбо за каждую дополнительную линию
            if (linesCleared > 1) {
                const bonusCombo = linesCleared - 1; // Бонус = количество дополнительных линий
                this.comboCount += bonusCombo;
            }
            
            this.lastClearTime = currentTime;
        }
        
        // Подсчитываем очки
        const basePointsPerCell = 2; // Одна клетка = 2 очка
        
        // Подсчитываем уникальные очищенные клетки (учитывая пересечения строк, столбцов и регионов)
        const uniqueCells = clearedCells.length;
        
        // Базовые очки: каждая очищенная клетка = 2 очка
        // Регион 3x3 = 9 клеток * 2 = 18 очков (автоматически)
        let totalPoints = uniqueCells * basePointsPerCell;
        
        // Вычисляем множитель комбо
        // Комбо начинается с 1 (нет множителя), затем увеличивается
        // 1 комбо = x1, 2 комбо = x1.5, 3 комбо = x2, 4 комбо = x2.5, 5 комбо = x3, и т.д.
        const comboMultiplier = this.comboCount > 1 ? 1 + (this.comboCount - 1) * 0.5 : 1;
        
        // Применяем множитель комбо
        totalPoints = Math.floor(totalPoints * comboMultiplier);
        
        const oldLevel = this.level;
        this.lines += linesCleared;
        this.score += totalPoints;
        this.level = Math.floor(this.lines / 20) + 1;

        if (this.level > oldLevel) {
            this.showLevelUpCompliment();
        }
        
        // Показываем комбо, если оно есть
        if (this.comboCount > 1 && clearedCells.length > 0) {
            this.showCombo(this.comboCount, comboMultiplier, totalPoints, linesCleared);
        }
        
        // Показываем очки на поле
        if (clearedCells.length > 0 && totalPoints > 0) {
            this.showPointsOnField(clearedCells, totalPoints, comboMultiplier);
        }

        this.updateUI();
        this.saveGameState();
    }

    isRegionFilled(startX, startY) {
        for (let y = startY; y < startY + 3; y++) {
            for (let x = startX; x < startX + 3; x++) {
                if (this.board[y][x] !== 1) {
                    return false;
                }
            }
        }
        return true;
    }
    
    // Очищает 3x3 регион
    hasAvailableMoves() {
        // Если нет фигур, игра не окончена (будут сгенерированы новые)
        if (this.availablePieces.length === 0) {
            return true;
        }
        
        // Получаем список свободных клеток для оптимизации
        const freeCells = this.getFreeCells();
        
        // Проверяем каждую доступную фигуру
        for (let piece of this.availablePieces) {
            // Проверяем только свободные клетки как потенциальные позиции
            for (let cell of freeCells) {
                if (this.canPlacePiece(piece, cell.x, cell.y)) {
                    return true; // Найдена хотя бы одна доступная позиция
                }
            }
        }
        
        return false; // Нет доступных ходов
    }
    
    // Получает список свободных клеток на доске
    getFreeCells() {
        const freeCells = [];
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (this.board[y][x] === 0) {
                    freeCells.push({ x, y });
                }
            }
        }
        return freeCells;
    }
    
    // Проверяет условия окончания игры
    checkGameOver() {
        if (!this.gameRunning) {
            return; // Игра уже окончена
        }
        
        // Проверяем, есть ли доступные ходы
        if (!this.hasAvailableMoves()) {
            this.gameOver();
        }
    }
    
    // Подсчитывает количество доступных ходов
    countAvailableMoves() {
        if (this.availablePieces.length === 0) {
            return 0;
        }
        
        let moveCount = 0;
        const freeCells = this.getFreeCells();
        
        for (let piece of this.availablePieces) {
            for (let cell of freeCells) {
                if (this.canPlacePiece(piece, cell.x, cell.y)) {
                    moveCount++;
                }
            }
        }
        
        return moveCount;
    }
    
    getCurrentColor() {
        // Возвращаем цвет первой доступной фигуры или синий по умолчанию
        if (this.availablePieces && this.availablePieces.length > 0) {
            return this.availablePieces[0].color;
        }
        return '#3BA3FF'; // Синий цвет по умолчанию
    }
    
    drawWithPreview(previewX, previewY, canPlace = true) {
        this.draw();

        if (!this.draggedPiece) {
            return;
        }

        // Если нельзя поставить — не рисуем никакой тени
        if (!canPlace) {
            return;
        }

        // Показываем подсветку потенциальных линий и зелёный призрак
        this.drawLinePreview(previewX, previewY);

        const baseColor = '#31C48D';

        for (let py = 0; py < this.draggedPiece.shape.length; py++) {
            for (let px = 0; px < this.draggedPiece.shape[py].length; px++) {
                if (this.draggedPiece.shape[py][px]) {
                    const x = (previewX + px) * this.CELL_SIZE;
                    const y = (previewY + py) * this.CELL_SIZE;
                    this.drawModernCellPreview(this.ctx, x, y, this.CELL_SIZE, baseColor);
                }
            }
        }
    }

    // Функция для расчета линий, которые будут очищены
    calculateLinesToClear(previewX, previewY) {
        if (!this.draggedPiece || !this.canPlacePiece(this.draggedPiece, previewX, previewY)) {
            return { rows: [], columns: [], regions: [] };
        }

        // Создаем временную копию доски с размещенной фигурой
        const tempBoard = this.board.map(row => [...row]);
        
        for (let py = 0; py < this.draggedPiece.shape.length; py++) {
            for (let px = 0; px < this.draggedPiece.shape[py].length; px++) {
                if (this.draggedPiece.shape[py][px]) {
                    const boardX = previewX + px;
                    const boardY = previewY + py;
                    tempBoard[boardY][boardX] = 1;
                }
            }
        }

        const rowsToClear = [];
        const columnsToClear = [];
        const regionsToClear = [];

        // Проверяем строки
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            if (tempBoard[y].every(cell => cell === 1)) {
                rowsToClear.push(y);
            }
        }

        // Проверяем столбцы
        for (let x = 0; x < this.BOARD_SIZE; x++) {
            if (tempBoard.every(row => row[x] === 1)) {
                columnsToClear.push(x);
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
        ];

        for (let region of regionsToCheck) {
            let isFilled = true;
            for (let ry = region.startY; ry < region.startY + 3; ry++) {
                for (let rx = region.startX; rx < region.startX + 3; rx++) {
                    if (tempBoard[ry][rx] !== 1) {
                        isFilled = false;
                        break;
                    }
                }
                if (!isFilled) break;
            }
            if (isFilled) {
                regionsToClear.push(region);
            }
        }

        return { rows: rowsToClear, columns: columnsToClear, regions: regionsToClear };
    }

    // Функция для отрисовки подсветки линий
    drawLinePreview(previewX, previewY) {
        const linesToClear = this.calculateLinesToClear(previewX, previewY);
        
        this.ctx.save();
        
        // Подсветка строк
        this.ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
        linesToClear.rows.forEach(y => {
            this.ctx.fillRect(0, y * this.CELL_SIZE, this.canvas.width, this.CELL_SIZE);
        });

        // Подсветка столбцов
        linesToClear.columns.forEach(x => {
            this.ctx.fillRect(x * this.CELL_SIZE, 0, this.CELL_SIZE, this.canvas.height);
        });

        // Подсветка блоков 3x3
        linesToClear.regions.forEach(region => {
            this.ctx.fillRect(
                region.startX * this.CELL_SIZE,
                region.startY * this.CELL_SIZE,
                3 * this.CELL_SIZE,
                3 * this.CELL_SIZE
            );
        });

        // Обводим контуром
        this.ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
        this.ctx.lineWidth = 2;
        linesToClear.rows.forEach(y => {
            this.ctx.strokeRect(0, y * this.CELL_SIZE, this.canvas.width, this.CELL_SIZE);
        });
        linesToClear.columns.forEach(x => {
            this.ctx.strokeRect(x * this.CELL_SIZE, 0, this.CELL_SIZE, this.canvas.height);
        });
        linesToClear.regions.forEach(region => {
            this.ctx.strokeRect(
                region.startX * this.CELL_SIZE,
                region.startY * this.CELL_SIZE,
                3 * this.CELL_SIZE,
                3 * this.CELL_SIZE
            );
        });

        this.ctx.restore();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawSudokuGrid();
        this.drawBoard();
        this.drawPlacementAnimations();
        this.drawClearAnimations();
        this.drawPointsAnimations();
    }

    drawSudokuGrid() {
        this.drawRegionBackgrounds();

        this.ctx.save();
        
        // Тонкие линии 1px для базовой сетки
        this.ctx.strokeStyle = '#E5DFD6';
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= this.BOARD_SIZE; i++) {
            const pos = i * this.CELL_SIZE + 0.5;

            this.ctx.beginPath();
            this.ctx.moveTo(pos, 0);
            this.ctx.lineTo(pos, this.canvas.height);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(0, pos);
            this.ctx.lineTo(this.canvas.width, pos);
            this.ctx.stroke();
        }

        // Утолщённые 2px для границ блоков 3×3
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#CFC6B8';

        for (let i = 0; i <= this.BOARD_SIZE; i += 3) {
            const pos = i * this.CELL_SIZE + 0.5;

            this.ctx.beginPath();
            this.ctx.moveTo(pos, 0);
            this.ctx.lineTo(pos, this.canvas.height);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(0, pos);
            this.ctx.lineTo(this.canvas.width, pos);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawRegionBackgrounds() {
        this.ctx.save();

        // Фон поля: тёплый светлый (#FAF6EF)
        this.ctx.fillStyle = '#FAF6EF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.restore();
    }

    drawBoard() {
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (this.board[y][x]) {
                    const pixelX = x * this.CELL_SIZE;
                    const pixelY = y * this.CELL_SIZE;
                    const cellColor = this.boardColors[y][x] || '#3BA3FF'; // Используем сохраненный цвет или синий по умолчанию
                    this.drawModernCell(this.ctx, pixelX, pixelY, this.CELL_SIZE, cellColor);
                }
            }
        }
    }

    drawPlacementAnimations() {
        if (!this.placementAnimations || this.placementAnimations.length === 0) {
            return;
        }

        this.placementAnimations.forEach(cell => {
            const pixelX = cell.x * this.CELL_SIZE;
            const pixelY = cell.y * this.CELL_SIZE;
            // Берем цвет ИЗ ДОСКИ - фигура уже размещена с правильным цветом
            const cellColor = this.boardColors[cell.y] && this.boardColors[cell.y][cell.x];
            
            // Если цвет не найден на доске, просто не рисуем анимацию
            if (!cellColor) return;
            
            if (cell.progress !== undefined) {
                // Анимация масштабирования
                const scale = 0.96 + (0.04 * cell.progress);
                this.ctx.save();
                this.ctx.translate(pixelX + this.CELL_SIZE / 2, pixelY + this.CELL_SIZE / 2);
                this.ctx.scale(scale, scale);
                this.ctx.translate(-this.CELL_SIZE / 2, -this.CELL_SIZE / 2);
                this.drawModernCell(this.ctx, 0, 0, this.CELL_SIZE, cellColor);
                this.ctx.restore();
            } else if (cell.flashProgress !== undefined) {
                // Анимация вспышки
                const flashElapsed = performance.now() - cell.flashStartTime;
                const flashProgress = Math.min(flashElapsed / 80, 1); // 80ms для вспышки
                const flashAlpha = Math.sin(flashProgress * Math.PI) * 0.3;
                
                this.ctx.save();
                this.ctx.globalAlpha = flashAlpha;
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.roundRectPath(this.ctx, pixelX + 2, pixelY + 2, this.CELL_SIZE - 4, this.CELL_SIZE - 4, 6);
                this.ctx.fill();
                this.ctx.restore();
            }
        });
    }

    drawClearAnimations() {
        if (!this.clearAnimations.length) {
            return;
        }

        this.clearAnimations.forEach(effect => {
            const progress = effect.progress ?? 0;
            effect.cells.forEach(cell => {
                const pixelX = cell.x * this.CELL_SIZE;
                const pixelY = cell.y * this.CELL_SIZE;
                // Используем сохраненный цвет клетки
                const cellColor = cell.color || '#3BA3FF';
                this.drawClearBurst(pixelX, pixelY, progress, cellColor);
            });
        });
    }

    // Показывает очки на поле при очистке клеток
    showPointsOnField(clearedCells, totalPoints, comboMultiplier) {
        if (clearedCells.length === 0 || totalPoints <= 0) return;
        
        // Выбираем несколько случайных позиций среди очищенных клеток для отображения очков
        const numberOfPointsLabels = Math.min(clearedCells.length, 5); // Максимум 5 меток очков
        const selectedCells = [];
        
        // Выбираем случайные клетки
        const shuffled = [...clearedCells].sort(() => Math.random() - 0.5);
        for (let i = 0; i < numberOfPointsLabels && i < shuffled.length; i++) {
            selectedCells.push(shuffled[i]);
        }
        
        // Если очищено много клеток, распределяем очки между метками
        let pointsPerLabel = Math.floor(totalPoints / selectedCells.length);
        let remainder = totalPoints % selectedCells.length;
        
        // Если слишком мало очков для разделения, показываем одну большую метку
        if (selectedCells.length > 1 && pointsPerLabel < 10) {
            // Используем только первую ячейку, но показываем все очки
            const cell = selectedCells[0];
            const pixelX = cell.x * this.CELL_SIZE + this.CELL_SIZE / 2;
            const pixelY = cell.y * this.CELL_SIZE + this.CELL_SIZE / 2;
            
            const pointAnimation = {
                x: pixelX,
                y: pixelY,
                startY: pixelY,
                points: totalPoints,
                comboMultiplier: comboMultiplier,
                startTime: performance.now(),
                progress: 0,
                opacity: 1,
                offsetX: (Math.random() - 0.5) * 20
            };
            
            this.pointsAnimations.push(pointAnimation);
        } else {
            // Распределяем очки между несколькими метками
            selectedCells.forEach((cell, index) => {
                let pointsToShow = pointsPerLabel;
                // Остаток распределяем по первой метке
                if (index === 0) {
                    pointsToShow += remainder;
                }
                
                const pixelX = cell.x * this.CELL_SIZE + this.CELL_SIZE / 2;
                const pixelY = cell.y * this.CELL_SIZE + this.CELL_SIZE / 2;
                
                const pointAnimation = {
                    x: pixelX,
                    y: pixelY,
                    startY: pixelY,
                    points: pointsToShow,
                    comboMultiplier: comboMultiplier,
                    startTime: performance.now(),
                    progress: 0,
                    opacity: 1,
                    offsetX: (Math.random() - 0.5) * 20
                };
                
                this.pointsAnimations.push(pointAnimation);
            });
        }
        
        // Запускаем анимацию
        this.ensureAnimationLoop();
    }
    
    // Отрисовывает анимацию очков на canvas
    drawPointsAnimations() {
        if (!this.pointsAnimations || this.pointsAnimations.length === 0) {
            return;
        }
        
        this.pointsAnimations.forEach(point => {
            const x = point.x + point.offsetX;
            const y = point.y;
            
            // Определяем размер текста в зависимости от множителя комбо
            let fontSize = 20;
            let fontWeight = 'bold';
            let color = '#FFD700'; // Золотой цвет по умолчанию
            
            if (point.comboMultiplier > 2) {
                fontSize = 28;
                color = '#FF6B9D'; // Розовый для большого комбо
            } else if (point.comboMultiplier > 1.5) {
                fontSize = 24;
                color = '#FFC145'; // Янтарный для среднего комбо
            }
            
            // Добавляем префикс "+" и форматируем число
            const pointsText = `+${point.points}`;
            
            this.ctx.save();
            
            // Тень для лучшей читаемости
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 4;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 2;
            
            // Основной текст
            this.ctx.globalAlpha = point.opacity;
            this.ctx.font = `${fontWeight} ${fontSize}px Arial`;
            this.ctx.fillStyle = color;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(pointsText, x, y);
            
            // Если есть множитель комбо больше 1, показываем его маленьким текстом под очками
            if (point.comboMultiplier > 1) {
                const multiplierText = `x${point.comboMultiplier.toFixed(1)}`;
                this.ctx.font = `bold ${fontSize * 0.5}px Arial`;
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.fillText(multiplierText, x, y + fontSize * 0.4);
            }
            
            this.ctx.restore();
        });
    }
    
    drawClearBurst(pixelX, pixelY, progress, baseColor) {
        const ctx = this.ctx;
        const centerX = pixelX + this.CELL_SIZE / 2;
        const centerY = pixelY + this.CELL_SIZE / 2;
        
        // Мягкое расширение с плавным исчезновением
        const expansion = this.CELL_SIZE * (0.35 + 0.65 * progress);
        const glowFade = 1 - progress * 0.9;

        const gradient = ctx.createRadialGradient(
            centerX,
            centerY,
            this.CELL_SIZE * 0.1,
            centerX,
            centerY,
            expansion
        );
        gradient.addColorStop(0, this.addAlpha('#ffffff', 0.85 * glowFade));
        gradient.addColorStop(0.55, this.addAlpha(this.lightenColor(baseColor, 0.35), 0.55 * glowFade));
        gradient.addColorStop(1, this.addAlpha(baseColor, 0));

        const haloRadius = this.CELL_SIZE * (0.55 + 0.45 * progress);
        const haloGradient = ctx.createRadialGradient(
            centerX,
            centerY,
            this.CELL_SIZE * 0.2,
            centerX,
            centerY,
            haloRadius * 1.25
        );
        haloGradient.addColorStop(0, this.addAlpha('#ffffff', 0.18 * glowFade));
        haloGradient.addColorStop(1, this.addAlpha('#ffffff', 0));

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = haloGradient;
        ctx.fillRect(pixelX - haloRadius, pixelY - haloRadius, this.CELL_SIZE + haloRadius * 2, this.CELL_SIZE + haloRadius * 2);

        ctx.fillStyle = gradient;
        ctx.fillRect(pixelX - expansion, pixelY - expansion, this.CELL_SIZE + expansion * 2, this.CELL_SIZE + expansion * 2);

        ctx.strokeStyle = this.addAlpha('#ffffff', 0.22 * glowFade);
        ctx.lineWidth = 1 + (1 - progress) * 1.2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, haloRadius, 0, Math.PI * 2);
        
        ctx.stroke();

        ctx.restore();
    }

    triggerClearAnimation(cells) {
        if (!cells || cells.length === 0) {
            return;
        }

        const effect = {
            cells: cells.map(cell => ({ x: cell.x, y: cell.y })),
            startTime: performance.now(),
            progress: 0
        };

        this.clearAnimations.push(effect);
        this.draw();
        this.ensureAnimationLoop();
    }

    ensureAnimationLoop() {
        if (this.animationFrameId) {
            return;
        }

        const step = (timestamp) => {
            this.updateClearAnimationProgress(timestamp);

            const hasActiveAnimations = this.clearAnimations.length > 0 || this.pointsAnimations.length > 0;

            if (hasActiveAnimations) {
                this.draw();
                this.animationFrameId = requestAnimationFrame(step);
            } else {
                // Выполняем финальный рендер, чтобы очистить артефакты анимации на мобильных устройствах
                this.draw();
                this.animationFrameId = null;
            }
        };

        this.animationFrameId = requestAnimationFrame(step);
    }

    updateClearAnimationProgress(timestamp) {
        const duration = this.CLEAR_ANIMATION_DURATION;

        this.clearAnimations = this.clearAnimations.filter(effect => {
            const elapsed = timestamp - effect.startTime;
            const progress = Math.min(1, elapsed / duration);
            effect.progress = progress;
            return elapsed < duration;
        });
        
        // Обновляем анимацию очков
        const pointsDuration = this.POINTS_ANIMATION_DURATION;
        this.pointsAnimations = this.pointsAnimations.filter(point => {
            const elapsed = timestamp - point.startTime;
            const progress = Math.min(1, elapsed / pointsDuration);
            point.progress = progress;
            point.y = point.startY - (progress * 60); // Всплытие вверх на 60px
            point.opacity = 1 - progress; // Постепенное исчезновение
            return elapsed < pointsDuration;
        });

        if (this.clearAnimations.length === 0 && this.pointsAnimations.length === 0 && this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    drawGlassCell(ctx, pixelX, pixelY, size, baseColor, options = {}) {
        const alpha = options.alpha ?? 1;
        const depth = options.depth ?? 0.25;
        const radius = Math.max(2.5, size * 0.16);
        const bevel = Math.max(2, size * 0.14);

        const light = this.lightenColor(baseColor, 0.35);
        const lightMid = this.lightenColor(baseColor, 0.15);
        const dark = this.darkenColor(baseColor, depth);
        const darker = this.darkenColor(baseColor, depth + 0.18);

        ctx.save();

        ctx.beginPath();
        this.roundRectPath(ctx, pixelX + 0.5, pixelY + 0.5, size - 1, size - 1, radius);
        ctx.closePath();
        ctx.clip();

        const bodyGradient = ctx.createLinearGradient(pixelX, pixelY, pixelX + size, pixelY + size);
        bodyGradient.addColorStop(0, this.addAlpha(light, alpha));
        bodyGradient.addColorStop(0.55, this.addAlpha(baseColor, alpha));
        bodyGradient.addColorStop(1, this.addAlpha(dark, alpha));
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(pixelX, pixelY, size, size);

        ctx.fillStyle = this.addAlpha(light, 0.85 * alpha);
        ctx.beginPath();
        ctx.moveTo(pixelX, pixelY);
        ctx.lineTo(pixelX + size, pixelY);
        ctx.lineTo(pixelX + size - bevel, pixelY + bevel);
        ctx.lineTo(pixelX + bevel, pixelY + bevel);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = this.addAlpha(lightMid, 0.75 * alpha);
        ctx.beginPath();
        ctx.moveTo(pixelX, pixelY);
        ctx.lineTo(pixelX + bevel, pixelY + bevel);
        ctx.lineTo(pixelX + bevel, pixelY + size - bevel);
        ctx.lineTo(pixelX, pixelY + size);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = this.addAlpha(darker, 0.75 * alpha);
        ctx.beginPath();
        ctx.moveTo(pixelX + size, pixelY);
        ctx.lineTo(pixelX + size, pixelY + size);
        ctx.lineTo(pixelX + size - bevel, pixelY + size - bevel);
        ctx.lineTo(pixelX + size - bevel, pixelY + bevel);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = this.addAlpha(this.darkenColor(baseColor, depth + 0.25), 0.9 * alpha);
        ctx.beginPath();
        ctx.moveTo(pixelX, pixelY + size);
        ctx.lineTo(pixelX + size, pixelY + size);
        ctx.lineTo(pixelX + size - bevel, pixelY + size - bevel);
        ctx.lineTo(pixelX + bevel, pixelY + size - bevel);
        ctx.closePath();
        ctx.fill();

        const sparkle = ctx.createRadialGradient(
            pixelX + bevel * 0.8,
            pixelY + bevel * 0.8,
            0,
            pixelX + bevel * 0.8,
            pixelY + bevel * 0.8,
            bevel * 1.8
        );
        sparkle.addColorStop(0, this.addAlpha('#ffffff', 0.45 * alpha));
        sparkle.addColorStop(1, this.addAlpha('#ffffff', 0));
        ctx.fillStyle = sparkle;
        ctx.fillRect(pixelX, pixelY, size, size);

        ctx.restore();

        ctx.save();
        ctx.beginPath();
        this.roundRectPath(ctx, pixelX + 0.5, pixelY + 0.5, size - 1, size - 1, radius);
        ctx.closePath();
        ctx.strokeStyle = this.addAlpha(this.darkenColor(baseColor, depth + 0.3), 0.65 * alpha);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    // Плоская версия отрисовки клеток без 3D эффекта
    drawFlatCell(ctx, pixelX, pixelY, size, baseColor, options = {}) {
        const alpha = options.alpha ?? 1;
        const radius = Math.max(2, size * 0.12);

        ctx.save();

        // Простая заливка одним цветом
        ctx.fillStyle = this.addAlpha(baseColor, alpha);
        ctx.beginPath();
        this.roundRectPath(ctx, pixelX + 0.5, pixelY + 0.5, size - 1, size - 1, radius);
        ctx.closePath();
        ctx.fill();

        // Простая рамка
        ctx.strokeStyle = this.addAlpha(this.darkenColor(baseColor, 0.3), 0.8 * alpha);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    roundRectPath(ctx, x, y, width, height, radius) {
        const r = Math.max(0, Math.min(radius, width / 2, height / 2));
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
    }

    hexToRgb(hex) {
        let cleaned = hex.replace('#', '');
        if (cleaned.length === 3) {
            cleaned = cleaned.split('').map(char => char + char).join('');
        }
        const num = parseInt(cleaned, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    addAlpha(hex, alpha) {
        const { r, g, b } = this.hexToRgb(hex);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    lightenColor(hex, amount = 0.2) {
        const { r, g, b } = this.hexToRgb(hex);
        const adjust = (channel) => Math.round(channel + (255 - channel) * amount);
        return `#${[adjust(r), adjust(g), adjust(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
    }

    darkenColor(hex, amount = 0.2) {
        const { r, g, b } = this.hexToRgb(hex);
        const adjust = (channel) => Math.round(channel * (1 - amount));
        return `#${[adjust(r), adjust(g), adjust(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
    }

    updateUI() {
        const levelDisplay = this.root.getElementById('levelDisplay');
        const record = this.root.getElementById('record');
        const currentScore = this.root.getElementById('currentScore');
        
        if (levelDisplay) levelDisplay.textContent = this.level;
        if (record) record.textContent = this.record;
        if (currentScore) currentScore.textContent = this.score;
    }
    
    // Показывает информацию о комбо
    showCombo(comboCount, multiplier, points, linesCleared = 1) {
        // Создаем элемент для комбо
        const comboElement = this.document.createElement('div');
        comboElement.className = 'combo-indicator-popup';
        
        // Добавляем информацию о бонусе за несколько линий, если удалено больше 1 линии
        const linesBonusText = linesCleared > 1 ? 
            `<div class="combo-lines-bonus">x${linesCleared}</div>` : '';
        
        comboElement.innerHTML = `
            <div class="combo-content">
                <div class="combo-text">COMBO x${comboCount}</div>
                ${linesBonusText}
            </div>
        `;
        
        // Добавляем стили, если их еще нет
        if (!this.root.getElementById('combo-styles')) {
            const style = this.document.createElement('style');
            style.id = 'combo-styles';
            style.textContent = `
                .combo-indicator-popup {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(0.8);
                    z-index: 10000;
                    pointer-events: none;
                    opacity: 0;
                    transition: all 0.25s ease-out;
                }
                .combo-indicator-popup.show {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                .combo-content {
                    color: white;
                    padding: 8px 16px;
                    text-align: center;
                    font-weight: 600;
                    min-width: 100px;
                }
                .combo-text {
                    font-size: 18px;
                    margin-bottom: 4px;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                }
                .combo-lines-bonus {
                    font-size: 14px;
                    margin-top: 2px;
                    color: #ffd700;
                    font-weight: 600;
                    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
                }
            `;
            this.document.head.appendChild(style);
        }

        // Добавляем в DOM
        this.document.body.appendChild(comboElement);
        
        // Анимация появления
        setTimeout(() => {
            comboElement.classList.add('show');
        }, 10);
        
        // Автоматическое удаление через 1.5 секунды
        setTimeout(() => {
            if (this.document.body.contains(comboElement)) {
                comboElement.classList.remove('show');
                setTimeout(() => {
                    if (this.document.body.contains(comboElement)) {
                        this.document.body.removeChild(comboElement);
                    }
                }, 250);
            }
        }, 1500);
    }
    
    // Показывает комплимент при достижении нового уровня
    showLevelUpCompliment() {
        // Выбираем случайный комплимент
        const randomCompliment = this.compliments[Math.floor(Math.random() * this.compliments.length)];
        
        // Создаем элемент для комплимента
        const complimentElement = this.document.createElement('div');
        complimentElement.className = 'level-up-compliment';
        complimentElement.innerHTML = `
            <div class="compliment-content">
                <div class="level-badge">Уровень ${this.level}! 🎉</div>
                <div class="compliment-text">${randomCompliment}</div>
                <button class="compliment-close">Продолжить игру</button>
            </div>
        `;
        
        // Добавляем в DOM
        this.document.body.appendChild(complimentElement);
        
        // Анимация появления
        setTimeout(() => {
            complimentElement.classList.add('show');
        }, 100);
        
        // Обработчик закрытия
        const closeBtn = complimentElement.querySelector('.compliment-close');
        closeBtn.addEventListener('click', () => {
            complimentElement.classList.remove('show');
            setTimeout(() => {
                this.document.body.removeChild(complimentElement);
            }, 300);
        });
        
        // Автоматическое закрытие через 5 секунд
        setTimeout(() => {
            if (this.document.body.contains(complimentElement)) {
                complimentElement.classList.remove('show');
                setTimeout(() => {
                    if (this.document.body.contains(complimentElement)) {
                        this.document.body.removeChild(complimentElement);
                    }
                }, 300);
            }
        }, 5000);
    }
    
    clearBoard() {
        this.board = Array(this.BOARD_SIZE).fill().map(() => Array(this.BOARD_SIZE).fill(0));
        this.boardColors = Array(this.BOARD_SIZE).fill().map(() => Array(this.BOARD_SIZE).fill(null));
        this.draw();
        
        // Сохраняем игру после очистки доски
        this.saveGameState();
    }
    
    
    gameOver() {
        this.gameRunning = false;
        
        // Проверяем рекорд
        const isNewRecord = this.saveRecord(this.score);
        
        const gameOverElement = this.root.getElementById('gameOver');
        
        // Обновляем интерфейс в зависимости от того, установлен ли новый рекорд
        if (isNewRecord) {
            gameOverElement.innerHTML = `
                <h2>🎉 Новый рекорд!</h2>
                <p>Поздравляем! Вы установили новый рекорд:</p>
                <div class="final-score">${this.score}</div>
                <p class="record-info">Предыдущий рекорд: ${this.record - this.score}</p>
                <button id="restartGameBtn">Играть снова</button>
            `;
        } else {
            gameOverElement.innerHTML = `
                <h2>Игра окончена!</h2>
                <p>Ваш результат:</p>
                <div class="final-score">${this.score}</div>
                <p class="record-info">Рекорд: ${this.record}</p>
                <button id="restartGameBtn">Играть снова</button>
            `;
        }
        
        // Добавляем обработчик события для кнопки
        const restartBtn = this.root.getElementById('restartGameBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.restart();
            });
        }
        
        gameOverElement.style.display = 'block';

        // Обновляем отображение рекорда в интерфейсе
        this.updateUI();

        const durationSeconds = Math.max(0, Math.round((Date.now() - this.gameStartTime) / 1000));
        if (typeof this.onGameOver === 'function') {
            this.onGameOver({
                score: this.score,
                level: this.level,
                lines_cleared: this.lines,
                game_duration_seconds: durationSeconds,
                pieces_placed: this.piecesPlaced,
                game_mode: 'classic'
            });
        }
    }
    
    restart() {
        this.board = Array(this.BOARD_SIZE).fill().map(() => Array(this.BOARD_SIZE).fill(0));
        this.boardColors = Array(this.BOARD_SIZE).fill().map(() => Array(this.BOARD_SIZE).fill(null));
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameRunning = true;
        this.draggedPiece = null;
        this.isDragging = false;
        this.piecesPlaced = 0;
        this.gameStartTime = Date.now();
        
        // Сбрасываем комбо
        this.comboCount = 0;
        this.lastClearTime = 0;
        
        // Сбрасываем анимацию очков
        this.pointsAnimations = [];
        
        // Сбрасываем выделение
        this.clearSelection();
        
        // Очищаем историю ходов
        this.moveHistory = [];
        
        // Очищаем сохраненное состояние при перезапуске
        this.clearGameState();
        
        const gameOverElement = this.root.getElementById('gameOver');
        if (gameOverElement) {
            gameOverElement.style.display = 'none';
        }
        this.updateUI();
        this.generatePieces();
        this.draw();
    }
    
    // Сохраняет состояние перед ходом для возможности отмены
    // Хранит только последний ход, чтобы можно было отменить только 1 последний ход
    saveMoveState() {
        const state = {
            board: this.board.map(row => [...row]),
            boardColors: this.boardColors.map(row => row.map(color => color ? color : null)),
            availablePieces: this.availablePieces.map(piece => JSON.parse(JSON.stringify(piece))),
            score: this.score,
            level: this.level,
            lines: this.lines
        };
        
        // Очищаем историю и сохраняем только текущее состояние
        // Это позволяет отменить только последний ход
        this.moveHistory = [state];
    }
    
    // Отменяет последний ход (можно отменить только 1 последний ход)
    undoMove() {
        if (this.moveHistory.length === 0) {
            console.log('Нет ходов для отмены');
            return;
        }
        
        if (!this.gameRunning) {
            console.log('Нельзя отменить ход после окончания игры');
            return;
        }
        
        // Восстанавливаем предыдущее состояние (последний сохраненный ход)
        const previousState = this.moveHistory[0];
        
        this.board = previousState.board.map(row => [...row]);
        this.boardColors = previousState.boardColors.map(row => row.map(color => color ? color : null));
        this.availablePieces = previousState.availablePieces.map(piece => JSON.parse(JSON.stringify(piece)));
        this.score = previousState.score;
        this.level = previousState.level;
        this.lines = previousState.lines;
        
        // Очищаем историю после отмены, чтобы нельзя было отменить еще раз
        this.moveHistory = [];
        
        // Обновляем отображение
        this.renderPieces(false);
        this.draw();
        this.updateUI();
        this.saveGameState();
        
        // Убираем выделение
        this.clearSelection();
        
        console.log('Последний ход отменен');
    }
    
    // Обновляет фигуры в лотке
    refreshPieces() {
        if (!this.gameRunning) {
            console.log('Нельзя обновить фигуры после окончания игры');
            return;
        }
        
        // Генерируем новые фигуры
        this.generatePieces();

        console.log('Фигуры в лотке обновлены');
    }

    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        this.cleanupFns.forEach(fn => fn());
        this.cleanupFns = [];

        if (this.dragCanvas && this.dragCanvas.parentNode) {
            this.dragCanvas.parentNode.removeChild(this.dragCanvas);
        }
    }
}