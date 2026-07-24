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
