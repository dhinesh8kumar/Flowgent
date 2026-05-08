import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Layout } from './components/layout/Layout'
import { Spinner } from './components/ui'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Bookings from './pages/Bookings'
import Customers from './pages/Customers'
import Services from './pages/Services'
import Settings from './pages/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

// Protected route wrapper
const Protected = ({ children }: { children: React.ReactNode }) => {
  const { token, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="w-8 h-8" />
          <p className="text-sm text-slate-400">Loading Flowgent...</p>
        </div>
      </div>
    )
  }

  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

const AppRoutes = () => {
  const { token } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />

      <Route path="/" element={
        <Protected>
          <Layout>
            <Dashboard />
          </Layout>
        </Protected>
      } />

      <Route path="/bookings" element={
        <Protected>
          <Layout>
            <Bookings />
          </Layout>
        </Protected>
      } />

      

      <Route path="/customers" element={
        <Protected>
          <Layout>
            <Customers />
          </Layout>
        </Protected>
      } />

      <Route path="/services" element={
        <Protected>
          <Layout>
            <Services />
          </Layout>
        </Protected>
      } />

      <Route path="/settings" element={
        <Protected>
          <Layout>
            <Settings />
          </Layout>
        </Protected>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: '16px',
                background: '#fff',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px -4px rgba(0,0,0,0.1)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
