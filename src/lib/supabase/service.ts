import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client.
 * Bypasses RLS — use only in trusted server contexts (cron, webhooks, admin actions).
 * Never expose to the browser.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
