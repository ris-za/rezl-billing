import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const admin = createAdminClient()

  // Try Authorization header first (fresh token after password update)
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  let userId: string | null = null

  if (token) {
    const { data: { user } } = await admin.auth.getUser(token)
    userId = user?.id ?? null
  }

  // Fall back to cookie-based session
  if (!userId) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  }

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await admin.from('profiles').update({ must_change_password: false }).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
