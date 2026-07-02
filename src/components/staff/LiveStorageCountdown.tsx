'use client'

import { useState, useEffect } from 'react'
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Props {
  endTime: string
  status: string
}

export function LiveStorageCountdown({ endTime, status }: Props) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isOverdue, setIsOverdue] = useState(false)

  useEffect(() => {
    const end = new Date(endTime).getTime()

    function update() {
      const now = Date.now()
      const diff = end - now

      if (diff <= 0) {
        setIsOverdue(true)
        const absDiff = Math.abs(diff)
        const hours = Math.floor(absDiff / (1000 * 60 * 60))
        const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((absDiff % (1000 * 60)) / 1000)
        setTimeLeft(`Overdue by ${hours}h ${minutes}m ${seconds}s`)
      } else {
        setIsOverdue(false)
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s remaining`)
      }
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [endTime])

  // Completed or terminal states
  if (status === 'completed') {
    return (
      <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-4 flex items-center gap-3 text-emerald-400 text-sm font-bold">
        <CheckCircle2 size={18} className="shrink-0" />
        <div>
          <p>Handover Completed</p>
          <p className="text-white/40 text-xs font-normal mt-0.5">Bags successfully returned to customer.</p>
        </div>
      </div>
    )
  }

  if (['cancelled', 'expired'].includes(status)) {
    return (
      <div className="bg-white/5 border border-white/15 rounded-2xl p-4 text-white/55 text-sm flex items-center gap-2">
        <AlertTriangle size={18} className="shrink-0" />
        <span>Booking is {status}</span>
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
      isOverdue 
        ? 'bg-red-500/10 border-red-500/30 text-red-300 animate-pulse' 
        : 'bg-brand/10 border-brand/20 text-brand-light font-medium'
    }`}>
      {isOverdue ? (
        <AlertTriangle size={20} className="shrink-0 text-red-400" />
      ) : (
        <Clock size={20} className="shrink-0 text-brand-light animate-spin-slow" />
      )}
      <div>
        <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">Storage Timer</p>
        <p className="font-mono text-sm font-extrabold tracking-wider mt-0.5">{timeLeft}</p>
      </div>
    </div>
  )
}
