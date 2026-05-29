'use client'

import { useTransition } from 'react'
import { deleteCustomer } from '@/lib/actions'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface DeleteCustomerButtonProps {
  customerId: string
  customerName: string
}

export function DeleteCustomerButton({ customerId, customerName }: DeleteCustomerButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`Permanently delete "${customerName}"?\n\nThis cannot be undone.`)) return
    startTransition(async () => {
      try {
        await deleteCustomer(customerId)
      } catch (err: unknown) {
        if (err instanceof Error && (err as any).digest?.startsWith('NEXT_REDIRECT')) throw err
        toast.error(err instanceof Error ? err.message : 'Failed to delete customer')
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
    >
      {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
      Delete
    </button>
  )
}
