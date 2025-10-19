/**
 * Утилиты для управления градиентами через CSS переменные
 * Это позволяет обновлять визуальные эффекты без перерисовки React компонентов
 */

// Функция для расчета прогресса градиента на основе времени
export const calculateGradientProgress = (timestamp: string, intervalHours: number): number => {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInMinutes = Math.max(0, Math.floor((now.getTime() - time.getTime()) / (1000 * 60)))
  const diffInHours = diffInMinutes / 60
  
  // Логика градиентов:
  // 0-95% интервала: зеленый (0-0.2)
  // 95-100% интервала: желто-оранжевый (0.2-0.8)
  // >100% интервала: красный (0.8-1.0)
  const greenThreshold = intervalHours * 0.95
  const yellowThreshold = intervalHours
  
  let progress
  if (diffInHours <= greenThreshold) {
    // Зеленый диапазон - плавно от 0 до 0.2
    progress = (diffInHours / greenThreshold) * 0.2
  } else if (diffInHours <= yellowThreshold) {
    // Желто-оранжевый диапазон - от 0.2 до 0.8
    const localProgress = (diffInHours - greenThreshold) / (yellowThreshold - greenThreshold)
    progress = 0.2 + localProgress * 0.6
  } else {
    // Красный диапазон - от 0.8 до 1.0 (превышение интервала)
    const localProgress = Math.min(1, (diffInHours - yellowThreshold) / (intervalHours * 0.5))
    progress = 0.8 + localProgress * 0.2
  }
  
  return Math.min(1, Math.max(0, progress))
}

// Функция для получения цветов градиента на основе прогресса
export const getGradientColors = (progress: number): { start: string; end: string } => {
  if (progress <= 0.2) {
    // Зеленый диапазон
    const intensity = progress / 0.2
    const r = Math.round(34 + (59 - 34) * intensity)
    const g = Math.round(197 + (130 - 197) * intensity)
    const b = Math.round(94 + (246 - 94) * intensity)
    
    return {
      start: `rgb(${r}, ${g}, ${b})`,
      end: `rgb(${Math.round(r * 0.8)}, ${Math.round(g * 0.7)}, ${Math.round(b * 0.6)})`
    }
  } else if (progress <= 0.8) {
    // Желто-оранжевый диапазон
    const intensity = (progress - 0.2) / 0.6
    const r = Math.round(59 + (249 - 59) * intensity)
    const g = Math.round(130 + (115 - 130) * intensity)
    const b = Math.round(246 + (22 - 246) * intensity)
    
    return {
      start: `rgb(${r}, ${g}, ${b})`,
      end: `rgb(${Math.round(r * 0.8)}, ${Math.round(g * 0.7)}, ${Math.round(b * 0.6)})`
    }
  } else {
    // Красный диапазон
    const intensity = (progress - 0.8) / 0.2
    const r = Math.round(249 + (239 - 249) * intensity)
    const g = Math.round(115 + (68 - 115) * intensity)
    const b = Math.round(22 + (68 - 22) * intensity)
    
    return {
      start: `rgb(${r}, ${g}, ${b})`,
      end: `rgb(${Math.round(r * 0.8)}, ${Math.round(g * 0.7)}, ${Math.round(b * 0.6)})`
    }
  }
}

// Функция для обновления CSS переменных градиента
export const updateGradientCSS = (timestamp: string, intervalHours: number, type: 'feeding' | 'diaper' | 'bath'): void => {
  const progress = calculateGradientProgress(timestamp, intervalHours)
  const colors = getGradientColors(progress)
  
  // Обновляем CSS переменные без перерисовки React компонентов
  document.documentElement.style.setProperty(`--gradient-${type}-progress`, progress.toString())
  document.documentElement.style.setProperty(`--gradient-${type}-color-start`, colors.start)
  document.documentElement.style.setProperty(`--gradient-${type}-color-end`, colors.end)
}

// Функция для получения текстового сообщения на основе прогресса
export const getStatusMessage = (progress: number, type: 'feeding' | 'diaper' | 'bath'): string => {
  const messages = {
    feeding: {
      good: "Все хорошо",
      warning: "Скоро пора кормить",
      urgent: "Пора кормить!"
    },
    diaper: {
      good: "Подгузник чистый",
      warning: "Скоро пора сменить",
      urgent: "Пора сменить подгузник!"
    },
    bath: {
      good: "Купание недавно",
      warning: "Скоро пора купать",
      urgent: "Пора искупать малыша!"
    }
  }
  
  if (progress < 0.5) {
    return messages[type].good
  } else if (progress < 0.8) {
    return messages[type].warning
  } else {
    return messages[type].urgent
  }
}

// Функция для инициализации таймера обновления градиентов
export const initGradientTimer = (
  feedingTimestamp: string | null,
  diaperTimestamp: string | null,
  bathTimestamp: string | null,
  feedingInterval: number,
  diaperInterval: number,
  bathInterval: number
): (() => void) => {
  const updateGradients = () => {
    if (feedingTimestamp) {
      updateGradientCSS(feedingTimestamp, feedingInterval, 'feeding')
    }
    if (diaperTimestamp) {
      updateGradientCSS(diaperTimestamp, diaperInterval, 'diaper')
    }
    if (bathTimestamp) {
      updateGradientCSS(bathTimestamp, bathInterval * 24, 'bath')
    }
  }
  
  // Обновляем сразу
  updateGradients()
  
  // Устанавливаем таймер на каждую минуту
  const intervalId = setInterval(updateGradients, 60000)
  
  // Возвращаем функцию для очистки таймера
  return () => clearInterval(intervalId)
}
