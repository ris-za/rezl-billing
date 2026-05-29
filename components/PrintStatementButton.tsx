'use client'

/**
 * Copyright (c) 2025 Saidi Tembo. All rights reserved.
 * Unauthorised copying, modification, distribution or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of Saidi Tembo.
 */

import { Printer } from 'lucide-react'

export function PrintStatementButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
      style={{ background: '#1e2235' }}
    >
      <Printer className="w-4 h-4" /> Print / Save PDF
    </button>
  )
}
