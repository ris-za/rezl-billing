import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? supabase : null
}

// GET /api/admin/users — list all users
export async function GET() {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profiles } = await admin.from('profiles').select('id, role, full_name, must_change_password')

  const result = users.map(u => {
    const p = profiles?.find(p => p.id === u.id)
    return {
      id:                  u.id,
      email:               u.email ?? '',
      full_name:           p?.full_name ?? u.user_metadata?.full_name ?? '',
      role:                p?.role ?? 'user',
      must_change_password: p?.must_change_password ?? false,
      created_at:          u.created_at,
    }
  })

  return NextResponse.json(result)
}

// POST /api/admin/users — create user
export async function POST(req: Request) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, full_name, role, password } = await req.json()
  if (!email || !password || !role) {
    return NextResponse.json({ error: 'email, password and role are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create auth user with confirmed email so they can log in immediately
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })
  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })

  // Upsert profile
  const { error: profileError } = await admin.from('profiles').upsert({
    id:                  newUser.user.id,
    role,
    full_name,
    must_change_password: true,
  })
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ success: true, id: newUser.user.id })
}
