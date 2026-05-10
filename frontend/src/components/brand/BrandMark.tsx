import { Zap } from 'lucide-react'
import { clsx } from 'clsx'

export const BrandMark = ({
  className = '',
  iconClassName = '',
}: {
  className?: string
  iconClassName?: string
}) => (
  <div className={clsx('flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 shadow-soft', className)}>
    <Zap className={clsx('text-[#6E7BFF]', iconClassName)} strokeWidth={2.25} />
  </div>
)
