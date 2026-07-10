'use server'

/**
 * Copyright (c) 2025 Saidi Tembo. All rights reserved.
 * Unauthorised copying, modification, distribution or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of Saidi Tembo.
 */


import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateInvoice, padInvoiceNumber } from '@/lib/calculations'

// Gets the current user + their role. Returns admin DB client so all
// data ops bypass the broken recursive RLS policy on profiles/customers.
async function getSessionWithRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'viewer'
  const fullName = profile?.full_name ?? user.email ?? 'Unknown user'
  // Use admin client for all DB ops — auth is enforced above, bypassing
  // the recursive RLS policy that causes "infinite recursion" errors.
  return { supabase: admin, user, role, fullName }
}

// ─────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────

export async function createCustomer(formData: FormData): Promise<{ error?: string }> {
  try {
    const { supabase, role } = await getSessionWithRole()
    if (role !== 'admin' && role !== 'user') return { error: 'Unauthorized' }

    const tariffRateRaw     = formData.get('tariff_rate') as string
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
    if (error) return { error: error.message }

    revalidatePath('/customers')
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Something went wrong' }
  }
}

export async function updateCustomer(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const { supabase, role } = await getSessionWithRole()
    if (role !== 'admin' && role !== 'user') return { error: 'Unauthorized' }

    const tariffRateRaw     = formData.get('tariff_rate') as string
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
    if (error) return { error: error.message }

    revalidatePath('/customers')
    revalidatePath(`/customers/${id}`)
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Something went wrong' }
  }
}

export async function deactivateCustomer(id: string): Promise<{ error?: string }> {
  try {
    const { supabase, role } = await getSessionWithRole()
    if (role !== 'admin') return { error: 'Unauthorized' }

    const { error } = await supabase.from('customers').update({ is_active: false }).eq('id', id)
    if (error) return { error: error.message }

    revalidatePath('/customers')
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Something went wrong' }
  }
}

export async function deleteCustomer(id: string): Promise<{ error?: string }> {
  try {
    const { supabase, role } = await getSessionWithRole()
    if (role !== 'admin') return { error: 'Unauthorized' }

    const [{ count: invCount }, { count: pmtCount }] = await Promise.all([
      supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('customer_id', id),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('customer_id', id),
    ])
    if ((invCount ?? 0) > 0 || (pmtCount ?? 0) > 0) {
      return { error: 'This customer has invoice or payment history and cannot be permanently deleted. Use Deactivate instead.' }
    }

    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) return { error: error.message }

    revalidatePath('/customers')
    revalidatePath('/invoices')
    revalidatePath('/')
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Something went wrong' }
  }
}

// ─────────────────────────────────────────────
// INVOICES
// ─────────────────────────────────────────────

export async function createInvoice(formData: FormData): Promise<{ error?: string; invoiceId?: string }> {
  try {
    const { supabase, user, role } = await getSessionWithRole()
    if (role !== 'admin' && role !== 'user') return { error: 'Unauthorized' }

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
    if (cErr || !customer) return { error: 'Customer not found' }

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
    if (error) return { error: error.message }

    revalidatePath('/invoices')
    revalidatePath('/')
    return { invoiceId: invoice.id }
  } catch (e: any) {
    return { error: e?.message ?? 'Something went wrong' }
  }
}

export async function updateInvoiceStatus(id: string, status: string): Promise<{ error?: string }> {
  try {
    const { supabase, user, role, fullName } = await getSessionWithRole()
    if (role !== 'admin' && role !== 'user') return { error: 'Unauthorized' }

    // Cancellation has its own flow (cancelInvoice) so a reason is always captured
    if (!['draft', 'issued', 'paid', 'overdue'].includes(status)) return { error: 'Invalid status' }

    const { data: current } = await supabase.from('invoices').select('status').eq('id', id).single()
    if (!current) return { error: 'Invoice not found' }
    if (current.status === 'cancelled') return { error: 'This invoice is cancelled. Reinstate it first to change its status.' }
    if (current.status === status) return {}

    const { error } = await supabase.from('invoices').update({ status }).eq('id', id)
    if (error) return { error: error.message }

    await supabase.from('invoice_audit_log').insert({
      invoice_id:        id,
      action:            'status_change',
      from_status:       current.status,
      to_status:         status,
      performed_by:      user.id,
      performed_by_name: fullName,
    })

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${id}`)
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Something went wrong' }
  }
}

export async function cancelInvoice(id: string, reason: string): Promise<{ error?: string }> {
  try {
    const { supabase, user, role, fullName } = await getSessionWithRole()
    if (role !== 'admin') return { error: 'Only admins can cancel invoices' }

    const trimmedReason = reason?.trim()
    if (!trimmedReason) return { error: 'A cancellation reason is required' }

    const { data: invoice } = await supabase.from('invoices').select('status, customer_id').eq('id', id).single()
    if (!invoice) return { error: 'Invoice not found' }
    if (invoice.status === 'cancelled') return { error: 'This invoice is already cancelled' }

    const { count: paymentCount } = await supabase
      .from('payments').select('*', { count: 'exact', head: true }).eq('invoice_id', id)
    if ((paymentCount ?? 0) > 0) {
      return { error: 'This invoice has payments recorded against it. Remove the payments first, then cancel.' }
    }

    const { error } = await supabase.from('invoices').update({
      status:              'cancelled',
      cancelled_at:        new Date().toISOString(),
      cancelled_by:        user.id,
      cancellation_reason: trimmedReason,
    }).eq('id', id)
    if (error) return { error: error.message }

    await supabase.from('invoice_audit_log').insert({
      invoice_id:        id,
      action:            'cancelled',
      from_status:       invoice.status,
      to_status:         'cancelled',
      reason:            trimmedReason,
      performed_by:      user.id,
      performed_by_name: fullName,
    })

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${id}`)
    revalidatePath(`/customers/${invoice.customer_id}`)
    revalidatePath(`/customers/${invoice.customer_id}/statement`)
    revalidatePath('/reports')
    revalidatePath('/')
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Something went wrong' }
  }
}

export async function reinstateInvoice(id: string): Promise<{ error?: string }> {
  try {
    const { supabase, user, role, fullName } = await getSessionWithRole()
    if (role !== 'admin') return { error: 'Only admins can reinstate invoices' }

    const { data: invoice } = await supabase.from('invoices').select('status, customer_id').eq('id', id).single()
    if (!invoice) return { error: 'Invoice not found' }
    if (invoice.status !== 'cancelled') return { error: 'Only cancelled invoices can be reinstated' }

    const { error } = await supabase.from('invoices').update({
      status:              'issued',
      cancelled_at:        null,
      cancelled_by:        null,
      cancellation_reason: null,
    }).eq('id', id)
    if (error) return { error: error.message }

    await supabase.from('invoice_audit_log').insert({
      invoice_id:        id,
      action:            'reinstated',
      from_status:       'cancelled',
      to_status:         'issued',
      performed_by:      user.id,
      performed_by_name: fullName,
    })

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${id}`)
    revalidatePath(`/customers/${invoice.customer_id}`)
    revalidatePath(`/customers/${invoice.customer_id}/statement`)
    revalidatePath('/reports')
    revalidatePath('/')
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Something went wrong' }
  }
}

// ─────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────

export async function recordPayment(formData: FormData): Promise<{ error?: string }> {
  try {
    const { supabase, user, role } = await getSessionWithRole()
    if (role !== 'admin' && role !== 'user') return { error: 'Unauthorized' }

    const invoiceId   = formData.get('invoice_id') as string || null
    const customerId  = formData.get('customer_id') as string
    const amount      = parseFloat(formData.get('amount') as string)
    const paymentDate = formData.get('payment_date') as string
    const txRef       = formData.get('transaction_ref') as string || null
    const notes       = formData.get('notes') as string || null

    if (!customerId || isNaN(amount) || !paymentDate) return { error: 'Missing required fields' }

    if (invoiceId) {
      const { data: inv } = await supabase.from('invoices').select('status').eq('id', invoiceId).single()
      if (inv?.status === 'cancelled') return { error: 'This invoice is cancelled. Payments cannot be recorded against it.' }
    }

    const { error } = await supabase.from('payments').insert({
      invoice_id:      invoiceId,
      customer_id:     customerId,
      amount,
      payment_date:    paymentDate,
      transaction_ref: txRef,
      notes,
      created_by:      user.id,
    })
    if (error) return { error: error.message }

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
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Something went wrong' }
  }
}

export async function deletePayment(paymentId: string, invoiceId: string | null, customerId: string): Promise<{ error?: string }> {
  try {
    const { supabase, role } = await getSessionWithRole()
    if (role !== 'admin' && role !== 'user') return { error: 'Unauthorized' }

    const { error } = await supabase.from('payments').delete().eq('id', paymentId)
    if (error) return { error: error.message }

    if (invoiceId) revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath(`/customers/${customerId}`)
    revalidatePath(`/customers/${customerId}/statement`)
    revalidatePath('/')
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Something went wrong' }
  }
}
