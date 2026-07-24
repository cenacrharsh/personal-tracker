import type { MetricRange } from "@/data/types"

export type MetricStatus = "ok" | "low" | "high" | "borderline"

export function metricStatus(value: number, range: MetricRange): MetricStatus {
  if (!Number.isFinite(value)) return "ok"
  if (range.low !== undefined && value < range.low) return "low"
  if (range.high !== undefined && value > range.high) return "high"
  // Borderline: within 5% of a defined bound (relative to the bound's magnitude).
  if (range.low !== undefined && value < range.low * 1.05) return "borderline"
  if (range.high !== undefined && value > range.high * 0.95) return "borderline"
  return "ok"
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
