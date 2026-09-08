'use client'

import React, { useState } from 'react'
import {
  Download,
  Loader2,
  CalendarDays,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  CreditCard,
  CheckSquare,
  Scale,
  ClipboardList,
  MessageSquare,
  type LucideIcon
} from 'lucide-react'
import { format, startOfDay, endOfDay, startOfMonth, subMonths, subDays } from 'date-fns'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { supabase } from '@/lib/supabase'
import { formatInputDate } from '@/utils/dateHelpers'
import { downloadWorkbook, type CellValue, type SheetData } from '@/utils/xlsx'
import DashboardLayout from '@/components/DashboardLayout'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type Row = Record<string, any>

interface Dataset {
  key: string
  label: string
  description: string
  sheetName: string
  icon: LucideIcon
  columns: { header: string; value: (row: Row) => CellValue }[]
  // Supabase query builders are thenable rather than real Promises
  fetch: (
    from: Date,
    to: Date,
    offset: number,
    limit: number
  ) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>
}

/* ------------------------------- formatting ------------------------------- */

const safeDate = (value?: string | null) => {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? value : d
}

const asDate = (value?: string | null) => {
  const d = safeDate(value)
  return d instanceof Date ? format(d, 'dd MMM yyyy') : d
}

const asDateTime = (value?: string | null) => {
  const d = safeDate(value)
  return d instanceof Date ? format(d, 'dd MMM yyyy, hh:mm a') : d
}

const asTime = (value?: string | null) => {
  const d = safeDate(value)
  return d instanceof Date ? format(d, 'hh:mm a') : d
}

const durationMinutes = (start?: string | null, end?: string | null) => {
  if (!start || !end) return null
  const a = new Date(start).getTime()
  const b = new Date(end).getTime()
  if (isNaN(a) || isNaN(b)) return null
  return Math.max(0, Math.round((b - a) / 60000))
}

const num = (value: any): CellValue =>
  value === null || value === undefined || value === '' ? null : Number(value)

/* -------------------------------- datasets -------------------------------- */

// `joined_at` / `start_date` are stored as plain yyyy-MM-dd date columns,
// everything else is a timestamp, so the bounds differ per dataset.
const dayKey = (d: Date) => formatInputDate(d)

const DATASETS: Dataset[] = [
  {
    key: 'members',
    label: 'Members',
    description: 'Members who joined within the selected dates',
    sheetName: 'Members',
    icon: Users,
    columns: [
      { header: 'ID No', value: r => r.id_no ?? null },
      { header: 'Full Name', value: r => r.full_name },
      { header: 'Phone', value: r => r.phone ?? null },
      { header: 'Email', value: r => r.email ?? null },
      { header: 'Joined On', value: r => asDate(r.joined_at) },
      { header: 'Valid Till', value: r => asDate(r.valid_till) },
      { header: 'Amount Paid', value: r => num(r.amount_paid) },
      { header: 'Receipt No', value: r => r.receipt_number ?? null },
      { header: 'Status', value: r => (r.is_active ? 'Active' : 'Inactive') },
      { header: 'Created At', value: r => asDateTime(r.created_at) },
    ],
    fetch: (from, to, offset, limit) =>
      supabase
        .from('members')
        .select('*')
        .gte('joined_at', dayKey(from))
        .lte('joined_at', dayKey(to))
        .order('joined_at', { ascending: true })
        .range(offset, offset + limit - 1),
  },
  {
    key: 'memberships',
    label: 'Memberships & Renewals',
    description: 'Membership plans starting within the selected dates',
    sheetName: 'Memberships',
    icon: CreditCard,
    columns: [
      { header: 'Member', value: r => r.full_name },
      { header: 'Member ID', value: r => r.uid },
      { header: 'Start Date', value: r => asDate(r.start_date) },
      { header: 'Valid Till', value: r => asDate(r.valid_till) },
      { header: 'Amount Paid', value: r => num(r.amount_paid) },
      { header: 'Payment Method', value: r => r.payment_method ?? null },
      { header: 'Receipt No', value: r => r.receipt_number ?? null },
      { header: 'Recorded At', value: r => asDateTime(r.created_at) },
    ],
    fetch: (from, to, offset, limit) =>
      supabase
        .from('memberships')
        .select('*')
        .gte('start_date', dayKey(from))
        .lte('start_date', dayKey(to))
        .order('start_date', { ascending: true })
        .range(offset, offset + limit - 1),
  },
  {
    key: 'checkins',
    label: 'Attendance',
    description: 'Every check-in and check-out in the selected dates',
    sheetName: 'Attendance',
    icon: CheckSquare,
    columns: [
      { header: 'ID No', value: r => r.member?.id_no ?? null },
      { header: 'Member', value: r => r.member?.full_name ?? null },
      { header: 'Phone', value: r => r.member?.phone ?? null },
      { header: 'Date', value: r => asDate(r.checked_in_at) },
      { header: 'Check In', value: r => asTime(r.checked_in_at) },
      { header: 'Check Out', value: r => asTime(r.checked_out_at) },
      { header: 'Duration (min)', value: r => durationMinutes(r.checked_in_at, r.checked_out_at) },
    ],
    fetch: (from, to, offset, limit) =>
      supabase
        .from('checkins')
        .select('*, member:members(full_name, id_no, phone)')
        .gte('checked_in_at', from.toISOString())
        .lte('checked_in_at', to.toISOString())
        .order('checked_in_at', { ascending: true })
        .range(offset, offset + limit - 1),
  },
  {
    key: 'body_records',
    label: 'Body Records',
    description: 'Weight and height measurements logged in the selected dates',
    sheetName: 'Body Records',
    icon: Scale,
    columns: [
      { header: 'ID No', value: r => r.member?.id_no ?? null },
      { header: 'Member', value: r => r.member?.full_name ?? null },
      { header: 'Recorded On', value: r => asDateTime(r.recorded_at) },
      { header: 'Weight (kg)', value: r => num(r.weight_kg) },
      { header: 'Height (cm)', value: r => num(r.height_cm) },
      { header: 'Photo URL', value: r => r.image_url ?? null },
    ],
    fetch: (from, to, offset, limit) =>
      supabase
        .from('body_records')
        .select('*, member:members(full_name, id_no)')
        .gte('recorded_at', from.toISOString())
        .lte('recorded_at', to.toISOString())
        .order('recorded_at', { ascending: true })
        .range(offset, offset + limit - 1),
  },
  {
    key: 'enquiries',
    label: 'Enquiries',
    description: 'Prospective member enquiries in the selected dates',
    sheetName: 'Enquiries',
    icon: ClipboardList,
    columns: [
      { header: 'Name', value: r => r.name },
      { header: 'Phone', value: r => r.phone ?? null },
      { header: 'Location', value: r => r.location ?? null },
      { header: 'Enquired On', value: r => asDateTime(r.created_at) },
    ],
    fetch: (from, to, offset, limit) =>
      supabase
        .from('enquiries')
        .select('*')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1),
  },
  {
    key: 'message_log',
    label: 'Messages Sent',
    description: 'Welcome and reminder messages sent in the selected dates',
    sheetName: 'Messages',
    icon: MessageSquare,
    columns: [
      { header: 'ID No', value: r => r.member?.id_no ?? null },
      { header: 'Member', value: r => r.member?.full_name ?? null },
      { header: 'Phone', value: r => r.member?.phone ?? null },
      { header: 'Message Type', value: r => r.message_type ?? null },
      { header: 'Sent At', value: r => asDateTime(r.sent_at) },
    ],
    fetch: (from, to, offset, limit) =>
      supabase
        .from('message_log')
        .select('*, member:members(full_name, id_no, phone)')
        .gte('sent_at', from.toISOString())
        .lte('sent_at', to.toISOString())
        .order('sent_at', { ascending: true })
        .range(offset, offset + limit - 1),
  },
]

const ALL_KEYS = DATASETS.map(d => d.key)

// PostgREST caps how many rows one request may return, so page through
// the range until a short page comes back.
const PAGE_SIZE = 1000

const fetchAll = async (dataset: Dataset, from: Date, to: Date) => {
  const all: Row[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await dataset.fetch(from, to, offset, PAGE_SIZE)
    if (error) throw new Error(`${dataset.label}: ${error.message}`)
    const page = data || []
    all.push(...page)
    if (page.length < PAGE_SIZE) return all
  }
}

/* ---------------------------------- page ---------------------------------- */

export default function ExportPage() {
  const today = new Date()
  const [fromDate, setFromDate] = useState(formatInputDate(startOfMonth(today)))
  const [toDate, setToDate] = useState(formatInputDate(today))
  const [selected, setSelected] = useState<string[]>(ALL_KEYS)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const allSelected = selected.length === ALL_KEYS.length
  const rangeValid = Boolean(fromDate && toDate && fromDate <= toDate)

  const toggle = (key: string) => {
    setResult(null)
    setSelected(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))
  }

  const toggleAll = () => {
    setResult(null)
    setSelected(allSelected ? [] : ALL_KEYS)
  }

  const applyPreset = (from: Date, to: Date) => {
    setResult(null)
    setFromDate(formatInputDate(from))
    setToDate(formatInputDate(to))
  }

  const handleExport = async () => {
    setError(null)
    setResult(null)

    if (!rangeValid) {
      setError('Please pick a valid date range — the "from" date must be on or before the "to" date.')
      return
    }
    if (selected.length === 0) {
      setError('Select at least one type of data to export.')
      return
    }

    setExporting(true)

    try {
      const from = startOfDay(new Date(`${fromDate}T00:00:00`))
      const to = endOfDay(new Date(`${toDate}T00:00:00`))
      const chosen = DATASETS.filter(d => selected.includes(d.key))

      const results = await Promise.all(chosen.map(d => fetchAll(d, from, to)))

      let total = 0
      const sheets: SheetData[] = chosen.map((dataset, i) => {
        const rows = results[i]
        total += rows.length
        return {
          name: dataset.sheetName,
          rows: [
            dataset.columns.map(c => c.header),
            ...rows.map(row => dataset.columns.map(c => c.value(row))),
          ],
        }
      })

      // A summary sheet up front so the file explains itself
      sheets.unshift({
        name: 'Summary',
        rows: [
          ['Aim Fitness — Data Export'],
          ['Generated On', format(new Date(), 'dd MMM yyyy, hh:mm a')],
          ['From Date', format(from, 'dd MMM yyyy')],
          ['To Date', format(to, 'dd MMM yyyy')],
          [],
          ['Sheet', 'Records'],
          ...chosen.map((d, i) => [d.sheetName, results[i].length]),
          ['Total', total],
        ],
      })

      downloadWorkbook(`aim-fitness-export-${fromDate}-to-${toDate}.xlsx`, sheets)
      setResult(`Exported ${total} record${total === 1 ? '' : 's'} across ${chosen.length} sheet${chosen.length === 1 ? '' : 's'}.`)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong while generating the export.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-10 pb-32">

        {/* Header */}
        <header>
          <h1 className="text-4xl font-bold mb-1">Export</h1>
          <p className="text-[var(--text-secondary)]">Download gym data for any date range as an Excel workbook</p>
        </header>

        {/* Date range */}
        <section className="glass-card p-6 md:p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Date Range</h2>
              <p className="text-xs text-[var(--text-muted)]">Both dates are included in the export</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="label font-bold mb-2">From</label>
              <input
                type="date"
                className="h-13"
                value={fromDate}
                max={toDate || undefined}
                onChange={e => { setFromDate(e.target.value); setResult(null) }}
              />
            </div>
            <div>
              <label className="label font-bold mb-2">To</label>
              <input
                type="date"
                className="h-13"
                value={toDate}
                min={fromDate || undefined}
                onChange={e => { setToDate(e.target.value); setResult(null) }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Last 7 days', from: subDays(today, 6), to: today },
              { label: 'Last 30 days', from: subDays(today, 29), to: today },
              { label: 'This month', from: startOfMonth(today), to: today },
              { label: 'Last month', from: startOfMonth(subMonths(today, 1)), to: subDays(startOfMonth(today), 1) },
              { label: 'This year', from: new Date(today.getFullYear(), 0, 1), to: today },
            ].map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.from, preset.to)}
                className="px-4 py-2 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-xs font-bold text-[var(--text-secondary)] hover:border-accent/30 hover:text-accent transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        {/* Data selection */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-lg leading-tight">Data to Include</h2>
              <p className="text-xs text-[var(--text-muted)]">Each selection becomes its own sheet in the workbook</p>
            </div>
            <button
              type="button"
              onClick={toggleAll}
              className="px-4 py-2 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-xs font-bold hover:border-accent/30 hover:text-accent transition-colors shrink-0"
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DATASETS.map(dataset => {
              const isChecked = selected.includes(dataset.key)
              return (
                <button
                  key={dataset.key}
                  type="button"
                  onClick={() => toggle(dataset.key)}
                  className={cn(
                    'glass-card p-5 flex items-center gap-4 text-left transition-all duration-200 hover:scale-[1.01]',
                    isChecked ? 'border-accent/30' : 'opacity-70 hover:opacity-100'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors',
                    isChecked
                      ? 'bg-accent/10 border border-accent/20 text-accent'
                      : 'bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-muted)]'
                  )}>
                    <dataset.icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base truncate">{dataset.label}</h3>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium leading-snug">
                      {dataset.description}
                    </p>
                  </div>

                  <div className={cn(
                    'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all',
                    isChecked
                      ? 'bg-accent border-accent text-white'
                      : 'border-[var(--input-border)] bg-[var(--input-bg)]'
                  )}>
                    {isChecked && <Check className="w-4 h-4" strokeWidth={3} />}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Feedback */}
        {error && (
          <div className="glass-card p-4 flex items-center gap-3 border-red-200 animate-fadeUp">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-500">{error}</p>
          </div>
        )}

        {result && !error && (
          <div className="glass-card p-4 flex items-center gap-3 border-accent/30 animate-fadeUp">
            <FileSpreadsheet className="w-5 h-5 text-accent shrink-0" />
            <p className="text-sm font-medium">{result}</p>
          </div>
        )}

        {/* Export */}
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || selected.length === 0 || !rangeValid}
          className="h-14 rounded-2xl bg-accent hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-accent text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-95"
        >
          {exporting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating workbook…</>
            : <><Download className="w-4 h-4" /> Download Excel ({selected.length} sheet{selected.length === 1 ? '' : 's'})</>
          }
        </button>
      </div>
    </DashboardLayout>
  )
}
