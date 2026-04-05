import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/AdminShell'
import { StickerBatchForm } from '@/components/admin/StickerBatchForm'
import { Tag } from 'lucide-react'
import { type UserRole } from '@/types/database'
import { format } from 'date-fns'

export default async function AdminStickersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single() as { data: { name: string; role: UserRole } | null; error: unknown }

  const [{ data: hubs }, { data: batches }] = await Promise.all([
    supabase
      .from('hubs')
      .select('id, name, alias')
      .eq('active', true)
      .order('name') as unknown as Promise<{ data: { id: string; name: string; alias: string }[] | null; error: unknown }>,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('sticker_batches') as any)
      .select('id, prefix, from_number, to_number, created_at, hubs ( name, alias )')
      .order('created_at', { ascending: false }) as Promise<{
        data: {
          id: string
          prefix: string
          from_number: number
          to_number: number
          created_at: string
          hubs: { name: string; alias: string } | null
        }[] | null
        error: unknown
      }>,
  ])

  // Group batches by hub
  const batchesByHub: Record<string, typeof batches> = {}
  batches?.forEach((b) => {
    const hubName = b.hubs?.name ?? 'Unknown'
    if (!batchesByHub[hubName]) batchesByHub[hubName] = []
    batchesByHub[hubName]!.push(b)
  })

  return (
    <AdminShell userName={profile?.name ?? '—'} userRole={profile?.role ?? 'admin'}>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-ocean-900 mb-1">Sticker Batches</h1>
            <p className="text-sm text-gray-400">{batches?.length ?? 0} batches registered</p>
          </div>
          <StickerBatchForm hubs={hubs ?? []} />
        </div>

        {Object.entries(batchesByHub).length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-12 text-center text-gray-400 text-sm">
            No sticker batches yet. Add one above.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(batchesByHub).map(([hubName, hubBatches]) => (
              <div key={hubName}>
                <h2 className="font-bold text-ocean-900 text-sm mb-3">{hubName}</h2>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-50 bg-gray-50/50">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Prefix</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Range</th>
                        <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400">Count</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hubBatches?.map((b) => (
                        <tr key={b.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-5 py-3">
                            <span className="flex items-center gap-1.5 font-mono text-sm font-bold text-ocean-900">
                              <Tag size={13} className="text-brand" />
                              {b.prefix}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-gray-600">
                            {b.prefix}-{b.from_number} → {b.prefix}-{b.to_number}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="text-xs font-bold bg-brand/10 text-brand px-2 py-0.5 rounded-full">
                              {b.to_number - b.from_number + 1}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-400">
                            {format(new Date(b.created_at), 'dd MMM yyyy')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
