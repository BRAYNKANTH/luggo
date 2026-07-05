import { cn } from '@/lib/utils/cn'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  default:  'bg-slate-50 text-slate-700 border-slate-200/60',
  success:  'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  warning:  'bg-amber-50 text-amber-700 border-amber-200/60',
  danger:   'bg-rose-50 text-rose-700 border-rose-200/60',
  info:     'bg-sky-50 text-sky-700 border-sky-200/60',
  purple:   'bg-purple-50 text-purple-700 border-purple-200/60',
}

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all duration-300',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
