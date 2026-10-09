"use client"

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/navigation'
import { locales, type Locale } from '@/i18n-config'
import { Globe } from 'lucide-react'

const LANG_NAMES = { en: 'English', si: '?????', ta: '?????' }
export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  return <div className="relative inline-flex items-center text-ocean-900">
    <Globe size={16} aria-hidden="true" className="absolute left-3 pointer-events-none" />
    <select aria-label="Language" value={locale} onChange={event => router.replace(`${pathname}${window.location.search}`, { locale: event.target.value as Locale })}
      className="min-h-11 max-w-[160px] rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm font-semibold">
      {locales.map(language => <option key={language} value={language}>{LANG_NAMES[language]}</option>)}
    </select>
  </div>
}
