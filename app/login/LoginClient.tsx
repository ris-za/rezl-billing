'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

const features = [
  { label: 'Customer Profiles', desc: 'Complete contract management' },
  { label: 'Monthly Invoices', desc: 'Auto-calculated billing' },
  { label: 'Expiry Alerts', desc: 'Never miss a renewal' },
  { label: 'Team Access', desc: 'Role-based permissions' },
]

export function LoginClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    if (searchParams.get('welcome') === '1') {
      toast.success('Password set! Sign in with your new password.')
    }
  }, [])

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between p-10 xl:p-12 flex-shrink-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(30,34,53,0.88), rgba(30,34,53,0.88)), url(/poll.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Logo */}
        <Image
          src="/logowhite.png"
          alt="N-POWER"
          width={0}
          height={0}
          sizes="220px"
          style={{ width: 'auto', height: '56px', objectFit: 'contain' }}
          priority
        />

        {/* Headline */}
        <div>
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(22,163,74,0.12)', color: '#4ade80' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Billing Management System
          </div>
          <h2 className="text-3xl xl:text-4xl font-bold text-white mb-4 leading-tight">
            Powering Zambia's<br />Energy Future
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: '#7b82a8' }}>
            Manage customer contracts, generate proforma invoices, and monitor your commercial energy portfolio. All in one secure platform.
          </p>

          {/* Feature grid */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            {features.map((f) => (
              <div
                key={f.label}
                className="rounded-xl p-4 border"
                style={{ background: '#252b42', borderColor: '#2e3554' }}
              >
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white text-sm font-semibold leading-tight mb-0.5">{f.label}</p>
                    <p className="text-xs leading-tight" style={{ color: '#7b82a8' }}>{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs" style={{ color: '#4a5180' }}>
            © {new Date().getFullYear()} Reliance Energy Zambia Limited · All rights reserved
          </p>
          <p className="text-xs mt-1" style={{ color: '#2e3554' }}>
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
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <Image
              src="/logo.png"
              alt="N-POWER"
              width={0}
              height={0}
              sizes="160px"
              style={{ width: 'auto', height: '36px' }}
              priority
            />
          </div>


          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-gray-500 mt-1 text-sm">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@relianceenergy-zm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:border-primary transition"
                style={{ '--tw-ring-color': 'rgba(22,163,74,0.25)' } as React.CSSProperties}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:border-primary transition"
                style={{ '--tw-ring-color': 'rgba(22,163,74,0.25)' } as React.CSSProperties}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2 mt-2"
              style={{ '--tw-ring-color': 'rgba(22,163,74,0.4)' } as React.CSSProperties}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-gray-400 mt-8 text-center leading-relaxed">
            Authorized personnel only.<br />Contact your administrator to request access.
          </p>
        </div>
      </div>
    </div>
  )
}
