'use client'

import { useTransition, useState, useRef, useEffect } from 'react'
import { updateInvoiceStatus } from '@/lib/actions'
import { ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface InvoiceStatusActionsProps {
  invoiceId: string
  currentStatus: string
}

const statuses = ['draft', 'issued', 'paid', 'overdue']

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  issued: 'Issued',
  paid: 'Paid',
  overdue: 'Overdue',
}

export function InvoiceStatusActions({ invoiceId, currentStatus }: InvoiceStatusActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleStatusChange(status: string) {
    setOpen(false)
    startTransition(async () => {
      try {
        await updateInvoiceStatus(invoiceId, status)
        toast.success(`Marked as ${statusLabels[status]}`)
        router.refresh()
      } catch {
        toast.error('Failed to update status')
      }
    })
  }

  const options = statuses.filter((s) => s !== currentStatus)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
        Mark as
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-lg border border-gray-200 bg-white shadow-lg z-50 py-1 overflow-hidden">
          {options.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
