import { z } from 'zod'

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s()+-]/g, '')
  if (/^94\d{9}$/.test(digits)) return `+${digits}`
  if (/^0\d{9}$/.test(digits)) return `+94${digits.slice(1)}`
  if (/^\d{9}$/.test(digits)) return `+94${digits}`
  return null
}
const phone = z.string().transform(normalizePhone).refine(v => v !== null, 'Enter a valid Sri Lankan phone number')
export const sendPhoneCodeSchema = z.object({ phone })
export const verifyPhoneCodeSchema = z.object({
  phone,
  otp: z.string().regex(/^\d{6}$/, 'Enter the six-digit code'),
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  nic: z.string().trim().max(20).optional(),
})

export function phoneAliases(phone: string): string[] {
  return [phone, phone.slice(1), `0${phone.slice(3)}`, phone.slice(3)]
}
