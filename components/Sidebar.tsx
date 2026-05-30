'use client'

/**
 * Copyright (c) 2025 Saidi Tembo. All rights reserved.
 * Unauthorised copying, modification, distribution or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of Saidi Tembo.
 */


import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, Zap, Receipt, BarChart3, LogOut, ChevronRight, UserCog, X } from 'lucide-react'
import { toast } from 'sonner'

// adminOnly: only admins see it
// editOnly:  admins and billing-staff ('user' role) see it; viewers don't
const navItems = [
  { href: '/',          label: 'Dashboard',   icon: LayoutDashboard, adminOnly: false, editOnly: false },
  { href: '/customers', label: 'Customers',   icon: Users,           adminOnly: false, editOnly: false },
  { href: '/billing',   label: 'New Invoice', icon: Zap,             adminOnly: false, editOnly: true  },
  { href: '/invoices',  label: 'Invoices',    icon: Receipt,         adminOnly: false, editOnly: false },
  { href: '/reports',   label: 'Reports',     icon: BarChart3,       adminOnly: false, editOnly: false },
  { href: '/users',     label: 'Users',       icon: UserCog,         adminOnly: true,  editOnly: false },
]

export function Sidebar({ role, onClose }: { role?: string; onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col min-h-screen"
      style={{
        backgroundImage: 'linear-gradient(rgba(30,34,53,0.90), rgba(30,34,53,0.90)), url(/poll.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Brand */}
      <div className="px-5 py-5 border-b flex items-center justify-between" style={{ borderColor: '#2e3554' }}>
        <Image
          src="/logowhite.png"
          alt="N-POWER"
          width={0}
          height={0}
          sizes="200px"
          style={{ width: 'auto', height: '30px', objectFit: 'contain' }}
          priority
        />
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: '#4a5180' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#4a5180')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-5 pb-3 space-y-0.5">
        <p
          className="text-xs font-semibold uppercase tracking-widest px-3 mb-3"
          style={{ color: '#4a5180' }}
        >
          Navigation
        </p>
        {navItems
          .filter(item =>
            (!item.adminOnly || role === 'admin') &&
            (!item.editOnly  || role === 'admin' || role === 'user')
          )
          .map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border',
                active
                  ? 'text-primary border-primary/25 shadow-sm'
                  : 'text-gray-400 border-transparent hover:text-white hover:border-white/5'
              )}
              style={active ? { background: 'rgba(22,163,74,0.12)' } : { background: 'transparent' }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom divider + signout */}
      <div className="px-3 pt-4 border-t" style={{ borderColor: '#2e3554' }}>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all duration-150 border border-transparent"
          style={{ color: '#7b82a8' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
            e.currentTarget.style.color = '#f87171'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#7b82a8'
          }}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* Developer credit */}
      <div className="px-5 py-4 border-t" style={{ borderColor: '#2e3554' }}>
        <p className="text-xs" style={{ color: '#3d4f7a' }}>
          Developed by{' '}
          <a
            href="https://portifolio-blue-delta.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:underline"
            style={{ color: '#4a5a8a' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#6b7db3')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#4a5a8a')}
          >
            Saidi Tembo
          </a>
        </p>
      </div>
    </aside>
  )
}
