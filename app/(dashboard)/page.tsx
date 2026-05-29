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
import { formatUSD, getContractEndDate, getContractStatus } from '@/lib/calculations'
import { Users, FileText, DollarSign, AlertTriangle, ArrowRight, Zap, TrendingUp } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import Link from 'next/link'
import type { Customer, InvoiceWithCustomer } from '@/types'

const statusConfig: Record<string, { label: string; className: string }> = {
  paid:    { label: 'Paid',    className: 'bg-green-100 text-green-700' },
  issued:  { label: 'Issued',  className: 'bg-gray-100 text-gray-600' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700' },
  draft:   { label: 'Draft',   className: 'bg-gray-100 text-gray-500' },
}

export default async function DashboardPage() {
  // Auth check via user client, data via admin client (bypasses broken RLS)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [
    { count: totalCustomers },
    { count: totalInvoices },
    { data: invoices },
    { data: customers },
    { data: allInvoiceTotals },
    { data: allPayments },
    { data: profile },
  ] = await Promise.all([
    admin.from('customers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('invoices').select('*', { count: 'exact', head: true }),
    admin.from('invoices').select('*, customers(*)').order('created_at', { ascending: false }).limit(8),
    admin.from('customers').select('*').eq('is_active', true),
    admin.from('invoices').select('total, consumption_kwh'),
    admin.from('payments').select('amount'),
    admin.from('profiles').select('role').eq('id', user.id).single(),
  ])

  const role    = (profile as any)?.role ?? 'viewer'
  const canEdit = role === 'admin' || role === 'user'

  const typedInvoices  = invoices as InvoiceWithCustomer[] | null
  const typedCustomers = customers as Customer[] | null

  const totalRevenue     = (allInvoiceTotals ?? []).reduce((s, i) => s + (i.total ?? 0), 0)
  const totalReceived    = (allPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)
  const totalOutstanding = totalRevenue - totalReceived
  const totalKwh         = (allInvoiceTotals ?? []).reduce((s, i) => s + (i.consumption_kwh ?? 0), 0)
  const paidRevenue      = totalReceived  // keep for hero metric

  const expiringContracts = typedCustomers?.filter((c) => {
    if (!c.contract_start_date) return false
    const endDate = getContractEndDate(c.contract_start_date, c.contract_duration_months)
    if (!endDate) return false
    return getContractStatus(endDate) === 'expiring_soon' || getContractStatus(endDate) === 'expired'
  }) ?? []

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-8 max-w-[1400px] space-y-6">

      {/* ═══ HERO BANNER ═══ */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(rgba(30,34,53,0.88), rgba(30,34,53,0.88)), url(/poll.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* decorative circles */}
        <div style={{ position:'absolute', top:-60, right:-60, width:280, height:280, borderRadius:'50%', background:'rgba(22,163,74,0.07)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:20, right:180, width:140, height:140, borderRadius:'50%', background:'rgba(22,163,74,0.05)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-40, left:-40, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.03)', pointerEvents:'none' }} />

        <div className="relative px-8 pt-8 pb-6">
          {/* Top row: greeting + CTA */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-sm font-medium mb-1" style={{ color:'#6b7db3' }}>{greeting}</p>
              <h1 className="text-3xl font-black text-white tracking-tight">Dashboard</h1>
              <p className="text-sm mt-1" style={{ color:'#4f5e8a' }}>
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            {canEdit && (
              <Link
                href="/billing"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background:'#16a34a', boxShadow:'0 4px 14px rgba(22,163,74,0.4)' }}
              >
                <Zap className="w-4 h-4" />
                New Invoice
              </Link>
            )}
          </div>

          {/* Key metrics — 4 cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Power Sold */}
            <div className="rounded-xl p-5" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:'rgba(255,255,255,0.1)' }}>
                  <Zap className="w-4 h-4" style={{ color:'#facc15' }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:'#6b7db3' }}>Power Sold</p>
              </div>
              <p className="text-2xl font-black text-white tabular-nums tracking-tight">
                {totalKwh >= 1_000_000
                  ? `${(totalKwh / 1_000_000).toFixed(2)}M`
                  : totalKwh >= 1_000
                  ? `${(totalKwh / 1_000).toFixed(0)}K`
                  : totalKwh.toLocaleString()}
              </p>
              <p className="text-xs mt-1" style={{ color:'#4f5e8a' }}>kWh across all clients</p>
            </div>

            {/* Total Billed */}
            <div className="rounded-xl p-5" style={{ background:'rgba(22,163,74,0.12)', border:'1px solid rgba(22,163,74,0.2)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:'rgba(22,163,74,0.25)' }}>
                  <DollarSign className="w-4 h-4" style={{ color:'#4ade80' }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:'#4ade80' }}>Total Billed</p>
              </div>
              <p className="text-2xl font-black text-white tabular-nums tracking-tight">{formatUSD(totalRevenue)}</p>
              <p className="text-xs mt-1" style={{ color:'#6b7db3' }}>across {totalInvoices ?? 0} invoices</p>
            </div>

            {/* Total Received */}
            <div className="rounded-xl p-5" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:'rgba(255,255,255,0.1)' }}>
                  <TrendingUp className="w-4 h-4" style={{ color:'#86efac' }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:'#6b7db3' }}>Received</p>
              </div>
              <p className="text-2xl font-black text-white tabular-nums tracking-tight">{formatUSD(totalReceived)}</p>
              <p className="text-xs mt-1" style={{ color:'#4f5e8a' }}>payments collected</p>
            </div>

            {/* Outstanding */}
            <div className="rounded-xl p-5" style={{
              background: totalOutstanding > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(22,163,74,0.08)',
              border: `1px solid ${totalOutstanding > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(22,163,74,0.2)'}`,
            }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: totalOutstanding > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(22,163,74,0.15)' }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: totalOutstanding > 0 ? '#f87171' : '#4ade80' }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: totalOutstanding > 0 ? '#f87171' : '#4ade80' }}>Outstanding</p>
              </div>
              <p className="text-2xl font-black text-white tabular-nums tracking-tight">{formatUSD(Math.max(0, totalOutstanding))}</p>
              <p className="text-xs mt-1" style={{ color:'#6b7db3' }}>owed by clients</p>
            </div>
          </div>
        </div>

        {/* green bottom accent */}
        <div style={{ height:3, background:'linear-gradient(90deg,#16a34a,#22c55e,#16a34a)' }} />
      </div>

      {/* ═══ EXPIRY ALERT ═══ */}
      {expiringContracts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1">Contract Expiry Alerts</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {expiringContracts.map((c) => {
                const endDate = getContractEndDate(c.contract_start_date, c.contract_duration_months)!
                const status  = getContractStatus(endDate)
                const daysLeft = differenceInDays(endDate, new Date())
                return (
                  <span key={c.id} className="text-xs text-amber-700">
                    <Link href={`/customers/${c.id}`} className="font-semibold hover:underline">{c.name}</Link>
                    {': '}
                    {status === 'expired' ? 'Contract EXPIRED' : `expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ RECENT INVOICES ═══ */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        {/* Section header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:'#f0fdf4' }}>
              <TrendingUp className="w-4 h-4" style={{ color:'#16a34a' }} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Recent Invoices</h2>
              <p className="text-xs text-gray-400">Latest billing activity</p>
            </div>
          </div>
          <Link href="/invoices" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!typedInvoices || typedInvoices.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background:'#f0fdf4' }}>
              <FileText className="w-7 h-7" style={{ color:'#16a34a' }} />
            </div>
            <p className="text-sm font-semibold text-gray-600 mb-1">No invoices yet</p>
            <p className="text-xs text-gray-400 mb-4">{canEdit ? 'Generate your first invoice to get started' : 'No invoices have been created yet'}</p>
            {canEdit && (
              <Link href="/billing" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background:'#16a34a' }}>
                <Zap className="w-3.5 h-3.5" /> New Invoice
              </Link>
            )}
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-6 px-7 py-3 border-b border-gray-100" style={{ background:'#fafbfc' }}>
              {['Invoice', 'Customer', 'Period', 'Amount', 'Status', 'Date'].map((h, i) => (
                <p key={h} className={`text-xs font-bold text-gray-400 uppercase tracking-widest ${i === 3 ? 'text-right' : ''}`}>{h}</p>
              ))}
            </div>

            {/* Rows */}
            {typedInvoices.map((inv, idx) => {
              const cfg = statusConfig[inv.status] ?? statusConfig.draft
              return (
                <div
                  key={inv.id}
                  className="grid grid-cols-6 px-7 py-4 items-center hover:bg-gray-50 transition-colors"
                  style={{ borderTop: idx > 0 ? '1px solid #f3f4f6' : 'none' }}
                >
                  <div>
                    <Link href={`/invoices/${inv.id}`} className="font-bold text-sm hover:underline" style={{ color:'#16a34a' }}>
                      INV-{inv.invoice_number}
                    </Link>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 truncate pr-4">{inv.customers.name}</p>
                  <p className="text-sm text-gray-500">{inv.billing_period}</p>
                  <p className="text-sm font-bold text-gray-900 text-right tabular-nums">{formatUSD(inv.total)}</p>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{format(new Date(inv.created_at), 'dd MMM yyyy')}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      {(() => {
        const allActions = [
          {
            href: '/billing',
            icon: Zap,
            title: 'Generate Invoice',
            desc: 'Create a new proforma invoice for a customer',
            color: '#16a34a',
            bg: '#f0fdf4',
            editOnly: true,
          },
          {
            href: '/customers/new',
            icon: Users,
            title: 'Add Customer',
            desc: 'Register a new customer in the system',
            color: '#1e2235',
            bg: '#f8f9fc',
            editOnly: true,
          },
          {
            href: '/invoices',
            icon: FileText,
            title: 'View All Invoices',
            desc: 'Browse, filter and manage all invoices',
            color: '#1e2235',
            bg: '#f8f9fc',
            editOnly: false,
          },
          {
            href: '/customers',
            icon: Users,
            title: 'View Customers',
            desc: 'Browse all registered customers',
            color: '#1e2235',
            bg: '#f8f9fc',
            editOnly: false,
          },
        ]
        const actions = allActions.filter(a => !a.editOnly || canEdit)
        return (
          <div className={`grid gap-4 ${actions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {actions.map(({ href, icon: Icon, title, desc, color, bg }) => (
              <Link
                key={href}
                href={href}
                className="group bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4 hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors" style={{ background: bg }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
              </Link>
            ))}
          </div>
        )
      })()}

    </div>
  )
}
