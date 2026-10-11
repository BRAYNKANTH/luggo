"use client"
import { useId } from 'react'
import { Input } from './Input'
export function OtpInput({ value, onChange, dark = false, label = 'Verification code', hint = 'Enter the six-digit code. You can paste the full code.' }: { value: string; onChange: (value: string) => void; dark?: boolean; label?: string; hint?: string }) {
  const id = useId()
  return <div className="min-w-0 space-y-2">
    <label htmlFor={id} className={`block text-sm font-semibold ${dark ? 'text-white' : 'text-ocean-900'}`}>{label}</label>
    <Input id={id} name="verification-code" type="text" inputMode="numeric" aria-describedby={`${id}-hint`}
      autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={value}
      onChange={event => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="000000" className="text-center text-2xl tracking-[0.4em] font-bold" />
    <p id={`${id}-hint`} className={`text-sm ${dark ? 'text-slate-300' : 'text-gray-600'}`}>{hint}</p>
  </div>
}
