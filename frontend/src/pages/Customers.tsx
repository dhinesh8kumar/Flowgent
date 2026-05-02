import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { Customer } from '../types'
import { Card, Badge, Spinner, EmptyState } from '../components/ui'
import { Users, Phone, MapPin } from 'lucide-react'
import { format } from 'date-fns'

export default function Customers() {
  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then(r => r.data.data as Customer[]).catch(() => [] as Customer[]),
  })

  const customers = data ?? []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900">Customers</h1>
        <div className="bg-surface-100 rounded-2xl px-4 py-2 text-sm text-slate-500">
          {customers.length} total
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="w-6 h-6" /></div>
      ) : customers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="No customers yet"
            description="Customers appear here automatically when they message via WhatsApp"
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                {['Customer', 'WhatsApp', 'Area', 'Bookings', 'Status', 'Since'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-700 font-semibold text-sm">
                          {(c.name ?? c.whatsappPhone).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-800">{c.name ?? 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {c.whatsappPhone}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {c.locality ? (
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {c.locality}
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-display font-bold text-slate-900">{c.totalBookings}</span>
                    <span className="text-slate-400 text-sm ml-1">orders</span>
                  </td>
                  <td className="px-5 py-4">
                    <Badge status={c.isBlocked ? 'CANCELLED' : 'DELIVERED'} label={c.isBlocked ? 'Blocked' : 'Active'} />
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-400">
                    {format(new Date(c.createdAt), 'd MMM yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
