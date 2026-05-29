'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateInvoice, padInvoiceNumber } from '@/lib/calculations'

// Gets the current user + their role from the profiles table (bypasses RLS)
async function getSessionWithRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'viewer'
  return { supabase, user, role }
}

// Admin-only operations (user management, deletions)
async function requireAdmin() {
  const { supabase, user, role } = await getSessionWithRole()
  if (role !== 'admin') throw new Error('Unauthorized: admin access required')
  return { supabase, user }
}

// Billing operations — admin and user (billing staff) allowed
async function requireEditor() {
  const { supabase, user, role } = await getSessionWithRole()
  if (role !== 'admin' && role !== 'user') throw new Error('Unauthorized: editor access required')
  return { supabase, user }
}

// ─────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────

export async function createCustomer(formData: FormData) {
  const { supabase } = await requireEditor()

  const tariffRateRaw    = formData.get('tariff_rate') as string
  const contractStartDate = formData.get('contract_start_date') as string || null
  const contractEndDate   = formData.get('contract_end_date') as string || null

  let contractDurationMonths: number | null = null
  if (contractStartDate && contractEndDate) {
    const start = new Date(contractStartDate)
    const end   = new Date(contractEndDate)
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    contractDurationMonths = months > 0 ? months : null
  }

  const { error } = await supabase.from('customers').insert({
    name:                     formData.get('name') as string,
    tpin:                     formData.get('tpin') as string || null,
    address:                  formData.get('address') as string || null,
    service_number:           formData.get('service_number') as string,
    tariff_rate:              tariffRateRaw ? parseFloat(tariffRateRaw) : 0,
    contract_start_date:      contractStartDate,
    contract_duration_months: contractDurationMonths,
    email:                    formData.get('email') as string || null,
    phone:                    formData.get('phone') as string || null,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/customers')
  redirect('/customers')
}

export async function updateCustomer(id: string, formData: FormData) {
  const { supabase } = await requireEditor()

  const tariffRateRaw    = formData.get('tariff_rate') as string
  const contractStartDate = formData.get('contract_start_date') as string || null
  const contractEndDate   = formData.get('contract_end_date') as string || null

  let contractDurationMonths: number | null = null
  if (contractStartDate && contractEndDate) {
    const start = new Date(contractStartDate)
    const end   = new Date(contractEndDate)
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    contractDurationMonths = months > 0 ? months : null
  }

  const { error } = await supabase.from('customers').update({
    name:                     formData.get('name') as string,
    tpin:                     formData.get('tpin') as string || null,
    address:                  formData.get('address') as string || null,
    service_number:           formData.get('service_number') as string,
    tariff_rate:              tariffRateRaw ? parseFloat(tariffRateRaw) : 0,
    contract_start_date:      contractStartDate,
    contract_duration_months: contractDurationMonths,
    email:                    formData.get('email') as string || null,
    phone:                    formData.get('phone') as string || null,
    updated_at:               new Date().toISOString(),
  }).eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  redirect('/customers')
}

export async function deactivateCustomer(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('customers').update({ is_active: false }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/customers')
  redirect('/customers')
}

export async function deleteCustomer(id: string) {
  const { supabase } = await requireAdmin()

  // Guard: never allow hard-delete of a customer who has any financial history
  const [{ count: invCount }, { count: pmtCount }] = await Promise.all([
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('customer_id', id),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('customer_id', id),
  ])
  if ((invCount ?? 0) > 0 || (pmtCount ?? 0) > 0) {
    throw new Error('This customer has invoice or payment history and cannot be permanently deleted. Use Deactivate instead.')
  }

  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/customers')
  revalidatePath('/invoices')
  revalidatePath('/')
  redirect('/customers')
}

// ─────────────────────────────────────────────
// INVOICES
// ─────────────────────────────────────────────

export async function createInvoice(formData: FormData) {
  const { supabase, user } = await requireEditor()

  const customerId      = formData.get('customer_id') as string
  const consumptionKwh  = parseFloat(formData.get('consumption_kwh') as string)
  const tariffRate      = parseFloat(formData.get('tariff_rate') as string)
  const previousReading = formData.get('previous_reading') ? parseFloat(formData.get('previous_reading') as string) : null
  const currentReading  = formData.get('current_reading')  ? parseFloat(formData.get('current_reading') as string)  : null
  const billingMonth    = formData.get('billing_month') as string
  const dueDate         = formData.get('due_date') as string || null
  const notes           = formData.get('notes') as string || null

  const { data: customer, error: cErr } = await supabase
    .from('customers').select('name').eq('id', customerId).single()
  if (cErr || !customer) throw new Error('Customer not found')

  const { subtotal, electricityLevy, vat, total } = calculateInvoice(consumptionKwh, tariffRate)

  const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true })
  const invoiceNumber = padInvoiceNumber((count ?? 0) + 1)

  const date = new Date(billingMonth + '-01')
  const billingPeriod = date.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const { data: invoice, error } = await supabase.from('invoices').insert({
    invoice_number:   invoiceNumber,
    customer_id:      customerId,
    billing_period:   billingPeriod,
    billing_month:    billingMonth + '-01',
    previous_reading: previousReading,
    current_reading:  currentReading,
    consumption_kwh:  consumptionKwh,
    tariff_rate:      tariffRate,
    subtotal,
    electricity_levy: electricityLevy,
    vat,
    total,
    due_date:         dueDate || null,
    notes,
    status:           'issued',
    created_by:       user.id,
  }).select().single()
  if (error) throw new Error(error.message)

  revalidatePath('/invoices')
  revalidatePath('/')
  redirect(`/invoices/${invoice.id}`)
}

export async function updateInvoiceStatus(id: string, status: string) {
  const { supabase } = await requireEditor()
  const { error } = await supabase.from('invoices').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
}

// ─────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────

export async function recordPayment(formData: FormData) {
  const { supabase, user } = await requireEditor()

  const invoiceId  = formData.get('invoice_id') as string || null
  const customerId = formData.get('customer_id') as string
  const amount     = parseFloat(formData.get('amount') as string)
  const paymentDate = formData.get('payment_date') as string
  const txRef      = formData.get('transaction_ref') as string || null
  const notes      = formData.get('notes') as string || null

  if (!customerId || isNaN(amount) || !paymentDate) throw new Error('Missing required fields')

  const { error } = await supabase.from('payments').insert({
    invoice_id:      invoiceId,
    customer_id:     customerId,
    amount,
    payment_date:    paymentDate,
    transaction_ref: txRef,
    notes,
    created_by:      user.id,
  })
  if (error) throw new Error(error.message)

  // Auto-mark invoice as paid when fully settled
  if (invoiceId) {
    const [{ data: inv }, { data: allPmts }] = await Promise.all([
      supabase.from('invoices').select('total, status').eq('id', invoiceId).single(),
      supabase.from('payments').select('amount').eq('invoice_id', invoiceId),
    ])
    if (inv && inv.status !== 'paid') {
      const totalPaid = (allPmts ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)
      if (totalPaid >= inv.total) {
        await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoiceId)
      }
    }
    revalidatePath(`/invoices/${invoiceId}`)
  }

  revalidatePath('/invoices')
  revalidatePath(`/customers/${customerId}`)
  revalidatePath(`/customers/${customerId}/statement`)
  revalidatePath('/')
}

export async function deletePayment(paymentId: string, invoiceId: string | null, customerId: string) {
  const { supabase } = await requireEditor()
  const { error } = await supabase.from('payments').delete().eq('id', paymentId)
  if (error) throw new Error(error.message)

  if (invoiceId) revalidatePath(`/invoices/${invoiceId}`)
  revalidatePath(`/customers/${customerId}`)
  revalidatePath(`/customers/${customerId}/statement`)
  revalidatePath('/')
}
