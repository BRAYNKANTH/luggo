import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/navigation'
import { Logo } from '@/components/ui/Logo'
import { SocialLinks } from '@/components/shared/SocialLinks'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { CONTACT_EMAIL } from '@/lib/public-company'
import { ArrowLeft, MapPin, Package, QrCode } from 'lucide-react'

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await props.params
  const t = await getTranslations({ locale, namespace: 'Meta' })
  return { title: t('aboutTitle'), description: t('aboutDescription') }
}

export default async function AboutPage() {
  const t = await getTranslations('About')
  const steps = [
    { icon: MapPin, key: 'find' },
    { icon: Package, key: 'drop' },
    { icon: QrCode, key: 'collect' },
  ] as const

  return (
    <main className="min-h-screen bg-white text-ocean-900">
      <nav aria-label={t('navLabel')} className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" aria-label={t('homeLabel')}><Logo size="sm" /></Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><ArrowLeft size={18} /> {t('backHome')}</Link>
          </div>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-12 sm:py-20">
        <p className="text-ocean-600 text-sm font-bold uppercase tracking-widest mb-3">{t('eyebrow')}</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-6">{t('title')}</h1>
        <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">{t('intro')}</p>
        <section className="mt-12" aria-labelledby="how-luggo-works">
          <h2 id="how-luggo-works" className="text-2xl font-bold mb-6">{t('howTitle')}</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {steps.map(({ icon: Icon, key }) => (
              <div key={key} className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                <Icon aria-hidden="true" className="text-ocean-600 mb-4" size={24} />
                <h3 className="font-bold text-lg mb-2">{t(`steps.${key}.title`)}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{t(`steps.${key}.text`)}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-12" aria-labelledby="booking-details">
          <h2 id="booking-details" className="text-2xl font-bold mb-3">{t('knowTitle')}</h2>
          <p className="text-gray-600 leading-relaxed">
            {t.rich('knowText', {
              terms: (chunks) => <Link href="/terms" className="text-ocean-600 underline font-semibold">{chunks}</Link>,
              privacy: (chunks) => <Link href="/privacy" className="text-ocean-600 underline font-semibold">{chunks}</Link>,
            })}
          </p>
          <Link href="/hubs" className="inline-flex min-h-11 items-center justify-center mt-6 rounded-xl bg-ocean-600 text-white px-6 py-3 font-bold">{t('findHub')}</Link>
        </section>
        <section className="mt-12 pt-8 border-t border-gray-100" aria-labelledby="contact-luggo">
          <h2 id="contact-luggo" className="text-2xl font-bold mb-3">{t('contactTitle')}</h2>
          <p className="text-gray-600 leading-relaxed">
            {t.rich('contactText', {
              email: () => <a href={`mailto:${CONTACT_EMAIL}`} className="text-ocean-600 underline font-semibold break-all">{CONTACT_EMAIL}</a>,
            })}
          </p>
          <div className="mt-6 text-ocean-600"><SocialLinks /></div>
        </section>
      </div>
    </main>
  )
}
