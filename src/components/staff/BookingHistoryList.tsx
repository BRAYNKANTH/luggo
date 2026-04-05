'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Search, Filter, ChevronRight, User, Calendar, Tag, Package, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface Booking {
  id: string
  status: string
  start_time: string
  end_time: string
  total_price: number
  created_at: string
  users: { name: string; phone: string | null } | null
}

interface BookingHistoryListProps {
  bookings: Booking[]
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  arrived: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  active_storage: 'text-green-400 bg-green-400/10 border-green-400/20',
  completed: 'text-white/40 bg-white/5 border-white/10',
  cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
  expired: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  overstayed: 'text-red-500 bg-red-500/10 border-red-500/20',
}

export function BookingHistoryList({ bookings }: BookingHistoryListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = bookings.filter(b => {
    const matchesSearch = 
      (b.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
       b.users?.phone?.includes(searchTerm))
    
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input 
            type="text" 
            placeholder="Search name, ID, or phone..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-brand/50 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="bg-white/5 border border-white/10 rounded-xl px-3 text-sm focus:outline-none text-white/70"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="confirmed">Upcoming</option>
          <option value="active_storage">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map(b => (
            <Link key={b.id} href={`/staff/booking/${b.id}`}>
              <div className="bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all active:scale-[0.98] group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                      <User size={18} className="text-white/30" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{b.users?.name ?? 'Customer'}</p>
                      <p className="text-white/40 text-[10px] font-mono">#{b.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${STATUS_COLORS[b.status] || 'text-white/40 bg-white/5 border-white/10'}`}>
                    {b.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-1">
                  <div className="flex items-center gap-2 text-white/40">
                    <Calendar size={12} />
                    <span className="text-[10px] font-bold">{format(new Date(b.created_at), 'dd MMM yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40 justify-end">
                    <Tag size={12} />
                    <span className="text-[10px] font-bold">LKR {b.total_price.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="py-20 text-center">
            <p className="text-white/20 text-sm font-bold italic">No bookings found matching your search</p>
          </div>
        )}
      </div>
    </div>
  )
}
