import type { ReactNode } from "react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export type StatTone = "default" | "positive" | "warning" | "negative" | "info"

const TONE_VALUE_CLASS: Record<StatTone, string> = {
  default: "",
  positive: "text-emerald-300",
  warning: "text-amber-300",
  negative: "text-rose-300",
  info: "text-cyan-300",
}

export type StatTileProps = {
  label: string
  value: string
  delta?: { value: number; label?: string }
  accent?: string // top accent bar color
  tone?: StatTone // tints the value text
  sub?: ReactNode
  icon?: ReactNode
  progress?: number // 0-100 renders a progress bar under the value
  size?: "sm" | "md" | "lg"
  children?: ReactNode
}

// The one stat/summary tile. Replaces KPICard, SummaryTile, StatCard,
// ProgressTile and ClassStatTile.
export function StatTile({
  label,
  value,
  delta,
  accent,
  tone = "default",
  sub,
  icon,
  progress,
  size = "md",
  children,
}: StatTileProps) {
  const valueClass = size === "lg" ? "text-3xl md:text-4xl" : size === "sm" ? "text-lg" : "text-2xl"
  return (
    <Card className="relative overflow-hidden rounded-2xl border-border/60 bg-card/85 p-4 shadow-sm backdrop-blur md:p-5">
      {accent ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5"
          style={{ background: accent }}
        />
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        {delta && Number.isFinite(delta.value) ? <DeltaPill value={delta.value} label={delta.label} /> : null}
      </div>
      <div className={`mt-2 font-semibold tracking-tight ${valueClass} ${TONE_VALUE_CLASS[tone]}`}>{value}</div>
      {typeof progress === "number" ? (
        <Progress value={Math.min(100, Math.max(0, progress))} className="mt-3 h-1.5" />
      ) : null}
      {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </Card>
  )
}

export function DeltaPill({ value, label, suffix = "%" }: { value: number; label?: string; suffix?: string }) {
  const safe = Number.isFinite(value) ? value : 0
  const positive = safe >= 0
  const Icon = positive ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        positive ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
      }`}
    >
      <Icon className="size-3" />
      <span>
        {positive ? "+" : ""}
        {Math.abs(safe) < 10 ? safe.toFixed(1) : Math.round(safe)}
        {suffix}
      </span>
      {label ? <span className="text-muted-foreground">·{label}</span> : null}
    </span>
  )
}
