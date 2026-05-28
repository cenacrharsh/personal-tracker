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

export const GAIN_COLOR = "#10b981"
export const LOSS_COLOR = "#f43f5e"
export const CASH_COLOR = "#06b6d4"
