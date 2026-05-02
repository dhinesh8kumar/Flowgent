import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react'
import { clsx } from 'clsx'

// ── Card ──────────────────────────────────────────────────
export const Card = ({ children, className = '', onClick }: {
  children: ReactNode; className?: string; onClick?: () => void
}) => (
  <div
    className={clsx('card', onClick && 'cursor-pointer hover:shadow-card-hover transition-shadow duration-200', className)}
    onClick={onClick}
  >
    {children}
  </div>
)

// ── Button ────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

export const Button = ({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }: ButtonProps) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'bg-red-50 hover:bg-red-100 text-red-600 font-medium px-5 py-2.5 rounded-2xl transition-all duration-150 border border-red-100',
  }
  const sizes = { sm: 'text-xs px-3 py-1.5', md: 'text-sm', lg: 'text-base px-6 py-3' }

  return (
    <button
      className={clsx(variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Loading...
        </span>
      ) : children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string
}

export const Input = ({ label, error, className = '', ...props }: InputProps) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <input className={clsx('input', error && 'border-red-300 focus:ring-red-300', className)} {...props} />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
)

// ── Select ────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; options: { value: string; label: string }[]
}

export const Select = ({ label, options, className = '', ...props }: SelectProps) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <select className={clsx('input bg-surface-50', className)} {...props}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
)

// ── Badge ─────────────────────────────────────────────────
const badgeColors: Record<string, string> = {
  PENDING:     'bg-amber-50   text-amber-700   border border-amber-200',
  CONFIRMED:   'bg-blue-50    text-blue-700    border border-blue-200',
  DISPATCHED:  'bg-purple-50  text-purple-700  border border-purple-200',
  DELIVERED:   'bg-green-50   text-green-700   border border-green-200',
  CANCELLED:   'bg-red-50     text-red-600     border border-red-200',
  IDLE:        'bg-slate-50   text-slate-600   border border-slate-200',
  MAINTENANCE: 'bg-orange-50  text-orange-700  border border-orange-200',
  PAID:        'bg-green-50   text-green-700   border border-green-200',
  UNPAID:      'bg-red-50     text-red-600     border border-red-200',
  PARTIAL:     'bg-amber-50   text-amber-700   border border-amber-200',
  WHATSAPP:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  DASHBOARD:   'bg-blue-50    text-blue-700    border border-blue-200',
}

export const Badge = ({ status, label }: { status: string; label?: string }) => (
  <span className={clsx('badge', badgeColors[status] ?? 'bg-slate-100 text-slate-600')}>
    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
    {label ?? status.charAt(0) + status.slice(1).toLowerCase()}
  </span>
)

// ── Modal ─────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode
}) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-xl">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────
export const EmptyState = ({ icon, title, description }: {
  icon: ReactNode; title: string; description?: string
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-14 h-14 rounded-3xl bg-surface-100 flex items-center justify-center text-slate-400 mb-4">
      {icon}
    </div>
    <p className="font-medium text-slate-700">{title}</p>
    {description && <p className="text-sm text-slate-400 mt-1 max-w-xs">{description}</p>}
  </div>
)

// ── Spinner ───────────────────────────────────────────────
export const Spinner = ({ className = '' }: { className?: string }) => (
  <svg className={clsx('animate-spin text-brand-500', className)} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
)
