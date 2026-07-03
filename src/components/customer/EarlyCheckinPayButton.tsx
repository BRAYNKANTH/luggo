'use client'

import { useState, useRef, useEffect } from 'react'
import { Shield, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createEarlyCheckinPayment } from '@/lib/customer/actions'
import { type PayhereFormData } from '@/lib/utils/payhere'

interface EarlyCheckinPayButtonProps {
  bookingId: string
  fee: number
}

export function EarlyCheckinPayButton({ bookingId, fee }: EarlyCheckinPayButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payhereData, setPayhereData] = useState<PayhereFormData | null>(null)
  const payhereFormRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (payhereData && payhereFormRef.current) {
      payhereFormRef.current.submit()
    }
  }, [payhereData])

  async function handlePayment() {
    setError(null)
    setLoading(true)
    try {
      const result = await createEarlyCheckinPayment(bookingId)
      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else if (result.formData) {
        setPayhereData(result.formData)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (payhereData) {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
          <ArrowRight size={24} className="text-brand" />
        </div>
        <p className="font-bold text-ocean-900 text-sm">Redirecting to PayHere...</p>
        <p className="text-xs text-gray-400">Opening secure payment page</p>

        <form
          ref={payhereFormRef}
          method="POST"
          action={payhereData.endpoint}
          style={{ display: 'none' }}
        >
          {Object.entries(payhereData)
            .filter(([key]) => key !== 'endpoint')
            .map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={String(value)} />
            ))}
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2 text-xs text-brand-danger font-medium">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <Button
        fullWidth
        size="lg"
        disabled={loading}
        onClick={handlePayment}
      >
        Pay Early Drop-off Fee (LKR {fee.toLocaleString()})
      </Button>

      <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
        <Shield size={12} className="text-brand/50" />
        Secure payment via PayHere
      </p>
    </div>
  )
}
