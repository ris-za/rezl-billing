'use client'

/**
 * Copyright (c) 2025 Saidi Tembo. All rights reserved.
 * Unauthorised copying, modification, distribution or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of Saidi Tembo.
 */


import { useState, useMemo } from 'react'
import { formatUSD } from '@/lib/calculations'
import { format, differenceInDays } from 'date-fns'
import {
  FileSpreadsheet, FileDown, TrendingUp, Users,
  AlertTriangle, Receipt, Filter, X,
} from 'lucide-react'
import type { InvoiceWithCustomer, Customer, Payment } from '@/types'

type ReportType = 'invoices' | 'revenue' | 'customers' | 'outstanding'

const reportTypes = [
  {
    id: 'invoices' as const,
    title: 'Invoice Report',
    desc: 'Full breakdown of all invoices',
    icon: Receipt,
  },
  {
    id: 'revenue' as const,
    title: 'Revenue Summary',
    desc: 'Revenue grouped by billing period',
    icon: TrendingUp,
  },
  {
    id: 'customers' as const,
    title: 'Customer Report',
    desc: 'Billing totals per customer',
    icon: Users,
  },
  {
    id: 'outstanding' as const,
    title: 'Outstanding',
    desc: 'Unpaid & overdue invoices',
    icon: AlertTriangle,
  },
]

const statusBadge = (val: string) => {
  const lower = val.toLowerCase()
  const cls =
    lower === 'paid'    ? 'bg-green-100 text-green-700' :
    lower === 'overdue' ? 'bg-red-100 text-red-700'     :
    lower === 'issued'  ? 'bg-gray-100 text-gray-600'   :
                          'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {val}
    </span>
  )
}

export function ReportsClient({
  invoices,
  customers,
  payments,
}: {
  invoices: InvoiceWithCustomer[]
  customers: Customer[]
  payments: Payment[]
}) {
  const [reportType, setReportType] = useState<ReportType>('invoices')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo,   setDateTo]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)

  /* ── payment lookup: invoice_id → total payments received ── */
  const paidByInvoice = useMemo(() => {
    const map: Record<string, number> = {}
    payments.forEach((p) => {
      if (p.invoice_id) {
        map[p.invoice_id] = (map[p.invoice_id] ?? 0) + p.amount
      }
    })
    return map
  }, [payments])

  /* ── filtered invoices ── */
  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (dateFrom && inv.created_at < dateFrom)                  return false
      if (dateTo   && inv.created_at > dateTo + 'T23:59:59')     return false
      if (statusFilter !== 'all' && inv.status !== statusFilter)  return false
      return true
    })
  }, [invoices, dateFrom, dateTo, statusFilter])

  /* ── report data ── */
  const invoiceRows = useMemo(() =>
    filtered.map((inv) => {
      const paid    = paidByInvoice[inv.id] ?? 0
      const balance = Math.max(0, inv.total - paid)
      return [
        `INV-${inv.invoice_number}`,
        inv.customers.name,
        inv.billing_period,
        inv.consumption_kwh.toLocaleString(),
        formatUSD(inv.tariff_rate),
        formatUSD(inv.subtotal),
        formatUSD(inv.electricity_levy),
        formatUSD(inv.vat),
        formatUSD(inv.total),
        formatUSD(paid),
        formatUSD(balance),
        inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
        format(new Date(inv.created_at), 'dd MMM yyyy'),
      ]
    }),
  [filtered, paidByInvoice])

  const revenueRows = useMemo(() => {
    const map: Record<string, { billed: number; paid: number; count: number }> = {}
    filtered.forEach((inv) => {
      if (!map[inv.billing_period]) map[inv.billing_period] = { billed: 0, paid: 0, count: 0 }
      map[inv.billing_period].billed += inv.total
      map[inv.billing_period].count  += 1
      map[inv.billing_period].paid   += paidByInvoice[inv.id] ?? 0
    })
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([period, v]) => [
        period,
        v.count.toString(),
        formatUSD(v.billed),
        formatUSD(v.paid),
        formatUSD(Math.max(0, v.billed - v.paid)),
      ])
  }, [filtered, paidByInvoice])

  const customerRows = useMemo(() =>
    customers
      .map((c) => {
        const ci = filtered.filter((i) => i.customer_id === c.id)
        if (!ci.length) return null
        const billed = ci.reduce((s, i) => s + i.total, 0)
        const paid   = ci.reduce((s, i) => s + (paidByInvoice[i.id] ?? 0), 0)
        return [
          c.name,
          c.service_number,
          c.tpin || 'N/A',
          ci.length.toString(),
          formatUSD(billed),
          formatUSD(paid),
          formatUSD(Math.max(0, billed - paid)),
        ]
      })
      .filter(Boolean) as string[][],
  [filtered, customers, paidByInvoice])

  const outstandingRows = useMemo(() =>
    filtered
      .filter((inv) => inv.status === 'overdue' || inv.status === 'issued')
      .map((inv) => {
        const paid    = paidByInvoice[inv.id] ?? 0
        const balance = Math.max(0, inv.total - paid)
        return [
          `INV-${inv.invoice_number}`,
          inv.customers.name,
          inv.billing_period,
          formatUSD(inv.total),
          formatUSD(paid),
          formatUSD(balance),
          inv.due_date ? format(new Date(inv.due_date), 'dd MMM yyyy') : 'Upon receipt',
          inv.due_date && inv.status === 'overdue'
            ? `${differenceInDays(new Date(), new Date(inv.due_date))} days`
            : 'N/A',
          inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
        ]
      }),
  [filtered, paidByInvoice])

  /* ── current report config ── */
  const report = useMemo(() => {
    switch (reportType) {
      case 'invoices':
        return {
          title:    'Invoice Report',
          filename: `invoice-report-${format(new Date(), 'yyyy-MM-dd')}`,
          headers:  ['Invoice No.', 'Customer', 'Period', 'Consumption (kWh)', 'Tariff Rate', 'Subtotal', 'Levy (3%)', 'VAT (16%)', 'Total', 'Paid', 'Balance', 'Status', 'Date'],
          rows:     invoiceRows,
          statusCol: 11,
        }
      case 'revenue':
        return {
          title:    'Revenue Summary',
          filename: `revenue-summary-${format(new Date(), 'yyyy-MM-dd')}`,
          headers:  ['Billing Period', 'Invoices', 'Total Billed', 'Payments Received', 'Outstanding'],
          rows:     revenueRows,
          statusCol: -1,
        }
      case 'customers':
        return {
          title:    'Customer Report',
          filename: `customer-report-${format(new Date(), 'yyyy-MM-dd')}`,
          headers:  ['Customer', 'Service No.', 'TPIN', 'Invoices', 'Total Billed', 'Payments Received', 'Outstanding'],
          rows:     customerRows,
          statusCol: -1,
        }
      case 'outstanding':
        return {
          title:    'Outstanding Invoices',
          filename: `outstanding-${format(new Date(), 'yyyy-MM-dd')}`,
          headers:  ['Invoice No.', 'Customer', 'Period', 'Invoiced', 'Paid So Far', 'Balance Due', 'Due Date', 'Days Overdue', 'Status'],
          rows:     outstandingRows,
          statusCol: 8,
        }
    }
  }, [reportType, invoiceRows, revenueRows, customerRows, outstandingRows])

  /* ── summary stats (payment-based, not status-based) ── */
  const totalBilled      = filtered.reduce((s, i) => s + i.total, 0)
  const totalPaid        = filtered.reduce((s, i) => s + (paidByInvoice[i.id] ?? 0), 0)
  const totalOutstanding = Math.max(0, totalBilled - totalPaid)

  /* ── Excel export ── */
  async function handleExcelExport() {
    setExporting('excel')
    try {
      const ExcelJS   = await import('exceljs')
      const workbook  = new ExcelJS.Workbook()
      workbook.creator  = 'Saidi Tembo'
      workbook.created  = new Date()
      workbook.modified = new Date()

      // ── brand palette (ARGB) ──────────────────────────────────────
      const NAVY   = 'FF1E2235'
      const GREEN  = 'FF16A34A'
      const LGREEN = 'FF4ADE80'
      const ACCENT = 'FF6B7DB3'
      const META   = 'FFE8F0FE'
      const LGRAY  = 'FFF8F9FC'
      const ALTROW = 'FFF1F5F9'
      const WHITE  = 'FFFFFFFF'

      // column-letter helper (1→A, 11→K, etc.)
      const col = (n: number) => {
        if (n <= 26) return String.fromCharCode(64 + n)
        return String.fromCharCode(64 + Math.floor((n - 1) / 26)) + String.fromCharCode(65 + (n - 1) % 26)
      }
      const lastCol = col(report.headers.length)

      // ── SHEET 1: SUMMARY ─────────────────────────────────────────
      const sum = workbook.addWorksheet('Summary', {
        pageSetup: { paperSize: 9, orientation: 'landscape' },
      })
      sum.columns = [{ width: 28 }, { width: 26 }, { width: 20 }, { width: 20 }, { width: 20 }]

      // Row 1 – company name
      sum.mergeCells('A1:E1')
      sum.getRow(1).height = 34
      Object.assign(sum.getCell('A1'), {
        value: 'RELIANCE ENERGY ZAMBIA LIMITED',
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } },
          font: { bold: true, color: { argb: WHITE }, size: 16, name: 'Calibri' },
          alignment: { horizontal: 'center', vertical: 'middle' },
        },
      })

      // Row 2 – system label
      sum.mergeCells('A2:E2')
      sum.getRow(2).height = 20
      Object.assign(sum.getCell('A2'), {
        value: 'BILLING MANAGEMENT SYSTEM',
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } },
          font: { color: { argb: ACCENT }, size: 9 },
          alignment: { horizontal: 'center', vertical: 'middle' },
        },
      })

      // Row 3 – green accent bar
      sum.mergeCells('A3:E3')
      sum.getRow(3).height = 5
      sum.getCell('A3').style = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } } }

      // Row 4 – spacer
      sum.getRow(4).height = 8

      // Rows 5-8 – metadata
      const metaRows = [
        ['Generated',     format(new Date(), 'dd/MM/yyyy, HH:mm:ss')],
        ['Report Type',   report.title],
        ['Total Records', `${report.rows.length}`],
        ['Prepared by',   'Saidi Tembo  ·  N-Power Billing System'],
      ]
      metaRows.forEach(([label, value], i) => {
        const r = 5 + i
        sum.mergeCells(`B${r}:E${r}`)
        sum.getRow(r).height = 18
        Object.assign(sum.getCell(`A${r}`), {
          value: label,
          style: {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: META } },
            font: { bold: true, size: 9, color: { argb: 'FF374151' } },
            alignment: { vertical: 'middle', indent: 1 },
          },
        })
        Object.assign(sum.getCell(`B${r}`), {
          value,
          style: {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: META } },
            font: { size: 9, color: { argb: 'FF111827' } },
            alignment: { vertical: 'middle', indent: 1 },
          },
        })
      })

      // Row 9 – spacer
      sum.getRow(9).height = 10

      // Row 10 – FINANCIAL SUMMARY section header
      sum.mergeCells('A10:E10')
      sum.getRow(10).height = 22
      Object.assign(sum.getCell('A10'), {
        value: 'FINANCIAL SUMMARY',
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } },
          font: { bold: true, color: { argb: WHITE }, size: 10 },
          alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
        },
      })

      // Rows 11-13 – stats
      const statsRows = [
        ['Total Billed',       formatUSD(totalBilled)],
        ['Payments Received',  formatUSD(totalPaid)],
        ['Outstanding',        formatUSD(totalOutstanding)],
      ]
      statsRows.forEach(([label, value], i) => {
        const r   = 11 + i
        const bg  = i % 2 === 0 ? LGRAY : WHITE
        sum.getRow(r).height = 18
        sum.mergeCells(`B${r}:E${r}`)
        Object.assign(sum.getCell(`A${r}`), {
          value: label,
          style: {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } },
            font: { size: 9, color: { argb: 'FF6B7280' } },
            alignment: { vertical: 'middle', indent: 1 },
          },
        })
        Object.assign(sum.getCell(`B${r}`), {
          value,
          style: {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } },
            font: {
              bold: true, size: 9,
              color: { argb: i === 2 && totalOutstanding > 0 ? 'FFDC2626' : 'FF111827' },
            },
            alignment: { vertical: 'middle', indent: 1 },
          },
        })
      })

      // Row 14 – spacer
      sum.getRow(14).height = 10

      // Row 15 – footer
      sum.mergeCells('A15:E15')
      sum.getRow(15).height = 16
      Object.assign(sum.getCell('A15'), {
        value: 'Developed by Saidi Tembo  ·  Reliance Energy Zambia Limited  ·  TPIN: 1004222073',
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } },
          font: { italic: true, size: 8, color: { argb: ACCENT } },
          alignment: { horizontal: 'center', vertical: 'middle' },
        },
      })

      // ── SHEET 2: DATA ─────────────────────────────────────────────
      const data = workbook.addWorksheet(report.title.substring(0, 31), {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
        views: [{ state: 'frozen', xSplit: 0, ySplit: 6 }],
      })

      data.columns = report.headers.map((h, i) => ({
        width: Math.max(h.length + 4, ...report.rows.map((r) => (r[i] ?? '').toString().length + 2), 14),
      }))

      // Row 1 – company header
      data.mergeCells(`A1:${lastCol}1`)
      data.getRow(1).height = 30
      Object.assign(data.getCell('A1'), {
        value: 'RELIANCE ENERGY ZAMBIA LIMITED  ·  BILLING MANAGEMENT SYSTEM',
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } },
          font: { bold: true, color: { argb: WHITE }, size: 13 },
          alignment: { horizontal: 'center', vertical: 'middle' },
        },
      })

      // Row 2 – report title
      data.mergeCells(`A2:${lastCol}2`)
      data.getRow(2).height = 20
      Object.assign(data.getCell('A2'), {
        value: report.title.toUpperCase(),
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } },
          font: { bold: true, color: { argb: LGREEN }, size: 10 },
          alignment: { horizontal: 'center', vertical: 'middle' },
        },
      })

      // Row 3 – green accent bar
      data.mergeCells(`A3:${lastCol}3`)
      data.getRow(3).height = 4
      data.getCell('A3').style = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } } }

      // Row 4 – metadata strip
      data.mergeCells(`A4:${lastCol}4`)
      data.getRow(4).height = 16
      Object.assign(data.getCell('A4'), {
        value: `Generated: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}   |   Records: ${report.rows.length}   |   Prepared by: Saidi Tembo`,
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: META } },
          font: { size: 8, color: { argb: 'FF374151' } },
          alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
        },
      })

      // Row 5 – spacer
      data.getRow(5).height = 6

      // Row 6 – column headers (green)
      const hdrRow = data.getRow(6)
      hdrRow.height = 24
      report.headers.forEach((h, i) => {
        Object.assign(hdrRow.getCell(i + 1), {
          value: h,
          style: {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } },
            font: { bold: true, color: { argb: WHITE }, size: 9 },
            alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
            border: { bottom: { style: 'medium', color: { argb: 'FF15803D' } } },
          },
        })
      })

      // Rows 7+ – data
      report.rows.forEach((row, ri) => {
        const dr  = data.getRow(7 + ri)
        dr.height = 18
        const alt = ri % 2 === 1
        row.forEach((cellVal, ci) => {
          const isStatus = ci === report.statusCol
          const statusColor =
            isStatus && cellVal.toLowerCase() === 'paid'    ? 'FF166534' :
            isStatus && cellVal.toLowerCase() === 'overdue' ? 'FF991B1B' : 'FF374151'

          Object.assign(dr.getCell(ci + 1), {
            value: cellVal,
            style: {
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: alt ? ALTROW : WHITE } },
              font: {
                size: 9,
                bold: ci === 0 || isStatus,
                color: { argb: ci === 0 ? 'FF111827' : isStatus ? statusColor : 'FF374151' },
              },
              alignment: { vertical: 'middle', indent: 1 },
              border: { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } },
            },
          })
        })
      })

      // Totals footer row (green bar)
      if (report.rows.length > 0) {
        const tRow = 7 + report.rows.length
        data.mergeCells(`A${tRow}:${lastCol}${tRow}`)
        data.getRow(tRow).height = 20
        Object.assign(data.getCell(`A${tRow}`), {
          value: `Total Records: ${report.rows.length}   |   Total Billed: ${formatUSD(totalBilled)}   |   Payments Received: ${formatUSD(totalPaid)}   |   Outstanding: ${formatUSD(totalOutstanding)}`,
          style: {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } },
            font: { bold: true, color: { argb: WHITE }, size: 9 },
            alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
          },
        })

        // Dark navy footer
        const fRow = tRow + 2
        data.mergeCells(`A${fRow}:${lastCol}${fRow}`)
        data.getRow(fRow).height = 14
        Object.assign(data.getCell(`A${fRow}`), {
          value: 'Reliance Energy Zambia Limited  ·  TPIN: 1004222073  ·  Plot 73719A, Sheki Sheki Road, Lusaka  ·  Developed by Saidi Tembo',
          style: {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } },
            font: { italic: true, size: 7.5, color: { argb: ACCENT } },
            alignment: { horizontal: 'center', vertical: 'middle' },
          },
        })
      }

      // ── Download ──────────────────────────────────────────────────
      const buffer = await workbook.xlsx.writeBuffer()
      const blob   = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a   = Object.assign(document.createElement('a'), {
        href: url,
        download: `${report.filename}.xlsx`,
      })
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(null)
    }
  }

  /* ── PDF export ── */
  async function handlePDFExport() {
    setExporting('pdf')
    try {
      const { default: jsPDF }    = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc   = new jsPDF({ orientation: 'landscape' })
      const pageW = doc.internal.pageSize.getWidth()

      // Dark navy header
      doc.setFillColor(30, 34, 53)
      doc.rect(0, 0, pageW, 30, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('RELIANCE ENERGY ZAMBIA LIMITED', 14, 11)

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(107, 125, 179)
      doc.text('TPIN: 1004222073  ·  Plot 73719A, Sheki Sheki Road, Lusaka, Zambia  ·  Billing Management System', 14, 18)

      doc.setFontSize(15)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(report.title.toUpperCase(), pageW - 14, 11, { align: 'right' })

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(74, 222, 128)
      doc.text(`Generated: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`, pageW - 14, 18, { align: 'right' })

      // Green accent line
      doc.setFillColor(22, 163, 74)
      doc.rect(0, 30, pageW, 2, 'F')

      // Sub-header: filters summary
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      let filterText = `Records: ${report.rows.length}`
      if (dateFrom || dateTo) filterText += `   |   Period: ${dateFrom || 'Start'} → ${dateTo || 'Today'}`
      if (statusFilter !== 'all') filterText += `   |   Status: ${statusFilter}`
      doc.text(filterText, 14, 40)

      // Summary stats row
      const stats = [
        { label: 'Total Billed',      val: formatUSD(totalBilled)      },
        { label: 'Payments Received', val: formatUSD(totalPaid)        },
        { label: 'Outstanding',       val: formatUSD(totalOutstanding) },
      ]
      const boxW = (pageW - 28) / 3
      stats.forEach(({ label, val }, i) => {
        const x = 14 + i * (boxW + 4)
        doc.setFillColor(248, 249, 252)
        doc.setDrawColor(230, 232, 238)
        doc.roundedRect(x, 44, boxW, 14, 2, 2, 'FD')
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(130, 130, 140)
        doc.text(label.toUpperCase(), x + 5, 50)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 34, 53)
        doc.text(val, x + 5, 55)
      })

      // Table
      autoTable(doc, {
        head:      [report.headers],
        body:      report.rows,
        startY:    64,
        theme:     'grid',
        headStyles: {
          fillColor:  [22, 163, 74],
          textColor:  [255, 255, 255],
          fontStyle:  'bold',
          fontSize:   7.5,
          cellPadding: 3.5,
        },
        bodyStyles: {
          fontSize:   7.5,
          cellPadding: 3,
          textColor:  [50, 50, 60],
        },
        alternateRowStyles: { fillColor: [249, 250, 252] },
        columnStyles: { 0: { fontStyle: 'bold' } },
        didDrawPage: (data) => {
          const pH = doc.internal.pageSize.getHeight()
          doc.setFillColor(30, 34, 53)
          doc.rect(0, pH - 10, pageW, 10, 'F')
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(107, 125, 179)
          doc.text('Reliance Energy Zambia Limited  ·  Billing Management System  ·  Developed by Saidi Tembo', 14, pH - 3.5)
          doc.setTextColor(74, 222, 128)
          doc.text(
            `Page ${(data as any).pageNumber}`,
            pageW - 14,
            pH - 3.5,
            { align: 'right' },
          )
        },
      })

      doc.save(`${report.filename}.pdf`)
    } finally {
      setExporting(null)
    }
  }

  const hasFilters = dateFrom || dateTo || statusFilter !== 'all'

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] space-y-4 sm:space-y-6">

      {/* ═══ HERO ═══ */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(rgba(30,34,53,0.88), rgba(30,34,53,0.88)), url(/poll.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="px-4 sm:px-8 py-5 sm:py-7">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5 sm:mb-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6b7db3' }}>Analytics</p>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Reports</h1>
              <p className="text-sm mt-1" style={{ color: '#4f5e8a' }}>
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExcelExport}
                disabled={!!exporting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: '#16a34a', color: 'white', boxShadow: '0 4px 14px rgba(22,163,74,0.4)' }}
              >
                <FileSpreadsheet className="w-4 h-4" />
                {exporting === 'excel' ? 'Exporting…' : 'Export Excel'}
              </button>
              <button
                onClick={handlePDFExport}
                disabled={!!exporting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <FileDown className="w-4 h-4" />
                {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-xl p-4" style={{ background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#4ade80' }}>Total Billed</p>
              <p className="text-2xl font-black text-white tabular-nums">{formatUSD(totalBilled)}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6b7db3' }}>Payments Received</p>
              <p className="text-2xl font-black text-white tabular-nums">{formatUSD(totalPaid)}</p>
            </div>
            <div className="rounded-xl p-4" style={{
              background: totalOutstanding > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(22,163,74,0.08)',
              border: `1px solid ${totalOutstanding > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(22,163,74,0.2)'}`,
            }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: totalOutstanding > 0 ? '#f87171' : '#4ade80' }}>Outstanding</p>
              <p className="text-2xl font-black text-white tabular-nums">{formatUSD(totalOutstanding)}</p>
            </div>
          </div>
        </div>
        <div style={{ height: 3, background: 'linear-gradient(90deg,#16a34a,#22c55e,#16a34a)' }} />
      </div>

      {/* ═══ REPORT TYPE SELECTOR ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {reportTypes.map(({ id, title, desc, icon: Icon }) => {
          const active = reportType === id
          const isAlert = id === 'outstanding'
          return (
            <button
              key={id}
              onClick={() => setReportType(id)}
              className="text-left rounded-2xl border p-5 flex items-start gap-4 transition-all hover:shadow-md hover:-translate-y-0.5 bg-white"
              style={{
                borderColor: active ? (isAlert ? '#f59e0b' : '#16a34a') : '#e5e7eb',
                boxShadow:   active ? (isAlert ? '0 0 0 3px rgba(245,158,11,0.12)' : '0 0 0 3px rgba(22,163,74,0.12)') : 'none',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: active
                    ? isAlert ? '#fef3c7' : '#dcfce7'
                    : '#f8f9fc',
                }}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: active ? (isAlert ? '#d97706' : '#16a34a') : '#94a3b8' }}
                />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm" style={{ color: active ? '#111827' : '#374151' }}>{title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* ═══ FILTERS ═══ */}
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Filters</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200"
            />
          </div>

          {reportType === 'invoices' && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-200"
              >
                <option value="all">All statuses</option>
                <option value="paid">Paid</option>
                <option value="issued">Issued</option>
                <option value="overdue">Overdue</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-3 ml-auto">
            {hasFilters && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter('all') }}
                className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-3 py-1">
              {report.rows.length} record{report.rows.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ TABLE ═══ */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        {/* Table title bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: '#fafbfc' }}>
          <div>
            <h2 className="text-sm font-bold text-gray-900">{report.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {report.rows.length === 0 ? 'No data' : `Showing ${report.rows.length} record${report.rows.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExcelExport}
              disabled={!!exporting || report.rows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-200 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-40"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel
            </button>
            <button
              onClick={handlePDFExport}
              disabled={!!exporting || report.rows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              <FileDown className="w-3.5 h-3.5" />
              PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#1e2235' }}>
                {report.headers.map((h) => (
                  <th
                    key={h}
                    className="py-3.5 px-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap"
                    style={{ color: '#6b7db3' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={report.headers.length} className="py-16 text-center">
                    <p className="text-sm text-gray-400 font-medium">No records match the selected filters</p>
                    {hasFilters && (
                      <button
                        onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter('all') }}
                        className="text-xs text-green-600 hover:underline mt-2 block mx-auto"
                      >
                        Clear filters to see all data
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                report.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="hover:bg-gray-50 transition-colors"
                    style={{ borderTop: '1px solid #f3f4f6' }}
                  >
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`py-3.5 px-5 ${ci === 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                      >
                        {ci === report.statusCol ? statusBadge(cell) : cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {report.rows.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100" style={{ background: '#fafbfc' }}>
            <p className="text-xs text-gray-400">
              {report.rows.length} record{report.rows.length !== 1 ? 's' : ''} · Export above to download full report
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
