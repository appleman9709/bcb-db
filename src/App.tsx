
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ImagePreloadProvider } from './contexts/ImagePreloadContext'
import Dashboard from './pages/Dashboard'
import AuthPage from './pages/AuthPage'
import LoadingScreen from './components/LoadingScreen'
import { CriticalImagePreloader } from './lib/imagePreloader'
import ImagePreloader from './components/ImagePreloader'

function AppContent() {
  const { family, member, initialized } = useAuth()
  const isAuthenticated = Boolean(family && member)

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
          <CriticalImagePreloader />
          <ImagePreloader />
          <AppContent />
        </AuthProvider>
      </ImagePreloadProvider>
    </ThemeProvider>
  )
}
