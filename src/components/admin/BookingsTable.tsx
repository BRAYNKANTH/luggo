'use client'

import { Link } from '@/navigation'
import { formatDateTimeSLT } from '@/lib/utils/timezone'

const STATUS_COLOUR: Record<string, string> = {
  pending_payment:                  'bg-amber-100 text-amber-700',
  confirmed:                        'bg-blue-100 text-blue-700',
  arrived:                          'bg-indigo-100 text-indigo-700',
  sealing_in_progress:              'bg-violet-100 text-violet-700',
  sealed_waiting_user_confirmation: 'bg-purple-100 text-purple-700',
  active_storage:                   'bg-brand/10 text-brand',
  pickup_requested:                 'bg-cyan-100 text-cyan-700',
  completed:                        'bg-green-100 text-green-700',
  cancelled:                        'bg-gray-100 text-gray-400',
  expired:                          'bg-gray-100 text-gray-400',
  overstayed:                       'bg-red-100 text-red-600',
  disputed:                         'bg-orange-100 text-orange-600',
}

interface Booking {
  id: string
  status: string
  start_time: string
  end_time: string
  total_price: number
  created_at: string
  users: { name: string; email: string } | null
  hubs: { name: string } | null
  booking_bags: { id: string }[]
}

interface BookingsTableProps {
  bookings: Booking[] | null
}

export function BookingsTable({ bookings }: BookingsTableProps) {

  return (
    <div role="region" aria-label="Bookings table" tabIndex={0} className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-sm">
        <thead>
          <tr className="border-b border-gray-50 bg-gray-50/50">
            <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Ref</th>
            <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Customer</th>
            <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Hub</th>
            <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Status</th>
            <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Bags</th>
            <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Period</th>
            <th scope="col" className="text-right px-5 py-3 text-xs font-semibold text-gray-600">Amount</th>
          </tr>
        </thead>
        <tbody>
          {bookings?.map((b) => (
            <tr
              key={b.id}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
            >
              <td className="px-5 py-3 font-mono text-xs text-gray-400">
                <Link href={`/admin/bookings/${b.id}`} aria-label={`View booking ${b.id.slice(0, 8).toUpperCase()}`} className="inline-flex min-h-11 items-center text-ocean-600 underline underline-offset-4">#{b.id.slice(0, 8).toUpperCase()}</Link>
              </td>
              <td className="px-5 py-3">
                <p className="font-medium text-ocean-900">{b.users?.name ?? '—'}</p>
                <p className="text-xs text-gray-400">{b.users?.email}</p>
              </td>
              <td className="px-5 py-3 text-gray-600">{b.hubs?.name ?? '—'}</td>
              <td className="px-5 py-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOUR[b.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {b.status.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-5 py-3 text-center text-gray-600">
                {b.booking_bags?.length ?? 0}
              </td>
              <td className="px-5 py-3 text-xs text-gray-500">
                <p>{formatDateTimeSLT(b.start_time)}</p>
                <p className="text-gray-400">→ {formatDateTimeSLT(b.end_time)}</p>
              </td>
              <td className="px-5 py-3 text-right font-semibold text-ocean-900">
                LKR {b.total_price.toLocaleString()}
              </td>
            </tr>
          ))}
          {!bookings?.length && (
            <tr>
              <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                No bookings found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
