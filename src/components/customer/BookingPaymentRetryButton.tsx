'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { createBookingRetryPayment } from '@/lib/customer/actions'
import { type PayhereFormData } from '@/lib/utils/payhere'

interface BookingPaymentRetryButtonProps {
  bookingId: string
  price: number
}

export function BookingPaymentRetryButton({ bookingId, price }: BookingPaymentRetryButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payhereData, setPayhereData] = useState<PayhereFormData | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleRetry() {
    setLoading(true)
    setError(null)
    try {
      const res = await createBookingRetryPayment(bookingId)
      if (res.error) {
        setError(res.error)
      } else if (res.formData) {
        setPayhereData(res.formData)
      }
    } catch {
      setError('Failed to initiate payment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (payhereData && formRef.current) {
      formRef.current.submit()
    }
  }, [payhereData])

  if (payhereData) {
    return (
      <form ref={formRef} method="post" action={payhereData.endpoint} className="hidden">
        {Object.entries(payhereData).map(([key, val]) => (
          <input key={key} type="hidden" name={key} value={val as string} />
        ))}
      </form>
    )
  }

  return (
    <div className="w-full space-y-2">
      {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
      <Button
        onClick={handleRetry}
        disabled={loading}
        fullWidth
        className="bg-brand text-ocean-900 hover:bg-brand-light font-extrabold"
      >
        {loading ? <Spinner size="sm" /> : `💳 Pay LKR ${price.toLocaleString()} Online`}
      </Button>
    </div>
  )
}
