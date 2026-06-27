import { useMemo, useState } from "react"
import {
  Banknote,
  CalendarClock,
  Coins,
  HeartPulse,
  LineChart as LineChartIcon,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DeltaPill, KPICard } from "@/components/primitives/KPICard"
import { Sparkline } from "@/components/primitives/Sparkline"
import { formatCompactINR, formatINR, formatPercent } from "@/lib/money"
import {
  computeCurrentAllocationPercents,
  computeEmergencyFundDelta,
  computeTargetAllocationPercents,
  computeTargetEmergencyFund,
  computeTotals,
  type AllocationCategory,
  type PortfolioInputs,
} from "@/lib/portfolioMath"
import { ASSET_COLORS, ASSET_LABELS } from "@/lib/tokens"
import { usePortfolioStore } from "@/store/usePortfolioStore"
import type { Snapshot } from "@/data"

type Range = "1M" | "3M" | "1Y" | "ALL"

function filterSnapshotsByRange(snaps: Snapshot[], range: Range) {
  if (snaps.length === 0) return []
  if (range === "ALL") return snaps
  const days = range === "1M" ? 30 : range === "3M" ? 90 : 365
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return snaps.filter((s) => s.ts >= cutoff)
}

function daysUntil(iso: string) {
  const target = new Date(iso).getTime()
  if (!Number.isFinite(target)) return Number.POSITIVE_INFINITY
  return Math.round((target - Date.now()) / (24 * 60 * 60 * 1000))
}

export function OverviewPage() {
  const store = usePortfolioStore()
  const [range, setRange] = useState<Range>("3M")

  const inputs: PortfolioInputs = {
    age: store.age,
    monthlyIncome: store.monthlyIncome,
    silverEnabled: store.silverEnabled,
    zerodhaTotal: store.zerodhaTotal,
    zerodhaGoldEtf: store.zerodhaGoldEtf,
    zerodhaSilverEtf: store.zerodhaSilverEtf,
    mfTotal: store.mfTotal,
    mfGold: store.mfGold,
    mfSilver: store.mfSilver,
    fdAmount: store.fdAmount,
    rdAmount: store.rdAmount,
    epfPpfAmount: store.epfPpfAmount,
    currentEmergencyFund: store.currentEmergencyFund,
  }

  const totals = computeTotals(inputs)
  const current = computeCurrentAllocationPercents(inputs)
  const target = computeTargetAllocationPercents(inputs)

  const targetEmergency = computeTargetEmergencyFund(store.monthlyIncome)
  const efDelta = computeEmergencyFundDelta(store.currentEmergencyFund, store.monthlyIncome)
  const efProgress =
    targetEmergency > 0 ? Math.min(100, (store.currentEmergencyFund / targetEmergency) * 100) : 0
  const efMonths = store.monthlyIncome > 0 ? store.currentEmergencyFund / store.monthlyIncome : 0

  const filtered = useMemo(
    () => filterSnapshotsByRange(store.snapshots, range),
    [store.snapshots, range],
  )

  const trendData = filtered.map((s) => ({
    date: s.date,
    netWorth: s.netWorth,
  }))

  const periodDelta = useMemo(() => {
    if (filtered.length < 2) return { abs: 0, pct: 0 }
    const first = filtered[0].netWorth
    const last = filtered[filtered.length - 1].netWorth
    if (first <= 0) return { abs: last, pct: 0 }
    return { abs: last - first, pct: ((last - first) / first) * 100 }
  }, [filtered])

  const overallDelta = useMemo(() => {
    if (store.snapshots.length < 2) return 0
    const first = store.snapshots[0].netWorth
    const last = store.snapshots[store.snapshots.length - 1].netWorth
    if (first <= 0) return 0
    return ((last - first) / first) * 100
  }, [store.snapshots])

  const allocationOrder: AllocationCategory[] = ["equity", "gold", "silver", "debt"]
  const allocationData = allocationOrder
    .filter((k) => k !== "silver" || store.silverEnabled)
    .map((k) => ({
      name: ASSET_LABELS[k],
      key: k,
      value: current[k],
      amount:
        k === "equity"
          ? totals.totalEquity
          : k === "gold"
            ? totals.totalGold
            : k === "silver"
              ? totals.totalSilver
              : totals.totalDebt,
    }))

  const buckets = [
    {
      key: "equity" as const,
      label: "Equity",
      icon: <LineChartIcon className="size-4" />,
      amount: totals.totalEquity,
    },
    {
      key: "gold" as const,
      label: "Gold",
      icon: <Coins className="size-4" />,
      amount: totals.totalGold,
    },
    ...(store.silverEnabled
      ? [
          {
            key: "silver" as const,
            label: "Silver",
            icon: <Coins className="size-4" />,
            amount: totals.totalSilver,
          },
        ]
      : []),
    {
      key: "debt" as const,
      label: "Debt",
      icon: <Banknote className="size-4" />,
      amount: totals.totalDebt,
    },
  ]

  const lifeMultiple = store.monthlyIncome > 0 ? store.lifeInsurance.coverAmount / (store.monthlyIncome * 12) : 0
  const healthMultiple = store.monthlyIncome > 0 ? store.healthInsurance.coverAmount / (store.monthlyIncome * 12) : 0
  const lifeRenewDays = daysUntil(store.lifeInsurance.renewalDate)
  const healthRenewDays = daysUntil(store.healthInsurance.renewalDate)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Your wealth at a glance · {store.snapshots.length} day{store.snapshots.length === 1 ? "" : "s"} of history
          </p>
        </div>
      </header>

      {/* Hero net worth card */}
      <Card className="overflow-hidden rounded-3xl border-border/60 bg-gradient-to-br from-card to-card/60 p-0">
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-[1fr_auto] md:items-end md:p-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Sparkles className="size-3.5 text-indigo-300" />
              Net Worth
            </div>
            <div className="flex flex-wrap items-baseline gap-3">
              <div className="text-4xl font-semibold tracking-tight md:text-5xl">
                {formatINR(totals.totalPortfolioValue)}
              </div>
              {Math.abs(overallDelta) > 0.01 ? (
                <DeltaPill value={overallDelta} label="all-time" />
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>
                {range} change:{" "}
                <span className={periodDelta.abs >= 0 ? "text-emerald-300" : "text-rose-300"}>
                  {periodDelta.abs >= 0 ? "+" : ""}
                  {formatCompactINR(periodDelta.abs)} ({periodDelta.pct >= 0 ? "+" : ""}
                  {periodDelta.pct.toFixed(2)}%)
                </span>
              </span>
            </div>
          </div>

          <div className="flex gap-1 self-start rounded-full border border-border/60 bg-muted/30 p-1 md:self-end">
            {(["1M", "3M", "1Y", "ALL"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  r === range
                    ? "bg-indigo-500/30 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[180px] w-full md:h-[220px]">
          {trendData.length >= 2 ? (
            <ResponsiveContainer>
              <AreaChart data={trendData} margin={{ top: 0, right: 12, bottom: 0, left: 12 }}>
                <defs>
                  <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={32}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v: number) => formatCompactINR(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20,20,30,0.92)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                  formatter={(v) => [formatINR(Number(v)), "Net worth"]}
                />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#818cf8"
                  strokeWidth={2}
                  fill="url(#netWorthGradient)"
                  isAnimationActive
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center text-sm text-muted-foreground">
              <TrendingUp className="size-5 opacity-50" />
              <div>Trend chart will populate as values are updated.</div>
              <div className="text-xs">Each save creates today's snapshot.</div>
            </div>
          )}
        </div>
      </Card>

      {/* Buckets strip */}
      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Holdings breakdown
        </div>
        <div
          className={`grid grid-cols-2 gap-3 ${
            buckets.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3"
          }`}
        >
          {buckets.map((b) => {
            const trend = filtered.map((s) => s[b.key])
            const share =
              totals.totalPortfolioValue > 0 ? (b.amount / totals.totalPortfolioValue) * 100 : 0
            return (
              <KPICard
                key={b.key}
                label={b.label}
                value={formatCompactINR(b.amount)}
                accent={ASSET_COLORS[b.key]}
                icon={b.icon}
                sub={`${formatPercent(share)} of net worth`}
              >
                <Sparkline data={trend} color={ASSET_COLORS[b.key]} height={36} />
              </KPICard>
            )
          })}
        </div>
      </div>

      <div
        className={`grid grid-cols-1 gap-3 ${
          buckets.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
        }`}
      >
        {/* Allocation */}
        <Card
          className={`rounded-2xl border-border/60 bg-card/85 ${
            buckets.length === 4 ? "lg:col-span-3" : "lg:col-span-2"
          }`}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Allocation</CardTitle>
            <div className="text-xs text-muted-foreground">
              Current vs target — drift highlighted
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[180px_1fr]">
              <div className="relative mx-auto h-[180px] w-[180px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={allocationData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={86}
                      paddingAngle={2}
                      strokeWidth={0}
                      isAnimationActive
                      animationDuration={600}
                    >
                      {allocationData.map((d) => (
                        <Cell key={d.key} fill={ASSET_COLORS[d.key]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Net</div>
                  <div className="text-sm font-semibold">
                    {formatCompactINR(totals.totalPortfolioValue)}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {allocationOrder
                  .filter((k) => k !== "silver" || store.silverEnabled)
                  .map((k) => {
                    const cur = current[k]
                    const tgt = target[k]
                    const drift = cur - tgt
                    const onTrack = Math.abs(drift) < 0.5
                    const driftLabel = onTrack
                      ? "On target"
                      : drift > 0
                        ? `Over ${Math.abs(drift).toFixed(1)}%`
                        : `Under ${Math.abs(drift).toFixed(1)}%`
                    const driftTone = onTrack
                      ? "text-muted-foreground"
                      : drift > 0
                        ? "text-amber-300"
                        : "text-indigo-300"
                    return (
                      <div key={k} className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 rounded-full"
                              style={{ background: ASSET_COLORS[k] }}
                            />
                            <span className="text-sm font-medium">{ASSET_LABELS[k]}</span>
                          </div>
                          <div className="text-sm font-semibold">{formatPercent(cur)}</div>
                        </div>
                        <div className="relative h-1.5 overflow-hidden rounded-full bg-muted/50">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{
                              width: `${Math.max(2, Math.min(100, cur))}%`,
                              background: ASSET_COLORS[k],
                            }}
                          />
                          <div
                            className="absolute top-0 h-full w-px bg-foreground/60"
                            style={{ left: `${Math.max(0, Math.min(100, tgt))}%` }}
                            title={`Target ${formatPercent(tgt)}`}
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">
                            Target {formatPercent(tgt)}
                          </span>
                          <span className={driftTone}>{driftLabel}</span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Fund ring */}
        <Card className="flex flex-col rounded-2xl border-border/60 bg-card/85">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PiggyBank className="size-4 text-cyan-300" />
              Emergency Fund
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              Target 6× monthly income
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center gap-5">
            <RingProgress value={efProgress} months={efMonths} />
            <div className="grid w-full grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Current
                </div>
                <div className="text-base font-semibold">
                  {formatINR(store.currentEmergencyFund)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Target
                </div>
                <div className="text-base font-medium text-muted-foreground">
                  {formatINR(targetEmergency)}
                </div>
              </div>
            </div>
            <div
              className={`w-full rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                efDelta >= 0
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
            >
              {efDelta >= 0 ? "+" : ""}
              {formatCompactINR(efDelta)} vs target
              <span className="ml-1 text-muted-foreground">
                · {efProgress.toFixed(0)}% funded
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insurance (only shown for enabled policies) */}
      {store.lifeInsurance.enabled || store.healthInsurance.enabled ? (
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Coverage
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {store.lifeInsurance.enabled ? (
              <InsuranceCard
                title="Life Insurance"
                icon={<ShieldCheck className="size-4 text-indigo-300" />}
                cover={store.lifeInsurance.coverAmount}
                premium={store.lifeInsurance.premium}
                multiple={lifeMultiple}
                renewDays={lifeRenewDays}
                renewDate={store.lifeInsurance.renewalDate}
                tone="indigo"
              />
            ) : null}
            {store.healthInsurance.enabled ? (
              <InsuranceCard
                title="Health Insurance"
                icon={<HeartPulse className="size-4 text-rose-300" />}
                cover={store.healthInsurance.coverAmount}
                premium={store.healthInsurance.premium}
                multiple={healthMultiple}
                renewDays={healthRenewDays}
                renewDate={store.healthInsurance.renewalDate}
                tone="rose"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function RingProgress({ value, months }: { value: number; months: number }) {
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const filled = Math.max(0, Math.min(100, value))
  const dashOffset = circumference * (1 - filled / 100)
  return (
    <div className="relative size-[128px] shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#06b6d4"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xl font-semibold">{months.toFixed(1)}</div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">months</div>
      </div>
    </div>
  )
}

function InsuranceCard({
  title,
  icon,
  cover,
  premium,
  multiple,
  renewDays,
  renewDate,
  tone,
}: {
  title: string
  icon: React.ReactNode
  cover: number
  premium: number
  multiple: number
  renewDays: number
  renewDate: string
  tone: "indigo" | "rose"
}) {
  const renewSoon = Number.isFinite(renewDays) && renewDays <= 60 && renewDays >= 0
  const overdue = Number.isFinite(renewDays) && renewDays < 0
  const renewTone = overdue
    ? "text-rose-300"
    : renewSoon
      ? "text-amber-300"
      : "text-muted-foreground"
  const accentBar = tone === "indigo" ? "bg-indigo-500/40" : "bg-rose-500/40"

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 bg-card/85">
      <div className={`h-1 ${accentBar}`} />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Cover</div>
            <div className="font-semibold">{formatCompactINR(cover)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Premium</div>
            <div className="font-semibold">{formatCompactINR(premium)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">× Annual income</div>
            <div className="font-semibold">{multiple > 0 ? `${multiple.toFixed(1)}×` : "—"}</div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Renews</span>
            <span className="font-medium text-foreground">{renewDate}</span>
          </div>
          <span className={renewTone}>
            {overdue
              ? `Overdue ${Math.abs(renewDays)}d`
              : Number.isFinite(renewDays)
                ? `in ${renewDays}d`
                : "—"}
          </span>
        </div>
        <Progress value={Math.max(0, Math.min(100, multiple * 10))} className="h-1.5" />
      </CardContent>
    </Card>
  )
}
