import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import { PackageOpen, Home } from 'lucide-react'

export default function NotFound() {
  const t = useTranslations('NotFound')
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 bg-brand/10 rounded-3xl flex items-center justify-center text-brand mb-6">
        <PackageOpen size={40} aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
        {t('title')}
      </h1>
      <p className="text-gray-600 max-w-md mb-8 text-sm md:text-base leading-relaxed">
        {t('body')}
      </p>
      {/* A single link styled as a button: nesting <button> inside <a> is invalid. */}
      <Link
        href="/dashboard"
        className="inline-flex min-h-11 items-center justify-center gap-2 w-full max-w-xs rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand/90"
      >
        <Home size={16} aria-hidden="true" />
        {t('cta')}
      </Link>
    </div>
  )
}
