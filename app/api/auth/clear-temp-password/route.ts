import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  // The proxy already ensures only authenticated users reach this route.
  // Decode the JWT to extract the user ID — no need to re-verify the signature.
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  let userId: string | null = null

  if (token) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
      userId = payload.sub ?? null
    } catch {
      // malformed token — fall through
    }
  }

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
