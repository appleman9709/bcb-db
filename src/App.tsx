import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Dashboard from './pages/Dashboard'
import AuthPage from './pages/AuthPage'
import LoadingScreen from './components/LoadingScreen'
import Button from './components/Button'

function AppContent() {
  const { loading, isAuthenticated, membership, membershipError, signOut } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <AuthPage />
  }

  if (!membership) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="w-full max-w-xl space-y-6 rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl">
          <h1 className="text-3xl font-semibold">No family membership</h1>
          <p className="text-sm text-white/70">
            Your account is active, but it is not linked to a family in Supabase yet. Ask an existing parent to add you to their family or contact the project administrator.
          </p>
          {membershipError && (
            <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {membershipError}
            </div>
          )}
          <div className="flex justify-center">
            <Button variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    )
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
