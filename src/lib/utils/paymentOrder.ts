const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
export function parseExtensionOrder(order: string): { paymentId: string; hours: number; endTime: string | null } | null {
  const match = order.match(new RegExp(`^ext[_-](${UUID})[_-](\\d+)(?:_(\\d+))?$`, 'i'))
  if (!match) return null
  const hours = Number(match[2])
  if (!Number.isSafeInteger(hours) || hours < 1 || hours > 168) return null
  const end = match[3] ? new Date(Number(match[3])) : null
  if (end && !Number.isFinite(end.getTime())) return null
  return { paymentId: match[1], hours, endTime: end?.toISOString() ?? null }
}
