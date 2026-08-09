import type { CSSProperties } from "react"

// Shared recharts styling so every chart reads as one system.
export const CHART_TOOLTIP_STYLE: CSSProperties = {
  background: "rgba(20,20,30,0.92)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  fontSize: 12,
}

export const AXIS_TICK = { fill: "rgba(255,255,255,0.5)", fontSize: 11 }

export const CHART_GRID_STROKE = "rgba(255,255,255,0.06)"

// Round a raw step up to the nearest 1/2/2.5/5 × 10^n, the steps that read as
// round numbers on an axis.
function niceStep(raw: number): number {
  if (!(raw > 0)) return 1
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10
  return factor * magnitude
}

// Ticks on round numbers covering [min, max]. Handing recharts a raw float
// domain makes it label axes with values like 13.44 or 4.0920000000000005.
export function niceAxisTicks(min: number, max: number, targetCount = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  const span = max > min ? max - min : Math.abs(max) * 0.2 || 1
  // A flat domain (one reading, no spread) still needs room on both sides,
  // otherwise the axis collapses onto a single tick.
  const lo = max > min ? min : min - span / 2
  const hi = max > min ? max : max + span / 2
  const step = niceStep(span / Math.max(1, targetCount - 1))
  const start = Math.floor(lo / step) * step
  const end = Math.ceil(hi / step) * step
  // Precision must fit the step, not just its magnitude: rounding a 2.5 step to
  // whole numbers turned 7.5 and 12.5 into 8 and 13 — an unevenly spaced axis.
  const decimals = Number.isInteger(step) ? 0 : Math.min(8, Math.max(0, -Math.floor(Math.log10(step))) + 1)

  const ticks: number[] = []
  for (let i = 0; start + i * step <= end + step / 2; i += 1) {
    ticks.push(Number((start + i * step).toFixed(decimals)))
    if (ticks.length > 24) break // guard against a pathological span
  }
  return ticks
}

export function formatAxisNumber(value: number): string {
  if (!Number.isFinite(value)) return ""
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)))
}
