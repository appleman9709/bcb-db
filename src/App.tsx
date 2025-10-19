
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ImagePreloadProvider } from './contexts/ImagePreloadContext'
import Dashboard from './pages/Dashboard'
import AuthPage from './pages/AuthPage'
import LoadingScreen from './components/LoadingScreen'

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
          <AppContent />
        </AuthProvider>
      </ImagePreloadProvider>
    </ThemeProvider>
  )
}
