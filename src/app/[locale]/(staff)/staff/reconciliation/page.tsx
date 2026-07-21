import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Landmark, Coins, Receipt, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { SignOutButton } from '@/components/shared/SignOutButton'
import { createClient } from '@/lib/supabase/server'
import { getStaffCashReconciliationAction } from '@/lib/staff/actions'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reconciliation — Staff' }

export default async function ReconciliationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

  const { data: staffRow } = await supabase
    .from('hub_staff')
    .select('hub_id, hubs(name)')
    .eq('user_id', user.id)
    .eq('active', true)
    .single() as { data: { hub_id: string; hubs: { name: string } | null } | null }

  if (!staffRow) redirect('/staff/login')

  const reconciliation = await getStaffCashReconciliationAction()
  const total = reconciliation.totalCollected || 0
  const breakdown = reconciliation.breakdown || []

  // Map backend payment types to clean labels and icons
  const typeMap: Record<string, { label: string; icon: React.ReactNode }> = {
    booking: { label: 'Base Bookings (Cash)', icon: <Receipt size={16} className="text-blue-400" /> },
    early_checkin: { label: 'Early Check-In Fees (Cash)', icon: <Coins size={16} className="text-amber-400" /> },
    late_fee: { label: 'Late Checkout Fees (Cash)', icon: <Landmark size={16} className="text-red-400" /> },
  }

  return (
    <div className="min-h-screen bg-ocean-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <Link
          href="/staff/dashboard"
          className="flex items-center gap-1 text-white/60 hover:text-white text-sm"
        >
          <ChevronLeft size={16} />
          Dashboard
        </Link>
        <Logo variant="white" size="sm" />
        <SignOutButton portal="staff" iconOnly />
      </div>

      <div className="px-4 py-6 max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            💵 Cash Drawer Shift Report
          </h1>
          <p className="text-white/50 text-xs mt-1">
            End of shift cash reconciliation for counter drawer at <strong className="text-white/80 font-bold">{staffRow.hubs?.name}</strong>.
          </p>
        </div>

        {/* Total Cash expected */}
        <div className="bg-brand rounded-3xl p-6 relative overflow-hidden shadow-xl border border-white/10">
          <div className="relative z-10 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Expected Drawer Cash</span>
            <p className="text-4xl font-black tracking-tight text-white">
              LKR {total.toLocaleString()}
            </p>
            <p className="text-[10px] text-white/50 pt-2 italic">
              Computed strictly from system-calculated paid counter transactions collected today.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 translate-y-1/4 translate-x-1/4">
            <Landmark size={150} />
          </div>
        </div>

        {/* Payments breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/70">Reconciliation Breakdown</h3>
          <div className="space-y-3">
            {breakdown.map((item) => {
              const meta = typeMap[item.type] || { label: `${item.type.toUpperCase()} Payments`, icon: <Receipt size={16} /> }
              return (
                <div key={item.type} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0 text-sm">
                  <div className="flex items-center gap-2.5">
                    {meta.icon}
                    <div>
                      <p className="font-bold text-white/90">{meta.label}</p>
                      <p className="text-[10px] text-white/40">{item.count} transaction{item.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <p className="font-mono font-bold text-white">LKR {item.total.toLocaleString()}</p>
                </div>
              )
            })}

            {breakdown.length === 0 && (
              <p className="text-center py-6 text-xs text-white/45 italic">No cash transactions collected during this shift yet.</p>
            )}
          </div>
        </div>

        {/* Verification Checklist */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/70">Reconciliation Checklist</h3>
          <div className="space-y-3 text-xs text-white/70 leading-relaxed">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" className="mt-0.5 rounded border-white/10 bg-white/5 text-brand-light focus:ring-brand-light" />
              <span>Verify that the actual cash amount matches <strong>LKR {total.toLocaleString()}</strong>.</span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" className="mt-0.5 rounded border-white/10 bg-white/5 text-brand-light focus:ring-brand-light" />
              <span>Audit and bundle all physical counter collection receipts.</span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" className="mt-0.5 rounded border-white/10 bg-white/5 text-brand-light focus:ring-brand-light" />
              <span>Confirm drop-off and pickup tags are reconciled on racks.</span>
            </label>
          </div>

          <div className="pt-2">
            <Link href="/staff/dashboard">
              <button className="w-full py-3 rounded-xl bg-brand text-white font-extrabold hover:bg-brand/90 transition-all flex items-center justify-center gap-1 text-xs">
                Submit Report & End Shift <ArrowRight size={14} />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
