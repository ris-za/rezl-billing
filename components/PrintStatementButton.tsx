'use client'
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
