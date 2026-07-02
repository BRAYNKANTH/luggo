/**
 * Timezone-safe date formatting helper for Sri Lanka Standard Time (Asia/Colombo)
 */
export function formatInSLT(dateStr: string | Date, options: Intl.DateTimeFormatOptions = {}): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    ...options
  }).format(date)
}

export function formatDateTimeSLT(dateStr: string | Date): string {
  return formatInSLT(dateStr, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

export function formatDateSLT(dateStr: string | Date): string {
  return formatInSLT(dateStr, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}
