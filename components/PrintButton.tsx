'use client'

/**
 * Copyright (c) 2025 Saidi Tembo. All rights reserved.
 * Unauthorised copying, modification, distribution or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of Saidi Tembo.
 */


import { Printer, FileDown } from 'lucide-react'

interface PrintButtonProps {
  invoiceNumber: string | number
}

export function PrintButton({ invoiceNumber: _ }: PrintButtonProps) {
  return (
    <div className="flex items-center gap-2 print:hidden">
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Printer className="w-4 h-4" />
        Print
      </button>

      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <FileDown className="w-4 h-4" />
        Save PDF
      </button>
    </div>
  )
}
