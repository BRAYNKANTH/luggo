import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { type UserRole } from '@/types/database'

// Kept out of the 'use server' actions module so it is never exposed as a
// callable server action endpoint.
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, error: 'Not authenticated' }

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: UserRole } | null; error: unknown }

  const adminRoles: UserRole[] = ['support_admin', 'ops_admin', 'master_admin']
  if (!data || !adminRoles.includes(data.role)) {
    return { supabase: null, error: 'Forbidden' }
  }

  const svc = createServiceClient()
  return { supabase, svc, userId: user.id, role: data.role, error: null }
}
