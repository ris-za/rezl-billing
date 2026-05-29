export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { InvoiceWithCustomer } from '@/types'
import { InvoicesClient } from '@/components/InvoicesClient'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user!.id).single()
  const role    = profile?.role ?? 'viewer'
  const isAdmin = role === 'admin'
  const canEdit = role === 'admin' || role === 'user'

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, customers(*)')
    .order('created_at', { ascending: false })

  const typedInvoices = (invoices as InvoiceWithCustomer[] | null) ?? []

  return (
    <div className="p-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">{typedInvoices.length} total invoices</p>
        </div>
        {canEdit && (
          <Link
            href="/billing"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </Link>
        )}
      </div>

      <InvoicesClient invoices={typedInvoices} isAdmin={isAdmin} />
    </div>
  )
}
