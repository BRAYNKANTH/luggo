/**
 * Timezone-safe date formatting helper for Sri Lanka Standard Time (Asia/Colombo)
 */
// App locale → Intl locale. English keeps en-GB's day-month order.
const INTL_LOCALES: Record<string, string> = { en: 'en-GB', si: 'si-LK', ta: 'ta-LK' }

export function formatInSLT(dateStr: string | Date, options: Intl.DateTimeFormatOptions = {}, locale = 'en'): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return new Intl.DateTimeFormat(INTL_LOCALES[locale] ?? locale, {
    timeZone: 'Asia/Colombo',
    ...options
  }).format(date)
}

export function formatDateTimeSLT(dateStr: string | Date, locale = 'en'): string {
  return formatInSLT(dateStr, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }, locale)
}

export function formatDateSLT(dateStr: string | Date, locale = 'en'): string {
  return formatInSLT(dateStr, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }, locale)
}
