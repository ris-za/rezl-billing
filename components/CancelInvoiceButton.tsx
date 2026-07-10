'use client'

/**
 * Copyright (c) 2025 Saidi Tembo. All rights reserved.
 * Unauthorised copying, modification, distribution or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of Saidi Tembo.
 */


import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Ban, RotateCcw, Loader2 } from 'lucide-react'
import { cancelInvoice, reinstateInvoice } from '@/lib/actions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface CancelInvoiceButtonProps {
  invoiceId: string
  invoiceNumber: string
  isCancelled: boolean
}

export function CancelInvoiceButton({ invoiceId, invoiceNumber, isCancelled }: CancelInvoiceButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleCancel() {
    if (!reason.trim()) {
      toast.error('Please enter a reason for cancelling this invoice')
      return
    }
    startTransition(async () => {
      const result = await cancelInvoice(invoiceId, reason)
      if (result.error) { toast.error(result.error); return }
      toast.success(`Invoice INV-${invoiceNumber} cancelled`)
      setOpen(false)
      setReason('')
      router.refresh()
    })
  }

  function handleReinstate() {
    startTransition(async () => {
      const result = await reinstateInvoice(invoiceId)
      if (result.error) { toast.error(result.error); return }
      toast.success(`Invoice INV-${invoiceNumber} reinstated as Issued`)
      router.refresh()
    })
  }

  if (isCancelled) {
    return (
      <button
        onClick={handleReinstate}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
        Reinstate
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-white text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        <Ban className="w-3.5 h-3.5" />
        Cancel Invoice
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!isPending) setOpen(o) }}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Invoice INV-{invoiceNumber}</DialogTitle>
            <DialogDescription>
              The invoice will be marked as cancelled and excluded from revenue and statements.
              It stays on record with a full audit trail and can be reinstated by an admin later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="cancel-reason" className="text-sm font-medium text-gray-700">
              Reason for cancellation <span className="text-red-500">*</span>
            </label>
            <textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Duplicate invoice, incorrect meter reading, customer dispute"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Keep Invoice
            </button>
            <button
              onClick={handleCancel}
              disabled={isPending || !reason.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
              Cancel Invoice
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
