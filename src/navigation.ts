import { createNavigation } from 'next-intl/navigation'

import { locales, type Locale } from './i18n-config'

export const { Link, redirect, usePathname, useRouter } =
  createNavigation({ locales })
