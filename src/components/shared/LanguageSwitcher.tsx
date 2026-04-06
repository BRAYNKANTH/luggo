'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname, locales } from '@/navigation'
import { Globe, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

const LANG_NAMES = {
  en: 'EN',
  si: 'සිං',
  ta: 'தமிழ்'
}

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function switchLocale(nextLocale: string) {
    setOpen(false)
    router.replace(pathname, { locale: nextLocale as any })
  }

  return (
    <div className="relative group">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors text-ocean-900/60 hover:text-brand"
      >
        <Globe size={14} />
        <span className="text-xs font-bold">{LANG_NAMES[locale as keyof typeof LANG_NAMES]}</span>
        <ChevronDown size={10} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute right-0 mt-2 w-28 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden"
            >
              {locales.map((l) => (
                <button
                  key={l}
                  onClick={() => switchLocale(l)}
                  className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-gray-50 transition-colors ${
                    locale === l ? 'text-brand bg-brand/5' : 'text-ocean-900/70'
                  }`}
                >
                  {LANG_NAMES[l as keyof typeof LANG_NAMES]}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
