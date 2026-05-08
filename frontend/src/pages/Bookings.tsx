import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, Filter } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Badge, Button, Card, EmptyState, Modal, Select, Spinner } from '../components/ui'
import { bookingsApi } from '../services/api'
import { Booking, BookingStatus } from '../types'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const NEXT_STATUSES: Partial<Record<BookingStatus, BookingStatus[]>> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['DISPATCHED', 'CANCELLED'],
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
      return bookingsApi.list(params).then((response) => response.data.data)
    },
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => bookingsApi.updateStatus(id, status),
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
        <div className="flex items-center gap-2 rounded-2xl bg-surface-100 px-3 py-2 text-sm text-slate-500">
          <Filter className="h-4 w-4" />
          <span>{data?.pagination?.total ?? 0} total</span>
        </div>
      </div>

      <Card className="flex flex-wrap gap-3 p-4">
        <div className="w-40">
          <Select options={STATUS_OPTIONS} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          className="input w-44"
        />
        {(statusFilter || dateFilter) && (
          <Button variant="ghost" onClick={() => { setStatusFilter(''); setDateFilter('') }}>
            Clear filters
          </Button>
        )}
      </Card>

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
                  {['Ref', 'Customer / Service', 'Amount', 'Date / Slot', 'Address', 'Source', 'Status', ''].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="whitespace-nowrap rounded-lg bg-surface-100 px-2 py-1 font-mono text-xs text-slate-600">{booking.bookingRef}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-800">{booking.customer?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-slate-400">{booking.customer?.whatsappPhone}</p>
                      <p className="mt-1 text-xs text-brand-600">{booking.serviceName}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="whitespace-nowrap text-sm font-semibold text-slate-800">
                        {booking.totalAmount != null ? `INR ${booking.totalAmount}` : '—'}
                      </p>
                      <p className="whitespace-nowrap text-xs text-slate-400">
                        {booking.quantity != null ? `${booking.quantity}${booking.unit ? ` ${booking.unit}` : ''}` : 'Service booking'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-700">{format(new Date(booking.scheduledDate), 'd MMM yyyy')}</p>
                      {booking.scheduledSlot && <p className="text-xs capitalize text-slate-400">{booking.scheduledSlot}</p>}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      <p>{booking.locality ?? '—'}</p>
                      <p className="mt-1 max-w-[260px] truncate text-xs text-slate-400">{booking.deliveryAddress ?? '—'}</p>
                    </td>
                    <td className="px-5 py-4"><Badge status={booking.source} label={booking.source === 'WHATSAPP' ? 'WhatsApp' : booking.source} /></td>
                    <td className="px-5 py-4"><Badge status={booking.status} /></td>
                    <td className="px-5 py-4">
                      {NEXT_STATUSES[booking.status] && (
                        <Button variant="ghost" size="sm" onClick={() => setSelected(booking)}>
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Update - ${selected?.bookingRef}`}>
        {selected && (
          <div className="space-y-4">
            <div className="space-y-2 rounded-2xl bg-surface-50 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Service</span>
                <span className="text-right font-medium">{selected.serviceName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Customer</span>
                <span className="text-right font-medium">{selected.customer?.name ?? selected.customer?.whatsappPhone}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Amount</span>
                <span className="text-right font-medium">{selected.totalAmount != null ? `INR ${selected.totalAmount}` : '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Quantity</span>
                <span className="text-right font-medium">
                  {selected.quantity != null ? `${selected.quantity}${selected.unit ? ` ${selected.unit}` : ''}` : 'Service booking'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Date</span>
                <span className="text-right font-medium">{format(new Date(selected.scheduledDate), 'd MMM yyyy')}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Area</span>
                <span className="text-right font-medium">{selected.locality ?? '—'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500">Address</span>
                <p className="break-words font-medium text-slate-800">{selected.deliveryAddress ?? '—'}</p>
              </div>
            </div>

            <p className="text-sm font-medium text-slate-700">Move to:</p>
            <div className="flex flex-col gap-2">
              {NEXT_STATUSES[selected.status]?.map((status) => (
                <Button
                  key={status}
                  variant={status === 'CANCELLED' ? 'danger' : 'primary'}
                  loading={updateStatus.isPending}
                  onClick={() => updateStatus.mutate({ id: selected.id, status })}
                  className="justify-center"
                >
                  Mark as {status.charAt(0) + status.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
