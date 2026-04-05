'use client'

import { useState, useTransition } from 'react'
import { deleteNearbyPlace } from '@/lib/admin/actions'
import { Trash2 } from 'lucide-react'

export function DeleteNearbyPlace({ placeId }: { placeId: string }) {
  const [confirm, setConfirm]   = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError]       = useState<string | null>(null)

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50"
        title="Delete"
      >
        <Trash2 size={14} />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-500">{error}</span>}
      <button
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await deleteNearbyPlace(placeId)
            if (result.error) setError(result.error)
          })
        }}
        disabled={isPending}
        className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
      >
        {isPending ? '…' : 'Delete'}
      </button>
      <button
        onClick={() => setConfirm(false)}
        className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
      >
        Cancel
      </button>
    </div>
  )
}
