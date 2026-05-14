import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Building2, Lock, Settings as SettingsIcon } from 'lucide-react'
import api, { tenantApi } from '../services/api'
import { Button, Card, Input } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', city: '' })
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [changingPassword, setChangingPassword] = useState(false)

  const { data: tenantData } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => tenantApi.me().then((response) => response.data.data),
  })

  useEffect(() => {
    if (tenantData) {
      setForm({
        name: tenantData.name ?? '',
        city: tenantData.city ?? '',
      })
    }
  }, [tenantData])

  const updateTenant = useMutation({
    mutationFn: () => tenantApi.update({ name: form.name, city: form.city }),
    onSuccess: () => {
      toast.success('Settings saved!')
      qc.invalidateQueries({ queryKey: ['tenant'] })
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const handlePasswordChange = async () => {
    if (passwordForm.next !== passwordForm.confirm) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordForm.next.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setChangingPassword(true)

    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      })
      toast.success('Password updated!')
      setPasswordForm({ current: '', next: '', confirm: '' })
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to update password')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-slate-900">Settings</h1>
      </div>

      <Card>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50">
            <Building2 className="h-4 w-4 text-brand-600" />
          </div>
          <h2 className="font-display font-semibold text-slate-800">Company Profile</h2>
        </div>

        <div className="space-y-4">
          <Input
            label="Company Name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Sri Balaji Waters"
          />
          <Input
            label="City"
            value={form.city}
            onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            placeholder="Hyderabad"
          />

          <div className="space-y-2 rounded-2xl bg-surface-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Plan</span>
              <span className="font-medium text-brand-600">{tenantData?.plan ?? '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Admin</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customers</span>
              <span className="font-medium">{tenantData?._count?.customers ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Bookings</span>
              <span className="font-medium">{tenantData?._count?.bookings ?? 0}</span>
            </div>
          </div>
        </div>
      </Card>

      <Button onClick={() => updateTenant.mutate()} loading={updateTenant.isPending} className="w-full justify-center">
        <SettingsIcon className="mr-2 h-4 w-4" /> Save Settings
      </Button>

      <Card>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50">
            <Lock className="h-4 w-4 text-slate-600" />
          </div>
          <h2 className="font-display font-semibold text-slate-800">Change Password</h2>
        </div>

        <div className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            placeholder="Your current password"
            value={passwordForm.current}
            onChange={(event) => setPasswordForm((current) => ({ ...current, current: event.target.value }))}
          />
          <Input
            label="New Password"
            type="password"
            placeholder="Min 8 characters"
            value={passwordForm.next}
            onChange={(event) => setPasswordForm((current) => ({ ...current, next: event.target.value }))}
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Repeat new password"
            value={passwordForm.confirm}
            onChange={(event) => setPasswordForm((current) => ({ ...current, confirm: event.target.value }))}
          />
          <Button
            onClick={handlePasswordChange}
            loading={changingPassword}
            variant="secondary"
            className="w-full justify-center"
          >
            Update Password
          </Button>
        </div>
      </Card>
    </div>
  )
}
