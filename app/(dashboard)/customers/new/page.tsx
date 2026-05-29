export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { CustomerForm } from '@/components/CustomerForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewCustomerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/customers')

  return (
    <div className="p-8 max-w-[1400px]">
      <div className="mb-8">
        <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Customers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Add Customer</h1>
        <p className="text-gray-500 text-sm mt-1">Create a new customer profile and contract</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-5 pb-4 border-b border-gray-100">Customer Details</h2>
            <CustomerForm />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800 leading-relaxed">
            <p className="font-semibold mb-2">Required fields</p>
            <ul className="space-y-1 text-xs text-blue-700 list-disc list-inside">
              <li>Customer Name</li>
              <li>Service Number (unique)</li>
            </ul>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
            Contract dates and tariff rate are entered when generating the first invoice.
          </div>
        </div>
      </div>
    </div>
  )
}
