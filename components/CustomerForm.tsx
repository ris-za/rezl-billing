'use client'

/**
 * Copyright (c) 2025 Saidi Tembo. All rights reserved.
 * Unauthorised copying, modification, distribution or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of Saidi Tembo.
 */


import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCustomer, updateCustomer } from '@/lib/actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { Customer } from '@/types'

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition'

const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

function computeEndDate(startDate: string | null, durationMonths: number | null): string {
  if (!startDate || !durationMonths) return ''
  const d = new Date(startDate + 'T00:00:00')
  d.setMonth(d.getMonth() + durationMonths)
  return d.toISOString().split('T')[0]
}

interface CustomerFormProps {
  customer?: Customer
}

export function CustomerForm({ customer }: CustomerFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = customer
        ? await updateCustomer(customer.id, formData)
        : await createCustomer(formData)

      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(customer ? 'Customer updated' : 'Customer added')
      router.push('/customers')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="name" className={labelClass}>Customer Name *</label>
          <input
            id="name"
            name="name"
            defaultValue={customer?.name}
            required
            placeholder="e.g. SCAW Limited"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="tpin" className={labelClass}>TPIN</label>
          <input
            id="tpin"
            name="tpin"
            defaultValue={customer?.tpin ?? ''}
            placeholder="e.g. 1001721G86"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="service_number" className={labelClass}>Service Number *</label>
          <input
            id="service_number"
            name="service_number"
            defaultValue={customer?.service_number}
            required
            placeholder="e.g. SC001"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="address" className={labelClass}>Customer Address</label>
          <textarea
            id="address"
            name="address"
            defaultValue={customer?.address ?? ''}
            placeholder="e.g. 1316 Dr Aggrey Ave, Kitwe, Zambia"
            rows={2}
            className={inputClass + ' resize-none'}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>Email (for reminders)</label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={customer?.email ?? ''}
            placeholder="accounts@company.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>Phone</label>
          <input
            id="phone"
            name="phone"
            defaultValue={customer?.phone ?? ''}
            placeholder="+260 xxx xxx xxx"
            className={inputClass}
          />
        </div>

        {/* Contract Details */}
        <div className="sm:col-span-2 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4 pb-2 border-b border-gray-100">Contract Details</p>
        </div>

        <div>
          <label htmlFor="tariff_rate" className={labelClass}>Tariff Rate (USD/kWh)</label>
          <input
            id="tariff_rate"
            name="tariff_rate"
            type="number"
            step="0.0001"
            min="0"
            defaultValue={customer?.tariff_rate || ''}
            placeholder="e.g. 0.1440"
            className={inputClass}
          />
        </div>

        <div>{/* spacer */}</div>

        <div>
          <label htmlFor="contract_start_date" className={labelClass}>Contract Start Date</label>
          <input
            id="contract_start_date"
            name="contract_start_date"
            type="date"
            defaultValue={customer?.contract_start_date ?? ''}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="contract_end_date" className={labelClass}>Contract End Date</label>
          <input
            id="contract_end_date"
            name="contract_end_date"
            type="date"
            defaultValue={computeEndDate(customer?.contract_start_date ?? null, customer?.contract_duration_months ?? null)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? 'Saving…' : customer ? 'Save Changes' : 'Add Customer'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
