export function bookingReferenceRange(reference: string): { lower: string; upper: string } | null {
  const prefix = reference.replace(/^WI-/i, '').replace(/-/g, '').toLowerCase()
  if (!/^[0-9a-f]{8,32}$/.test(prefix)) return null
  const uuid = (value: string) => `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`
  return { lower: uuid(prefix.padEnd(32, '0')), upper: uuid(prefix.padEnd(32, 'f')) }
}
