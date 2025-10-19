import { useState, useCallback, useEffect } from 'react'

interface AnimationLimiterOptions {
  maxConcurrent?: number
  enableOnMobile?: boolean
}

/**
 * Хук для управления количеством одновременных анимаций
 * Помогает снизить графическую нагрузку на слабых устройствах
 */
export const useAnimationLimiter = (options: AnimationLimiterOptions = {}) => {
  const { maxConcurrent = 3, enableOnMobile = false } = options
  const [activeAnimations, setActiveAnimations] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  
  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  const canAnimate = useCallback(() => {
    // На мобильных устройствах ограничиваем анимации
    if (isMobile && !enableOnMobile) {
      return activeAnimations < 1
    }
    return activeAnimations < maxConcurrent
  }, [activeAnimations, maxConcurrent, isMobile, enableOnMobile])
  
  const startAnimation = useCallback(() => {
    if (canAnimate()) {
      setActiveAnimations(prev => prev + 1)
      return true
    }
    return false
  }, [canAnimate])
  
  const endAnimation = useCallback(() => {
    setActiveAnimations(prev => Math.max(0, prev - 1))
  }, [])
  
  const resetAnimations = useCallback(() => {
    setActiveAnimations(0)
  }, [])
  
  return { 
    canAnimate, 
    startAnimation, 
    endAnimation, 
    resetAnimations,
    activeAnimations,
    isMobile
  }
}

/**
 * Хук для управления анимациями монет
 * Ограничивает количество одновременно падающих монет
 */
export const useCoinAnimationLimiter = () => {
  const { canAnimate, startAnimation, endAnimation } = useAnimationLimiter({
    maxConcurrent: 3, // Максимум 3 монеты одновременно
    enableOnMobile: false // На мобильных отключаем анимации монет
  })
  
  const animateCoin = useCallback((callback: () => void) => {
    if (canAnimate()) {
      startAnimation()
      callback()
      
      // Автоматически завершаем анимацию через 1 секунду
      setTimeout(() => {
        endAnimation()
      }, 1000)
      
      return true
    }
    return false
  }, [canAnimate, startAnimation, endAnimation])
  
  return { animateCoin, canAnimate }
}

/**
 * Хук для управления анимациями загрузки
 * Оптимизирует анимации спиннеров и индикаторов
 */
export const useLoadingAnimationLimiter = () => {
  const { canAnimate, startAnimation, endAnimation } = useAnimationLimiter({
    maxConcurrent: 1, // Только один спиннер одновременно
    enableOnMobile: true // Спиннеры нужны на мобильных
  })
  
  const animateLoading = useCallback((callback: () => void) => {
    if (canAnimate()) {
      startAnimation()
      callback()
      return true
    }
    return false
  }, [canAnimate, startAnimation])
  
  const stopLoading = useCallback(() => {
    endAnimation()
  }, [endAnimation])
  
  return { animateLoading, stopLoading, canAnimate }
}
