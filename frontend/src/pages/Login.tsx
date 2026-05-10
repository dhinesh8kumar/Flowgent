import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock } from 'lucide-react'
import { Button, Input } from '../components/ui'
import toast from 'react-hot-toast'
import { BrandMark } from '../components/brand/BrandMark'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@sribalaji.com')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/')
    } catch {
      setError('Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-50 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-100 opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-brand-200 opacity-30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mb-4 inline-flex">
            <BrandMark className="h-14 w-14" iconClassName="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Zevio</h1>
          <p className="text-slate-500 text-sm mt-1">AI booking operations for service businesses</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="font-display text-xl font-semibold text-slate-800 mb-6">Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-11"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-11"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full justify-center">
              Sign in to Zevio
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Demo: admin@sribalaji.com / admin123
          </p>
        </div>
      </div>
    </div>
  )
}
