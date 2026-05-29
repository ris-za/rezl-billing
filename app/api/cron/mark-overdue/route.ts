/**
 * Copyright (c) 2025 Saidi Tembo. All rights reserved.
 * Unauthorised copying, modification, distribution or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of Saidi Tembo.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Called nightly by Vercel cron (see vercel.json)
// Flips any 'issued' invoice whose due_date has passed to 'overdue'
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const { data, error } = await admin
    .from('invoices')
    .update({ status: 'overdue' })
    .eq('status', 'issued')
    .not('due_date', 'is', null)
    .lt('due_date', today)
    .select('id, invoice_number')

  if (error) {
    console.error('[cron/mark-overdue] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const count = data?.length ?? 0
  console.log(`[cron/mark-overdue] marked ${count} invoice(s) overdue`)

  return NextResponse.json({
    success: true,
    marked: count,
    invoices: data?.map((i) => `INV-${i.invoice_number}`) ?? [],
  })
}
