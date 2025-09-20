import { ThemeProvider } from './contexts/ThemeContext'
import { NotificationProvider } from './contexts/NotificationContext'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <Dashboard />
      </NotificationProvider>
    </ThemeProvider>
  )
}
