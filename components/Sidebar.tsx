'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, Zap, Receipt, BarChart3, LogOut, ChevronRight, UserCog } from 'lucide-react'
import { toast } from 'sonner'

const navItems = [
  { href: '/',         label: 'Dashboard',   icon: LayoutDashboard, adminOnly: false },
  { href: '/customers',label: 'Customers',   icon: Users,           adminOnly: false },
  { href: '/billing',  label: 'New Invoice', icon: Zap,             adminOnly: false },
  { href: '/invoices', label: 'Invoices',    icon: Receipt,         adminOnly: false },
  { href: '/reports',  label: 'Reports',     icon: BarChart3,       adminOnly: false },
  { href: '/users',    label: 'Users',       icon: UserCog,         adminOnly: true  },
]

export function Sidebar({ role }: { role?: string }) {
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
      <div className="px-5 py-5 border-b" style={{ borderColor: '#2e3554' }}>
        <Image
          src="/logowhite.png"
          alt="N-POWER"
          width={0}
          height={0}
          sizes="200px"
          style={{ width: 'auto', height: '30px', objectFit: 'contain' }}
          priority
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-5 pb-3 space-y-0.5">
        <p
          className="text-xs font-semibold uppercase tracking-widest px-3 mb-3"
          style={{ color: '#4a5180' }}
        >
          Navigation
        </p>
        {navItems.filter(item => !item.adminOnly || role === 'admin').map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
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
        <p className="text-xs" style={{ color: '#2e3554' }}>© {new Date().getFullYear()} N-Power</p>
        <p className="text-xs mt-0.5" style={{ color: '#2e3554' }}>
          Developed by{' '}
          <a
            href="https://portifolio-blue-delta.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline transition-colors"
            style={{ color: '#3d4f7a' }}
          >
            Saidi Tembo
          </a>
        </p>
      </div>
    </aside>
  )
}
