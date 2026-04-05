'use client'

import { useState, useTransition } from 'react'
import { updateComplaintStatus } from '@/lib/admin/actions'
import { type ComplaintStatus } from '@/types/database'

const TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  open:      ['in_review', 'closed'],
  in_review: ['resolved', 'closed'],
  resolved:  ['closed'],
  closed:    [],
}

const LABELS: Record<ComplaintStatus, string> = {
  open:      'Open',
  in_review: 'In Review',
  resolved:  'Resolved',
  closed:    'Closed',
}

const COLOURS: Record<ComplaintStatus, string> = {
  open:      'bg-red-100 text-red-600',
  in_review: 'bg-amber-100 text-amber-700',
  resolved:  'bg-green-100 text-green-700',
  closed:    'bg-gray-100 text-gray-400',
}

interface ComplaintActionsProps {
  complaintId: string
  initialStatus: ComplaintStatus
}

export function ComplaintActions({ complaintId, initialStatus }: ComplaintActionsProps) {
  const [status, setStatus] = useState<ComplaintStatus>(initialStatus)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const next = TRANSITIONS[status]

  function handle(newStatus: ComplaintStatus) {
    setError(null)
    const prev = status
    setStatus(newStatus)
    startTransition(async () => {
      const result = await updateComplaintStatus(complaintId, newStatus)
      if (result.error) {
        setStatus(prev)
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${COLOURS[status]}`}>
        {LABELS[status]}
      </span>
      {next.map((s) => (
        <button
          key={s}
          onClick={() => handle(s)}
          disabled={isPending}
          className="text-xs px-2.5 py-1 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          → {LABELS[s]}
        </button>
      ))}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
