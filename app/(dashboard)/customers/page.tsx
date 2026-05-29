export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import { DeleteCustomerButton } from '@/components/DeleteCustomerButton'
import type { Customer } from '@/types'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user!.id).single()
  const role    = profile?.role ?? 'viewer'
  const isAdmin = role === 'admin'
  const canEdit = role === 'admin' || role === 'user'

  const [{ data: customers }, { data: inactiveCustomers }] = await Promise.all([
    admin.from('customers').select('*').eq('is_active', true).order('name'),
    admin.from('customers').select('*').eq('is_active', false).order('name'),
  ])

  const typedCustomers = customers as Customer[] | null
  const typedInactive = inactiveCustomers as Customer[] | null

  return (
    <div className="p-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customers</h1>
          <p className="text-gray-500 text-sm mt-1">{typedCustomers?.length ?? 0} active customers</p>
        </div>
        {canEdit && (
          <Link
            href="/customers/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </Link>
        )}
      </div>

      {/* Active customers table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!typedCustomers || typedCustomers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500 mb-1">No customers yet</p>
            {canEdit && (
              <Link href="/customers/new" className="text-xs text-primary hover:underline">
                Add your first customer
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8f9fc' }}>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Service No.</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">TPIN</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                <th className="py-3 px-6" />
              </tr>
            </thead>
            <tbody>
              {typedCustomers.map((c) => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6">
                    <p className="font-semibold text-gray-900">{c.name}</p>
                    {c.address && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{c.address}</p>}
                  </td>
                  <td className="py-4 px-4 font-mono text-xs font-semibold text-gray-700">{c.service_number}</td>
                  <td className="py-4 px-4 text-gray-500 text-sm">{c.tpin || <span className="text-gray-300 text-xs">Not set</span>}</td>
                  <td className="py-4 px-4">
                    {c.email && <p className="text-sm text-gray-600">{c.email}</p>}
                    {c.phone && <p className="text-xs text-gray-400 mt-0.5">{c.phone}</p>}
                    {!c.email && !c.phone && <span className="text-gray-300 text-xs">Not provided</span>}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Link
                      href={`/customers/${c.id}`}
                      className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Inactive customers */}
      {typedInactive && typedInactive.length > 0 && (
        <div className="mt-10">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Inactive Customers</p>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden opacity-70">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#f8f9fc' }}>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Service No.</th>
                  <th className="py-3 px-6" />
                </tr>
              </thead>
              <tbody>
                {typedInactive.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="py-3.5 px-6">
                      <p className="font-medium text-gray-500">{c.name}</p>
                      {c.tpin && <p className="text-xs text-gray-400 mt-0.5">TPIN: {c.tpin}</p>}
                    </td>
                    <td className="py-3.5 px-4 text-gray-400 font-mono text-xs">{c.service_number}</td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/customers/${c.id}`} className="text-xs text-gray-400 hover:text-primary transition-colors">
                          View →
                        </Link>
                        {isAdmin && (
                          <DeleteCustomerButton customerId={c.id} customerName={c.name} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
