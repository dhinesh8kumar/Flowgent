import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import type { ElementType } from 'react'
import { CalendarCheck, IndianRupee, TrendingUp, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { bookingsApi, dashboardApi } from '../services/api'
import { Booking, DashboardStats } from '../types'
import { Badge, Card, Spinner } from '../components/ui'
import { BrandMark } from '../components/brand/BrandMark'

const StatCard = ({ label, value, icon: Icon, color, sub }: {
  label: string
  value: string | number
  icon: ElementType
  color: string
  sub?: string
}) => (
  <Card className="flex items-start justify-between p-4 sm:p-6">
    <div className="min-w-0">
      <p className="mb-1 text-xs sm:text-sm font-medium text-slate-500">{label}</p>
      <p className="font-display text-2xl sm:text-3xl font-bold text-slate-900 break-words">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
    <div className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-2xl flex-shrink-0 ${color}`}>
      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
    </div>
  </Card>
)

export default function Dashboard() {
  const { user } = useAuth()

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => dashboardApi.stats().then((response) => response.data.data as DashboardStats),
    refetchInterval: 30000,
  })

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', 'recent'],
    queryFn: () => bookingsApi.list({ limit: '8' }).then((response) => response.data.data),
  })

  const bookings: Booking[] = bookingsData?.bookings ?? []
  const stats = statsData

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <div className="hidden items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-2 sm:flex">
          <BrandMark className="h-6 w-6 border-brand-100 bg-white" iconClassName="h-3 w-3" />
          <span className="text-sm font-medium text-brand-700">Zevio Live</span>
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
        </div>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="h-24 sm:h-28 bg-surface-100 animate-pulse">
              <div />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Today's Bookings" value={stats?.todayBookings ?? 0} icon={CalendarCheck} color="bg-brand-50 text-brand-600" />
          <StatCard label="Pending Approval" value={stats?.pendingBookings ?? 0} icon={TrendingUp} color="bg-amber-50 text-amber-600" />
          <StatCard label="Revenue This Month" value={`INR ${stats?.monthRevenue ?? 0}`} icon={IndianRupee} color="bg-green-50 text-green-600" />
          <StatCard label="Total Customers" value={stats?.totalCustomers ?? 0} icon={Users} color="bg-purple-50 text-purple-600" />
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-surface-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50">
              <CalendarCheck className="h-4 w-4 text-brand-600" />
            </div>
            <h2 className="font-display font-semibold text-slate-800">Recent Bookings</h2>
          </div>
          <a href="/bookings" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</a>
        </div>

        {bookingsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarCheck className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-500">No bookings yet</p>
            <p className="text-sm text-slate-400">Bookings from WhatsApp will appear here</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {bookings.map((booking) => (
                <Card key={booking.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-slate-500">{booking.bookingRef}</p>
                      <p className="mt-2 text-sm font-medium text-slate-800">{booking.customer?.name ?? 'Unknown'}</p>
                      <p className="mt-1 text-xs text-brand-600">{booking.serviceName}</p>
                    </div>
                    <Badge status={booking.status} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Amount</p>
                      <p className="font-semibold text-slate-800">{booking.totalAmount != null ? `INR ${booking.totalAmount}` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Date</p>
                      <p className="text-slate-700">{format(new Date(booking.scheduledDate), 'd MMM')}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-slate-400">Address</p>
                    <p className="text-sm text-slate-700">{booking.locality ?? '-'}</p>
                    <p className="mt-1 text-xs text-slate-400 break-words">{booking.deliveryAddress ?? '-'}</p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-100">
                    {['Ref', 'Customer / Service', 'Amount', 'Date', 'Address', 'Status'].map((heading) => (
                      <th key={heading} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-50">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-surface-100 px-2 py-1 font-mono text-xs text-slate-600">{booking.bookingRef}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-800">{booking.customer?.name ?? 'Unknown'}</p>
                        <p className="mt-1 text-xs text-brand-600">{booking.serviceName}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                        {booking.totalAmount != null ? `INR ${booking.totalAmount}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {format(new Date(booking.scheduledDate), 'd MMM')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <p>{booking.locality ?? '-'}</p>
                        <p className="mt-1 max-w-[220px] truncate text-xs text-slate-400">{booking.deliveryAddress ?? '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge status={booking.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
