'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from '@/navigation'
import { Clock, Plus, ArrowRight, Shield, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { extendBooking } from '@/lib/auth/actions'
import { Dialog } from '@/components/ui/Dialog'
import { type BagType } from '@/types/database'

interface ExtendBookingCTAProps {
  bookingId: string
  bags: { bag_type: BagType }[]
  hourlyRate: number
  minimal?: boolean
}

const EXTENSION_OPTIONS = [
  { hours: 2, label: '+2 hours' },
  { hours: 4, label: '+4 hours' },
  { hours: 8, label: '+8 hours' },
  { hours: 24, label: '+24 hours' },
]

export function ExtendBookingCTA({ bookingId, bags, hourlyRate, minimal = false }: ExtendBookingCTAProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedHours, setSelectedHours] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payhereData, setPayhereData] = useState<Record<string, unknown> | null>(null)
  const payhereFormRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (payhereData && payhereFormRef.current) {
      payhereFormRef.current.submit()
    }
  }, [payhereData])

  async function handleExtend() {
    if (!selectedHours) return
    setError(null)
    setLoading(true)

    try {
      const result = await extendBooking(bookingId, selectedHours)
      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else if (result.success) {
        setIsOpen(false)
        setLoading(false)
        router.refresh()
      } else if (result.payhere) {
        setPayhereData(result.payhere)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const extensionPrice = selectedHours ? selectedHours * hourlyRate : 0

  return (
    <>
      {minimal ? (
        <Button 
          variant="outline" 
          fullWidth 
          onClick={() => setIsOpen(true)}
          className="bg-white border-brand/20 text-brand hover:bg-brand hover:text-white transition-all rounded-2xl"
        >
          <Plus size={16} className="mr-1" />
          Extend
        </Button>
      ) : (
        <div className="card border-brand/20 bg-brand/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-brand/10 text-brand rounded-xl">
              <Clock size={20} />
            </div>
            <div>
              <p className="font-bold text-ocean-900 text-sm">Need more time?</p>
              <p className="text-xs text-gray-500">Extend your storage before it expires</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            fullWidth 
            onClick={() => setIsOpen(true)}
            className="bg-white border-brand/20 text-brand hover:bg-brand hover:text-white transition-all rounded-2xl"
          >
            <Plus size={16} className="mr-1" />
            Extend Booking
          </Button>
        </div>
      )}

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} title="Extend booking" dismissible={!loading} className="max-w-sm">
              {payhereData ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
                    <ArrowRight size={32} className="text-brand" />
                  </div>
                  <h3 className="text-xl font-bold text-ocean-900">Redirecting to PayHere</h3>
                  <p className="text-sm text-gray-500">Opening secure payment gateway...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {EXTENSION_OPTIONS.map((opt) => (
                      <button
                        key={opt.hours}
                        type="button"
                        disabled={loading}
                        aria-pressed={selectedHours === opt.hours}
                        onClick={() => setSelectedHours(opt.hours)}
                        className={`p-4 rounded-2xl border-2 transition-all text-center ${
                          selectedHours === opt.hours
                            ? 'border-brand bg-brand/5 text-brand'
                            : 'border-gray-50 bg-gray-50 text-gray-600 hover:border-gray-200'
                        }`}
                      >
                        <p className="font-bold">{opt.label}</p>
                        <p className="text-[10px] opacity-70">LKR {(opt.hours * hourlyRate).toLocaleString()}</p>
                      </button>
                    ))}
                  </div>

                  {selectedHours && (
                    <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                      <div className="flex justify-between items-center text-sm mb-1">
                        <span className="text-gray-500">Estimated Extension Fee</span>
                        <span className="font-bold text-ocean-900">LKR {extensionPrice.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Estimate for {bags.length} bag(s). Daily caps and overdue time affect the final fee shown at checkout.
                      </p>
                    </div>
                  )}

                  {error && (
                    <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2 text-xs text-brand-danger font-medium">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}

                  <Button
                    fullWidth
                    size="lg"
                    disabled={!selectedHours || loading}
                    loading={loading}
                    onClick={handleExtend}
                  >
                    Continue to payment
                  </Button>

                  <p className="text-xs text-gray-600 mt-4 text-center flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                    <Shield size={12} className="text-brand/50" />
                    Secure payment via PayHere
                  </p>
                </>
              )}
      </Dialog>

      <form
        ref={payhereFormRef}
        method="POST"
        action={(payhereData?.endpoint as string) || ''}
        style={{ display: 'none' }}
      >
        {payhereData && Object.entries(payhereData)
          .filter(([key]) => key !== 'endpoint')
          .map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={String(value)} />
          ))}
      </form>
    </>
  )
}
