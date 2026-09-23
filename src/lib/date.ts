const day = 86_400_000

export function todayISO(date = new Date()) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return `${copy.getFullYear()}-${String(copy.getMonth() + 1).padStart(2, '0')}-${String(copy.getDate()).padStart(2, '0')}`
}

export function parseISODate(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatShortDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(parseISODate(value))
}

export function formatLongDate(date = new Date()) {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

export function countdownLabel(value: string, now = new Date()) {
  const target = parseISODate(value)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const delta = Math.round((target.getTime() - start.getTime()) / day)
  if (delta === 0) return 'oggi'
  if (delta === 1) return 'domani'
  if (delta > 1) return `tra ${delta} giorni`
  if (delta === -1) return 'scaduto da 1 giorno'
  return `scaduto da ${Math.abs(delta)} giorni`
}

export function countdownTone(value: string, now = new Date()) {
  const target = parseISODate(value)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const delta = Math.round((target.getTime() - start.getTime()) / day)
  if (delta < 0) return 'overdue'
  if (delta <= 3) return 'urgent'
  if (delta <= 14) return 'soon'
  return 'future'
}

export function addMonths(value: string, months: number, dueDay?: number | null) {
  const source = parseISODate(value)
  const result = new Date(source.getFullYear(), source.getMonth() + months, 1)
  const preferred = dueDay ?? source.getDate()
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(preferred, lastDay))
  return todayISO(result)
}

export function money(value: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value)
}
