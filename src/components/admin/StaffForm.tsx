'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react'
import { createStaffMember } from '@/lib/admin/staffActions'

interface Props {
  hubs: { id: string; name: string; alias: string }[]
}

export function StaffForm({ hubs }: Props) {
  const [isPending, startTransition] = useTransition()
  const [email, setEmail]   = useState('')
  const [name, setName]     = useState('')
  const [hubId, setHubId]   = useState(hubs[0]?.id ?? '')
  const [error, setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await createStaffMember({ email: email.trim(), name: name.trim(), hubId })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(`Staff member added successfully${result.created ? ' — a login link has been sent to their email.' : '.'}`)
        setEmail('')
        setName('')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email address *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@example.com"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>

        {/* Name (only needed for new accounts) */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            Full name <span className="text-gray-400 font-normal">(required for new accounts)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Silva"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>

        {/* Hub */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Assigned hub *</label>
          <select
            required
            value={hubId}
            onChange={(e) => setHubId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white"
          >
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.alias} — {h.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700">
          <CheckCircle size={15} className="mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      <Button type="submit" loading={isPending} className="gap-2">
        <UserPlus size={15} />
        Add staff member
      </Button>
    </form>
  )
}
