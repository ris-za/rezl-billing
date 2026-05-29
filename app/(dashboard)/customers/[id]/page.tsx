export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CustomerForm } from '@/components/CustomerForm'
import { formatUSD, getContractEndDate, getContractStatus } from '@/lib/calculations'
import { format, differenceInDays } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, AlertTriangle, XCircle, Zap, FileText } from 'lucide-react'
import { CustomerDangerZone } from '@/components/CustomerDangerZone'
import type { InvoiceWithCustomer } from '@/types'

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Paid</span>
  if (status === 'overdue') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Overdue</span>
  if (status === 'issued') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Issued</span>
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Draft</span>
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = profile?.role === 'admin'

  const [{ data: customer }, { data: invoices }, { count: paymentCount }] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).single(),
    supabase.from('invoices').select('*, customers(*)').eq('customer_id', id).order('billing_month', { ascending: false }),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('customer_id', id),
  ])

  if (!customer) notFound()

  const endDate = getContractEndDate(customer.contract_start_date, customer.contract_duration_months)
  const contractStatus = endDate ? getContractStatus(endDate) : null
  const daysLeft = endDate ? differenceInDays(endDate, new Date()) : 0

  return (
    <div className="p-8 max-w-[1400px]">
      {/* Back + header */}
      <div className="mb-8">
        <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Customers
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{customer.name}</h1>
            <p className="text-gray-500 text-sm mt-1">Service No: <span className="font-mono">{customer.service_number}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/customers/${customer.id}/statement`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ background: '#f8f9fc', color: '#1e2235', border: '1px solid #e5e7eb' }}
            >
              <FileText className="w-4 h-4" />
              Statement
            </Link>
            {isAdmin && (
              <Link
                href="/billing"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
              >
                <Zap className="w-4 h-4" />
                Create Invoice
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Contract status card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100">Contract Status</h3>
            {!customer.contract_start_date ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">No contract set yet.</p>
                <p className="text-xs text-gray-400 leading-relaxed">Contract dates and tariff rate are entered when generating the first invoice.</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  {contractStatus === 'expired' && (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="w-5 h-5" />
                      <span className="font-semibold">Contract Expired</span>
                    </div>
                  )}
                  {contractStatus === 'expiring_soon' && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-semibold">Expiring in {daysLeft} days</span>
                    </div>
                  )}
                  {contractStatus === 'active' && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Contract Active</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Start Date</span>
                    <span className="font-medium text-gray-800">{format(new Date(customer.contract_start_date), 'dd MMM yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-medium text-gray-800">{customer.contract_duration_months} months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">End Date</span>
                    <span className="font-medium text-gray-800">{endDate ? format(endDate, 'dd MMM yyyy') : 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tariff Rate</span>
                    <span className="font-medium text-gray-800">{customer.tariff_rate ? `${formatUSD(customer.tariff_rate)}/kWh` : 'Not set'}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Contact details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100">Contact Details</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'TPIN', value: customer.tpin },
                { label: 'Address', value: customer.address },
                { label: 'Email', value: customer.email },
                { label: 'Phone', value: customer.phone },
              ].filter(({ value }) => !!value).map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="font-medium text-gray-800">{value}</p>
                </div>
              ))}
              {!customer.tpin && !customer.address && !customer.email && !customer.phone && (
                <p className="text-xs text-gray-400 italic">No contact details on file.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Edit form */}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-5 pb-4 border-b border-gray-100">Edit Customer</h3>
              <CustomerForm customer={customer} />
            </div>
          )}

          {/* Invoice history */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Invoice History</h3>
            </div>
            {!invoices || invoices.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">No invoices for this customer yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#f8f9fc' }}>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Period</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoices as InvoiceWithCustomer[]).map((inv) => (
                    <tr key={inv.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3.5 px-6">
                        <Link href={`/invoices/${inv.id}`} className="font-semibold text-primary hover:underline">
                          INV-{inv.invoice_number}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">{inv.billing_period}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-gray-900">{formatUSD(inv.total)}</td>
                      <td className="py-3.5 px-6"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Danger zone */}
          {isAdmin && (
            <CustomerDangerZone
              customerId={customer.id}
              customerName={customer.name}
              hasHistory={(invoices?.length ?? 0) > 0 || (paymentCount ?? 0) > 0}
            />
          )}
        </div>
      </div>
    </div>
  )
}
