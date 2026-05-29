'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Lock } from 'lucide-react'
import Image from 'next/image'

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm]         = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
    if (newPassword !== confirm)  { setError('Passwords do not match'); return }

    setLoading(true)
    try {
      // Update auth password
      const { error: pwError } = await supabase.auth.updateUser({ password: newPassword })
      if (pwError) throw pwError

      // Clear the must_change_password flag via API (bypasses RLS)
      await fetch('/api/auth/clear-temp-password', { method: 'POST' })

      router.push('/')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f4f6fa' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Top accent */}
          <div style={{ height: 4, background: 'linear-gradient(90deg,#16a34a,#22c55e,#16a34a)' }} />

          <div className="px-8 py-6"
            style={{
              backgroundImage: 'linear-gradient(rgba(22,28,45,0.92), rgba(22,28,45,0.92)), url(/poll.jpg)',
              backgroundSize: 'cover',
            }}
          >
            <Image src="/logowhite.png" alt="N-POWER" width={0} height={0} sizes="160px"
              style={{ width: 'auto', height: '28px', objectFit: 'contain' }} />
            <div className="mt-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(22,163,74,0.2)' }}>
                <Lock className="w-4 h-4" style={{ color: '#4ade80' }} />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Set Your Password</p>
                <p className="font-light" style={{ color: '#6b7db3', fontSize: '11px' }}>
                  Your account has a temporary password. Please set a new one to continue.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your new password"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                required
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ background: '#16a34a' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {loading ? 'Saving…' : 'Set Password & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
