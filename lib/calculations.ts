/**
 * Copyright (c) 2025 Saidi Tembo. All rights reserved.
 * Unauthorised copying, modification, distribution or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of Saidi Tembo.
 */

export const ELECTRICITY_LEVY_RATE = 0.03
export const VAT_RATE = 0.16

export function calculateInvoice(consumptionKwh: number, tariffRate: number) {
  const subtotal = consumptionKwh * tariffRate
  const electricityLevy = subtotal * ELECTRICITY_LEVY_RATE
  const vat = (subtotal + electricityLevy) * VAT_RATE
  const total = subtotal + electricityLevy + vat
  return { subtotal, electricityLevy, vat, total }
}

export function formatUSD(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function getContractEndDate(startDate: string | null, durationMonths: number | null): Date | null {
  if (!startDate || !durationMonths) return null
  const start = new Date(startDate)
  return new Date(start.getFullYear(), start.getMonth() + durationMonths, start.getDate())
}

export function getContractStatus(endDate: Date): 'active' | 'expiring_soon' | 'expired' {
  const now = new Date()
  const twoMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate())
  if (endDate <= now) return 'expired'
  if (endDate <= twoMonthsFromNow) return 'expiring_soon'
  return 'active'
}

export function padInvoiceNumber(n: number) {
  return String(n).padStart(3, '0')
}

// ─────────────────────────────────────────────
// ACCOUNT CREDIT / BROUGHT-FORWARD BALANCE
// ─────────────────────────────────────────────

export interface LedgerInvoice {
  id: string
  total: number
  billing_month: string
  status?: string | null
}

export interface LedgerPayment {
  amount: number
  payment_date: string
  invoice_id: string | null
}

/**
 * Credit available to bring forward onto `targetInvoiceId`.
 *
 * Derived purely from real transactions: the running account balance of every
 * non-cancelled invoice (debit) and every payment (credit) that falls, in date
 * order, before this invoice. A negative running balance means the account is
 * in credit, i.e. the customer has overpaid and that surplus reduces this
 * invoice's obligation. Because each invoice nets against its own payments,
 * unused credit automatically carries on to later invoices and is never
 * double-counted. Payments linked to the target invoice itself are excluded —
 * they are that invoice's own settlement, not brought-forward credit.
 */
export function creditBroughtForward(
  targetInvoiceId: string,
  invoices: LedgerInvoice[],
  payments: LedgerPayment[],
): number {
  type Ev = { date: string; kind: 'inv' | 'pay'; amount: number; isTarget: boolean }
  const events: Ev[] = []

  for (const inv of invoices) {
    if (inv.status === 'cancelled') continue
    events.push({ date: inv.billing_month, kind: 'inv', amount: inv.total, isTarget: inv.id === targetInvoiceId })
  }
  for (const p of payments) {
    if (p.invoice_id === targetInvoiceId) continue
    events.push({ date: p.payment_date, kind: 'pay', amount: p.amount, isTarget: false })
  }

  // Chronological. On a same-date tie, other invoices and payments are applied
  // before the target invoice so we capture the balance *just before* it.
  events.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    const rank = (e: Ev) => (e.isTarget ? 2 : e.kind === 'inv' ? 0 : 1)
    return rank(a) - rank(b)
  })

  let balance = 0
  for (const e of events) {
    if (e.isTarget) break
    balance += e.kind === 'inv' ? e.amount : -e.amount
  }
  return balance < 0 ? -balance : 0
}
