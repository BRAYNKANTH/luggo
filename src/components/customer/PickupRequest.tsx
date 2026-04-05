'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { requestPickupAction, createLateFeePayment } from '@/lib/customer/actions'
import { ShoppingBag, CreditCard, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react'
import { type PayhereFormData } from '@/lib/utils/payhere'

interface PickupRequestProps {
  bookingId: string
  lateFee: number
}

export function PickupRequest({ bookingId, lateFee }: PickupRequestProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [payhereData, setPayhereData] = useState<PayhereFormData | null>(null)

  // Zero-fee path — just request pickup
  if (lateFee === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
           <h3 className="text-xl font-black text-ocean-900 tracking-tight">Ready for Collection?</h3>
           <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-none">Standard storage session complete</p>
        </div>
        
        <form action={requestPickupAction.bind(null, bookingId)}>
          <Button 
            type="submit" 
            fullWidth 
            size="lg" 
            disabled={isPending}
            className="h-12 md:h-20 rounded-2xl md:rounded-[2.5rem] shadow-xl md:shadow-2xl shadow-brand/30 text-sm md:text-lg font-black uppercase tracking-widest md:tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95"
          >
            {isPending ? <Spinner size="sm" /> : (
              <span className="flex items-center gap-2 md:gap-3">
                <ShoppingBag size={18} className="md:w-[22px] md:h-[22px]" />
                Release My Bags
              </span>
            )}
          </Button>
        </form>
        
        <div className="flex items-center justify-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 py-2.5 rounded-2xl border border-emerald-100">
           <ShieldCheck size={14} /> Full Security Clearance Granted
        </div>
      </div>
    )
  }

  // Late-fee path — pay then request
  async function handlePayAndRequest() {
    setError(null)
    startTransition(async () => {
      const result = await createLateFeePayment(bookingId)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.formData) {
        setPayhereData(result.formData)
        setTimeout(() => formRef.current?.submit(), 50)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
           <h3 className="text-xl font-black text-ocean-900 tracking-tight">Access Locked</h3>
           <p className="text-xs text-red-500 font-black uppercase tracking-widest leading-none italic">Overdue Settlement Required</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 text-red-600 text-xs bg-red-50 border border-red-200 rounded-[2rem] p-5 shadow-inner">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p className="font-bold leading-relaxed">{error}</p>
        </div>
      )}

      <Button
        fullWidth
        size="lg"
        onClick={handlePayAndRequest}
        disabled={isPending}
        className="h-12 md:h-20 rounded-2xl md:rounded-[2.5rem] shadow-xl md:shadow-2xl shadow-brand/30 text-xs md:text-base font-black uppercase tracking-widest md:tracking-[0.15em] transition-all hover:scale-[1.02] active:scale-95 bg-ocean-900 hover:bg-ocean-800"
      >
        {isPending ? <Spinner size="sm" /> : (
          <span className="flex items-center justify-center gap-2 md:gap-3">
            <CreditCard size={16} className="md:w-[22px] md:h-[22px]" />
            <span className="hidden md:inline">Settle LKR {lateFee.toLocaleString()} & Release</span>
            <span className="md:hidden">Settle & Release</span>
          </span>
        )}
      </Button>

      <div className="bg-gray-50/50 p-5 rounded-[2rem] border border-gray-100 flex items-center justify-between group">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-brand">
               <ShieldCheck size={16} />
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Secure PayHere Gateway</p>
         </div>
         <ArrowRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
      </div>

      {/* Hidden PayHere auto-submit form */}
      {payhereData && (
        <form
          ref={formRef}
          method="POST"
          action={payhereData.endpoint}
          className="hidden"
        >
          {Object.entries(payhereData).filter(([k]) => k !== 'endpoint').map(([key, val]) => (
            <input key={key} type="hidden" name={key} value={val as string} />
          ))}
        </form>
      )}
    </div>
  )
}
