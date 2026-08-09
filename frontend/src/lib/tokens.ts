import type { AllocationCategory } from "@/lib/portfolioMath"

export const ASSET_COLORS: Record<AllocationCategory, string> = {
  equity: "#6366f1",
  gold: "#f59e0b",
  silver: "#94a3b8",
  debt: "#10b981",
}

export const ASSET_LABELS: Record<AllocationCategory, string> = {
  equity: "Equity",
  gold: "Gold",
  silver: "Silver",
  debt: "Debt",
}

// Goal progress: rose → amber → emerald as a target is approached.
const GOAL_STOPS = ["#f43f5e", "#f59e0b", "#10b981"]

// Returns hex, not rgb(): callers append an alpha suffix (`${color}20`) to tint
// backgrounds, which only works on a hex string.
function mixHex(a: string, b: string, t: number) {
  const channel = (hex: string, at: number) => parseInt(hex.slice(at, at + 2), 16)
  const parts = [1, 3, 5].map((at) =>
    Math.round(channel(a, at) + (channel(b, at) - channel(a, at)) * t),
  )
  return `#${parts.map((n) => n.toString(16).padStart(2, "0")).join("")}`
}

export function goalColor(percent: number) {
  const p = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0)) / 100
  const scaled = p * (GOAL_STOPS.length - 1)
  const i = Math.min(GOAL_STOPS.length - 2, Math.floor(scaled))
  return mixHex(GOAL_STOPS[i], GOAL_STOPS[i + 1], scaled - i)
}

// Shared categorical palette for multi-series charts.
export const CHART_PALETTE = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#ec4899",
  "#a855f7",
  "#f43f5e",
  "#84cc16",
  "#0ea5e9",
  "#fb923c",
]
