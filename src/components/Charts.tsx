import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

import type { AllocationCategory, Percentages } from "@/lib/portfolioMath"
import { formatINR } from "@/lib/money"

const COLORS: Record<AllocationCategory, string> = {
  equity: "#3B82F6", // blue
  gold: "#F59E0B", // amber
  silver: "#94A3B8", // slate
  debt: "#10B981", // emerald
}

const CATEGORY_LABELS: Record<AllocationCategory, string> = {
  equity: "Equity",
  gold: "Gold",
  silver: "Silver",
  debt: "Debt",
}

function toDonutData(p: Percentages) {
  const order: AllocationCategory[] = ["equity", "gold", "silver", "debt"]
  return order.map((k) => ({
    category: k,
    value: p[k],
  }))
}

export type ChartsProps = {
  current: Percentages
  target: Percentages
  currentAmounts: Record<AllocationCategory, number>
  portfolioValue: number
}

function formatPct(n: number) {
  if (!Number.isFinite(n)) return "0%"
  const abs = Math.abs(n)
  const rounded = abs < 10 ? n.toFixed(1) : Math.round(n).toString()
  return `${rounded}%`
}

function formatDeltaPct(n: number) {
  if (!Number.isFinite(n)) return "+0.0%"
  const abs = Math.abs(n)
  const rounded = abs < 10 ? n.toFixed(1) : Math.round(n).toString()
  const numeric = Number(rounded)
  const sign = numeric >= 0 ? "+" : "-"
  return `${sign}${Math.abs(numeric)}%`
}

function AllocationRows({
  mode,
  current,
  target,
  currentAmounts,
  portfolioValue,
}: {
  mode: "current" | "target"
  current: Percentages
  target: Percentages
  currentAmounts: Record<AllocationCategory, number>
  portfolioValue: number
}) {
  const order: AllocationCategory[] = ["equity", "gold", "silver", "debt"]
  return (
    <div className="space-y-2">
      {order.map((k) => {
        const currentPct = current[k]
        const targetPct = target[k]
        const currentAmount = currentAmounts[k]
        const targetAmount = (portfolioValue * targetPct) / 100
        const deltaPct = currentPct - targetPct

        const onTrack = Math.abs(deltaPct) < 0.05

        const gapText =
          mode === "current"
            ? onTrack
              ? "On track"
              : deltaPct > 0
                ? `Overweight ${formatDeltaPct(deltaPct)}`
                : `Underweight ${formatDeltaPct(deltaPct)}`
            : "Target allocation"

        const gapTone =
          mode === "current"
            ? onTrack
              ? "text-muted-foreground"
              : deltaPct > 0
                ? "text-emerald-400"
                : "text-amber-400"
            : "text-muted-foreground"

        return (
          <div
            key={k}
            className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
          >
            <div className="min-w-[96px]">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[k] }}
                  aria-hidden
                />
                <span className="text-sm font-medium">{CATEGORY_LABELS[k]}</span>
              </div>

              <div className={`mt-1 text-xs ${gapTone}`}>{gapText}</div>

              {mode === "current" ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  Target: {formatPct(targetPct)} • {formatINR(targetAmount)}
                </div>
              ) : null}
              {mode === "target" ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  Current: {formatPct(currentPct)} • {formatINR(currentAmount)}
                </div>
              ) : null}
            </div>

            <div className="text-right">
              <div className="text-sm font-semibold">
                {mode === "current" ? formatPct(currentPct) : formatPct(targetPct)}
              </div>
              <div className="text-xs text-muted-foreground">
                {mode === "current" ? formatINR(currentAmount) : formatINR(targetAmount)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({
  title,
  data,
}: {
  title: string
  data: { category: AllocationCategory; value: number }[]
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">Allocation by share of portfolio</div>
        </div>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="category"
              innerRadius={70}
              outerRadius={105}
              paddingAngle={3}
              strokeWidth={4}
              isAnimationActive
              animationDuration={900}
            >
              {data.map((entry) => (
                <Cell key={entry.category} fill={COLORS[entry.category]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function Charts({ current, target, currentAmounts, portfolioValue }: ChartsProps) {
  const currentDonut = toDonutData(current)
  const targetDonut = toDonutData(target)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border/60 bg-card p-4 overflow-visible">
        <DonutChart title="Current Allocation" data={currentDonut} />
        <div className="mt-3">
          <AllocationRows
            mode="current"
            current={current}
            target={target}
            currentAmounts={currentAmounts}
            portfolioValue={portfolioValue}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4 overflow-visible">
        <DonutChart title="Target Allocation" data={targetDonut} />
        <div className="mt-3">
          <AllocationRows
            mode="target"
            current={current}
            target={target}
            currentAmounts={currentAmounts}
            portfolioValue={portfolioValue}
          />
        </div>
      </div>
    </div>
  )
}

