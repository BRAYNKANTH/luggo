import { createNavigation } from 'next-intl/navigation'

export const locales = ['en', 'si', 'ta'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale = 'en' as const

export const { Link, redirect, usePathname, useRouter } =
  createNavigation({ locales })
