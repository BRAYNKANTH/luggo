"use client"

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/navigation'
import { locales, type Locale } from '@/i18n-config'
import { Globe } from 'lucide-react'

// Each language is named in its own script so people can find theirs.
const LANG_NAMES: Record<Locale, string> = { en: 'English', si: 'සිංහල', ta: 'தமிழ்' }

export function LanguageSwitcher() {
  const t = useTranslations('Shell')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  return <div className="relative inline-flex items-center text-ocean-900">
    <Globe size={16} aria-hidden="true" className="absolute left-3 pointer-events-none" />
    <select aria-label={t('language')} value={locale} onChange={event => router.replace(`${pathname}${window.location.search}`, { locale: event.target.value as Locale })}
      className="min-h-11 max-w-[160px] rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm font-semibold">
      {locales.map(language => <option key={language} value={language} lang={language}>{LANG_NAMES[language]}</option>)}
    </select>
  </div>
}
