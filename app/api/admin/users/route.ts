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

// GET /api/admin/users — list all users
export async function GET() {
  const callerId = await requireAdmin()
  if (!callerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, role, full_name, must_change_password')

  const result = users.map(u => {
    const p = profiles?.find(p => p.id === u.id)
    return {
      id:                  u.id,
      email:               u.email ?? '',
      full_name:           p?.full_name ?? u.user_metadata?.full_name ?? '',
      role:                p?.role ?? 'viewer',
      must_change_password: p?.must_change_password ?? false,
      created_at:          u.created_at,
    }
  })

  return NextResponse.json(result)
}

// POST /api/admin/users — create user
export async function POST(req: Request) {
  const callerId = await requireAdmin()
  if (!callerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, full_name, role, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create auth user with email confirmed so they can log in immediately
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name || '' },
  })
  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })

  const userId = created.user.id

  // Upsert profile — handles both cases: trigger already created a row, or no trigger
  const { error: profileError } = await admin
    .from('profiles')
    .upsert(
      { id: userId, role, full_name: full_name || '', must_change_password: true },
      { onConflict: 'id' }
    )

  if (profileError) {
    // Clean up the auth user so we don't leave orphans
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: `Profile error: ${profileError.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: userId })
}
