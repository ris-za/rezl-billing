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
import { notFound } from 'next/navigation'
import { formatUSD } from '@/lib/calculations'
import { format } from 'date-fns'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { PrintStatementButton } from '@/components/PrintStatementButton'
import type { Invoice, Payment } from '@/types'

export default async function StatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Auth check via user client, data via admin client (bypasses broken RLS)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = createAdminClient()

  const [{ data: customer }, { data: invoicesRaw }, { data: paymentsRaw }] = await Promise.all([
    admin.from('customers').select('*').eq('id', id).single(),
    admin.from('invoices').select('*').eq('customer_id', id).neq('status', 'cancelled').order('billing_month', { ascending: true }),
    admin.from('payments').select('*').eq('customer_id', id).order('payment_date', { ascending: true }),
  ])

  if (!customer) notFound()

  const invoices = (invoicesRaw ?? []) as Invoice[]
  const payments = (paymentsRaw ?? []) as Payment[]

  // Merge and sort all rows by date, track running balance
  type Row =
    | { kind: 'invoice'; date: string; data: Invoice; balance: number }
    | { kind: 'payment'; date: string; data: Payment; balance: number }

  let balance = 0
  const rows: Row[] = [
    ...invoices.map(inv => ({ kind: 'invoice' as const, date: inv.billing_month, data: inv })),
    ...payments.map(pay => ({ kind: 'payment' as const, date: pay.payment_date,  data: pay  })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(row => {
      if (row.kind === 'invoice') balance += (row.data as Invoice).total
      else                        balance -= (row.data as Payment).amount
      return { ...row, balance }
    })

  const totalBilled   = invoices.reduce((s, i) => s + i.total,    0)
  const totalReceived = payments.reduce((s, p) => s + p.amount,   0)
  const outstanding   = totalBilled - totalReceived

  return (
    <div className="p-6 lg:p-8 print:p-0" style={{ background: '#dde1ea', minHeight: '100vh' }}>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 print:hidden" style={{ maxWidth: '860px', margin: '0 auto 20px' }}>
        <Link href={`/customers/${id}`} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back to Customer
        </Link>
        <PrintStatementButton />
      </div>

      {/* Statement document */}
      <div
        id="statement-document"
        className="bg-white mx-auto overflow-hidden print:shadow-none print:max-w-none"
        style={{ maxWidth: '860px', border: '1px solid #d1d5db', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}
      >
        {/* Green top accent */}
        <div style={{ height: 3, background: 'linear-gradient(90deg,#16a34a,#22c55e,#16a34a)' }} />

        {/* Header */}
        <div
          style={{
            backgroundImage: 'linear-gradient(rgba(22,28,45,0.93), rgba(22,28,45,0.93)), url(/poll.jpg)',
            backgroundSize: 'cover', backgroundPosition: 'center',
          }}
          className="px-10 py-6 flex items-center justify-between gap-8"
        >
          <div>
            <Image src="/logowhite.png" alt="N-POWER" width={0} height={0} sizes="160px"
              style={{ width: 'auto', height: '26px', objectFit: 'contain' }} priority />
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-white font-semibold" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>RELIANCE ENERGY ZAMBIA LIMITED</p>
              <p className="font-light mt-0.5" style={{ color: '#6b7db3', fontSize: '9px' }}>TPIN: 1004222073 · VAT No: 1004222073</p>
              <p className="font-light mt-0.5" style={{ color: '#6b7db3', fontSize: '9px' }}>Plot 73719A, Sheki Sheki Road, Lusaka, Zambia</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-light tracking-[0.4em] uppercase mb-1" style={{ color: '#4ade80', fontSize: '8px' }}>Account</p>
            <p className="text-white font-light tracking-[0.1em]" style={{ fontSize: '26px', lineHeight: 1 }}>STATEMENT</p>
            <p className="font-light mt-1.5" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
              {format(new Date(), 'dd MMMM yyyy')}
            </p>
          </div>
        </div>

        {/* Account info + summary */}
        <div className="grid grid-cols-2" style={{ borderBottom: '1px solid #edf0f5' }}>
          <div className="px-10 py-6" style={{ borderRight: '1px solid #edf0f5' }}>
            <p className="font-normal text-gray-400 uppercase tracking-widest mb-2" style={{ fontSize: '8px' }}>Account Holder</p>
            <p className="font-semibold text-gray-900 text-lg">{customer.name}</p>
            {customer.tpin    && <p className="text-gray-400 text-xs mt-1">TPIN: {customer.tpin}</p>}
            {customer.address && <p className="text-gray-400 text-xs mt-1 leading-relaxed">{customer.address}</p>}
            <p className="text-gray-400 text-xs mt-1">Service No: <span className="font-mono">{customer.service_number}</span></p>
          </div>
          <div className="px-10 py-6" style={{ background: '#fafbfd' }}>
            <p className="font-normal text-gray-400 uppercase tracking-widest mb-4" style={{ fontSize: '8px' }}>Account Summary</p>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Invoiced</span>
                <span className="font-medium text-gray-800">{formatUSD(totalBilled)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Received</span>
                <span className="font-medium text-green-700">{formatUSD(totalReceived)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2" style={{ borderTop: '1px solid #e5e7eb' }}>
                <span className="font-semibold text-gray-700">Balance Due</span>
                <span className={`font-bold text-base ${outstanding > 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {formatUSD(Math.abs(outstanding))}{outstanding <= 0 ? ' (CR)' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions table */}
        <div className="px-10 py-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Transaction History</p>

          <div className="overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#1e2235' }}>
                  {['Date', 'Description', 'Invoice #', 'Ref', 'Debit', 'Credit', 'Balance'].map((h, i) => (
                    <th key={h}
                      className={`py-3 px-4 font-normal uppercase tracking-wider text-white ${i >= 4 ? 'text-right' : 'text-left'}`}
                      style={{ fontSize: '8px' }}
                    >{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-gray-400 italic">
                      No transactions on record.
                    </td>
                  </tr>
                )}
                {rows.map((row, i) => {
                  const isInv = row.kind === 'invoice'
                  const inv   = isInv  ? (row.data as Invoice) : null
                  const pay   = !isInv ? (row.data as Payment) : null
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', background: !isInv ? '#f0fdf4' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td className="py-3 px-4 text-xs text-gray-600 whitespace-nowrap">
                        {format(new Date((isInv ? inv!.billing_month : pay!.payment_date) + 'T00:00:00'), 'dd MMM yyyy')}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium" style={{ color: isInv ? '#1e2235' : '#15803d' }}>
                        {isInv ? `Invoice — ${inv!.billing_period}` : 'Payment Received'}
                        {pay?.notes ? <span className="text-gray-400 font-normal"> · {pay.notes}</span> : null}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-gray-400">
                        {isInv ? `INV-${inv!.invoice_number}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-gray-400">
                        {pay?.transaction_ref ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-gray-800">
                        {isInv ? formatUSD(inv!.total) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-xs font-medium text-green-700">
                        {!isInv ? formatUSD(pay!.amount) : '—'}
                      </td>
                      <td className={`py-3 px-4 text-right text-xs font-bold ${row.balance > 0 ? 'text-red-600' : 'text-green-700'}`}>
                        {formatUSD(Math.abs(row.balance))}{row.balance < 0 ? ' CR' : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#1e2235' }}>
                  <td colSpan={4} className="py-3.5 px-4 text-white font-normal text-xs uppercase tracking-wider">Closing Balance</td>
                  <td className="py-3.5 px-4 text-right text-white font-bold text-sm">{formatUSD(totalBilled)}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-sm" style={{ color: '#4ade80' }}>{formatUSD(totalReceived)}</td>
                  <td className={`py-3.5 px-4 text-right font-bold text-sm ${outstanding > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {formatUSD(Math.abs(outstanding))}{outstanding <= 0 ? ' CR' : ''}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            backgroundImage: 'linear-gradient(rgba(22,28,45,0.93), rgba(22,28,45,0.93)), url(/poll.jpg)',
            backgroundSize: 'cover', backgroundPosition: 'center bottom',
          }}
          className="px-10 py-5 flex items-center justify-between"
        >
          <p className="font-light text-xs" style={{ color: '#6b7db3' }}>
            Tel: +260 966 812 238 · +260 763 594 933 · md@relianceenergy-zm.com
          </p>
          <p className="font-light tracking-widest text-xs" style={{ color: '#4ade80' }}>
            THANK YOU FOR YOUR BUSINESS
          </p>
        </div>
      </div>
    </div>
  )
}
