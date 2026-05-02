import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantApi } from '../services/api'
import { Card, Button, Input } from '../components/ui'
import { Settings as SettingsIcon, Wifi, WifiOff, Building2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', city: '', whatsappPhoneId: '', whatsappToken: '' })

  const { data: tenantData } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => tenantApi.me().then(r => r.data.data),
  })

  useEffect(() => {
    if (tenantData) {
      setForm({
        name: tenantData.name ?? '',
        city: tenantData.city ?? '',
        whatsappPhoneId: tenantData.whatsappPhoneId ?? '',
        whatsappToken: '',
      })
    }
  }, [tenantData])

  const updateTenant = useMutation({
    mutationFn: () => tenantApi.update({ name: form.name, city: form.city, whatsappPhoneId: form.whatsappPhoneId, ...(form.whatsappToken && { whatsappToken: form.whatsappToken }) }),
    onSuccess: () => { toast.success('Settings saved!'); qc.invalidateQueries({ queryKey: ['tenant'] }) },
    onError: () => toast.error('Failed to save settings'),
  })

  const waConnected = !!tenantData?.whatsappPhoneId

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-slate-900">Settings</h1>
      </div>

      {/* Company profile */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-2xl bg-brand-50 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-brand-600" />
          </div>
          <h2 className="font-display font-semibold text-slate-800">Company Profile</h2>
        </div>
        <div className="space-y-4">
          <Input label="Company Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sri Balaji Waters" />
          <Input label="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Hyderabad" />
          <div className="bg-surface-50 rounded-2xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Plan</span><span className="font-medium text-brand-600">{tenantData?.plan ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Admin</span><span className="font-medium">{user?.email}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Customers</span><span className="font-medium">{tenantData?._count?.customers ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Total Bookings</span><span className="font-medium">{tenantData?._count?.bookings ?? 0}</span></div>
          </div>
        </div>
      </Card>

      {/* WhatsApp */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${waConnected ? 'bg-green-50' : 'bg-slate-100'}`}>
              {waConnected ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-slate-400" />}
            </div>
            <h2 className="font-display font-semibold text-slate-800">WhatsApp Connection</h2>
          </div>
          <span className={`badge ${waConnected ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${waConnected ? 'bg-green-500' : 'bg-slate-400'}`} />
            {waConnected ? 'Connected' : 'Not connected'}
          </span>
        </div>

        <div className="space-y-4">
          <Input
            label="Phone Number ID"
            value={form.whatsappPhoneId}
            onChange={e => setForm(f => ({ ...f, whatsappPhoneId: e.target.value }))}
            placeholder="From Meta Developer Console"
          />
          <Input
            label="Access Token (leave blank to keep existing)"
            type="password"
            value={form.whatsappToken}
            onChange={e => setForm(f => ({ ...f, whatsappToken: e.target.value }))}
            placeholder="EAAxxxx..."
          />
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-700">
            <strong>Webhook URL:</strong>
            <code className="block mt-1 text-xs bg-amber-100 rounded-xl px-3 py-2 font-mono break-all">
              {window.location.protocol}//{window.location.hostname.replace('5173', '3000')}/webhook
            </code>
            <p className="mt-2 text-xs">Set this in your Meta Developer Console → WhatsApp → Configuration</p>
          </div>
        </div>
      </Card>

      <Button onClick={() => updateTenant.mutate()} loading={updateTenant.isPending} className="w-full justify-center">
        <SettingsIcon className="w-4 h-4 mr-2" /> Save Settings
      </Button>
    </div>
  )
}
