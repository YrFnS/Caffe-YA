const BAGHDAD_TIME_ZONE = 'Asia/Baghdad'
const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000

export interface ReportDateFilters {
  from?: string
  to?: string
}

export interface ReportDateRange {
  from: Date
  to: Date
  fromInput: string
  toInput: string
}

function baghdadDateParts(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BAGHDAD_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return { year: map.year, month: map.month, day: map.day }
}

function normalizeDateInput(value: string | undefined, fallback: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback
  const [year, month, day] = value.split('-').map(Number)
  const candidate = new Date(Date.UTC(year, month - 1, day))
  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() !== month - 1
    || candidate.getUTCDate() !== day
  ) return fallback
  return value
}

function parseBaghdadBoundary(value: string, endOfDay: boolean) {
  const [year, month, day] = value.split('-').map(Number)
  const nextDay = endOfDay ? 1 : 0
  const utc = Date.UTC(year, month - 1, day + nextDay) - BAGHDAD_OFFSET_MS - (endOfDay ? 1 : 0)
  return new Date(utc)
}

export function getBaghdadReportRange(
  filters: ReportDateFilters,
  now = new Date(),
): ReportDateRange {
  const today = baghdadDateParts(now)
  const todayInput = `${today.year}-${today.month}-${today.day}`
  const monthStartInput = `${today.year}-${today.month}-01`
  const fromInput = normalizeDateInput(filters.from, monthStartInput)
  const toInput = normalizeDateInput(filters.to, todayInput)
  const safeFromInput = fromInput <= toInput ? fromInput : toInput
  const safeToInput = fromInput <= toInput ? toInput : fromInput

  return {
    from: parseBaghdadBoundary(safeFromInput, false),
    to: parseBaghdadBoundary(safeToInput, true),
    fromInput: safeFromInput,
    toInput: safeToInput,
  }
}
