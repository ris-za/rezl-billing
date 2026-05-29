/**
 * Copyright (c) 2025 Saidi Tembo. All rights reserved.
 * Unauthorised copying, modification, distribution or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of Saidi Tembo.
 */

export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ReportsClient } from '@/components/ReportsClient'
import type { InvoiceWithCustomer, Customer, Payment } from '@/types'

export default async function ReportsPage() {
  // Auth check via user client, data via admin client (bypasses broken RLS)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [{ data: invoices }, { data: customers }, { data: payments }] = await Promise.all([
    admin.from('invoices').select('*, customers(*)').order('created_at', { ascending: false }),
    admin.from('customers').select('*').eq('is_active', true).order('name'),
    admin.from('payments').select('*'),
  ])

  return (
    <ReportsClient
      invoices={(invoices as InvoiceWithCustomer[]) ?? []}
      customers={(customers as Customer[]) ?? []}
      payments={(payments as Payment[]) ?? []}
    />
  )
}
