import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, backHref, action }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="flex items-center gap-2 px-4 md:px-6 h-14 max-w-5xl mx-auto">
        {backHref && (
          <Link
            href={backHref}
            className="shrink-0 -ml-1 w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900 leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-[11px] text-gray-400 leading-tight truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}
