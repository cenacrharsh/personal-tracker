import { Card } from "@/components/ui/card"

const TILE_TINTS = {
  indigo: {
    iconBg: "bg-indigo-500/15 text-indigo-300",
    glow: "from-indigo-500/20",
    bar: "bg-indigo-400",
  },
  emerald: {
    iconBg: "bg-emerald-500/15 text-emerald-300",
    glow: "from-emerald-500/20",
    bar: "bg-emerald-400",
  },
  amber: {
    iconBg: "bg-amber-500/15 text-amber-300",
    glow: "from-amber-500/20",
    bar: "bg-amber-400",
  },
} as const

export function SummaryTile({
  label,
  value,
  sub,
  icon,
  tint,
  valueClass,
  gauge,
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  tint: keyof typeof TILE_TINTS
  valueClass?: string
  gauge?: number
}) {
  const t = TILE_TINTS[tint]
  return (
    <Card className="relative overflow-hidden rounded-2xl border-border/60 bg-card/85 p-4">
      <div className={`pointer-events-none absolute -right-12 -top-10 size-32 rounded-full bg-gradient-to-br ${t.glow} to-transparent blur-2xl`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className={`mt-1 text-2xl font-semibold tracking-tight ${valueClass ?? ""}`}>{value}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
        </div>
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${t.iconBg}`}>
          {icon}
        </div>
      </div>
      {typeof gauge === "number" ? (
        <div className="relative mt-3 h-1 w-full overflow-hidden rounded-full bg-muted/40">
          <div
            className={`h-full rounded-full ${t.bar}`}
            style={{ width: `${Math.max(0, Math.min(1, gauge)) * 100}%` }}
          />
        </div>
      ) : null}
    </Card>
  )
}

export function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: "emerald"
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold ${accent === "emerald" ? "text-emerald-300" : ""}`}>{value}</div>
    </div>
  )
}
