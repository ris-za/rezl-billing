/**
 * Copyright (c) 2025 Saidi Tembo. All rights reserved.
 * Unauthorised copying, modification, distribution or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of Saidi Tembo.
 */

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role = 'viewer'
  if (user) {
    // Use admin client to bypass RLS — layout is server-only, role drives UI visibility only
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role ?? 'viewer'
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#f4f6fa' }}>
      <div className="print:hidden">
        <Sidebar role={role} />
      </div>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
