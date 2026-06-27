'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Package, MapPin, ShieldCheck, Warehouse, UserCheck } from 'lucide-react'
import { type BookingStatus } from '@/types/database'

interface Step {
  id: string
  label: string
  icon: React.ElementType
  statuses: BookingStatus[]
}

const STEPS: Step[] = [
  { id: 'booked',   label: 'Booked',        icon: MapPin,      statuses: ['confirmed'] },
  { id: 'arrived',  label: 'At Hub',        icon: UserCheck,   statuses: ['arrived'] },
  { id: 'sealed',   label: 'Sealed',        icon: ShieldCheck, statuses: ['sealing_in_progress', 'sealed_waiting_user_confirmation'] },
  { id: 'storing',  label: 'In Vault',      icon: Warehouse,   statuses: ['active_storage'] },
  { id: 'pickup',   label: 'Collected',     icon: Package,     statuses: ['completed'] },
]

export function BookingProgressTracker({ status }: { status: BookingStatus }) {
  const currentStepIndex = STEPS.findIndex(s => s.statuses.includes(status))
  const displayIndex = currentStepIndex === -1 && status === 'completed' ? 4 : currentStepIndex

  return (
    <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 p-4 md:p-6 shadow-sm overflow-hidden relative">
      <h3 className="text-[10px] md:text-sm font-black text-gray-900 uppercase tracking-widest mb-4 md:mb-8 text-center">Luggage Lifecycle</h3>
      
      <div className="relative flex justify-between">
        {/* Progress Line */}
        <div className="absolute top-4 md:top-5 left-6 md:left-8 right-6 md:right-8 h-0.5 bg-gray-100 z-0">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(Math.max(0, displayIndex) / (STEPS.length - 1)) * 100}%` }}
            className="h-full bg-brand"
          />
        </div>

        {STEPS.map((step, i) => {
          const isCompleted = i < displayIndex || status === 'completed'
          const isCurrent = i === displayIndex && status !== 'completed'
          const Icon = step.icon

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-1.5 md:gap-3">
              <motion.div 
                initial={false}
                animate={{ 
                  scale: isCurrent ? 1.1 : 1,
                  backgroundColor: isCompleted || isCurrent ? '#0066FF' : '#F9FAFB',
                  color: isCompleted || isCurrent ? '#FFFFFF' : '#9CA3AF',
                  boxShadow: isCurrent ? '0 0 15px rgba(0, 102, 255, 0.2)' : 'none'
                }}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center border-2 ${
                  isCompleted || isCurrent ? 'border-brand' : 'border-gray-200'
                }`}
              >
                <Icon size={14} className="md:w-[18px] md:h-[18px]" />
                {isCurrent && (
                  <motion.div 
                    layoutId="pulse"
                    className="absolute inset-0 rounded-2xl bg-brand/20"
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </motion.div>
              <div className="text-center">
                <p className={`text-[10px] font-black uppercase tracking-tighter ${
                  isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {step.label}
                </p>
                {isCurrent && (
                  <motion.p 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[9px] font-bold text-brand mt-0.5 animate-pulse"
                  >
                    Current
                  </motion.p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
