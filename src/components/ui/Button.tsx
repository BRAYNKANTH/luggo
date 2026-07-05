'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-brand to-ocean-500 text-white shadow-glow-brand hover:shadow-premium-hover hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
  outline:
    'border border-brand/50 text-brand bg-white hover:bg-brand/5 active:scale-[0.98]',
  ghost:
    'text-ocean-700 hover:bg-ocean-50/50 hover:text-brand active:scale-[0.98]',
  danger:
    'bg-gradient-to-r from-brand-danger to-red-500 text-white shadow-sm hover:shadow-premium-hover hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-4 py-2 text-xs rounded-xl tracking-wide font-extrabold',
  md: 'px-6 py-3 text-sm rounded-2xl tracking-wide font-extrabold',
  lg: 'px-8 py-4.5 text-base rounded-[1.25rem] tracking-wider font-black uppercase',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading, fullWidth, className, disabled, children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold',
          'transition-all duration-300 ease-out active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:-translate-y-0',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
