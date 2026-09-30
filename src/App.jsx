import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { seedDatabase } from './lib/seed'
import AppShell from './components/AppShell'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  useEffect(() => {
    seedDatabase()
  }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
