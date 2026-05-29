export const ELECTRICITY_LEVY_RATE = 0.03
export const VAT_RATE = 0.16

export function calculateInvoice(consumptionKwh: number, tariffRate: number) {
  const subtotal = consumptionKwh * tariffRate
  const electricityLevy = subtotal * ELECTRICITY_LEVY_RATE
  const vat = subtotal * VAT_RATE
  const total = subtotal + electricityLevy + vat
  return { subtotal, electricityLevy, vat, total }
}

export function formatUSD(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function getContractEndDate(startDate: string | null, durationMonths: number | null): Date | null {
  if (!startDate || !durationMonths) return null
  const start = new Date(startDate)
  return new Date(start.getFullYear(), start.getMonth() + durationMonths, start.getDate())
}

export function getContractStatus(endDate: Date): 'active' | 'expiring_soon' | 'expired' {
  const now = new Date()
  const twoMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate())
  if (endDate <= now) return 'expired'
  if (endDate <= twoMonthsFromNow) return 'expiring_soon'
  return 'active'
}

export function padInvoiceNumber(n: number) {
  return String(n).padStart(3, '0')
}
