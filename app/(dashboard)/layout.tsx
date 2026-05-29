import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role = 'user'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role ?? 'user'
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#f4f6fa' }}>
      <div className="print:hidden">
        <Sidebar role={role} />
      </div>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
