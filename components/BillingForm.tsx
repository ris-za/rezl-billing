'use client'

/**
 * Copyright (c) 2025 Saidi Tembo. All rights reserved.
 * Unauthorised copying, modification, distribution or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of Saidi Tembo.
 */


import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createInvoice } from '@/lib/actions'
import { calculateInvoice, formatUSD } from '@/lib/calculations'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { Customer } from '@/types'

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition'

const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

interface BillingFormProps {
  customers: Customer[]
}

export function BillingForm({ customers }: BillingFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [consumption, setConsumption] = useState('')
  const [tariffRate, setTariffRate] = useState('')
  const [prevReading, setPrevReading] = useState('')
  const [currReading, setCurrReading] = useState('')
  const [useReadings, setUseReadings] = useState(false)

  function formatContractDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function getContractEndDate(startDate: string | null, durationMonths: number | null): string | null {
    if (!startDate || !durationMonths) return null
    const d = new Date(startDate + 'T00:00:00')
    d.setMonth(d.getMonth() + durationMonths)
    return d.toISOString().split('T')[0]
  }

  const effectiveConsumption = useReadings && prevReading && currReading
    ? parseFloat(currReading) - parseFloat(prevReading)
    : parseFloat(consumption) || 0

  const preview = selectedCustomer && effectiveConsumption > 0 && parseFloat(tariffRate) > 0
    ? calculateInvoice(effectiveConsumption, parseFloat(tariffRate))
    : null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    if (useReadings) {
      const prev = parseFloat(prevReading)
      const curr = parseFloat(currReading)
      formData.set('consumption_kwh', String(curr - prev))
    }
    startTransition(async () => {
      const result = await createInvoice(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      router.push(`/invoices/${result.invoiceId}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer selector */}
      <div>
        <label htmlFor="customer_id" className={labelClass}>Customer *</label>
        <select
          id="customer_id"
          name="customer_id"
          required
          className={inputClass}
          onChange={(e) => {
            const c = customers.find((c) => c.id === e.target.value) || null
            setSelectedCustomer(c)
            setTariffRate(c?.tariff_rate ? String(c.tariff_rate) : '')
          }}
        >
          <option value="">Select a customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.service_number}
            </option>
          ))}
        </select>
      </div>

      {/* Selected customer info */}
      {selectedCustomer && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">TPIN</p>
            <p className="font-medium text-gray-800">{selectedCustomer.tpin || <span className="text-gray-400 text-xs italic">—</span>}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Service No.</p>
            <p className="font-medium text-gray-800">{selectedCustomer.service_number}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Contract Period</p>
            <p className="font-medium text-gray-800 text-xs">
              {formatContractDate(selectedCustomer.contract_start_date)} → {formatContractDate(getContractEndDate(selectedCustomer.contract_start_date, selectedCustomer.contract_duration_months))}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Tariff Rate</p>
            <p className="font-medium text-gray-800">{selectedCustomer.tariff_rate ? `$${selectedCustomer.tariff_rate}/kWh` : <span className="text-gray-400 text-xs italic">Not set</span>}</p>
          </div>
        </div>
      )}

      {/* Tariff rate (pre-filled from customer, still editable) */}
      {selectedCustomer && (
        <div>
          <label htmlFor="tariff_rate" className={labelClass}>Tariff Rate (USD/kWh) *</label>
          <input
            id="tariff_rate"
            name="tariff_rate"
            type="number"
            step="0.0001"
            min="0"
            required
            value={tariffRate}
            onChange={(e) => setTariffRate(e.target.value)}
            placeholder="e.g. 0.1440"
            className={inputClass}
          />
        </div>
      )}

      {/* Billing month + due date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="billing_month" className={labelClass}>Billing Month *</label>
          <input id="billing_month" name="billing_month" type="month" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="due_date" className={labelClass}>Due Date</label>
          <input id="due_date" name="due_date" type="date" className={inputClass} />
        </div>
      </div>

      {/* Consumption input */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-primary"
            checked={useReadings}
            onChange={(e) => setUseReadings(e.target.checked)}
          />
          <span className="text-sm text-gray-600">Enter meter readings instead of direct kWh</span>
        </label>

        {useReadings ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="previous_reading" className={labelClass}>Previous Reading</label>
                <input
                  id="previous_reading"
                  name="previous_reading"
                  type="number"
                  step="0.01"
                  value={prevReading}
                  onChange={(e) => setPrevReading(e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="current_reading" className={labelClass}>Current Reading</label>
                <input
                  id="current_reading"
                  name="current_reading"
                  type="number"
                  step="0.01"
                  value={currReading}
                  onChange={(e) => setCurrReading(e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
            </div>
            {prevReading && currReading && (
              <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
                Consumption: <strong className="text-gray-900">{(parseFloat(currReading) - parseFloat(prevReading)).toLocaleString()} kWh</strong>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="consumption_kwh" className={labelClass}>Consumption (kWh) *</label>
            <input
              id="consumption_kwh"
              name="consumption_kwh"
              type="number"
              step="0.01"
              min="0"
              required={!useReadings}
              value={consumption}
              onChange={(e) => setConsumption(e.target.value)}
              placeholder="e.g. 1235682"
              className={inputClass}
            />
          </div>
        )}
      </div>

      {/* Live preview */}
      {preview && (
        <div className="rounded-xl border border-green-200 bg-green-50 overflow-hidden">
          <div className="px-5 py-3 border-b border-green-200">
            <p className="text-sm font-semibold text-green-800">Invoice Preview</p>
          </div>
          <div className="px-5 py-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Consumption</span>
              <span className="font-medium text-gray-900">{effectiveConsumption.toLocaleString()} kWh</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Subtotal ({formatUSD(parseFloat(tariffRate))}/kWh)</span>
              <span className="font-medium text-gray-900">{formatUSD(preview.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Electricity Levy (3%)</span>
              <span className="font-medium text-gray-900">{formatUSD(preview.electricityLevy)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>VAT (16%)</span>
              <span className="font-medium text-gray-900">{formatUSD(preview.vat)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-3 mt-2 border-t border-green-200 text-base">
              <span>Total Due</span>
              <span className="text-primary">{formatUSD(preview.total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label htmlFor="notes" className={labelClass}>Notes (optional)</label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="Any special instructions or notes…"
          className={inputClass + ' resize-none'}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || !selectedCustomer}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {isPending ? 'Generating Invoice…' : 'Generate Invoice'}
      </button>
    </form>
  )
}
