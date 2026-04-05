'use client'

import { useState, useTransition } from 'react'
import { toggleHubActive } from '@/lib/admin/actions'

interface HubToggleProps {
  hubId: string
  initialActive: boolean
}

export function HubToggle({ hubId, initialActive }: HubToggleProps) {
  const [active, setActive] = useState(initialActive)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const next = !active
    setActive(next)
    startTransition(async () => {
      const result = await toggleHubActive(hubId, next)
      if (result.error) setActive(!next) // revert on error
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        active ? 'bg-brand' : 'bg-gray-200'
      } ${isPending ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
      role="switch"
      aria-checked={active}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          active ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
