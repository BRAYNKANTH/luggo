'use client'

import { useState, useTransition } from 'react'
import { createStickerBatch } from '@/lib/admin/actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus } from 'lucide-react'

interface Hub { id: string; name: string; alias: string }

export function StickerBatchForm({ hubs }: { hubs: Hub[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [hubId,  setHubId]  = useState(hubs[0]?.id ?? '')
  const [from,   setFrom]   = useState('')
  const [to,     setTo]     = useState('')

  const selectedHub = hubs.find((h) => h.id === hubId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const fromNum = Number(from)
    const toNum   = Number(to)

    if (!fromNum || !toNum) { setError('Enter valid numbers'); return }
    if (fromNum >= toNum)   { setError('From must be less than To'); return }

    startTransition(async () => {
      const result = await createStickerBatch(hubId, selectedHub?.alias ?? '', fromNum, toNum)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setFrom(''); setTo('')
        setTimeout(() => { setOpen(false); setSuccess(false) }, 1200)
      }
    })
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand/80 transition-colors"
        >
          <Plus size={16} />
          Add batch
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-brand/20 p-5 space-y-4"
        >
          <h3 className="font-bold text-ocean-900 text-sm">New Sticker Batch</h3>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Hub</label>
            <select
              value={hubId}
              onChange={(e) => setHubId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              {hubs.map((h) => (
                <option key={h.id} value={h.id}>{h.name} ({h.alias})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="from"
              label="From number"
              type="number"
              min="1"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="e.g. 1"
            />
            <Input
              id="to"
              label="To number"
              type="number"
              min="2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="e.g. 100"
            />
          </div>

          {selectedHub && from && to && Number(from) < Number(to) && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
              Preview: <span className="font-mono font-bold text-ocean-900">
                {selectedHub.alias}-{from}
              </span> to <span className="font-mono font-bold text-ocean-900">
                {selectedHub.alias}-{to}
              </span> ({Number(to) - Number(from) + 1} stickers)
            </p>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
          {success && <p className="text-xs text-green-600 font-semibold">Batch created!</p>}

          <div className="flex gap-2">
            <Button type="submit" loading={isPending} size="sm">
              Create
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setOpen(false); setError(null) }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
