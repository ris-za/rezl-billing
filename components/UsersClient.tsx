'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, KeyRound, Trash2, Loader2, Shield, User, RefreshCw } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

type AppUser = {
  id: string
  email: string
  full_name: string
  role: string
  must_change_password: boolean
  created_at: string
}

const ROLES = ['admin', 'user', 'viewer'] as const

const roleBadge: Record<string, string> = {
  admin:  'bg-green-100 text-green-700 border border-green-200',
  user:   'bg-blue-50 text-blue-600 border border-blue-200',
  viewer: 'bg-gray-100 text-gray-500 border border-gray-200',
}

function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function UsersClient() {
  const [users, setUsers]           = useState<AppUser[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  // Modal states
  const [addOpen, setAddOpen]       = useState(false)
  const [editUser, setEditUser]     = useState<AppUser | null>(null)
  const [resetUser, setResetUser]   = useState<AppUser | null>(null)
  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null)

  // Add form
  const [addForm, setAddForm] = useState({ email: '', full_name: '', role: 'user', password: '' })

  // Edit form
  const [editForm, setEditForm] = useState({ full_name: '', role: 'user' })

  // Reset form
  const [resetPassword, setResetPassword] = useState('')

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to load users')
      setUsers(await res.json())
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  async function handleAdd() {
    if (!addForm.email || !addForm.password || !addForm.role) {
      toast.error('Please fill in all fields')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`User ${addForm.email} created`)
      setAddOpen(false)
      setAddForm({ email: '', full_name: '', role: 'user', password: '' })
      loadUsers()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit() {
    if (!editUser) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('User updated')
      setEditUser(null)
      loadUsers()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!resetUser || !resetPassword) return
    if (resetPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${resetUser.id}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Password reset for ${resetUser.email}. They will be asked to change it on next login.`)
      setResetUser(null)
      setResetPassword('')
      loadUsers()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteUser) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteUser.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${deleteUser.email} deleted`)
      setDeleteUser(null)
      loadUsers()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">Add users, assign roles and manage account access.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => { setAddForm({ email: '', full_name: '', role: 'user', password: generatePassword() }); setAddOpen(true) }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg"
            style={{ background: '#16a34a' }}
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading users…
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: '#f8f9fc', borderBottom: '1px solid #edf0f5' }}>
                {['Name', 'Email', 'Role', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-medium text-gray-400 uppercase tracking-wider" style={{ fontSize: '10px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                        style={{ background: u.role === 'admin' ? '#16a34a' : '#3b82f6' }}>
                        {(u.full_name || u.email)[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{u.full_name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge[u.role] ?? roleBadge.user}`}>
                      {u.role === 'admin' ? <Shield className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.must_change_password ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-600 border border-amber-200">
                        Temp password
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-600 border border-green-200">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-400">
                    {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditForm({ full_name: u.full_name, role: u.role }); setEditUser(u) }}
                        title="Edit user"
                        className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setResetPassword(generatePassword()); setResetUser(u) }}
                        title="Reset password"
                        className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteUser(u)}
                        title="Delete user"
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add User Modal ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Full Name">
              <input className={input} placeholder="e.g. John Banda" value={addForm.full_name}
                onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))} />
            </Field>
            <Field label="Email Address *">
              <input className={input} type="email" placeholder="john@example.com" value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Role *">
              <select className={input} value={addForm.role}
                onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Temporary Password *">
              <div className="flex gap-2">
                <input className={`${input} flex-1 font-mono`} value={addForm.password}
                  onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button"
                  onClick={() => setAddForm(f => ({ ...f, password: generatePassword() }))}
                  className="px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                  Generate
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">User will be forced to change this on first login.</p>
            </Field>
          </div>
          <DialogFooter>
            <button onClick={() => setAddOpen(false)} className={btnSecondary}>Cancel</button>
            <button onClick={handleAdd} disabled={saving} className={btnPrimary}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Modal ── */}
      <Dialog open={!!editUser} onOpenChange={v => !v && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-500">{editUser?.email}</p>
            <Field label="Full Name">
              <input className={input} placeholder="Full name" value={editForm.full_name}
                onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
            </Field>
            <Field label="Role">
              <select className={input} value={editForm.role}
                onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </Field>
          </div>
          <DialogFooter>
            <button onClick={() => setEditUser(null)} className={btnSecondary}>Cancel</button>
            <button onClick={handleEdit} disabled={saving} className={btnPrimary}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Modal ── */}
      <Dialog open={!!resetUser} onOpenChange={v => !v && setResetUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-500">
              Resetting password for <strong className="text-gray-700">{resetUser?.email}</strong>.
              They will be required to change it on their next login.
            </p>
            <Field label="New Temporary Password">
              <div className="flex gap-2">
                <input className={`${input} flex-1 font-mono`} value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)} />
                <button type="button"
                  onClick={() => setResetPassword(generatePassword())}
                  className="px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                  Generate
                </button>
              </div>
            </Field>
          </div>
          <DialogFooter>
            <button onClick={() => setResetUser(null)} className={btnSecondary}>Cancel</button>
            <button onClick={handleReset} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <Dialog open={!!deleteUser} onOpenChange={v => !v && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete User</DialogTitle></DialogHeader>
          <div className="py-2">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <strong>{deleteUser?.email}</strong>?
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <button onClick={() => setDeleteUser(null)} className={btnSecondary}>Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Small helpers
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

const input = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400'
const btnPrimary = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60'
const btnSecondary = 'inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50'
