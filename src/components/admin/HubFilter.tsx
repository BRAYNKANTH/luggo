'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Hub {
  id: string
  name: string
}

interface HubFilterProps {
  hubs: Hub[]
  currentHubId?: string
}

export function HubFilter({ hubs, currentHubId }: HubFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(hubId: string) {
    const sp = new URLSearchParams(searchParams.toString())
    if (hubId) {
      sp.set('hub', hubId)
    } else {
      sp.delete('hub')
    }
    sp.set('page', '1') // Reset to page 1 on filter change
    router.push(`/admin/bookings?${sp.toString()}`)
  }

  return (
    <select
      value={currentHubId ?? ''}
      onChange={(e) => handleChange(e.target.value)}
      className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/30"
    >
      <option value="">All hubs</option>
      {hubs.map((h) => (
        <option key={h.id} value={h.id}>
          {h.name}
        </option>
      ))}
    </select>
  )
}
