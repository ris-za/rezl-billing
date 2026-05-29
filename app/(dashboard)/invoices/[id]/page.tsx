export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { formatUSD } from '@/lib/calculations'
import { format } from 'date-fns'
import { InvoiceStatusActions } from '@/components/InvoiceStatusActions'
import { PrintButton } from '@/components/PrintButton'
import { RecordPaymentButton } from '@/components/RecordPaymentButton'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import type { Payment } from '@/types'

const statusStyles: Record<string, string> = {
  issued: 'bg-green-50 text-green-600 border border-green-200',
  paid:   'bg-green-50 text-green-600 border border-green-200',
  overdue:'bg-red-50 text-red-500 border border-red-200',
  draft:  'bg-gray-100 text-gray-400 border border-gray-200',
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user!.id).single()
  const role    = profile?.role ?? 'viewer'
  const isAdmin = role === 'admin'
  const canEdit = role === 'admin' || role === 'user'

  const [{ data: invoice }, { data: paymentsRaw }] = await Promise.all([
    supabase.from('invoices').select('*, customers(*)').eq('id', id).single(),
    supabase.from('payments').select('*').eq('invoice_id', id).order('payment_date', { ascending: true }),
  ])

  if (!invoice) notFound()
  const customer = invoice.customers
  const payments = (paymentsRaw ?? []) as Payment[]

  return (
    <div
      className="print:p-0 print:bg-white"
      style={{ background: '#dde1ea', minHeight: '100vh', padding: '36px 32px 64px' }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 print:hidden" style={{ maxWidth: '780px', margin: '0 auto 20px' }}>
        <Link href="/invoices" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-3 h-3" />
          Back to Invoices
        </Link>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal ${statusStyles[invoice.status] ?? statusStyles.draft}`}>
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </span>
          {canEdit && <InvoiceStatusActions invoiceId={invoice.id} currentStatus={invoice.status} />}
          <PrintButton invoiceNumber={invoice.invoice_number} />
        </div>
      </div>

      {/* Invoice Document */}
      <div
        id="invoice-document"
        className="bg-white mx-auto overflow-hidden print:shadow-none print:max-w-none"
        style={{
          maxWidth: '780px',
          border: '1px solid #d1d5db',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        }}
      >
        {/* Top accent line */}
        <div style={{ height: 4, background: 'linear-gradient(90deg,#16a34a,#22c55e,#16a34a)' }} />

        {/* ── HEADER ── */}
        <div
          style={{
            backgroundImage: 'linear-gradient(rgba(22,28,45,0.92), rgba(22,28,45,0.92)), url(/poll.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          className="px-8 py-5 flex items-center justify-between gap-8"
        >
          <div>
            <Image
              src="/logowhite.png"
              alt="N-POWER"
              width={0}
              height={0}
              sizes="160px"
              style={{ width: 'auto', height: '26px', objectFit: 'contain' }}
              priority
            />
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-white font-semibold tracking-wide" style={{ fontSize: '10px' }}>RELIANCE ENERGY ZAMBIA LIMITED</p>
              <p className="font-light mt-0.5" style={{ color: '#6b7db3', fontSize: '9px' }}>TPIN: 1004222073 · VAT No: 1004222073</p>
              <p className="font-light mt-0.5" style={{ color: '#6b7db3', fontSize: '9px' }}>Plot 73719A, Sheki Sheki Road, Lusaka, Zambia</p>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="font-light tracking-[0.4em] uppercase mb-1" style={{ color: '#4ade80', fontSize: '8px' }}>Proforma</p>
            <p className="text-white font-light tracking-[0.15em]" style={{ fontSize: '30px', lineHeight: 1 }}>INVOICE</p>
            <p className="font-mono font-light mt-1.5" style={{ color: '#4ade80', fontSize: '12px' }}>
              INV-{invoice.invoice_number}
            </p>
          </div>
        </div>

        {/* ── META STRIP ── */}
        <div className="grid grid-cols-3" style={{ background: '#f9fafb', borderBottom: '1px solid #edf0f5' }}>
          {[
            { label: 'Invoice Date', value: format(new Date(invoice.created_at), 'dd MMM yyyy') },
            { label: 'Due Date',     value: invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy') : 'Upon receipt' },
            { label: 'Status',       value: invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) },
          ].map(({ label, value }, i) => (
            <div key={label} className="px-7 py-5" style={{ borderRight: i < 2 ? '1px solid #edf0f5' : 'none' }}>
              <p className="font-normal text-gray-400 uppercase tracking-widest mb-1.5" style={{ fontSize: '8px' }}>{label}</p>
              <p className="font-normal text-gray-700 text-sm">{value}</p>
            </div>
          ))}
        </div>

        {/* ── BILL TO / SERVICE ── */}
        <div className="grid grid-cols-2" style={{ borderBottom: '1px solid #edf0f5' }}>
          <div className="px-10 py-7" style={{ borderRight: '1px solid #edf0f5' }}>
            <p className="font-normal text-gray-400 uppercase tracking-widest mb-2" style={{ fontSize: '8px' }}>Bill To</p>
            <p className="font-semibold text-gray-900 text-lg leading-snug">{customer.name}</p>
            {customer.tpin    && <p className="text-gray-400 font-light mt-1.5 text-xs">TPIN: {customer.tpin}</p>}
            {customer.address && <p className="text-gray-500 font-light mt-1.5 leading-relaxed whitespace-pre-line text-xs">{customer.address}</p>}
          </div>
          <div className="px-10 py-7" style={{ background: '#fafbfd' }}>
            <p className="font-normal text-gray-400 uppercase tracking-widest mb-2" style={{ fontSize: '8px' }}>Service Details</p>
            <p className="font-medium text-sm mb-3" style={{ color: '#16a34a' }}>Electricity Charges</p>
            <div className="space-y-2">
              <div className="flex gap-3">
                <span className="text-gray-400 font-light text-xs w-24 flex-shrink-0">Period</span>
                <span className="font-normal text-gray-700 text-xs">{invoice.billing_period}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-400 font-light text-xs w-24 flex-shrink-0">Service No.</span>
                <span className="font-mono font-normal text-gray-700 text-xs">{customer.service_number}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="px-10 py-7">

          {/* Notice */}
          <div className="border-l-2 border-gray-200 px-4 py-2 mb-2 text-xs" style={{ background: '#f9fafb' }}>
            <span className="font-medium text-gray-600">Special Instructions: </span>
            <span className="font-light text-gray-500">Overdue accounts will attract a service charge of 3% per month.</span>
          </div>

          {/* Billing table */}
          <div className="overflow-hidden mb-6" style={{ border: '1px solid #e5e7eb' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#1e2235' }}>
                  {['Billing Month', 'Prev. Reading', 'Curr. Reading', 'Consumption kWh', 'Tariff Rate', 'Amount'].map((h, i) => (
                    <th
                      key={h}
                      className={`py-3 px-4 font-normal uppercase tracking-wider text-white ${i === 0 ? 'text-left' : 'text-right'}`}
                      style={{ fontSize: '9px' }}
                    >{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-4 px-4 font-normal text-gray-700 text-xs">{invoice.billing_period}</td>
                  <td className="py-4 px-4 text-right font-mono text-gray-400 font-light text-xs">
                    {invoice.previous_reading != null ? invoice.previous_reading.toLocaleString() : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-gray-400 font-light text-xs">
                    {invoice.current_reading != null ? invoice.current_reading.toLocaleString() : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-semibold text-gray-800 text-sm">{invoice.consumption_kwh.toLocaleString()}</td>
                  <td className="py-4 px-4 text-right font-mono text-gray-500 text-xs">{formatUSD(invoice.tariff_rate)}</td>
                  <td className="py-4 px-4 text-right font-semibold text-gray-800 text-sm">{formatUSD(invoice.subtotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div style={{ width: '280px' }}>
              <div style={{ border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                {[
                  ['Subtotal',              formatUSD(invoice.subtotal)],
                  ['Electricity Levy (3%)', formatUSD(invoice.electricity_levy)],
                  ['VAT (16%)',             formatUSD(invoice.vat)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center px-5 py-3 border-b" style={{ background: '#fafafa', borderColor: '#f0f0f0' }}>
                    <span className="font-light text-gray-400 text-xs">{label}</span>
                    <span className="font-normal text-gray-600 tabular-nums text-xs">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center px-5 py-4" style={{ background: '#1e2235' }}>
                  <span className="font-normal text-white tracking-wider text-xs">TOTAL DUE</span>
                  <span className="font-semibold text-white tabular-nums text-lg">{formatUSD(invoice.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment details */}
          <div className="mb-6" style={{ border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div
              className="flex items-center justify-between px-6 py-3.5"
              style={{
                backgroundImage: 'linear-gradient(rgba(22,28,45,0.92), rgba(22,28,45,0.92)), url(/poll.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <p className="font-normal tracking-widest uppercase" style={{ color: '#4ade80', fontSize: '9px' }}>Payment Details</p>
              <p className="font-light text-xs" style={{ color: '#6b7db3' }}>
                Reference: <span className="text-white font-normal">INV-{invoice.invoice_number}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 px-6 py-5">
              <div className="space-y-3 pr-6" style={{ borderRight: '1px solid #f0f2f5' }}>
                {[
                  ['Bank',           'ABSA Bank Zambia PLC'],
                  ['Account Name',   'Reliance Energy & Eitherion FZCO'],
                  ['Account No.',    '1115748'],
                  ['Currency',       'USD'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className="font-light text-gray-400 text-xs flex-shrink-0" style={{ width: '84px' }}>{label}</span>
                    <span className="font-normal text-gray-700 text-xs">{value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3 pl-6">
                {[
                  ['Sort Code',   '020001'],
                  ['Branch',      'Lusaka Business Center'],
                  ['Branch Code', '001'],
                  ['SWIFT / BIC', 'BARCZMLX'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className="font-light text-gray-400 text-xs flex-shrink-0" style={{ width: '76px' }}>{label}</span>
                    <span className="font-normal text-gray-700 text-xs">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="mb-6 px-5 py-3.5 text-xs" style={{ border: '1px solid #e5e7eb', background: '#fafafa' }}>
              <strong className="font-medium text-gray-500 uppercase tracking-wider" style={{ fontSize: '8px' }}>Notes: </strong>
              <span className="font-light text-gray-500">{invoice.notes}</span>
            </div>
          )}

        </div>

        {/* ── FOOTER ── */}
        <div
          style={{
            backgroundImage: 'linear-gradient(rgba(22,28,45,0.92), rgba(22,28,45,0.92)), url(/poll.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
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

      {/* ── PAYMENTS SECTION (screen only) ── */}
      <div className="print:hidden mx-auto mt-5 pb-10" style={{ maxWidth: '780px' }}>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Payments Received</h3>
              <p className="text-xs text-gray-400 mt-0.5">Track payments against this invoice</p>
            </div>
            <Link
              href={`/customers/${customer.id}/statement`}
              className="text-xs text-primary font-semibold hover:underline"
            >
              View Full Statement →
            </Link>
          </div>
          <RecordPaymentButton
            invoiceId={invoice.id}
            customerId={customer.id}
            invoiceTotal={invoice.total}
            payments={payments}
            isAdmin={canEdit}
          />
        </div>
      </div>
    </div>
  )
}
