class MobileSudokuTetris {
    constructor() {
        console.log('Создаем экземпляр игры...');
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            throw new Error('Canvas с id="gameCanvas" не найден!');
        }
        console.log('Canvas найден:', this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('Не удалось получить контекст canvas!');
        }
        console.log('Контекст canvas получен');
        
        this.piecesContainer = document.getElementById('piecesContainer');
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
        this.CLEAR_ANIMATION_DURATION = 360;
        this.clearAnimations = [];
        this.placementAnimations = [];
        this.animationFrameId = null;
        
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameRunning = true;
        this.record = this.loadRecord();
        
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
        
        // Состояние выбранной фигуры
        this.selectedPiece = null;
        this.selectedPieceElement = null;
        
        // Разнообразные фигуры с новой цветовой схемой
        this.tetrisPieces = [
            // Классические фигуры тетриса
            {
                id: 'I',
                name: 'Линия',
                shape: [[1, 1, 1, 1]],
                color: '#3BA3FF', // Синий
                size: 4
            },
            {
                id: 'O',
                name: 'Квадрат',
                shape: [
                    [1, 1],
                    [1, 1]
                ],
                color: '#31C48D', // Зеленый
                size: 2,
            },
            {
                id: 'T',
                name: 'Т-образная',
                shape: [
                    [0, 1, 0],
                    [1, 1, 1]
                ],
                color: '#FF8A34', // Оранжевый
                size: 3
            },
            {
                id: 'S',
                name: 'S-образная',
                shape: [
                    [0, 1, 1],
                    [1, 1, 0]
                ],
                color: '#7C5CFF', // Фиолетовый
                size: 3
            },
            {
                id: 'Z',
                name: 'Z-образная',
                shape: [
                    [1, 1, 0],
                    [0, 1, 1]
                ],
                color: '#FF5A5F', // Красный
                size: 3
            },
            {
                id: 'J',
                name: 'J-образная',
                shape: [
                    [1, 0, 0],
                    [1, 1, 1]
                ],
                color: '#FFC145', // Янтарный
                size: 3
            },
            {
                id: 'L',
                name: 'L-образная',
                shape: [
                    [0, 0, 1],
                    [1, 1, 1]
                ],
                color: '#7AD53A', // Лаймовый
                size: 3
            },
            // Дополнительные фигуры с новой цветовой схемой
            {
                id: 'CROSS',
                name: 'Крест',
                shape: [
                    [0, 1, 0],
                    [1, 1, 1],
                    [0, 1, 0]
                ],
                color: '#3BA3FF', // Синий
                size: 3
            },
            {
                id: 'CORNER',
                name: 'Уголок',
                shape: [
                    [1, 1],
                    [1, 0]
                ],
                color: '#31C48D', // Зеленый
                size: 2
            },
            {
                id: 'LINE3',
                name: 'Тройка',
                shape: [[1, 1, 1]],
                color: '#FF8A34', // Оранжевый
                size: 3
            },
            {
                id: 'LINE2',
                name: 'Двойка',
                shape: [[1, 1]],
                color: '#7C5CFF', // Фиолетовый
                size: 2
            },
            {
                id: 'DOT',
                name: 'Точка',
                shape: [[1]],
                color: '#FF5A5F', // Красный
                size: 1
            },
            {
                id: 'LONG',
                name: 'Длинная',
                shape: [[1, 1, 1, 1, 1]],
                color: '#FFC145', // Янтарный
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
                color: '#7AD53A', // Лаймовый
                size: 3
            },
            {
                id: 'SMALLT',
                name: 'Маленькая Т',
                shape: [
                    [0, 1, 0],
                    [1, 1, 1]
                ],
                color: '#3BA3FF', // Синий
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
                color: '#31C48D', // Зеленый
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
                color: '#FF8A34', // Оранжевый
                size: 3
            },
            {
                id: 'LINE4',
                name: 'Четверка',
                shape: [[1, 1, 1, 1]],
                color: '#7C5CFF', // Фиолетовый
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
                color: '#FF5A5F', // Красный
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
                color: '#FFC145', // Янтарный
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
                color: '#7AD53A', // Лаймовый
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
                color: '#3BA3FF', // Синий
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
                color: '#31C48D', // Зеленый
                size: 3
            },
            {
                id: 'LONG4',
                name: 'Длинная 4',
                shape: [[1, 1, 1, 1]],
                color: '#FF8A34', // Оранжевый
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
                color: '#7C5CFF', // Фиолетовый
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
    
    // Функция для ротации комплиментов
    startComplimentRotation() {
        const complimentElement = document.getElementById('complimentText');
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
        const slots = document.querySelectorAll('[id^="slot"]');
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
            timestamp: Date.now()
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
        const slots = document.querySelectorAll('[id^="slot"]');
        slots.forEach(slot => {
            slot.innerHTML = '';
            slot.classList.remove('active', 'empty');
        });
        
        this.availablePieces.forEach((piece, index) => {
            // Убеждаемся, что цвет фигуры правильный перед отрисовкой
            this.ensurePieceColor(piece);
            
            const slot = document.getElementById(`slot${index + 1}`);
            if (!slot) return;
            
            const pieceElement = document.createElement('div');
            pieceElement.className = 'piece-item';
            pieceElement.draggable = true;
            pieceElement.dataset.pieceId = piece.uniqueId;
            
            // Добавляем атрибут цвета для CSS стилизации
            const colorName = this.getColorName(piece.color);
            pieceElement.dataset.color = colorName;
            
            const canvas = document.createElement('canvas');
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
            const slot = document.getElementById(`slot${i + 1}`);
            if (slot) {
                slot.classList.add('empty');
            }
        }
    }
    
    // Метод для получения имени цвета из hex значения
    getColorName(hexColor) {
        const colorMap = {
            '#3BA3FF': 'blue',
            '#31C48D': 'green', 
            '#FF8A34': 'orange',
            '#7C5CFF': 'purple',
            '#FF5A5F': 'red',
            '#FFC145': 'amber',
            '#7AD53A': 'lime'
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
        const validColors = ['#3BA3FF', '#31C48D', '#FF8A34', '#7C5CFF', '#FF5A5F', '#FFC145', '#7AD53A'];
        return validColors.includes(color);
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
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: true });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
        
        // События для фигур - touch события
        this.piecesContainer.addEventListener('touchstart', (e) => this.handlePieceTouchStart(e), { passive: false });
        this.piecesContainer.addEventListener('touchmove', (e) => this.handlePieceTouchMove(e), { passive: false });
        this.piecesContainer.addEventListener('touchend', (e) => this.handlePieceTouchEnd(e), { passive: false });
        
        // События для фигур - mouse события (для тестирования на ПК)
        this.piecesContainer.addEventListener('mousedown', (e) => this.handlePieceMouseStart(e));
        this.piecesContainer.addEventListener('mousemove', (e) => this.handlePieceMouseMove(e));
        this.piecesContainer.addEventListener('mouseup', (e) => this.handlePieceMouseEnd(e));
        
        // Кнопки управления
        const newGameBtn = document.getElementById('newGameBtn');
        
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => this.restart());
        }
        
        // Предотвращаем скролл страницы при перетаскивании
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Предотвращаем контекстное меню
        this.piecesContainer.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Глобальные mouse события для перетаскивания
        document.addEventListener('mousemove', (e) => this.handlePieceMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handlePieceMouseEnd(e));
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
            
            const touch = e.touches[0];
            const rect = pieceElement.getBoundingClientRect();
            this.dragOffset = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
            
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchMoved = false;
            
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
        
        const canvasX = touch.clientX - canvasRect.left;
        const effectiveLift = this.getEffectiveTouchLift(touch.clientY, canvasRect);
        const rawCanvasY = touch.clientY - canvasRect.top - effectiveLift;
        const adjustedCanvasY = Math.max(0, rawCanvasY);
        
        const gridX = Math.max(0, Math.min(this.BOARD_SIZE - 1, Math.round(canvasX / this.CELL_SIZE)));
        const gridY = Math.max(0, Math.min(this.BOARD_SIZE - 1, Math.round(adjustedCanvasY / this.CELL_SIZE)));
        
        this.drawWithPreview(gridX, gridY, this.canPlacePiece(this.draggedPiece, gridX, gridY));
        
        e.preventDefault();
    }
    
    handlePieceTouchEnd(e) {
        if (!this.isDragging || !this.draggedPiece) return;
        
        const touch = e.changedTouches[0];
        const canvasRect = this.canvas.getBoundingClientRect();
        
        const effectiveLift = this.getEffectiveTouchLift(touch.clientY, canvasRect);
        const dynamicMargin = Math.max(10, effectiveLift + this.CELL_SIZE * 0.5);
        if (touch.clientX >= canvasRect.left - dynamicMargin && touch.clientX <= canvasRect.right + dynamicMargin &&
            touch.clientY >= canvasRect.top - dynamicMargin && touch.clientY <= canvasRect.bottom + dynamicMargin) {
            
            const canvasX = touch.clientX - canvasRect.left;
            const rawCanvasY = touch.clientY - canvasRect.top - effectiveLift;
            const adjustedCanvasY = Math.max(0, rawCanvasY);
            
            const gridX = Math.max(0, Math.min(this.BOARD_SIZE - 1, Math.round(canvasX / this.CELL_SIZE)));
            const gridY = Math.max(0, Math.min(this.BOARD_SIZE - 1, Math.round(adjustedCanvasY / this.CELL_SIZE)));
            
            if (this.touchMoved && this.canPlacePiece(this.draggedPiece, gridX, gridY)) {
                this.placePiece(this.draggedPiece, gridX, gridY);
            }
        }
        
        this.isDragging = false;
        this.draggedPiece = null;
        this.touchMoved = false;
        this.isTouchDragging = false;
        this.touchLiftOffset = this.TOUCH_LIFT_BASE;
        
        document.querySelectorAll('.piece-item').forEach(el => {
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
            
            this.dragOffset = {
                x: e.offsetX,
                y: e.offsetY
            };
            
            e.preventDefault();
        }
    }
    
    handlePieceMouseMove(e) {
        if (!this.isDragging || !this.draggedPiece) return;
        
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Вычисляем позицию на canvas
        const canvasX = e.clientX - canvasRect.left;
        const canvasY = e.clientY - canvasRect.top;
        
        // Конвертируем в координаты сетки с проверкой границ
        const gridX = Math.max(0, Math.min(this.BOARD_SIZE - 1, Math.round(canvasX / this.CELL_SIZE)));
        const gridY = Math.max(0, Math.min(this.BOARD_SIZE - 1, Math.round(canvasY / this.CELL_SIZE)));
        
        // Всегда показываем полупрозрачную фигуру, независимо от возможности размещения
        this.drawWithPreview(gridX, gridY, this.canPlacePiece(this.draggedPiece, gridX, gridY));
        
        e.preventDefault();
    }
    
    handlePieceMouseEnd(e) {
        if (!this.isDragging || !this.draggedPiece) return;
        
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Проверяем, был ли клик над canvas (с небольшим запасом для лучшего UX)
        const margin = 10; // Добавляем запас в 10px
        if (e.clientX >= canvasRect.left - margin && e.clientX <= canvasRect.right + margin &&
            e.clientY >= canvasRect.top - margin && e.clientY <= canvasRect.bottom + margin) {
            
            const canvasX = e.clientX - canvasRect.left;
            const canvasY = e.clientY - canvasRect.top;
            
            // Используем Math.round вместо Math.floor для более точного позиционирования
            // и добавляем проверку на границы
            const gridX = Math.max(0, Math.min(this.BOARD_SIZE - 1, Math.round(canvasX / this.CELL_SIZE)));
            const gridY = Math.max(0, Math.min(this.BOARD_SIZE - 1, Math.round(canvasY / this.CELL_SIZE)));
            
            if (this.canPlacePiece(this.draggedPiece, gridX, gridY)) {
                this.placePiece(this.draggedPiece, gridX, gridY);
            }
        }
        
        // Сбрасываем состояние
        this.isDragging = false;
        this.draggedPiece = null;
        
        // Убираем класс dragging со всех элементов
        document.querySelectorAll('.piece-item').forEach(el => {
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
        
        // Удаляем использованную фигуру
        this.availablePieces = this.availablePieces.filter(p => p.uniqueId !== piece.uniqueId);
        
        // Убираем выделение с размещенной фигуры
        this.clearSelection();
        
        // Добавляем анимацию размещения фигуры
        this.animatePiecePlacement(x, y, piece);
        
        // Проверяем заполненные линии
        this.checkLines();
        
        // Если фигуры закончились, генерируем новые
        if (this.availablePieces.length === 0) {
            this.generatePieces();
        } else {
            this.renderPieces(false); // Без анимации при обновлении панели
        }
        
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

        const oldLevel = this.level;
        this.lines += linesCleared;
        this.score += linesCleared * 10 * this.level;
        this.level = Math.floor(this.lines / 20) + 1;

        if (this.level > oldLevel) {
            this.showLevelUpCompliment();
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

        // Валидно: зеленоватая подсветка rgba(49,196,141,0.35)
        // Невалидно: розовая rgba(255,90,95,0.35)
        const baseColor = canPlace ? '#31C48D' : '#FF5A5F';

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

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawSudokuGrid();
        this.drawBoard();
        this.drawPlacementAnimations();
        this.drawClearAnimations();
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

        const baseColor = '#3BA3FF'; // Синий цвет для размещенных фигур

        this.placementAnimations.forEach(cell => {
            const pixelX = cell.x * this.CELL_SIZE;
            const pixelY = cell.y * this.CELL_SIZE;
            
            if (cell.progress !== undefined) {
                // Анимация масштабирования
                const scale = 0.96 + (0.04 * cell.progress);
                this.ctx.save();
                this.ctx.translate(pixelX + this.CELL_SIZE / 2, pixelY + this.CELL_SIZE / 2);
                this.ctx.scale(scale, scale);
                this.ctx.translate(-this.CELL_SIZE / 2, -this.CELL_SIZE / 2);
                this.drawModernCell(this.ctx, 0, 0, this.CELL_SIZE, baseColor);
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

        const baseColor = '#3BA3FF'; // Синий цвет для анимаций очистки

        this.clearAnimations.forEach(effect => {
            const progress = effect.progress ?? 0;
            effect.cells.forEach(cell => {
                const pixelX = cell.x * this.CELL_SIZE;
                const pixelY = cell.y * this.CELL_SIZE;
                this.drawClearBurst(pixelX, pixelY, progress, baseColor);
            });
        });
    }

    drawClearBurst(pixelX, pixelY, progress, baseColor) {
        const ctx = this.ctx;
        const centerX = pixelX + this.CELL_SIZE / 2;
        const centerY = pixelY + this.CELL_SIZE / 2;
        const expansion = this.CELL_SIZE * (0.4 + 0.6 * progress);

        const gradient = ctx.createRadialGradient(
            centerX,
            centerY,
            this.CELL_SIZE * 0.1,
            centerX,
            centerY,
            expansion
        );
        gradient.addColorStop(0, this.addAlpha('#ffffff', 0.75 * (1 - progress)));
        gradient.addColorStop(0.6, this.addAlpha(this.lightenColor(baseColor, 0.3), 0.45 * (1 - progress)));
        gradient.addColorStop(1, this.addAlpha(baseColor, 0));

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = gradient;
        ctx.fillRect(pixelX - expansion, pixelY - expansion, this.CELL_SIZE + expansion * 2, this.CELL_SIZE + expansion * 2);

        ctx.strokeStyle = this.addAlpha('#ffffff', 0.28 * (1 - progress));
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.CELL_SIZE * (0.55 + 0.4 * progress), 0, Math.PI * 2);
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
            if (this.clearAnimations.length > 0) {
                this.draw();
                this.animationFrameId = requestAnimationFrame(step);
            } else {
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

        if (this.clearAnimations.length === 0 && this.animationFrameId) {
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
        const levelDisplay = document.getElementById('levelDisplay');
        const record = document.getElementById('record');
        const currentScore = document.getElementById('currentScore');
        
        if (levelDisplay) levelDisplay.textContent = this.level;
        if (record) record.textContent = this.record;
        if (currentScore) currentScore.textContent = this.score;
    }
    
    // Показывает комплимент при достижении нового уровня
    showLevelUpCompliment() {
        // Выбираем случайный комплимент
        const randomCompliment = this.compliments[Math.floor(Math.random() * this.compliments.length)];
        
        // Создаем элемент для комплимента
        const complimentElement = document.createElement('div');
        complimentElement.className = 'level-up-compliment';
        complimentElement.innerHTML = `
            <div class="compliment-content">
                <div class="level-badge">Уровень ${this.level}! 🎉</div>
                <div class="compliment-text">${randomCompliment}</div>
                <button class="compliment-close">Продолжить игру</button>
            </div>
        `;
        
        // Добавляем в DOM
        document.body.appendChild(complimentElement);
        
        // Анимация появления
        setTimeout(() => {
            complimentElement.classList.add('show');
        }, 100);
        
        // Обработчик закрытия
        const closeBtn = complimentElement.querySelector('.compliment-close');
        closeBtn.addEventListener('click', () => {
            complimentElement.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(complimentElement);
            }, 300);
        });
        
        // Автоматическое закрытие через 5 секунд
        setTimeout(() => {
            if (document.body.contains(complimentElement)) {
                complimentElement.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(complimentElement)) {
                        document.body.removeChild(complimentElement);
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
        
        const gameOverElement = document.getElementById('gameOver');
        
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
        const restartBtn = document.getElementById('restartGameBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.restart();
            });
        }
        
        gameOverElement.style.display = 'block';
        
        // Обновляем отображение рекорда в интерфейсе
        this.updateUI();
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
        
        // Сбрасываем выделение
        this.clearSelection();
        
        // Очищаем сохраненное состояние при перезапуске
        this.clearGameState();
        
        document.getElementById('gameOver').style.display = 'none';
        this.updateUI();
        this.generatePieces();
        this.draw();
    }
}

// Глобальные функции для HTML
window.restartGame = function() {
    if (window.game) {
        window.game.restart();
    }
};

// Theme switching functionality
class ThemeManager {
    constructor() {
        this.currentTheme = 'light'; // light, pink, blue
        this.themes = ['light', 'pink', 'blue'];
        this.themeIndex = 0;
        this.init();
    }
    
    init() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.switchTheme());
        }
        
        // Load saved theme
        const savedTheme = localStorage.getItem('sudokuTetrisTheme');
        if (savedTheme && this.themes.includes(savedTheme)) {
            this.setTheme(savedTheme);
        }
    }
    
    switchTheme() {
        this.themeIndex = (this.themeIndex + 1) % this.themes.length;
        const newTheme = this.themes[this.themeIndex];
        this.setTheme(newTheme);
        localStorage.setItem('sudokuTetrisTheme', newTheme);
    }
    
    setTheme(theme) {
        // Отключаем переключение тем, чтобы фигуры сохраняли свои цвета
        console.log('Переключение тем отключено для сохранения цветов фигур');
        this.currentTheme = theme;
    }
    
    updatePieceColors(color) {
        // Отключаем перекрашивание фигур, так как теперь у нас есть правильная цветовая схема
        // Фигуры должны сохранять свои оригинальные цвета из новой схемы
        console.log('Цветовая схема фигур теперь фиксированная');
    }
}

// Инициализация игры
let game;
let themeManager;
window.addEventListener('load', () => {
    try {
        console.log('Начинаем инициализацию игры...');
        game = new MobileSudokuTetris();
        window.game = game; // Делаем доступным глобально
        console.log('Игра инициализирована успешно');
        themeManager = new ThemeManager();
        console.log('Менеджер тем инициализирован');
    } catch (error) {
        console.error('Ошибка при инициализации игры:', error);
        alert('Ошибка при загрузке игры: ' + error.message);
    }
});