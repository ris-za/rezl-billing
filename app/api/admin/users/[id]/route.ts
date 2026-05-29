/**
 * Copyright (c) 2025 Saidi Tembo. All rights reserved.
 * Unauthorised copying, modification, distribution or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of Saidi Tembo.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_ROLES = ['admin', 'user', 'viewer']

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user.id : null
}

// PUT /api/admin/users/[id] — update name and role
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const callerId = await requireAdmin()
  if (!callerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const full_name: string = body.full_name ?? ''
  const role: string      = body.role ?? ''

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Update auth user metadata
  const { error: authError } = await admin.auth.admin.updateUserById(id, {
    user_metadata: { full_name },
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // Update profile — upsert in case profile row is missing
  const { error: profileError } = await admin
    .from('profiles')
    .upsert(
      { id, full_name, role, must_change_password: false },
      { onConflict: 'id' }
    )
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// DELETE /api/admin/users/[id] — delete user
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const callerId = await requireAdmin()
  if (!callerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  if (id === callerId) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Delete profile first (FK), then auth user
  await admin.from('profiles').delete().eq('id', id)

  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
