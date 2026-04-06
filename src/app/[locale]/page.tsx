import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandingPage } from '@/components/marketing/LandingPage'
import { type UserRole } from '@/types/database'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <LandingPage />
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: UserRole } | null; error: unknown }

  if (!profile) redirect('/login')

  switch (profile.role) {
    case 'hub_staff':
      redirect('/staff/dashboard')
    case 'support_admin':
    case 'ops_admin':
    case 'master_admin':
      redirect('/admin/dashboard')
    default:
      redirect('/dashboard')
  }
}
