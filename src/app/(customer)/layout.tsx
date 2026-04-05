import { createClient } from '@/lib/supabase/server'
import { CustomerShell } from '@/components/shared/CustomerShell'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let activeCount = 0
  if (user) {
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('status', 'in', '("completed","cancelled","expired","pending_payment")')
    activeCount = count ?? 0
  }

  return <CustomerShell activeCount={activeCount} isLoggedIn={!!user}>{children}</CustomerShell>
}
