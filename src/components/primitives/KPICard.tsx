import type { ReactNode } from "react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { Card } from "@/components/ui/card"

export type KPICardProps = {
  label: string
  value: string
  delta?: { value: number; label?: string }
  accent?: string
  sub?: ReactNode
  icon?: ReactNode
  children?: ReactNode
  size?: "sm" | "md" | "lg"
}

export function KPICard({ label, value, delta, accent, sub, icon, children, size = "md" }: KPICardProps) {
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
      <div className={`mt-2 font-semibold tracking-tight ${valueClass}`}>{value}</div>
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
