import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { PackageOpen, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 bg-brand/10 rounded-3xl flex items-center justify-center text-brand mb-6 animate-pulse">
        <PackageOpen size={40} />
      </div>
      <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
        Page or Booking Not Found
      </h1>
      <p className="text-gray-500 max-w-md mb-8 text-sm md:text-base leading-relaxed">
        We couldn&apos;t find the page or booking you were looking for. It might have been deleted, or you might not have permission to view it.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Link href="/dashboard" className="w-full">
          <Button fullWidth className="gap-2">
            <Home size={16} />
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
