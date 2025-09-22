import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Dashboard from './pages/Dashboard'
import AuthPage from './pages/AuthPage'

function AppContent() {
  const { family, member } = useAuth()
  const isAuthenticated = Boolean(family && member)

  if (!isAuthenticated) {
    return <AuthPage />
  }

  return <Dashboard />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}

