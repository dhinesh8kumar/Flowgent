import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tankersApi } from '../services/api'
import { Tanker } from '../types'
import { Card, Badge, Button, Input, Modal, Spinner, EmptyState } from '../components/ui'
import { Truck, Plus, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

const StatusDot = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    IDLE: 'bg-green-400', DISPATCHED: 'bg-blue-400',
    EN_ROUTE: 'bg-purple-400', DELIVERING: 'bg-amber-400', MAINTENANCE: 'bg-red-400',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] ?? 'bg-slate-400'}`} />
}

export default function Tankers() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ vehicleNo: '', capacityKL: '', driverName: '', driverPhone: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['tankers'],
    queryFn: () => tankersApi.list().then(r => r.data.data as Tanker[]),
  })

  const addTanker = useMutation({
    mutationFn: () => tankersApi.create({ ...form, capacityKL: Number(form.capacityKL) }),
    onSuccess: () => {
      toast.success('Tanker added!')
      qc.invalidateQueries({ queryKey: ['tankers'] })
      setShowAdd(false)
      setForm({ vehicleNo: '', capacityKL: '', driverName: '', driverPhone: '' })
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to add tanker'),
  })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.vehicleNo) e.vehicleNo = 'Vehicle number required'
    if (!form.capacityKL || isNaN(Number(form.capacityKL))) e.capacityKL = 'Valid capacity required'
    if (!form.driverName) e.driverName = 'Driver name required'
    if (!form.driverPhone || form.driverPhone.length < 10) e.driverPhone = 'Valid phone required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => { if (validate()) addTanker.mutate() }

  const tankers = data ?? []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900">Tankers</h1>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Tanker
        </Button>
      </div>

      {/* Fleet summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: tankers.length, color: 'text-slate-900' },
          { label: 'Available', value: tankers.filter(t => t.status === 'IDLE').length, color: 'text-green-600' },
          { label: 'Dispatched', value: tankers.filter(t => ['DISPATCHED','EN_ROUTE','DELIVERING'].includes(t.status)).length, color: 'text-blue-600' },
          { label: 'Maintenance', value: tankers.filter(t => t.status === 'MAINTENANCE').length, color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="text-center py-4">
            <p className={`font-display text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* Tanker cards */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="w-6 h-6" /></div>
      ) : tankers.length === 0 ? (
        <Card>
          <EmptyState icon={<Truck className="w-6 h-6" />} title="No tankers yet" description="Add your first tanker to get started" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tankers.map((t) => (
            <Card key={t.id} className="hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-slate-900">{t.vehicleNo}</p>
                    <p className="text-xs text-slate-400">{t.capacityKL} KL capacity</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusDot status={t.status} />
                  <Badge status={t.status} />
                </div>
              </div>

              <div className="bg-surface-50 rounded-2xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
                    <span className="text-xs">👤</span>
                  </div>
                  <span className="text-slate-700 font-medium">{t.driverName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
                    <Phone className="w-3 h-3 text-slate-400" />
                  </div>
                  <span className="text-slate-500">{t.driverPhone}</span>
                </div>
              </div>

              {t._count && (
                <p className="text-xs text-slate-400 mt-3">{t._count.bookings} total bookings</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add tanker modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Tanker">
        <div className="space-y-4">
          <Input label="Vehicle Number" placeholder="TS09EA1234" value={form.vehicleNo}
            onChange={e => setForm(f => ({ ...f, vehicleNo: e.target.value.toUpperCase() }))}
            error={errors.vehicleNo} />
          <Input label="Capacity (KL)" type="number" placeholder="10" value={form.capacityKL}
            onChange={e => setForm(f => ({ ...f, capacityKL: e.target.value }))}
            error={errors.capacityKL} />
          <Input label="Driver Name" placeholder="Ravi Kumar" value={form.driverName}
            onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))}
            error={errors.driverName} />
          <Input label="Driver Phone" type="tel" placeholder="9876543210" value={form.driverPhone}
            onChange={e => setForm(f => ({ ...f, driverPhone: e.target.value }))}
            error={errors.driverPhone} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)} className="flex-1 justify-center">Cancel</Button>
            <Button onClick={handleSubmit} loading={addTanker.isPending} className="flex-1 justify-center">Add Tanker</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
