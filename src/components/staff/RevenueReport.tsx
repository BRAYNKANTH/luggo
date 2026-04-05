'use client'

import React from 'react'
import { TrendingUp, DollarSign, Calendar, BarChart3, PieChart } from 'lucide-react'

interface RevenueData {
  total: number
  recentTotal: number
  byType: Record<string, number>
  paymentCount: number
}

interface RevenueReportProps {
  data: RevenueData
}

export function RevenueReport({ data }: RevenueReportProps) {
  const { total, recentTotal, byType, paymentCount } = data

  const types = Object.entries(byType)
  const maxVal = Math.max(...Object.values(byType), 1)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
          <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center mb-3">
            <DollarSign size={20} className="text-brand-light" />
          </div>
          <div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Total Revenue</p>
            <p className="text-2xl font-black text-white mt-1">LKR {total.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center mb-3">
            <TrendingUp size={20} className="text-green-400" />
          </div>
          <div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Last 30 Days</p>
            <p className="text-2xl font-black text-green-400 mt-1">LKR {recentTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={18} className="text-brand-light" />
          <h2 className="text-sm font-black uppercase tracking-widest text-white/70">Revenue Breakdown</h2>
        </div>

        <div className="space-y-5">
          {types.length > 0 ? (
            types.map(([type, amount]) => (
              <div key={type} className="space-y-2">
                <div className="flex justify-between items-end">
                  <p className="text-xs font-bold text-white/50 capitalize">{type.replace('_', ' ')}</p>
                  <p className="text-sm font-black text-white">LKR {amount.toLocaleString()}</p>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand rounded-full transition-all duration-1000" 
                    style={{ width: `${(amount / maxVal) * 100}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-10 text-white/20 text-xs font-bold italic">No payments recorded yet</p>
          )}
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-brand-light" />
          <h2 className="text-sm font-black uppercase tracking-widest text-white/70">Transaction Activity</h2>
        </div>
        <div className="flex items-center justify-between py-2">
          <p className="text-xs text-white/40 font-bold">Total Transactions</p>
          <span className="bg-white/10 text-white text-xs font-black px-3 py-1 rounded-lg">
            {paymentCount}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-white/5 mt-2 pt-4">
          <p className="text-xs text-white/40 font-bold">Average Order Value</p>
          <p className="text-sm font-black text-white">
            LKR {paymentCount > 0 ? (total / paymentCount).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
          </p>
        </div>
      </div>
    </div>
  )
}
