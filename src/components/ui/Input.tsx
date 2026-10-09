"use client"

import { forwardRef, useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, label, hint, className, type, id, 'aria-describedby': describedBy, 'aria-invalid': invalid, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const messageId = `${inputId}-message`
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    return (
      <div className="w-full min-w-0">
        {label && <label htmlFor={inputId} className="block text-sm font-medium text-ocean-800 mb-1.5">{label}</label>}
        <div className="relative">
          <input {...props} ref={ref} id={inputId} type={isPassword && showPassword ? 'text' : type}
            aria-invalid={error ? true : invalid}
            aria-describedby={[describedBy, error || hint ? messageId : null].filter(Boolean).join(' ') || undefined}
            className={cn(
              'w-full min-h-12 px-4 py-3 rounded-2xl border text-ocean-900 text-base md:text-sm shadow-sm transition-colors',
              'bg-white placeholder:text-gray-500 disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand',
              error ? 'border-red-600 ring-1 ring-red-600 focus:ring-red-600/30' : 'border-gray-300 hover:border-gray-400',
              isPassword && 'pr-14', className,
            )} />
          {isPassword && <button type="button" disabled={props.disabled}
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-1 top-1/2 -translate-y-1/2 min-h-11 min-w-11 flex items-center justify-center rounded-xl text-gray-600 hover:text-ocean-900 disabled:opacity-50"
            aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} aria-controls={inputId}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>}
        </div>
        {error ? <p id={messageId} role="alert" className="mt-1.5 text-sm text-red-700 font-medium">{error}</p>
          : hint && <p id={messageId} className="mt-1.5 text-sm text-gray-600">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
