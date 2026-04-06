import { getRequestConfig } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales, type Locale } from './i18n-config'

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) notFound()

  return {
    locale: locale as string,
    messages: (
      locale === 'si' ? (await import('../messages/si.json')).default :
      locale === 'ta' ? (await import('../messages/ta.json')).default :
      (await import('../messages/en.json')).default
    )
  }
})
