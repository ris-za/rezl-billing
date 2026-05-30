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
import { BillingForm } from '@/components/BillingForm'
import { Zap } from 'lucide-react'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user!.id).single()
  const role = profile?.role ?? 'viewer'
  if (role !== 'admin' && role !== 'user') redirect('/')

  const { data: customers } = await admin
    .from('customers')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">New Invoice</h1>
        <p className="text-gray-500 text-sm mt-1">Select a customer, enter consumption, and generate the proforma invoice</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-5 pb-4 border-b border-gray-100">Billing Details</h2>
            <BillingForm customers={customers ?? []} />
          </div>
        </div>

        {/* Info sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700">Invoice Calculation</h3>
            </div>
            <div className="space-y-3 text-xs text-gray-500 leading-relaxed">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span>Subtotal</span>
                <span className="font-medium text-gray-700">kWh × Tariff Rate</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span>Electricity Levy</span>
                <span className="font-medium text-gray-700">Subtotal × 3%</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span>VAT</span>
                <span className="font-medium text-gray-700">Subtotal × 16%</span>
              </div>
              <div className="flex justify-between py-1.5 font-semibold text-gray-900">
                <span>Total</span>
                <span>Sum of above</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 leading-relaxed">
            <p className="font-semibold mb-1">Note</p>
            <p>Invoices are issued as proforma. Mark them as <strong>Paid</strong> once payment is received.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
