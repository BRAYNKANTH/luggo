'use client'

import { Minus, Plus, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { DEFAULT_BAG_RATES, type BagRates, BAG_LABELS } from '@/lib/utils/pricing'
import { type BagType } from '@/types/database'

export type BagCounts = Record<BagType, number>

interface BagSelectorProps {
  value: BagCounts
  onChange: (counts: BagCounts) => void
  className?: string
  rates?: BagRates
}

const BAG_ICONS: Record<BagType, React.ReactNode> = {
  small:   '🎒',
  regular: '🧳',
  large:   '🛄',
}

const BAG_DESCRIPTIONS: Record<BagType, string> = {
  small:   'Compact storage for hand luggage and backpacks',
  regular: 'Ideal for standard cabin-size carry-ons',
  large:   'Oversized storage for check-in suitcases',
}

export function BagSelector({ value, onChange, className, rates = DEFAULT_BAG_RATES }: BagSelectorProps) {
  const total = Object.values(value).reduce((s, n) => s + n, 0)

  function increment(type: BagType) {
    if (total >= 10) return
    onChange({ ...value, [type]: value[type] + 1 })
  }

  function decrement(type: BagType) {
    if (value[type] === 0) return
    onChange({ ...value, [type]: value[type] - 1 })
  }

  return (
    <div className={cn('grid gap-4', className)}>
      {(Object.keys(BAG_LABELS) as BagType[]).map((type) => (
        <div
          key={type}
          className={cn(
            'group bg-white p-6 rounded-[2.5rem] border border-gray-100 flex items-center justify-between gap-6 transition-all duration-500 hover:shadow-xl hover:border-brand/20',
            value[type] > 0 && 'border-brand/40 bg-brand/5 shadow-brand/5'
          )}
        >
          {/* Visual ID */}
          <div className="flex items-center gap-5 flex-1 min-w-0">
             <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500 group-hover:bg-white shadow-sm">
                {BAG_ICONS[type]}
             </div>
             <div className="min-w-0">
                <p className="font-black text-ocean-900 tracking-tight leading-none mb-1.5">{BAG_LABELS[type]}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed line-clamp-2 md:line-clamp-none">{BAG_DESCRIPTIONS[type]}</p>
             </div>
          </div>

          <div className="flex items-center gap-8">
             {/* Rate Information */}
             <div className="hidden sm:block text-right">
                <p className="text-sm font-black text-ocean-900 italic">LKR {rates[type].hourlyRate.toLocaleString()}</p>
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Per Hour</p>
             </div>

             {/* Dynamic Counter Controls */}
             <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm p-2 rounded-[2rem] border border-gray-100 shadow-inner">
                <button
                  type="button"
                  onClick={() => decrement(type)}
                  disabled={value[type] === 0}
                  className={cn(
                    'h-10 w-10 rounded-2xl flex items-center justify-center transition-all active:scale-90',
                    value[type] > 0
                      ? 'bg-ocean-900 text-white shadow-lg shadow-ocean-900/20'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  )}
                  aria-label={`Remove ${type} bag`}
                >
                  <Minus size={16} strokeWidth={3} />
                </button>
                
                <span className="w-6 text-center font-black text-ocean-900 text-lg tabular-nums">
                  {value[type]}
                </span>

                <button
                  type="button"
                  onClick={() => increment(type)}
                  disabled={total >= 10}
                  className={cn(
                    'h-10 w-10 rounded-2xl flex items-center justify-center transition-all active:scale-90',
                    total < 10
                      ? 'bg-brand text-white shadow-lg shadow-brand/20'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  )}
                  aria-label={`Add ${type} bag`}
                >
                  <Plus size={16} strokeWidth={3} />
                </button>
             </div>
          </div>
        </div>
      ))}

      {total >= 10 && (
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center justify-center gap-2 text-amber-600 font-black text-[10px] uppercase tracking-widest mt-2 animate-pulse">
           <ShoppingBag size={12} /> Limit Reached: 10 Storage Units
        </div>
      )}
    </div>
  )
}
