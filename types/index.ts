export type UserRole = 'admin' | 'user' | 'viewer'

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export interface Customer {
  id: string
  name: string
  tpin: string | null
  address: string | null
  service_number: string
  tariff_rate: number
  contract_start_date: string | null
  contract_duration_months: number | null
  email: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CustomerWithExpiry extends Customer {
  contract_end_date: string
  contract_status: 'active' | 'expiring_soon' | 'expired'
}

export interface Invoice {
  id: string
  invoice_number: string
  customer_id: string
  billing_period: string
  billing_month: string
  previous_reading: number | null
  current_reading: number | null
  consumption_kwh: number
  tariff_rate: number
  subtotal: number
  electricity_levy: number
  vat: number
  total: number
  due_date: string | null
  status: 'draft' | 'issued' | 'paid' | 'overdue'
  notes: string | null
  created_at: string
  created_by: string | null
}

export interface InvoiceWithCustomer extends Invoice {
  customers: Customer
}

export interface Payment {
  id: string
  customer_id: string
  invoice_id: string | null
  amount: number
  payment_date: string
  transaction_ref: string | null
  notes: string | null
  created_at: string
  created_by: string | null
}
