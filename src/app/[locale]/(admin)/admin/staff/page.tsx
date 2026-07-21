import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin/actions'
import { AdminShell } from '@/components/admin/AdminShell'
import { StaffForm } from '@/components/admin/StaffForm'
import { type UserRole } from '@/types/database'
import { format } from 'date-fns'
import { UserCheck, UserX, Building2 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Staff — Admin' }

type StaffRow = {
  id: string
  active: boolean
  created_at: string
  users: { id: string; name: string; email: string; phone: string | null } | null
  hubs: { id: string; name: string; alias: string } | null
}

async function toggleStaffAction(staffId: string, active: boolean) {
  'use server'
  const { svc, error } = await requireAdmin()
  if (error || !svc) redirect('/admin/login')
  await svc.from('hub_staff' as never).update({ active }).eq('id', staffId)
  redirect('/admin/staff')
}

export default async function AdminStaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single() as { data: { name: string; role: UserRole } | null; error: unknown }

  // Get all hubs for the form dropdown
  const { data: hubs } = await supabase
    .from('hubs')
    .select('id, name, alias')
    .eq('active', true)
    .order('name') as {
      data: { id: string; name: string; alias: string }[] | null
      error: unknown
    }

  // Get all staff with user + hub info
  const { data: staffList } = await supabase
    .from('hub_staff')
    .select(`
      id, active, created_at,
      users ( id, name, email, phone ),
      hubs ( id, name, alias )
    `)
    .order('created_at', { ascending: false }) as {
      data: StaffRow[] | null
      error: unknown
    }

  const activeStaff   = staffList?.filter(s => s.active) ?? []
  const inactiveStaff = staffList?.filter(s => !s.active) ?? []

  return (
    <AdminShell userName={profile?.name ?? '—'} userRole={profile?.role ?? 'admin'}>
      <div className="px-6 py-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-extrabold text-ocean-900 mb-1">Staff Management</h1>
        <p className="text-sm text-gray-400 mb-8">
          {activeStaff.length} active staff across {hubs?.length ?? 0} hubs
        </p>

        {/* Add new staff */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
          <h2 className="font-bold text-ocean-900 mb-1">Add Staff Member</h2>
          <p className="text-xs text-gray-400 mb-5">
            Enter the staff member&apos;s email and select their hub. If they don&apos;t have a Luggo account yet, one will be created and they&apos;ll receive a login link.
          </p>
          <StaffForm hubs={hubs ?? []} />
        </div>

        {/* Active staff */}
        {activeStaff.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
              <UserCheck size={16} className="text-green-500" />
              <h2 className="font-bold text-ocean-900">Active Staff ({activeStaff.length})</h2>
            </div>
            <StaffTable rows={activeStaff} isActive toggleAction={toggleStaffAction} />
          </div>
        )}

        {/* Inactive staff */}
        {inactiveStaff.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
              <UserX size={16} className="text-gray-400" />
              <h2 className="font-bold text-gray-500">Deactivated Staff ({inactiveStaff.length})</h2>
            </div>
            <StaffTable rows={inactiveStaff} isActive={false} toggleAction={toggleStaffAction} />
          </div>
        )}

        {staffList?.length === 0 && (
          <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <Building2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No staff added yet</p>
            <p className="text-sm mt-1">Use the form above to add your first staff member.</p>
          </div>
        )}
      </div>
    </AdminShell>
  )
}

function StaffTable({
  rows,
  isActive,
  toggleAction,
}: {
  rows: StaffRow[]
  isActive: boolean
  toggleAction: (staffId: string, active: boolean) => Promise<void>
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-50 bg-gray-50/50">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Name</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Email</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Hub</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Added</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
              <td className="px-5 py-3 font-medium text-ocean-900">
                {s.users?.name ?? '—'}
              </td>
              <td className="px-5 py-3 text-gray-500">{s.users?.email ?? '—'}</td>
              <td className="px-5 py-3">
                {s.hubs ? (
                  <span className="inline-flex items-center gap-1 text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                    {s.hubs.alias} — {s.hubs.name}
                  </span>
                ) : '—'}
              </td>
              <td className="px-5 py-3 text-xs text-gray-400">
                {format(new Date(s.created_at), 'dd MMM yyyy')}
              </td>
              <td className="px-5 py-3 text-right">
                <form action={toggleAction.bind(null, s.id, !isActive)}>
                  <button
                    type="submit"
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
