'use client'

import { useState, useRef, useEffect } from 'react'
import { Clock, Plus, ArrowRight, Shield, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { extendBooking } from '@/lib/auth/actions'
import { motion, AnimatePresence } from 'framer-motion'
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

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loading && setIsOpen(false)}
              className="absolute inset-0 bg-ocean-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-6 shadow-2xl overflow-hidden"
            >
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
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-ocean-900">Extend Booking</h3>
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Plus size={24} className="rotate-45" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {EXTENSION_OPTIONS.map((opt) => (
                      <button
                        key={opt.hours}
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
                        <span className="text-gray-500">Extension Fee</span>
                        <span className="font-bold text-ocean-900">LKR {extensionPrice.toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Based on {bags.length} bag(s) @ LKR {hourlyRate}/hr
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2 text-xs text-brand-danger font-medium">
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
                    Confirm & Pay LKR {extensionPrice.toLocaleString()}
                  </Button>

                  <p className="text-[10px] text-gray-400 mt-4 text-center flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                    <Shield size={12} className="text-brand/50" />
                    Secure payment via PayHere
                  </p>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
