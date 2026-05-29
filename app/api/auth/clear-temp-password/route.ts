/**
 * Copyright (c) 2025 Saidi Tembo. All rights reserved.
 * Unauthorised copying, modification, distribution or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of Saidi Tembo.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  // Read the user from the session cookie (set by the browser after updateUser)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use admin client to bypass RLS and clear the flag
  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
