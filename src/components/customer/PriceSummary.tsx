'use client'

import { cn } from '@/lib/utils/cn'
import { BAG_LABELS, DEFAULT_BAG_RATES, type BagRates, calculateBagPriceForHours } from '@/lib/utils/pricing'
import { type BagType } from '@/types/database'
import { type BagCounts } from './BagSelector'
import { Clock, Tag, CreditCard, ShieldCheck } from 'lucide-react'

interface PriceSummaryProps {
  bags: BagCounts
  startTime: Date | null
  endTime: Date | null
  className?: string
  lateFee?: number
  rates?: BagRates
}

export function PriceSummary({ bags, startTime, endTime, className, lateFee = 0, rates = DEFAULT_BAG_RATES }: PriceSummaryProps) {
  const hours =
    startTime && endTime
      ? Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60))
      : 0

  const bagLines = (Object.entries(bags) as [BagType, number][]).filter(([, qty]) => qty > 0)
  const storageTotal = bagLines.reduce(
    (sum, [type, qty]) => sum + calculateBagPriceForHours(type, hours, rates) * qty,
    0
  )
  const grandTotal = storageTotal + lateFee

  if (bagLines.length === 0 || hours <= 0) {
    return (
      <div className={cn('bg-white p-8 rounded-[3rem] border border-gray-100 text-center shadow-sm', className)}>
        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest italic">Awaiting Selection to Calculate Quote</p>
      </div>
    )
  }

  return (
    <div className={cn('bg-ocean-900 p-8 md:p-10 rounded-[4rem] text-white space-y-8 relative overflow-hidden group shadow-2xl shadow-ocean-900/10 transition-all duration-500', className)}>
      <div className="absolute right-[-5%] top-[-5%] w-48 h-48 bg-brand/20 rounded-full blur-3xl pointer-events-none group-hover:bg-brand/30 transition-all duration-700" />
      
      <div className="flex items-center justify-between relative z-10">
         <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2.5 rounded-xl text-brand-light">
               <CreditCard size={20} />
            </div>
            <h3 className="font-black text-lg tracking-tight leading-none">Financial Quote</h3>
         </div>
         <div className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
            <Clock size={12} className="text-brand-light" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/70">{hours} HRS Storage</span>
         </div>
      </div>

      <div className="space-y-4 relative z-10">
        {/* Per-bag rows */}
        {bagLines.map(([type, qty]) => (
          <div key={type} className="flex justify-between items-center group/row">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-brand/50 group-hover/row:bg-brand transition-colors" />
               <span className="text-white/60 font-bold text-sm tracking-tight">
                 {qty}× {BAG_LABELS[type]}
               </span>
            </div>
            <span className="font-black text-sm text-white tracking-tight italic">LKR {(calculateBagPriceForHours(type, hours, rates) * qty).toLocaleString()}</span>
          </div>
        ))}

        {/* Late fee */}
        {lateFee > 0 && (
          <div className="flex justify-between items-center text-red-400">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
               <span className="font-black text-sm tracking-tight uppercase">Late Collection Penalty</span>
            </div>
            <span className="font-black text-sm italic">+ LKR {lateFee.toLocaleString()}</span>
          </div>
        )}

        <div className="pt-8 mt-4 border-t border-white/10 flex justify-between items-end">
           <div className="space-y-1">
              <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em] leading-none">Guaranteed Total</p>
              <p className="text-xs text-brand-light font-black uppercase tracking-widest">Post-Tax Inclusion</p>
           </div>
           <div className="text-right">
              <p className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-1">
                 <span className="text-xs text-white/40 align-middle mr-1 tracking-normal font-bold">LKR</span>
                 {grandTotal.toLocaleString()}
              </p>
           </div>
        </div>
      </div>

      <div className="pt-6 relative z-10 flex items-center justify-center gap-4 border-t border-white/5">
         <div className="flex items-center gap-2 text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">
            <ShieldCheck size={12} className="text-brand/50" />
            End-to-End Encrypted
         </div>
         <div className="w-1 h-1 bg-white/10 rounded-full" />
         <div className="flex items-center gap-2 text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">
            <Tag size={12} className="text-brand/50" />
            Voucher Eligible
         </div>
      </div>
    </div>
  )
}
