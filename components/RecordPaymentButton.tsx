'use client'

import { useState, useTransition } from 'react'
import { recordPayment, deletePayment } from '@/lib/actions'
import { PlusCircle, Trash2, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Payment } from '@/types'

const inputClass = (hasError?: boolean) =>
  `w-full px-3.5 py-2.5 rounded-lg border text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 transition ${
    hasError
      ? 'border-red-400 focus:ring-red-200 focus:border-red-500'
      : 'border-gray-300 focus:ring-primary/25 focus:border-primary'
  }`
const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  invoiceId: string
  customerId: string
  invoiceTotal: number
  payments: Payment[]
  isAdmin: boolean
}

export function RecordPaymentButton({ invoiceId, customerId, invoiceTotal, payments, isAdmin }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [amountVal, setAmountVal] = useState('')
  const [amountError, setAmountError] = useState('')

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const outstanding = invoiceTotal - totalPaid
  const isSettled = outstanding <= 0.001

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setAmountVal(val)
    const num = parseFloat(val)
    if (!val || isNaN(num)) {
      setAmountError('')
    } else if (num <= 0) {
      setAmountError('Amount must be greater than zero.')
    } else if (num > outstanding + 0.001) {
      setAmountError(`Exceeds outstanding balance of $${fmt(outstanding)}.`)
    } else {
      setAmountError('')
    }
  }

  function handleOpen() {
    setAmountVal('')
    setAmountError('')
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const num = parseFloat(amountVal)
    if (!amountVal || isNaN(num) || num <= 0) {
      setAmountError('Please enter a valid amount.')
      return
    }
    if (num > outstanding + 0.001) {
      setAmountError(`Exceeds outstanding balance of $${fmt(outstanding)}.`)
      return
    }
    const fd = new FormData(e.currentTarget)
    fd.set('invoice_id', invoiceId)
    fd.set('customer_id', customerId)
    startTransition(async () => {
      try {
        await recordPayment(fd)
        setOpen(false)
        toast.success('Payment recorded')
      } catch (err: unknown) {
        if (err instanceof Error && (err as any).digest?.startsWith('NEXT_REDIRECT')) throw err
        toast.error(err instanceof Error ? err.message : 'Failed to record payment')
      }
    })
  }

  async function handleDelete(paymentId: string) {
    setDeleting(paymentId)
    try {
      await deletePayment(paymentId, invoiceId, customerId)
      toast.success('Payment removed')
    } catch {
      toast.error('Failed to remove payment')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      {/* Outstanding balance bar */}
      <div
        className="flex items-center justify-between px-5 py-3 rounded-xl mb-4"
        style={{
          background: isSettled ? '#f0fdf4' : '#fff7ed',
          border: `1px solid ${isSettled ? '#bbf7d0' : '#fed7aa'}`,
        }}
      >
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div>
            <span className="text-xs text-gray-400 block leading-none mb-0.5">Invoice Total</span>
            <span className="font-bold text-gray-800">${fmt(invoiceTotal)}</span>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <span className="text-xs text-gray-400 block leading-none mb-0.5">Total Paid</span>
            <span className="font-bold text-green-700">${fmt(totalPaid)}</span>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <span className="text-xs text-gray-400 block leading-none mb-0.5">Outstanding</span>
            <span className={`font-bold text-base ${isSettled ? 'text-green-600' : 'text-orange-600'}`}>
              {isSettled ? (
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Settled
                </span>
              ) : (
                `$${fmt(outstanding)}`
              )}
            </span>
          </div>
        </div>

        {!isSettled && isAdmin && (
          <button
            onClick={handleOpen}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 shrink-0"
            style={{ background: '#16a34a' }}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Record Payment
          </button>
        )}
      </div>

      {/* Payments list */}
      {payments.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8f9fc' }}>
                {['Date', 'Transaction Ref', 'Notes', 'Amount', ''].map((h, i) => (
                  <th
                    key={i}
                    className={`py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide ${i === 3 ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">
                    {new Date(p.payment_date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-500 text-xs">
                    {p.transaction_ref || <span className="italic text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-4 text-gray-400 text-xs">{p.notes || '—'}</td>
                  <td className="py-3 px-4 text-right font-bold text-green-700">${fmt(p.amount)}</td>
                  <td className="py-3 px-4 text-right">
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deleting === p.id}
                        className="p-1 rounded text-gray-300 hover:text-red-400 transition-colors"
                      >
                        {deleting === p.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payments.length === 0 && (
        <p className="text-xs text-gray-400 italic px-1">No payments recorded against this invoice yet.</p>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Record Payment</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Outstanding balance banner inside modal */}
            <div className="mx-6 mt-5 rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
              <div>
                <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide mb-0.5">Outstanding Balance</p>
                <p className="text-xl font-bold text-orange-600">${fmt(outstanding)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAmountVal(outstanding.toFixed(2))
                  setAmountError('')
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: '#ffedd5', color: '#c2410c' }}
              >
                Pay in Full
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Amount (USD) *</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amountVal}
                    onChange={handleAmountChange}
                    placeholder={fmt(outstanding)}
                    className={inputClass(!!amountError)}
                  />
                  {amountError && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {amountError}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Payment Date *</label>
                  <input
                    name="payment_date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className={inputClass()}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Transaction Reference / ID</label>
                <input name="transaction_ref" type="text" placeholder="e.g. TXN-2026-001234" className={inputClass()} />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <input name="notes" type="text" placeholder="e.g. Bank transfer via ABSA" className={inputClass()} />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending || !!amountError || !amountVal}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isPending ? 'Saving…' : 'Record Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
