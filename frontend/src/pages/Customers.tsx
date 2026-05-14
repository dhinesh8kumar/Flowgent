import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { Customer } from '../types'
import { Card, Badge, Spinner, EmptyState } from '../components/ui'
import { Users, Phone, MapPin } from 'lucide-react'
import { format } from 'date-fns'

export default function Customers() {
  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then((response) => response.data.data as Customer[]).catch(() => [] as Customer[]),
  })

  const customers = data ?? []

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900">Customers</h1>
        <div className="w-fit rounded-2xl bg-surface-100 px-4 py-2 text-sm text-slate-500">
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
        <>
          <div className="grid gap-3 md:hidden">
            {customers.map((customer) => (
              <Card key={customer.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100">
                      <span className="text-brand-700 font-semibold text-sm">
                        {(customer.name ?? customer.whatsappPhone).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{customer.name ?? 'Unknown'}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        <span className="break-all">{customer.whatsappPhone}</span>
                      </div>
                    </div>
                  </div>
                  <Badge status={customer.isBlocked ? 'CANCELLED' : 'DELIVERED'} label={customer.isBlocked ? 'Blocked' : 'Active'} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Area</p>
                    {customer.locality ? (
                      <div className="mt-1 flex items-center gap-1.5 text-slate-700">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        <span>{customer.locality}</span>
                      </div>
                    ) : (
                      <p className="text-slate-400">-</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Bookings</p>
                    <p className="font-display text-xl font-bold text-slate-900">{customer.totalBookings}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs text-slate-400">Customer since</p>
                  <p className="text-sm text-slate-700">{format(new Date(customer.createdAt), 'd MMM yyyy')}</p>
                </div>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden p-0 md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  {['Customer', 'WhatsApp', 'Area', 'Bookings', 'Status', 'Since'].map((heading) => (
                    <th key={heading} className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-brand-700 font-semibold text-sm">
                            {(customer.name ?? customer.whatsappPhone).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-slate-800">{customer.name ?? 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {customer.whatsappPhone}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {customer.locality ? (
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {customer.locality}
                        </div>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-display font-bold text-slate-900">{customer.totalBookings}</span>
                      <span className="text-slate-400 text-sm ml-1">orders</span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge status={customer.isBlocked ? 'CANCELLED' : 'DELIVERED'} label={customer.isBlocked ? 'Blocked' : 'Active'} />
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400">
                      {format(new Date(customer.createdAt), 'd MMM yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
