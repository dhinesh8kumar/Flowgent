import { useQuery } from '@tanstack/react-query'
import { dashboardApi, bookingsApi } from '../services/api'
import { DashboardStats, Booking } from '../types'
import { Card, Badge, Spinner } from '../components/ui'
import { CalendarCheck, Truck, IndianRupee, Users, TrendingUp, Droplets } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'

const StatCard = ({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: React.ElementType
  color: string; sub?: string
}) => (
  <Card className="flex items-start justify-between">
    <div>
      <p className="text-sm text-slate-500 font-medium mb-1">{label}</p>
      <p className="font-display text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
  </Card>
)

export default function Dashboard() {
  const { user } = useAuth()

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => dashboardApi.stats().then(r => r.data.data as DashboardStats),
    refetchInterval: 30000,
  })

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', 'recent'],
    queryFn: () => bookingsApi.list({ limit: '8' }).then(r => r.data.data),
  })

  const bookings: Booking[] = bookingsData?.bookings ?? []
  const stats = statsData

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-2xl px-4 py-2">
          <Droplets className="w-4 h-4 text-brand-500" />
          <span className="text-sm font-medium text-brand-700">Live</span>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>
      </div>

      {/* Stat cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-28 bg-surface-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Today's Bookings"
            value={stats?.todayBookings ?? 0}
            icon={CalendarCheck}
            color="bg-brand-50 text-brand-600"
            sub="scheduled today"
          />
          <StatCard
            label="Pending"
            value={stats?.pendingBookings ?? 0}
            icon={TrendingUp}
            color="bg-amber-50 text-amber-600"
            sub="need confirmation"
          />
          <StatCard
            label="Revenue"
            value={`₹${((stats?.totalRevenue ?? 0) / 1000).toFixed(1)}k`}
            icon={IndianRupee}
            color="bg-green-50 text-green-600"
            sub="total delivered"
          />
          <StatCard
            label="Customers"
            value={stats?.totalCustomers ?? 0}
            icon={Users}
            color="bg-purple-50 text-purple-600"
            sub="via WhatsApp"
          />
        </div>
      )}

      {/* Recent bookings */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4 text-brand-600" />
            </div>
            <h2 className="font-display font-semibold text-slate-800">Recent Bookings</h2>
          </div>
          <a href="/bookings" className="text-sm text-brand-600 hover:text-brand-700 font-medium">View all →</a>
        </div>

        {bookingsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="w-6 h-6" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Truck className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No bookings yet</p>
            <p className="text-slate-400 text-sm">Bookings from WhatsApp will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  {['Ref', 'Customer', 'Quantity', 'Date', 'Area', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-600 bg-surface-100 px-2 py-1 rounded-lg">{b.bookingRef}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-800">{b.customer?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-slate-400">{b.customer?.whatsappPhone}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-medium">{b.quantityKL} KL</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {format(new Date(b.scheduledDate), 'd MMM')}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{b.locality ?? '—'}</td>
                    <td className="px-6 py-4"><Badge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
