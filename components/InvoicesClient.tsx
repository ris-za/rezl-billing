'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Search, Receipt, Archive, Zap, X } from 'lucide-react'
import { formatUSD } from '@/lib/calculations'
import type { InvoiceWithCustomer } from '@/types'

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid:    'bg-green-100 text-green-700',
    issued:  'bg-blue-100 text-blue-700',
    overdue: 'bg-red-100 text-red-700',
    draft:   'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] ?? styles.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

interface Props {
  invoices: InvoiceWithCustomer[]
  isAdmin: boolean
}

export function InvoicesClient({ invoices, isAdmin }: Props) {
  const [tab, setTab]       = useState<'active' | 'archive'>('active')
  const [search, setSearch] = useState('')

  const active  = invoices.filter(i => i.status !== 'paid')
  const archive = invoices.filter(i => i.status === 'paid')

  const baseList = tab === 'active' ? active : archive

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return baseList
    return baseList.filter(inv =>
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.customers.name.toLowerCase().includes(q) ||
      inv.billing_period.toLowerCase().includes(q) ||
      String(inv.total).includes(q)
    )
  }, [baseList, search])

  return (
    <div className="space-y-4">
      {/* ── Tabs + Search bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Tabs */}
        <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb', background: '#f8f9fc' }}>
          <button
            onClick={() => { setTab('active'); setSearch('') }}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all"
            style={{
              background: tab === 'active' ? '#fff' : 'transparent',
              color: tab === 'active' ? '#111827' : '#9ca3af',
              borderRight: '1px solid #e5e7eb',
              boxShadow: tab === 'active' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <Receipt className="w-4 h-4" />
            Active
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
              style={{ background: tab === 'active' ? '#f0fdf4' : '#e5e7eb', color: tab === 'active' ? '#16a34a' : '#9ca3af' }}
            >
              {active.length}
            </span>
          </button>
          <button
            onClick={() => { setTab('archive'); setSearch('') }}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all"
            style={{
              background: tab === 'archive' ? '#fff' : 'transparent',
              color: tab === 'archive' ? '#111827' : '#9ca3af',
              boxShadow: tab === 'archive' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <Archive className="w-4 h-4" />
            Archive
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
              style={{ background: tab === 'archive' ? '#f0fdf4' : '#e5e7eb', color: tab === 'archive' ? '#16a34a' : '#9ca3af' }}
            >
              {archive.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[220px] relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by invoice #, customer, period…"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
            style={{ border: '1px solid #e5e7eb' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Result count when searching */}
        {search && (
          <span className="text-xs text-gray-400">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* Archive banner */}
        {tab === 'archive' && (
          <div className="flex items-center gap-2 px-6 py-3 text-xs text-green-700 font-medium" style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
            <Archive className="w-3.5 h-3.5" />
            Fully paid invoices are automatically moved here
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            {search ? (
              <>
                <Search className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500 mb-1">No results for "{search}"</p>
                <button onClick={() => setSearch('')} className="text-xs text-primary hover:underline">Clear search</button>
              </>
            ) : tab === 'archive' ? (
              <>
                <Archive className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">No paid invoices yet</p>
                <p className="text-xs text-gray-400 mt-1">Fully paid invoices will appear here automatically</p>
              </>
            ) : (
              <>
                <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500 mb-1">No active invoices</p>
                {isAdmin && (
                  <Link href="/billing" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-1">
                    <Zap className="w-3 h-3" /> Generate one now
                  </Link>
                )}
              </>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8f9fc' }}>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Period</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Consumption</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                  style={tab === 'archive' ? { opacity: 0.75 } : {}}
                >
                  <td className="py-3.5 px-6">
                    <Link href={`/invoices/${inv.id}`} className="font-semibold text-primary hover:underline">
                      INV-{inv.invoice_number}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-gray-900">{inv.customers.name}</td>
                  <td className="py-3.5 px-4 text-gray-500">{inv.billing_period}</td>
                  <td className="py-3.5 px-4 text-right text-gray-600 font-mono text-xs">
                    {inv.consumption_kwh.toLocaleString()} kWh
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-gray-900">{formatUSD(inv.total)}</td>
                  <td className="py-3.5 px-4"><StatusPill status={inv.status} /></td>
                  <td className="py-3.5 px-6 text-gray-400 text-xs">
                    {format(new Date(inv.created_at), 'dd MMM yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
