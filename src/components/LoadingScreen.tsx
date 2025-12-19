import React from 'react'

const SPIN_DURATION = '1.2s'

const LoadingScreen = React.memo(function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="relative flex h-32 w-32 items-center justify-center mt-4">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-200" />
        <div
          className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
          style={{ animationDuration: SPIN_DURATION }}
        />
        <img
          src="/icons/baby.png"
          alt="Малыш"
          loading="lazy"
          className="relative z-10 h-24 w-24 animate-pulse object-contain"
        />
      </div>
    </div>
  )
})

export default LoadingScreen

