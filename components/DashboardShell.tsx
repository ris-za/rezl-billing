'use client'

/**
 * Copyright (c) 2025 Saidi Tembo. All rights reserved.
 * Unauthorised copying, modification, distribution or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of Saidi Tembo.
 */

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import Image from 'next/image'

export function DashboardShell({
  role,
  children,
}: {
  role: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen" style={{ background: '#f4f6fa' }}>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, static on desktop */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out print:hidden
          lg:relative lg:translate-x-0 lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar role={role} onClose={() => setOpen(false)} />
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Mobile top bar */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-30 print:hidden"
          style={{
            backgroundImage: 'linear-gradient(rgba(30,34,53,0.95), rgba(30,34,53,0.95)), url(/poll.jpg)',
            backgroundSize: 'cover',
            borderBottom: '1px solid #2e3554',
          }}
        >
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#6b7db3' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7db3')}
          >
            <Menu className="w-5 h-5" />
          </button>
          <Image
            src="/logowhite.png"
            alt="N-POWER"
            width={0}
            height={0}
            sizes="120px"
            style={{ width: 'auto', height: '22px', objectFit: 'contain' }}
            priority
          />
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
