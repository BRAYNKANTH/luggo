import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

/**
 * Builds a `generateMetadata` that sets a translated page title from the
 * `Meta` messages namespace. The root layout appends " | Luggo".
 */
export function titleMetadata(key: string) {
  return async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await props.params
    const t = await getTranslations({ locale, namespace: 'Meta' })
    return { title: t(key) }
  }
}
