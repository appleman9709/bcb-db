
import { useEffect } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ImagePreloadProvider } from './contexts/ImagePreloadContext'
import { reminderProcessor } from './services/reminderProcessor'
import './utils/debugReminders' // Инициализация утилит отладки
import Dashboard from './pages/Dashboard'
import AuthPage from './pages/AuthPage'
import LoadingScreen from './components/LoadingScreen'

function AppContent() {
  const { family, member, initialized } = useAuth()
  const isAuthenticated = Boolean(family && member)

  // Запускаем обработчик напоминаний при загрузке приложения
  useEffect(() => {
    if (isAuthenticated) {
      reminderProcessor.start()
    }

    return () => {
      reminderProcessor.stop()
    }
  }, [isAuthenticated])

  if (!initialized) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <AuthPage />
  }

  return <Dashboard />
}

export default function App() {
  return (
    <ThemeProvider>
      <ImagePreloadProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ImagePreloadProvider>
    </ThemeProvider>
  )
}
