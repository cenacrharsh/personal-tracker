import { toDateKey } from "@/lib/dates"

// Math for "avoid" trackers. Only lapses are ever recorded — an unlogged day is
// unknown, not proven clean — so everything here is phrased against the log:
// how long since the last recorded lapse, and the longest recorded gap.

const DAY_MS = 86_400_000

function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function shiftKey(key: string, days: number): string {
  const d = parseKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

// Inclusive day count between two date keys ("2026-01-01" → "2026-01-03" is 3).
export function daysBetween(start: string, end: string): number {
  if (end < start) return 0
  return Math.round((parseKey(end).getTime() - parseKey(start).getTime()) / DAY_MS) + 1
}

// Days since the most recent logged lapse, counting today. Bounded by the
// earliest entry: before tracking began there is no record to measure against.
export function daysSinceLastLapse(entries: string[], today: string): number {
  if (entries.length === 0) return 0
  const lapses = new Set(entries)
  if (lapses.has(today)) return 0

  const first = entries[0] // entries are kept sorted ascending
  let days = 0
  let cursor = today
  while (cursor >= first && !lapses.has(cursor)) {
    days++
    cursor = shiftKey(cursor, -1)
  }
  return days
}

// Longest stretch with no logged lapse. Only gaps bounded by a lapse on one
// side count, so the untracked stretch before the first entry is ignored.
export function longestLapseFreeRun(entries: string[], today: string): number {
  if (entries.length === 0) return 0

  let best = 0
  for (let i = 0; i < entries.length - 1; i++) {
    const gap = daysBetween(entries[i], entries[i + 1]) - 2 // days strictly between
    if (gap > best) best = gap
  }
  const trailing = daysBetween(entries[entries.length - 1], today) - 1
  return Math.max(best, trailing, 0)
}
