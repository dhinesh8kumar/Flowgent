import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsApi } from '../services/api'
import { Booking, BookingStatus } from '../types'
import { Card, Badge, Button, Select, Spinner, EmptyState, Modal } from '../components/ui'
import { CalendarCheck, Filter } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const NEXT_STATUSES: Partial<Record<BookingStatus, BookingStatus[]>> = {
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED', 'CANCELLED'],
}

export default function Bookings() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [selected, setSelected] = useState<Booking | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', statusFilter, dateFilter],
    queryFn: () => {
      const params: Record<string, string> = { limit: '50' }
      if (statusFilter) params.status = statusFilter
      if (dateFilter) params.date = dateFilter
      return bookingsApi.list(params).then(r => r.data.data)
    },
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      bookingsApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Booking updated')
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      setSelected(null)
    },
    onError: () => toast.error('Failed to update booking'),
  })

  const bookings: Booking[] = data?.bookings ?? []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900">Bookings</h1>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-surface-100 rounded-2xl px-3 py-2">
          <Filter className="w-4 h-4" />
          <span>{data?.pagination?.total ?? 0} total</span>
        </div>
      </div>

      {/* Filters */}
      <Card className="flex flex-wrap gap-3 p-4">
        <div className="w-40">
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="input w-44"
        />
        {(statusFilter || dateFilter) && (
          <Button variant="ghost" onClick={() => { setStatusFilter(''); setDateFilter('') }}>
            Clear filters
          </Button>
        )}
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner className="w-6 h-6" /></div>
        ) : bookings.length === 0 ? (
          <EmptyState icon={<CalendarCheck className="w-6 h-6" />} title="No bookings found" description="Try changing your filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  {['Ref', 'Customer', 'Qty', 'Date / Slot', 'Area', 'Source', 'Status', ''].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-slate-600 bg-surface-100 px-2 py-1 rounded-lg whitespace-nowrap">{b.bookingRef}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-800">{b.customer?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-slate-400">{b.customer?.whatsappPhone}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800 whitespace-nowrap">{b.quantityKL} KL</td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-700">{format(new Date(b.scheduledDate), 'd MMM yyyy')}</p>
                      {b.scheduledSlot && <p className="text-xs text-slate-400 capitalize">{b.scheduledSlot}</p>}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{b.locality ?? b.deliveryAddress?.slice(0, 20) ?? '—'}</td>
                    <td className="px-5 py-4"><Badge status={b.source} label={b.source === 'WHATSAPP' ? 'WhatsApp' : b.source} /></td>
                    <td className="px-5 py-4"><Badge status={b.status} /></td>
                    <td className="px-5 py-4">
                      {NEXT_STATUSES[b.status] && (
                        <Button variant="ghost" size="sm" onClick={() => setSelected(b)}>
                          Update
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Status update modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Update — ${selected?.bookingRef}`}>
        {selected && (
          <div className="space-y-4">
            <div className="bg-surface-50 rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer</span>
                <span className="font-medium">{selected.customer?.name ?? selected.customer?.whatsappPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quantity</span>
                <span className="font-medium">{selected.quantityKL} KL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-medium">{format(new Date(selected.scheduledDate), 'd MMM yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Area</span>
                <span className="font-medium">{selected.locality ?? '—'}</span>
              </div>
            </div>

            <p className="text-sm font-medium text-slate-700">Move to:</p>
            <div className="flex flex-col gap-2">
              {NEXT_STATUSES[selected.status]?.map((s) => (
                <Button
                  key={s}
                  variant={s === 'CANCELLED' ? 'danger' : 'primary'}
                  loading={updateStatus.isPending}
                  onClick={() => updateStatus.mutate({ id: selected.id, status: s })}
                  className="justify-center"
                >
                  Mark as {s.charAt(0) + s.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
