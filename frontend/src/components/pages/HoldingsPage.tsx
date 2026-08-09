import type { ReactNode } from "react"
import { Banknote, Coins, LifeBuoy, LineChart, ShieldAlert, Sparkles } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/forms/NumberInput"
import { formatCompactINR, formatINR, formatPercent } from "@/lib/money"
import {
  clampEmergencyMonths,
  computeCurrentAllocationPercents,
  computeEmergencyFundTotal,
  computeTargetAllocationPercents,
  computeTargetEmergencyFund,
  computeTotals,
  EMERGENCY_MONTHS_MAX,
  EMERGENCY_MONTHS_MIN,
  type AllocationCategory,
  type PortfolioInputs,
} from "@/lib/portfolioMath"
import { ASSET_COLORS, ASSET_LABELS, goalColor } from "@/lib/tokens"
import { usePortfolioStore } from "@/store/usePortfolioStore"

function GroupCard({
  title,
  subtitle,
  total,
  accent,
  icon,
  children,
}: {
  title: string
  subtitle: string
  total: number
  accent: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 bg-card/85">
      <div className="h-1" style={{ background: accent }} />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="flex size-8 items-center justify-center rounded-lg"
              style={{ background: `${accent}20`, color: accent }}
            >
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</div>
            <div className="text-lg font-semibold">{formatCompactINR(total)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">{children}</CardContent>
    </Card>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

// Label beside a narrow input — lets a card hold more rows without growing taller
// than the cards next to it.
function RowField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {hint ? <div className="text-[10px] text-muted-foreground/70">{hint}</div> : null}
      </div>
      <div className="w-28 shrink-0 sm:w-32">{children}</div>
    </div>
  )
}

export function HoldingsPage() {
  const store = usePortfolioStore()

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
    bondsAmount: store.bondsAmount,
    npsAmount: store.npsAmount,
    currentEmergencyFund: store.currentEmergencyFund,
    emergencyFdAmount: store.emergencyFdAmount,
    emergencyRdAmount: store.emergencyRdAmount,
  }

  const totals = computeTotals(inputs)
  const currentPercents = computeCurrentAllocationPercents(inputs)
  const targetPercents = computeTargetAllocationPercents(inputs)

  const zerodhaWarn = store.zerodhaGoldEtf + store.zerodhaSilverEtf > store.zerodhaTotal
  const mfWarn = store.mfGold + store.mfSilver > store.mfTotal

  const efTotal = computeEmergencyFundTotal(inputs)
  const efMonthsTarget = clampEmergencyMonths(store.emergencyMonthsTarget)
  const targetEmergency = computeTargetEmergencyFund(store.monthlyIncome, efMonthsTarget)
  const efProgress = targetEmergency > 0 ? Math.min(100, (efTotal / targetEmergency) * 100) : 0
  const efColor = goalColor(efProgress)
  const expenseMonths = store.monthlyExpenses > 0 ? efTotal / store.monthlyExpenses : 0

  // Sub-allocation breakdowns per asset class (for the contribution bar inside each tile)
  const equityFromZerodha = Math.max(
    0,
    store.zerodhaTotal - store.zerodhaGoldEtf - (store.silverEnabled ? store.zerodhaSilverEtf : 0),
  )
  const equityFromMf = Math.max(
    0,
    store.mfTotal - store.mfGold - (store.silverEnabled ? store.mfSilver : 0),
  )

  const classTiles: ClassTile[] = [
    {
      key: "equity",
      icon: <LineChart className="size-5" />,
      amount: totals.totalEquity,
      currentPct: currentPercents.equity,
      targetPct: targetPercents.equity,
      breakdown: [
        { label: "Zerodha", amount: equityFromZerodha },
        { label: "Mutual Funds", amount: equityFromMf },
      ],
    },
    {
      key: "gold",
      icon: <Coins className="size-5" />,
      amount: totals.totalGold,
      currentPct: currentPercents.gold,
      targetPct: targetPercents.gold,
      breakdown: [
        { label: "Zerodha ETF", amount: store.zerodhaGoldEtf },
        { label: "Mutual Funds", amount: store.mfGold },
      ],
    },
    ...(store.silverEnabled
      ? [
          {
            key: "silver" as const,
            icon: <Coins className="size-5" />,
            amount: totals.totalSilver,
            currentPct: currentPercents.silver,
            targetPct: targetPercents.silver,
            breakdown: [
              { label: "Zerodha ETF", amount: store.zerodhaSilverEtf },
              { label: "Mutual Funds", amount: store.mfSilver },
            ],
          },
        ]
      : []),
    {
      key: "debt",
      icon: <Banknote className="size-5" />,
      amount: totals.totalDebt,
      currentPct: currentPercents.debt,
      targetPct: targetPercents.debt,
      breakdown: [
        { label: "FD", amount: store.fdAmount },
        { label: "RD", amount: store.rdAmount },
        { label: "EPF/PPF", amount: store.epfPpfAmount },
        { label: "Bonds", amount: store.bondsAmount },
        { label: "NPS", amount: store.npsAmount },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Holdings</h1>
        <p className="text-sm text-muted-foreground">
          Edit invested amounts. Updates auto-save and snapshot for trend charts.
        </p>
      </header>

      <NetWorthHero
        netWorth={totals.totalPortfolioValue}
        tiles={classTiles}
      />

      <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${classTiles.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {classTiles.map((t) => (
          <ClassStatTile key={t.key} tile={t} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GroupCard
          title="Brokerage (Zerodha)"
          subtitle="Direct stocks + ETFs"
          total={store.zerodhaTotal}
          accent={ASSET_COLORS.equity}
          icon={<LineChart className="size-5" />}
        >
          <Field label="Total invested">
            <NumberInput
              value={store.zerodhaTotal}
              onChange={store.setZerodhaTotal}
              min={0}
              step={1000}
              ariaLabel="Zerodha total"
            />
          </Field>
          <Field label="Gold ETFs" hint="Subset of total">
            <NumberInput
              value={store.zerodhaGoldEtf}
              onChange={store.setZerodhaGoldEtf}
              min={0}
              step={500}
              ariaLabel="Zerodha gold ETF"
            />
          </Field>
          {store.silverEnabled ? (
            <Field label="Silver ETFs" hint="Subset of total">
              <NumberInput
                value={store.zerodhaSilverEtf}
                onChange={store.setZerodhaSilverEtf}
                min={0}
                step={500}
                ariaLabel="Zerodha silver ETF"
              />
            </Field>
          ) : null}
          {zerodhaWarn ? (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-200">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>Gold + Silver exceeds total. Adjust totals or sub-amounts.</span>
            </div>
          ) : null}
        </GroupCard>

        <GroupCard
          title="Mutual Funds"
          subtitle="Equity / Gold / Silver schemes"
          total={store.mfTotal}
          accent={ASSET_COLORS.equity}
          icon={<LineChart className="size-5" />}
        >
          <Field label="Total invested">
            <NumberInput
              value={store.mfTotal}
              onChange={store.setMfTotal}
              min={0}
              step={1000}
              ariaLabel="MF total"
            />
          </Field>
          <Field label="Gold MFs" hint="Subset of total">
            <NumberInput
              value={store.mfGold}
              onChange={store.setMfGold}
              min={0}
              step={500}
              ariaLabel="MF gold"
            />
          </Field>
          {store.silverEnabled ? (
            <Field label="Silver MFs" hint="Subset of total">
              <NumberInput
                value={store.mfSilver}
                onChange={store.setMfSilver}
                min={0}
                step={500}
                ariaLabel="MF silver"
              />
            </Field>
          ) : null}
          {mfWarn ? (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-200">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>Gold + Silver exceeds total. Adjust totals or sub-amounts.</span>
            </div>
          ) : null}
        </GroupCard>

        <GroupCard
          title="Debt"
          subtitle="Fixed-income instruments"
          total={totals.totalDebt}
          accent={ASSET_COLORS.debt}
          icon={<Banknote className="size-5" />}
        >
          <RowField label="Fixed Deposits">
            <NumberInput
              value={store.fdAmount}
              onChange={store.setFdAmount}
              min={0}
              step={1000}
              ariaLabel="FD amount"
            />
          </RowField>
          <RowField label="Recurring Deposits">
            <NumberInput
              value={store.rdAmount}
              onChange={store.setRdAmount}
              min={0}
              step={500}
              ariaLabel="RD amount"
            />
          </RowField>
          <RowField label="EPF / PPF">
            <NumberInput
              value={store.epfPpfAmount}
              onChange={store.setEpfPpfAmount}
              min={0}
              step={1000}
              ariaLabel="EPF/PPF amount"
            />
          </RowField>
          <RowField label="Bonds">
            <NumberInput
              value={store.bondsAmount}
              onChange={store.setBondsAmount}
              min={0}
              step={1000}
              ariaLabel="Bonds amount"
            />
          </RowField>
          <RowField label="NPS">
            <NumberInput
              value={store.npsAmount}
              onChange={store.setNpsAmount}
              min={0}
              step={1000}
              ariaLabel="NPS amount"
            />
          </RowField>
        </GroupCard>

        <GroupCard
          title="Emergency Fund"
          subtitle="Liquid cash + earmarked deposits"
          total={efTotal}
          accent={efColor}
          icon={<LifeBuoy className="size-5" />}
        >
          <RowField label="Savings / Liquid">
            <NumberInput
              value={store.currentEmergencyFund}
              onChange={store.setCurrentEmergencyFund}
              min={0}
              step={1000}
              ariaLabel="Emergency fund liquid balance"
            />
          </RowField>
          <RowField label="Fixed Deposits">
            <NumberInput
              value={store.emergencyFdAmount}
              onChange={store.setEmergencyFdAmount}
              min={0}
              step={1000}
              ariaLabel="Emergency fund FD"
            />
          </RowField>
          <RowField label="Recurring Deposits">
            <NumberInput
              value={store.emergencyRdAmount}
              onChange={store.setEmergencyRdAmount}
              min={0}
              step={500}
              ariaLabel="Emergency fund RD"
            />
          </RowField>
          <RowField label="Monthly expenses" hint="Used for coverage below">
            <NumberInput
              value={store.monthlyExpenses}
              onChange={store.setMonthlyExpenses}
              min={0}
              step={1000}
              ariaLabel="Monthly expenses"
            />
          </RowField>

          <div className="space-y-1.5 border-t border-border/60 pt-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs text-muted-foreground">Target cover</Label>
              <span className="text-xs font-medium">
                {efMonthsTarget}× income · {formatCompactINR(targetEmergency)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{EMERGENCY_MONTHS_MIN}×</span>
              <input
                type="range"
                min={EMERGENCY_MONTHS_MIN}
                max={EMERGENCY_MONTHS_MAX}
                step={1}
                value={efMonthsTarget}
                onChange={(e) => store.setEmergencyMonthsTarget(Number(e.target.value))}
                style={{ accentColor: efColor }}
                className="flex-1 cursor-pointer"
                aria-label="Emergency fund target months of income"
              />
              <span className="text-[10px] text-muted-foreground">{EMERGENCY_MONTHS_MAX}×</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${efProgress}%`, background: efColor }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span style={{ color: efColor }}>{efProgress.toFixed(0)}% funded</span>
              <span>
                {store.monthlyExpenses > 0
                  ? `${expenseMonths.toFixed(1)} months of expenses`
                  : "Add expenses for coverage"}
              </span>
            </div>
          </div>
        </GroupCard>
      </div>
    </div>
  )
}

type ClassTile = {
  key: AllocationCategory
  icon: ReactNode
  amount: number
  currentPct: number
  targetPct: number
  breakdown: { label: string; amount: number }[]
}

function NetWorthHero({ netWorth, tiles }: { netWorth: number; tiles: ClassTile[] }) {
  const segments = tiles.filter((t) => t.amount > 0)
  const totalForBar = segments.reduce((acc, t) => acc + t.amount, 0)

  return (
    <Card className="overflow-hidden rounded-3xl border-border/60 bg-gradient-to-br from-card via-card to-card/60">
      <div className="grid gap-4 p-5 md:grid-cols-[auto_1fr] md:items-center md:gap-8 md:p-6">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-3.5 text-indigo-300" />
            Net worth
          </div>
          <div className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
            {formatINR(netWorth)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {tiles.length} asset {tiles.length === 1 ? "class" : "classes"} · {formatCompactINR(netWorth)}
          </div>
        </div>

        <div className="space-y-3">
          {netWorth > 0 ? (
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/40">
              {segments.map((t) => (
                <div
                  key={t.key}
                  className="h-full transition-[width]"
                  style={{
                    width: `${(t.amount / totalForBar) * 100}%`,
                    background: ASSET_COLORS[t.key],
                  }}
                  title={`${ASSET_LABELS[t.key]} · ${formatPercent((t.amount / totalForBar) * 100)}`}
                />
              ))}
            </div>
          ) : (
            <div className="h-2.5 w-full rounded-full bg-muted/30" />
          )}

          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
            {tiles.map((t) => (
              <div key={t.key} className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: ASSET_COLORS[t.key] }}
                />
                <span className="font-medium">{ASSET_LABELS[t.key]}</span>
                <span className="text-muted-foreground">
                  {formatCompactINR(t.amount)} · {formatPercent(t.currentPct)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

function ClassStatTile({ tile }: { tile: ClassTile }) {
  const color = ASSET_COLORS[tile.key]
  const drift = tile.currentPct - tile.targetPct
  const onTarget = Math.abs(drift) < 0.5
  const driftLabel = onTarget
    ? "On target"
    : drift > 0
      ? `+${drift.toFixed(1)}%`
      : `${drift.toFixed(1)}%`
  const driftTone = onTarget
    ? "bg-muted/40 text-muted-foreground"
    : drift > 0
      ? "bg-amber-500/15 text-amber-300"
      : "bg-indigo-500/15 text-indigo-300"

  const breakdownTotal = tile.breakdown.reduce((acc, b) => acc + Math.max(0, b.amount), 0)
  // Fade evenly across however many parts the class has, so the last one stays visible.
  const shade = (i: number) => 1 - i * (0.6 / Math.max(1, tile.breakdown.length - 1))

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 bg-card/85">
      <div className="h-0.5" style={{ background: color }} />
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="flex size-8 items-center justify-center rounded-lg"
              style={{ background: `${color}22`, color }}
            >
              {tile.icon}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {ASSET_LABELS[tile.key]}
              </div>
              <div className="text-base font-semibold leading-none">
                {formatPercent(tile.currentPct)}
                <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                  of net
                </span>
              </div>
            </div>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${driftTone}`}>
            {driftLabel}
          </span>
        </div>

        <div>
          <div className="text-2xl font-semibold tracking-tight">
            {formatCompactINR(tile.amount)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Target {formatPercent(tile.targetPct)}
          </div>
        </div>

        {breakdownTotal > 0 ? (
          <div className="space-y-1.5">
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
              {tile.breakdown.map((b, i) => {
                const pct = breakdownTotal > 0 ? (Math.max(0, b.amount) / breakdownTotal) * 100 : 0
                if (pct <= 0) return null
                return (
                  <div
                    key={b.label}
                    className="h-full"
                    style={{
                      width: `${pct}%`,
                      background: color,
                      opacity: shade(i),
                    }}
                    title={`${b.label} · ${formatPercent(pct)}`}
                  />
                )
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
              {tile.breakdown
                .filter((b) => b.amount > 0)
                .map((b, i) => (
                  <span key={b.label} className="inline-flex items-center gap-1">
                    <span
                      className="inline-block size-1.5 rounded-full"
                      style={{ background: color, opacity: shade(i) }}
                    />
                    {b.label}{" "}
                    <span className="text-foreground">{formatCompactINR(b.amount)}</span>
                  </span>
                ))}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground/60">No allocations yet</div>
        )}
      </CardContent>
    </Card>
  )
}
