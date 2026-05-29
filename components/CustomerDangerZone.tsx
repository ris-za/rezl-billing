'use client'

/**
 * Copyright (c) 2025 Saidi Tembo. All rights reserved.
 * Unauthorised copying, modification, distribution or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of Saidi Tembo.
 */


import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deactivateCustomer, deleteCustomer } from '@/lib/actions'
import { Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface CustomerDangerZoneProps {
  customerId: string
  customerName: string
  hasHistory: boolean
}

export function CustomerDangerZone({ customerId, customerName, hasHistory }: CustomerDangerZoneProps) {
  const [isDeactivating, startDeactivate] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const router = useRouter()

  function handleDeactivate() {
    if (!window.confirm(`Deactivate "${customerName}"?\n\nThey will be hidden from the active customer list but all their invoices and payment records will be fully preserved.`)) return
    startDeactivate(async () => {
      const result = await deactivateCustomer(customerId)
      if (result.error) { toast.error(result.error); return }
      toast.success('Customer deactivated')
      router.push('/customers')
      router.refresh()
    })
  }

  function handleDelete() {
    const input = window.prompt(
      `Permanently delete "${customerName}"?\n\nThis cannot be undone.\n\nType DELETE to confirm.`
    )
    if (input?.trim().toUpperCase() !== 'DELETE') return
    startDelete(async () => {
      const result = await deleteCustomer(customerId)
      if (result.error) { toast.error(result.error); return }
      toast.success('Customer deleted')
      router.push('/customers')
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-red-200 p-6">
      <h3 className="text-sm font-semibold text-red-700 mb-1">Danger Zone</h3>
      <p className="text-xs text-gray-400 mb-4">Irreversible actions — proceed with caution.</p>

      <div className="space-y-4">
        {/* Deactivate */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-red-100">
          <div>
            <p className="text-sm font-medium text-gray-700">Deactivate customer</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Removes them from the active list. All invoices and payment records are fully preserved.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={isDeactivating || isDeleting}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {isDeactivating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Deactivate
          </button>
        </div>

        {/* Delete */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">Delete permanently</p>
            {hasHistory ? (
              <div className="mt-1.5 flex items-start gap-2 rounded-lg px-3 py-2.5" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
                <Lock className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  This customer has invoice or payment history and <strong>cannot be permanently deleted</strong>.
                  Use <strong>Deactivate</strong> instead.
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                No invoices or payments on record. Removes this customer entirely from the database.
              </p>
            )}
          </div>
          {!hasHistory && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeactivating || isDeleting}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
