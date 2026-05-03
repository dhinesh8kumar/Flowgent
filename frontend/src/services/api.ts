import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
})

// Auto-attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ── Typed API helpers ──────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
}

export const dashboardApi = {
  stats: () => api.get('/bookings/stats/summary'),
}

export const bookingsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/bookings', { params }),
  get: (id: string) => api.get(`/bookings/${id}`),
  updateStatus: (id: string, status: string, driverName?: string, driverPhone?: string) =>
    api.patch(`/bookings/${id}/status`, { status, driverName, driverPhone }),
}



export const customersApi = {
  list: () => api.get('/customers'),
}

export const tenantApi = {
  me: () => api.get('/tenants/me'),
  update: (data: Record<string, unknown>) => api.patch('/tenants/me', data),
}
