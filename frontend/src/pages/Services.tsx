import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card, EmptyState, Input, Spinner } from '../components/ui'
import { Service, TenantContext } from '../types'
import { servicesApi } from '../services/api'

type ServiceFormState = {
  serviceName: string
  basePrice: string
}

const DEFAULT_FORM: ServiceFormState = {
  serviceName: '',
  basePrice: '',
}

const toFormState = (service: Service): ServiceFormState => ({
  serviceName: service.serviceName,
  basePrice: String(service.basePrice),
})

const toPayload = (form: ServiceFormState) => ({
  serviceName: form.serviceName.trim(),
  basePrice: Number(form.basePrice),
})

export default function Services() {
  const qc = useQueryClient()
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [form, setForm] = useState<ServiceFormState>(DEFAULT_FORM)
  const [context, setContext] = useState('')

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.list().then((response) => response.data.data as Service[]),
  })

  const { data: tenantContextData } = useQuery({
    queryKey: ['tenant-context'],
    queryFn: () => servicesApi.getContext().then((response) => response.data.data as TenantContext),
  })

  useEffect(() => {
    setContext(tenantContextData?.context ?? '')
  }, [tenantContextData])

  const saveService = useMutation({
    mutationFn: () => {
      const payload = toPayload(form)
      return selectedService
        ? servicesApi.update(selectedService.id, payload)
        : servicesApi.create(payload)
    },
    onSuccess: () => {
      toast.success(selectedService ? 'Service updated' : 'Service created')
      qc.invalidateQueries({ queryKey: ['services'] })
      setSelectedService(null)
      setForm(DEFAULT_FORM)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error ?? 'Failed to save service')
    },
  })

  const deleteService = useMutation({
    mutationFn: (id: string) => servicesApi.remove(id),
    onSuccess: () => {
      toast.success('Service deleted')
      qc.invalidateQueries({ queryKey: ['services'] })
      if (selectedService) {
        setSelectedService(null)
        setForm(DEFAULT_FORM)
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error ?? 'Failed to delete service')
    },
  })

  const saveContext = useMutation({
    mutationFn: () => servicesApi.updateContext(context),
    onSuccess: () => {
      toast.success('AI notes saved')
      qc.invalidateQueries({ queryKey: ['tenant-context'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error ?? 'Failed to save AI notes')
    },
  })

  const services = servicesData ?? []

  const handleEdit = (service: Service) => {
    setSelectedService(service)
    setForm(toFormState(service))
  }

  const handleReset = () => {
    setSelectedService(null)
    setForm(DEFAULT_FORM)
  }

  const handleSubmit = () => {
    if (!form.serviceName.trim()) {
      toast.error('Service name is required')
      return
    }

    if (!form.basePrice.trim() || Number.isNaN(Number(form.basePrice))) {
      toast.error('Price must be a valid number')
      return
    }

    saveService.mutate()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Services</h1>
          <p className="mt-1 text-sm text-slate-500">Keep service setup simple. Add a name and a price, and the AI will quote from this list.</p>
        </div>
        <Button onClick={handleReset}>
          <Plus className="mr-1.5 h-4 w-4" /> New service
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50">
              <Package className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-slate-800">
                {selectedService ? 'Edit service' : 'Add service'}
              </h2>
              <p className="text-sm text-slate-400">We auto-generate the internal service code for you.</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Service Name"
              value={form.serviceName}
              onChange={(event) => setForm((current) => ({ ...current, serviceName: event.target.value }))}
              placeholder="Water tanker 20L"
            />
            <Input
              label="Price"
              type="number"
              value={form.basePrice}
              onChange={(event) => setForm((current) => ({ ...current, basePrice: event.target.value }))}
              placeholder="200"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleSubmit} loading={saveService.isPending} className="justify-center sm:flex-1">
              {selectedService ? 'Save changes' : 'Create service'}
            </Button>
            <Button variant="secondary" onClick={handleReset} className="justify-center sm:flex-1">
              Reset form
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="border-b border-surface-100 px-6 py-4">
              <h2 className="font-display font-semibold text-slate-800">Saved Services</h2>
            </div>

            {servicesLoading ? (
              <div className="flex justify-center py-16">
                <Spinner className="h-6 w-6" />
              </div>
            ) : services.length === 0 ? (
              <EmptyState
                icon={<Package className="h-6 w-6" />}
                title="No services saved yet"
                description="Create your first service so the chatbot can quote a real price."
              />
            ) : (
              <div className="divide-y divide-surface-100">
                {services.map((service) => (
                  <div key={service.id} className="flex items-center justify-between gap-4 px-6 py-5">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-slate-900">{service.serviceName}</h3>
                      <p className="mt-1 text-xs text-slate-400">{service.serviceCode}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-display text-xl font-bold text-slate-900">INR {service.basePrice}</p>
                      <Button variant="ghost" onClick={() => handleEdit(service)}>
                        <Pencil className="mr-1.5 h-4 w-4" /> Edit
                      </Button>
                      <Button variant="ghost" onClick={() => deleteService.mutate(service.id)} loading={deleteService.isPending}>
                        <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50">
                <Sparkles className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-slate-800">AI Notes</h2>
                <p className="text-sm text-slate-400">Optional business rules or pricing notes that apply across all services.</p>
              </div>
            </div>

            <textarea
              className="input min-h-[220px]"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Example: Only quote saved services. If a customer asks for something else, ask them to contact us."
            />

            <Button onClick={() => saveContext.mutate()} loading={saveContext.isPending} className="mt-4 w-full justify-center">
              Save AI notes
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
