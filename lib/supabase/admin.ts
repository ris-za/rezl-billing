import { createClient } from '@supabase/supabase-js'

/**
 * Supabase admin client — uses service_role key.
 * ONLY use in server-side code (API routes). Never expose to the browser.
 */
export function createAdminClient() {
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
