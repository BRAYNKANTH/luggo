'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Logo } from '@/components/ui/Logo'
import { SignOutButton } from '@/components/shared/SignOutButton'
import { Spinner } from '@/components/ui/Spinner'
import { resolveQRCode } from '@/lib/staff/actions'
import { AlertCircle } from 'lucide-react'

// Dynamically import QRScanner (uses camera APIs — must be client-only)
const QRScanner = dynamic(
  () => import('@/components/staff/QRScanner').then((m) => ({ default: m.QRScanner })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center gap-3 py-12">
        <Spinner size="lg" className="text-brand" />
        <p className="text-white/50 text-sm">Loading scanner…</p>
      </div>
    ),
  }
)

export default function StaffScanPage() {
  const router = useRouter()
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleScan = useCallback(
    async (code: string) => {
      if (resolving) return
      setResolving(true)
      setError(null)

      const result = await resolveQRCode(code)

      if (result.error) {
        setError(result.error)
        setResolving(false)
        return
      }

      router.push(`/staff/booking/${result.bookingId}`)
    },
    [resolving, router]
  )

  return (
    <div className="min-h-screen bg-ocean-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <Logo variant="white" size="sm" />
        <SignOutButton portal="staff" />
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-6 gap-6">
        <div className="text-center">
          <h1 className="text-xl font-extrabold text-white">Scan Customer QR</h1>
          <p className="text-white/50 text-sm mt-1">
            Point camera at the customer&apos;s QR code in the Luggo app
          </p>
        </div>

        {/* Scanner or resolving overlay */}
        {resolving ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Spinner size="lg" className="text-brand" />
            <p className="text-white/60 text-sm">Looking up booking…</p>
          </div>
        ) : (
          <QRScanner onScan={handleScan} disabled={resolving} />
        )}

        {/* Error */}
        {error && (
          <div className="w-full max-w-xs flex items-start gap-2 bg-red-500/20 border border-red-400/30 rounded-2xl px-4 py-3 text-sm text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p>{error}</p>
              <button
                className="text-red-300/70 underline text-xs mt-1"
                onClick={() => setError(null)}
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
