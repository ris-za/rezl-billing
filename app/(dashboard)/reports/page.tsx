export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { ReportsClient } from '@/components/ReportsClient'
import type { InvoiceWithCustomer, Customer } from '@/types'

export default async function ReportsPage() {
  const supabase = await createClient()

  const [{ data: invoices }, { data: customers }] = await Promise.all([
    supabase.from('invoices').select('*, customers(*)').order('created_at', { ascending: false }),
    supabase.from('customers').select('*').eq('is_active', true).order('name'),
  ])

  return (
    <ReportsClient
      invoices={(invoices as InvoiceWithCustomer[]) ?? []}
      customers={(customers as Customer[]) ?? []}
    />
  )
}
