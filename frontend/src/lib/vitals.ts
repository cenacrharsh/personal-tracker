import type { MetricRange } from "@/data/types"

export type MetricStatus = "ok" | "low" | "high" | "borderline"

// How near a bound still counts as borderline. A closed range measures against
// its own width — measuring against the bound's magnitude instead marked the
// whole of a narrow interval (sodium 136–145) borderline. An open-ended bound
// has no width, so it falls back to a share of the bound itself.
const BORDERLINE_SPAN_FRACTION = 0.1
const BORDERLINE_BOUND_FRACTION = 0.05

export function metricStatus(value: number, range: MetricRange): MetricStatus {
  if (!Number.isFinite(value)) return "ok"
  const { low, high } = range

  if (low !== undefined && value < low) return "low"
  if (high !== undefined && value > high) return "high"

  if (low !== undefined && high !== undefined) {
    const margin = (high - low) * BORDERLINE_SPAN_FRACTION
    return value <= low + margin || value >= high - margin ? "borderline" : "ok"
  }
  // "> low" metrics (HDL, eGFR): only approaching the floor is a concern.
  if (low !== undefined) return value <= low * (1 + BORDERLINE_BOUND_FRACTION) ? "borderline" : "ok"
  // "< high" metrics (LDL, TG, SGPT): only approaching the ceiling is.
  if (high !== undefined) return value >= high * (1 - BORDERLINE_BOUND_FRACTION) ? "borderline" : "ok"
  return "ok"
}

// Borderline sits inside the reference interval — it warns, it does not fail.
export function isOutOfRange(status: MetricStatus): boolean {
  return status === "low" || status === "high"
}

export const STATUS_TONE_CLASS: Record<MetricStatus, string> = {
  ok: "text-emerald-300",
  borderline: "text-amber-300",
  low: "text-rose-300",
  high: "text-rose-300",
}

export const STATUS_LABEL: Record<MetricStatus, string> = {
  ok: "In range",
  borderline: "Borderline",
  low: "Low",
  high: "High",
}

export function statusArrow(status: MetricStatus): string {
  if (status === "high") return "↑"
  if (status === "low") return "↓"
  return ""
}

export function formatMetricValue(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—"
  // Whole numbers display without decimals even when the metric allows them.
  return Number.isInteger(value) ? String(value) : value.toFixed(decimals)
}

export function formatRange(range: MetricRange): string {
  if (range.low !== undefined && range.high !== undefined) return `${range.low}–${range.high}`
  if (range.low !== undefined) return `> ${range.low}`
  if (range.high !== undefined) return `< ${range.high}`
  return "—"
}
