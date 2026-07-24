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
