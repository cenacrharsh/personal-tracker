import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  CalendarRange,
  CheckCircle2,
  CreditCard as CreditCardIcon,
  Gift,
  Pencil,
  Percent,
  Plus,
  Trash2,
  Wallet,
  X,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { NumberInput } from "@/components/forms/NumberInput"
import { YearPicker } from "@/components/primitives/YearPicker"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCompactINR, formatINR } from "@/lib/money"
import { ASSET_COLORS } from "@/lib/tokens"
import { usePortfolioStore } from "@/store/usePortfolioStore"
import type { CreditCardConfig } from "@/data"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const PREFERRED_CARD_ORDER = [
  "SBI Cashback",
  "SBI PhonePe",
  "HSBC Live+",
  "Kotak Platinum",
  "Amazon ICICI",
  "HDFC Millenia",
]
const PREFERRED_RANK = new Map(
  PREFERRED_CARD_ORDER.map((name, i) => [name.toLowerCase(), i]),
)
function rankForCard(name: string): number {
  return PREFERRED_RANK.get(name.toLowerCase()) ?? Number.POSITIVE_INFINITY
}

type View = "overview" | "card" | "settings"
type DataField = "cashback" | "expenses"

const PALETTE = [
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

function safeNum(n: unknown) {
  const v = typeof n === "number" ? n : Number(n)
  return Number.isFinite(v) ? v : 0
}

function colorFor(idx: number) {
  return PALETTE[idx % PALETTE.length]
}

function getMonthValue(
  dataByYear: Record<number, Record<string, { cashback: Record<number, number>; expenses: Record<number, number> }>>,
  year: number,
  cardId: string,
  month: number,
  field: DataField,
) {
  return safeNum(dataByYear[year]?.[cardId]?.[field]?.[month] ?? 0)
}

export function CardsPage() {
  const {
    creditCards,
    creditCardDataByYear,
    setCreditCardMonthValue,
    setCreditCardMeta,
    addCreditCard,
    removeCreditCard,
  } = usePortfolioStore()

  const [view, setView] = useState<View>("overview")
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedCardId, setSelectedCardId] = useState<string>(creditCards[0]?.id ?? "")
  const [newCardName, setNewCardName] = useState("")

  const activeCards = useMemo(
    () =>
      creditCards
        .filter((c) => c.status === "active")
        .slice()
        .sort((a, b) => rankForCard(a.name) - rankForCard(b.name)),
    [creditCards],
  )

  const monthlyChartData = useMemo(() => {
    return MONTHS.map((m, idx) => {
      const row: Record<string, string | number> = { month: m }
      for (const card of activeCards) {
        row[card.id] = getMonthValue(creditCardDataByYear, year, card.id, idx + 1, "expenses")
      }
      return row
    })
  }, [activeCards, creditCardDataByYear, year])

  const yearTotals = useMemo(() => {
    const totals = { spend: 0, cashback: 0 }
    for (const card of activeCards) {
      for (let m = 1; m <= 12; m += 1) {
        totals.spend += getMonthValue(creditCardDataByYear, year, card.id, m, "expenses")
        totals.cashback += getMonthValue(creditCardDataByYear, year, card.id, m, "cashback")
      }
    }
    return totals
  }, [activeCards, creditCardDataByYear, year])

  const cashbackRate = yearTotals.spend > 0 ? (yearTotals.cashback / yearTotals.spend) * 100 : 0

  const cardSummaries = useMemo(() => {
    return creditCards.map((card, idx) => {
      let spend = 0
      let cashback = 0
      for (let m = 1; m <= 12; m += 1) {
        spend += getMonthValue(creditCardDataByYear, year, card.id, m, "expenses")
        cashback += getMonthValue(creditCardDataByYear, year, card.id, m, "cashback")
      }

      // Anchor the anniversary cycle to the one that overlaps the selected
      // calendar year the most. For a late anniversary month (Aug–Dec) the
      // current cycle started the previous year, so start there — otherwise a
      // November card viewed in 2026 would point at the empty Nov 2026 cycle
      // instead of the active Nov 2025 → Oct 2026 one.
      const annivStartYear = card.anniversaryStartMonth >= 8 ? year - 1 : year
      const annivRows: { month: number; year: number; expenses: number; cashback: number }[] = []
      for (let i = 0; i < 12; i += 1) {
        const base = card.anniversaryStartMonth - 1 + i
        const month = (base % 12) + 1
        const ry = annivStartYear + (base >= 12 ? 1 : 0)
        annivRows.push({
          month,
          year: ry,
          expenses: getMonthValue(creditCardDataByYear, ry, card.id, month, "expenses"),
          cashback: getMonthValue(creditCardDataByYear, ry, card.id, month, "cashback"),
        })
      }
      const annivSpend = annivRows.reduce((s, r) => s + r.expenses, 0)
      const waiverProgress =
        card.feeWaiverTarget > 0 ? Math.min(100, (annivSpend / card.feeWaiverTarget) * 100) : 0
      const waiverGap = card.feeWaiverTarget - annivSpend

      return {
        card,
        color: colorFor(idx),
        spend,
        cashback,
        rate: spend > 0 ? (cashback / spend) * 100 : 0,
        annivSpend,
        waiverProgress,
        waiverGap,
        annivRows,
      }
    })
  }, [creditCards, creditCardDataByYear, year])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Credit Cards</h1>
          <p className="text-sm text-muted-foreground">
            Track monthly spend, cashback and fee-waiver progress.
          </p>
        </div>
        <YearPicker
          year={year}
          onChange={setYear}
          onJumpToday={() => setYear(new Date().getFullYear())}
          isThisYear={year === new Date().getFullYear()}
          minYear={2025}
        />
      </header>

      <div className="flex flex-wrap gap-2">
        <ViewTab active={view === "overview"} onClick={() => setView("overview")} icon={<CalendarRange className="size-4" />}>
          Overview
        </ViewTab>
        <ViewTab active={view === "card"} onClick={() => setView("card")} icon={<CreditCardIcon className="size-4" />}>
          Single card
        </ViewTab>
        <ViewTab active={view === "settings"} onClick={() => setView("settings")} icon={<Pencil className="size-4" />}>
          Card profiles
        </ViewTab>
      </div>

      {view === "overview" ? (
        <OverviewView
          year={year}
          activeCards={activeCards}
          summaries={cardSummaries.filter((s) => s.card.status === "active")}
          monthly={monthlyChartData}
          dataByYear={creditCardDataByYear}
          yearTotals={yearTotals}
          cashbackRate={cashbackRate}
          onValueChange={setCreditCardMonthValue}
          onSelectCard={(id) => {
            setSelectedCardId(id)
            setView("card")
          }}
        />
      ) : null}

      {view === "card" ? (
        <SingleCardView
          year={year}
          creditCards={creditCards}
          selectedCardId={selectedCardId}
          setSelectedCardId={setSelectedCardId}
          dataByYear={creditCardDataByYear}
          onValueChange={setCreditCardMonthValue}
          summaries={cardSummaries}
        />
      ) : null}

      {view === "settings" ? (
        <ProfilesView
          creditCards={creditCards}
          newCardName={newCardName}
          setNewCardName={setNewCardName}
          addCreditCard={(name) => {
            addCreditCard(name)
            setNewCardName("")
          }}
          setCreditCardMeta={setCreditCardMeta}
          removeCreditCard={(id) => {
            removeCreditCard(id)
            if (selectedCardId === id) setSelectedCardId(creditCards[0]?.id ?? "")
          }}
        />
      ) : null}
    </div>
  )
}

function ViewTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
        active
          ? "border-indigo-400/40 bg-indigo-500/15 text-foreground"
          : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

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

function SummaryTile({
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

function OverviewView({
  year,
  activeCards,
  summaries,
  monthly,
  dataByYear,
  yearTotals,
  cashbackRate,
  onValueChange,
  onSelectCard,
}: {
  year: number
  activeCards: CreditCardConfig[]
  summaries: { card: CreditCardConfig; color: string; spend: number; cashback: number; rate: number; annivSpend: number; waiverProgress: number; waiverGap: number }[]
  monthly: Record<string, string | number>[]
  dataByYear: Record<number, Record<string, { cashback: Record<number, number>; expenses: Record<number, number> }>>
  yearTotals: { spend: number; cashback: number }
  cashbackRate: number
  onValueChange: (params: { year: number; cardId: string; month: number; field: DataField; value: number }) => void
  onSelectCard: (id: string) => void
}) {
  if (activeCards.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No active cards. Add one from the "Card profiles" tab.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryTile
          label={`${year} Spend`}
          value={formatINR(yearTotals.spend)}
          sub={`Across ${activeCards.length} active card${activeCards.length === 1 ? "" : "s"}`}
          icon={<Wallet className="size-5" />}
          tint="indigo"
        />
        <SummaryTile
          label={`${year} Cashback`}
          value={formatINR(yearTotals.cashback)}
          sub="Total reward earned"
          icon={<Gift className="size-5" />}
          tint="emerald"
          valueClass="text-emerald-300"
        />
        <SummaryTile
          label="Cashback rate"
          value={`${cashbackRate.toFixed(2)}%`}
          sub="Cashback ÷ spend"
          icon={<Percent className="size-5" />}
          tint="amber"
          gauge={Math.min(cashbackRate, 5) / 5}
        />
      </div>

      <Card className="rounded-2xl border-border/60 bg-card/85">
        <CardHeader>
          <CardTitle className="text-base">Monthly spend by card</CardTitle>
          <div className="text-xs text-muted-foreground">Stacked across active cards</div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer>
              <BarChart data={monthly} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
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
                  itemSorter={(item) => -Number(item.value ?? 0)}
                  formatter={(v, name) => {
                    const card = activeCards.find((c) => c.id === String(name))
                    return [formatINR(Number(v)), card?.name ?? String(name)]
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  content={() => (
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-2 text-[11px]">
                      {activeCards.map((c, i) => (
                        <span key={c.id} className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block size-2 rounded-full"
                            style={{ background: colorFor(i) }}
                          />
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                />
                {activeCards.map((card, idx) => (
                  <Bar
                    key={card.id}
                    dataKey={card.id}
                    stackId="spend"
                    fill={colorFor(idx)}
                    radius={idx === activeCards.length - 1 ? [4, 4, 0, 0] : 0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <CardBreakdownTable
        field="cashback"
        title={`Cashback ${year}`}
        year={year}
        activeCards={activeCards}
        dataByYear={dataByYear}
        onValueChange={onValueChange}
      />

      <CardBreakdownTable
        field="expenses"
        title={`Expenses ${year}`}
        year={year}
        activeCards={activeCards}
        dataByYear={dataByYear}
        onValueChange={onValueChange}
      />

      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Per-card summary</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {summaries.map((s) => (
            <button
              key={s.card.id}
              onClick={() => onSelectCard(s.card.id)}
              className="group block w-full overflow-hidden rounded-2xl border border-border/60 bg-card/85 p-4 text-left transition hover:border-indigo-400/40 hover:bg-card"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm font-semibold">{s.card.name}</span>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                  {s.card.annualFeeType === "ltf" ? "LTF" : `₹${s.card.annualFeeAmount} fee`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-[11px] uppercase text-muted-foreground">Spend</div>
                  <div className="font-medium">{formatCompactINR(s.spend)}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase text-muted-foreground">Cashback</div>
                  <div className="font-medium text-emerald-300">{formatCompactINR(s.cashback)}</div>
                </div>
              </div>
              {s.card.annualFeeType === "paid" && s.card.feeWaiverTarget > 0 ? (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Fee waiver</span>
                    <span className={s.waiverGap <= 0 ? "text-emerald-300" : "text-amber-300"}>
                      {s.waiverGap <= 0 ? "Achieved" : `${formatCompactINR(s.waiverGap)} to go`}
                    </span>
                  </div>
                  <Progress value={s.waiverProgress} className="h-1.5" />
                </div>
              ) : (
                <div className="mt-3 text-[11px] text-muted-foreground">
                  {s.card.annualFeeType === "ltf" ? "Lifetime free · no fee" : "No waiver target"}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function CardBreakdownTable({
  field,
  title,
  year,
  activeCards,
  dataByYear,
  onValueChange,
}: {
  field: DataField
  title: string
  year: number
  activeCards: CreditCardConfig[]
  dataByYear: Record<number, Record<string, { cashback: Record<number, number>; expenses: Record<number, number> }>>
  onValueChange: (params: { year: number; cardId: string; month: number; field: DataField; value: number }) => void
}) {
  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth() + 1

  // Show every active card (so blank cells can be edited too).
  const cardsToShow = activeCards

  if (cardsToShow.length === 0) {
    return (
      <Card className="rounded-2xl border-border/60 bg-card/85">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          No active cards. Add one from "Card profiles".
        </CardContent>
      </Card>
    )
  }

  const monthTotals = MONTHS.map((_, idx) =>
    cardsToShow.reduce((sum, c) => sum + getMonthValue(dataByYear, year, c.id, idx + 1, field), 0),
  )
  const cardTotals = cardsToShow.map((c) =>
    MONTHS.reduce((sum, _, idx) => sum + getMonthValue(dataByYear, year, c.id, idx + 1, field), 0),
  )
  const grandTotal = cardTotals.reduce((a, b) => a + b, 0)

  const fmtTotal = (n: number) => {
    if (n === 0) return <span className="text-muted-foreground/40">0</span>
    return Math.round(n * 100) / 100 === Math.floor(n)
      ? Math.round(n).toLocaleString("en-IN")
      : n.toLocaleString("en-IN", { maximumFractionDigits: 2 })
  }

  return (
    <Card className="rounded-2xl border-border/60 bg-card/85">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="text-xs text-muted-foreground">
          Click any cell to edit · totals on the right and bottom
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Month</TableHead>
                {cardsToShow.map((c) => (
                  <TableHead key={c.id} className="min-w-28 text-right">
                    {c.name}
                  </TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MONTHS.map((m, idx) => {
                const month = idx + 1
                const isCurrent = year === todayYear && month === todayMonth
                return (
                  <TableRow
                    key={m}
                    className={
                      isCurrent
                        ? "bg-indigo-500/10 hover:bg-indigo-500/15"
                        : undefined
                    }
                  >
                    <TableCell className={`font-medium ${isCurrent ? "text-indigo-300" : ""}`}>
                      {m}
                    </TableCell>
                    {cardsToShow.map((c) => (
                      <TableCell key={c.id} className="px-1 py-1 text-right tabular-nums">
                        <NumberInput
                          className="h-8 text-right tabular-nums"
                          step={1}
                          ariaLabel={`${c.name} ${m} ${field}`}
                          value={getMonthValue(dataByYear, year, c.id, month, field)}
                          onChange={(v) =>
                            onValueChange({ year, cardId: c.id, month, field, value: v })
                          }
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium tabular-nums">
                      {fmtTotal(monthTotals[idx])}
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="bg-muted/15">
                <TableCell className="font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">
                  Sum
                </TableCell>
                {cardTotals.map((total, i) => (
                  <TableCell key={cardsToShow[i].id} className="text-right font-semibold tabular-nums">
                    {fmtTotal(total)}
                  </TableCell>
                ))}
                <TableCell className="text-right font-semibold tabular-nums">
                  {fmtTotal(grandTotal)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function SingleCardView({
  year,
  creditCards,
  selectedCardId,
  setSelectedCardId,
  dataByYear,
  onValueChange,
  summaries,
}: {
  year: number
  creditCards: CreditCardConfig[]
  selectedCardId: string
  setSelectedCardId: (id: string) => void
  dataByYear: Record<number, Record<string, { cashback: Record<number, number>; expenses: Record<number, number> }>>
  onValueChange: (params: { year: number; cardId: string; month: number; field: DataField; value: number }) => void
  summaries: { card: CreditCardConfig; spend: number; cashback: number; rate: number; annivSpend: number; waiverProgress: number; waiverGap: number; annivRows: { month: number; year: number; expenses: number; cashback: number }[] }[]
}) {
  const card = creditCards.find((c) => c.id === selectedCardId) ?? creditCards[0]
  if (!card) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No cards yet. Add one in "Card profiles".
        </CardContent>
      </Card>
    )
  }
  const summary = summaries.find((s) => s.card.id === card.id)!

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60 bg-card/85">
        <CardContent className="flex flex-wrap items-end justify-between gap-3 py-4">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Card</Label>
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              value={card.id}
              onChange={(e) => setSelectedCardId(e.target.value)}
            >
              {creditCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.status === "closed" ? " (closed)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <Stat label="Year spend" value={formatCompactINR(summary.spend)} />
            <Stat label="Year cashback" value={formatCompactINR(summary.cashback)} accent="emerald" />
            <Stat label="Cashback rate" value={`${summary.rate.toFixed(2)}%`} />
          </div>
        </CardContent>
      </Card>

      {card.annualFeeType === "paid" ? (
        <Card className="rounded-2xl border-border/60 bg-card/85">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fee waiver progress</CardTitle>
            <div className="text-xs text-muted-foreground">
              Anniversary year · {MONTHS[summary.annivRows[0].month - 1]} {summary.annivRows[0].year} – {MONTHS[summary.annivRows[11].month - 1]} {summary.annivRows[11].year}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {card.feeWaiverTarget > 0 ? (
              <>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <div className="text-2xl font-semibold">{formatINR(summary.annivSpend)}</div>
                    <div className="text-xs text-muted-foreground">Spent of {formatINR(card.feeWaiverTarget)} target</div>
                  </div>
                  <div className={`flex items-center gap-1.5 text-sm font-medium ${summary.waiverGap <= 0 ? "text-emerald-300" : "text-amber-300"}`}>
                    {summary.waiverGap <= 0 ? <CheckCircle2 className="size-4" /> : null}
                    {summary.waiverGap <= 0
                      ? "Target achieved — fee waived"
                      : `${formatCompactINR(summary.waiverGap)} more to waive fee`}
                  </div>
                </div>
                <Progress value={summary.waiverProgress} className="h-2" />
              </>
            ) : (
              <div>
                <div className="text-2xl font-semibold">{formatINR(summary.annivSpend)}</div>
                <div className="text-xs text-muted-foreground">
                  Spent this anniversary year · set a fee-waiver target in “Card profiles” to track progress.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-border/60 bg-card/85">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Lifetime Free</CardTitle>
              <span className="rounded-full bg-yellow-400/25 px-2 py-0.5 text-[10px] text-yellow-300">LTF</span>
            </div>
            <div className="text-xs text-muted-foreground">No annual fee — no spend target to track.</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatINR(summary.spend)}</div>
            <div className="text-xs text-muted-foreground">Spent in {year}</div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-border/60 bg-card/85">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{year} Spend vs Cashback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] w-full">
            <ResponsiveContainer>
              <BarChart
                data={MONTHS.map((m, idx) => ({
                  month: m,
                  spend: getMonthValue(dataByYear, year, card.id, idx + 1, "expenses"),
                  cashback: getMonthValue(dataByYear, year, card.id, idx + 1, "cashback"),
                }))}
                margin={{ top: 6, right: 10, bottom: 0, left: 0 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
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
                  formatter={(v, name) => [formatINR(Number(v)), String(name) === "spend" ? "Spend" : "Cashback"]}
                />
                <Bar dataKey="spend" fill={ASSET_COLORS.equity} radius={[4, 4, 0, 0]}>
                  {MONTHS.map((_, i) => (
                    <Cell key={i} fill={ASSET_COLORS.equity} />
                  ))}
                </Bar>
                <Bar dataKey="cashback" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60 bg-card/85">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly entries — {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Cashback</TableHead>
                  <TableHead>Expenses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MONTHS.map((m, idx) => {
                  const month = idx + 1
                  return (
                    <TableRow key={m}>
                      <TableCell className="font-medium">{m}</TableCell>
                      <TableCell>
                        <NumberInput
                          className="h-8 max-w-[140px]"
                          step={1}
                          ariaLabel={`${m} cashback`}
                          value={getMonthValue(dataByYear, year, card.id, month, "cashback")}
                          onChange={(v) =>
                            onValueChange({
                              year,
                              cardId: card.id,
                              month,
                              field: "cashback",
                              value: v,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <NumberInput
                          className="h-8 max-w-[140px]"
                          step={1}
                          ariaLabel={`${m} expenses`}
                          value={getMonthValue(dataByYear, year, card.id, month, "expenses")}
                          onChange={(v) =>
                            onValueChange({
                              year,
                              cardId: card.id,
                              month,
                              field: "expenses",
                              value: v,
                            })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
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

function ProfilesView({
  creditCards,
  newCardName,
  setNewCardName,
  addCreditCard,
  setCreditCardMeta,
  removeCreditCard,
}: {
  creditCards: CreditCardConfig[]
  newCardName: string
  setNewCardName: (v: string) => void
  addCreditCard: (name: string) => void
  setCreditCardMeta: (id: string, details: Partial<Omit<CreditCardConfig, "id">>) => void
  removeCreditCard: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60 bg-card/85">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Add new card</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid flex-1 gap-1.5">
            <Label className="text-xs text-muted-foreground">Card name</Label>
            <Input value={newCardName} onChange={(e) => setNewCardName(e.target.value)} placeholder="HDFC Diners" />
          </div>
          <Button onClick={() => addCreditCard(newCardName)} disabled={!newCardName.trim()}>
            <Plus className="mr-1 size-4" /> Add card
          </Button>
        </CardContent>
      </Card>

      {(() => {
        const active = creditCards.filter((c) => c.status === "active")
        const closed = creditCards.filter((c) => c.status === "closed")
        return (
          <>
            {active.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-400" />
                  Active · {active.length}
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {active.map((card) => renderCard(card))}
                </div>
              </div>
            ) : null}

            {active.length > 0 && closed.length > 0 ? (
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Closed
                </span>
                <div className="h-px flex-1 bg-border/60" />
              </div>
            ) : null}

            {closed.length > 0 ? (
              <div className="space-y-3">
                {active.length === 0 ? (
                  <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="inline-block size-1.5 rounded-full bg-amber-400" />
                    Closed · {closed.length}
                  </div>
                ) : null}
                <div className="grid grid-cols-1 gap-3 opacity-80 lg:grid-cols-2">
                  {closed.map((card) => renderCard(card))}
                </div>
              </div>
            ) : null}
          </>
        )

        function renderCard(card: CreditCardConfig) {
          return (
          <Card key={card.id} className="overflow-hidden rounded-2xl border-border/60 bg-card/85">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CreditCardIcon className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base">{card.name}</CardTitle>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      card.status === "active"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {card.status === "active" ? "Active" : "Closed"}
                  </span>
                  {card.annualFeeType === "ltf" ? (
                    <span className="rounded-full bg-yellow-400/25 px-2 py-0.5 text-[10px] text-yellow-300">
                      LTF
                    </span>
                  ) : null}
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${card.name}? Card data will be removed.`)) {
                      removeCreditCard(card.id)
                    }
                  }}
                  className="text-muted-foreground transition hover:text-rose-300"
                  aria-label="Delete card"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <select
                  className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={card.status}
                  onChange={(e) =>
                    setCreditCardMeta(card.id, { status: e.target.value as "active" | "closed" })
                  }
                >
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Annual fee type</Label>
                <select
                  className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={card.annualFeeType}
                  onChange={(e) =>
                    setCreditCardMeta(card.id, { annualFeeType: e.target.value as "ltf" | "paid" })
                  }
                >
                  <option value="ltf">Lifetime Free</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Annual fee (₹)</Label>
                <NumberInput
                  min={0}
                  step={100}
                  disabled={card.annualFeeType === "ltf"}
                  value={card.annualFeeType === "ltf" ? 0 : card.annualFeeAmount}
                  onChange={(v) => setCreditCardMeta(card.id, { annualFeeAmount: v })}
                  ariaLabel="Annual fee"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Fee-waiver target (₹)</Label>
                <NumberInput
                  min={0}
                  step={1000}
                  disabled={card.annualFeeType === "ltf"}
                  value={card.annualFeeType === "ltf" ? 0 : card.feeWaiverTarget}
                  onChange={(v) => setCreditCardMeta(card.id, { feeWaiverTarget: v })}
                  ariaLabel="Fee waiver target"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Anniversary start month (1-12)</Label>
                <NumberInput
                  min={1}
                  max={12}
                  step={1}
                  emptyValue={1}
                  disabled={card.annualFeeType === "ltf"}
                  value={card.anniversaryStartMonth}
                  onChange={(v) =>
                    setCreditCardMeta(card.id, { anniversaryStartMonth: Math.round(v) })
                  }
                  ariaLabel="Anniversary start month"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Credit limit (₹)</Label>
                <NumberInput
                  min={0}
                  step={1000}
                  value={card.creditLimit}
                  onChange={(v) => setCreditCardMeta(card.id, { creditLimit: v })}
                  ariaLabel="Credit limit"
                />
              </div>
              <div className="grid gap-1.5 md:col-span-2">
                <Label className="text-xs text-muted-foreground">Benefits / usage</Label>
                <textarea
                  className="min-h-16 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  value={card.benefitsNote}
                  onChange={(e) => setCreditCardMeta(card.id, { benefitsNote: e.target.value })}
                  placeholder="e.g. 5% on online spends, free lounge access…"
                />
              </div>
            </CardContent>
          </Card>
          )
        }
      })()}

      {creditCards.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <X className="size-6 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">No cards yet. Add one above to begin.</div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
