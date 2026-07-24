import { useMemo, useState } from "react"
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  HeartPulse,
  ShieldCheck,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { YearPicker } from "@/components/primitives/YearPicker"
import { MONTHS } from "@/lib/dates"
import { formatCompactINR, formatINR } from "@/lib/money"
import { ccBillKey, insuranceBillKey, usePortfolioStore } from "@/store/usePortfolioStore"

export function BillsPage() {
  const {
    creditCards,
    bills,
    lifeInsurance,
    healthInsurance,
    setCreditCardBillPaid,
    setInsuranceBillPaid,
  } = usePortfolioStore()

  const today = new Date()
  // Billing cycle: bills run from the 13th of one calendar month
  // through the 12th of the next. Before the 13th, the active
  // billing month is the previous calendar month.
  const billingDate = new Date(today)
  if (today.getDate() < 13) {
    billingDate.setMonth(billingDate.getMonth() - 1)
  }
  const billingYear = billingDate.getFullYear()
  const billingMonth = billingDate.getMonth() + 1

  const periodStart = new Date(billingYear, billingMonth - 1, 12)
  const periodEnd = new Date(billingYear, billingMonth, 12)
  const fmtPeriod = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`
  const periodLabel = `${fmtPeriod(periodStart)} – ${fmtPeriod(periodEnd)}`

  const [year, setYear] = useState(today.getFullYear())

  const activeCards = useMemo(() => creditCards.filter((c) => c.status === "active"), [creditCards])

  const ccPaidThisMonth = useMemo(
    () =>
      activeCards.filter(
        (c) => bills.creditCards[ccBillKey(billingYear, billingMonth, c.id)]?.paid,
      ).length,
    [activeCards, bills.creditCards, billingYear, billingMonth],
  )

  const lifeKey = insuranceBillKey(year, "life")
  const healthKey = insuranceBillKey(year, "health")
  const lifePaid = Boolean(bills.insurance[lifeKey]?.paid)
  const healthPaid = Boolean(bills.insurance[healthKey]?.paid)

  // Show every enabled policy for the selected year. (Disabled policies stay
  // hidden everywhere.) A premium is only actually *payable* in its renewal
  // year — other years show a locked, ticked "paid" row for display only.
  const lifeDue = lifeInsurance.enabled
  const healthDue = healthInsurance.enabled
  const showInsurance = lifeDue || healthDue
  const lifePayable = new Date(lifeInsurance.renewalDate).getFullYear() === year
  const healthPayable = new Date(healthInsurance.renewalDate).getFullYear() === year

  const isThisYear = year === today.getFullYear()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Bills</h1>
          <p className="text-sm text-muted-foreground">
            Tap any cell to mark a credit card bill paid. Insurance is yearly.
          </p>
        </div>
        <YearPicker
          year={year}
          onChange={setYear}
          onJumpToday={() => setYear(today.getFullYear())}
          isThisYear={isThisYear}
          minYear={2025}
        />
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <ProgressTile
          label="Credit cards"
          done={ccPaidThisMonth}
          total={activeCards.length}
          accent="indigo"
          sub={periodLabel}
        />
        {lifeDue ? (
          <ProgressTile
            label="Life insurance"
            done={lifePayable ? (lifePaid ? 1 : 0) : 1}
            total={1}
            accent="indigo"
            sub={`Renews ${lifeInsurance.renewalDate || "—"}`}
          />
        ) : null}
        {healthDue ? (
          <ProgressTile
            label="Health insurance"
            done={healthPayable ? (healthPaid ? 1 : 0) : 1}
            total={1}
            accent="rose"
            sub={`Renews ${healthInsurance.renewalDate || "—"}`}
          />
        ) : null}
      </div>

      {/* Year overview — credit card bills */}
      {activeCards.length > 0 ? (
        <Card className="rounded-2xl border-border/60 bg-card/85">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-indigo-300" />
              Credit card bills · {year}
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              Tap any cell to toggle paid for that card-month.
            </div>
          </CardHeader>
          <CardContent>
            <YearGrid
              year={year}
              cards={activeCards}
              bills={bills.creditCards}
              currentYear={billingYear}
              currentMonth={billingMonth}
              onToggle={(cardId, m, paid) =>
                setCreditCardBillPaid({ year, month: m, cardId, paid })
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-border/60 bg-card/85">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No active cards. Add or activate one in Cards → Card profiles.
          </CardContent>
        </Card>
      )}

      {/* Insurance checklist (yearly) — only policies whose renewal falls in this year */}
      {showInsurance ? (
        <Card className="rounded-2xl border-border/60 bg-card/85">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4 text-indigo-300" />
              Insurance premiums · {year}
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              Tap once per calendar year.
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {lifeDue ? (
              <BillRow
                paid={lifePayable ? lifePaid : true}
                disabled={!lifePayable}
                onToggle={(next) => setInsuranceBillPaid({ year, type: "life", paid: next })}
                title="Life insurance"
                subtitle={
                  (lifeInsurance.coverAmount > 0
                    ? `Cover ${formatCompactINR(lifeInsurance.coverAmount)} · renews ${lifeInsurance.renewalDate || "—"}`
                    : "No cover details set — update in Settings") + (lifePayable ? "" : " · not due this year")
                }
                amount={lifeInsurance.premium > 0 ? formatINR(lifeInsurance.premium) : null}
                icon={<ShieldCheck className="size-4 text-indigo-300" />}
              />
            ) : null}
            {healthDue ? (
              <BillRow
                paid={healthPayable ? healthPaid : true}
                disabled={!healthPayable}
                onToggle={(next) => setInsuranceBillPaid({ year, type: "health", paid: next })}
                title="Health insurance"
                subtitle={
                  (healthInsurance.coverAmount > 0
                    ? `Cover ${formatCompactINR(healthInsurance.coverAmount)} · renews ${healthInsurance.renewalDate || "—"}`
                    : "No cover details set — update in Settings") + (healthPayable ? "" : " · not due this year")
                }
                amount={healthInsurance.premium > 0 ? formatINR(healthInsurance.premium) : null}
                icon={<HeartPulse className="size-4 text-rose-300" />}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function ProgressTile({
  label,
  done,
  total,
  sub,
  accent,
}: {
  label: string
  done: number
  total: number
  sub: string
  accent: "indigo" | "rose"
}) {
  const pct = total > 0 ? (done / total) * 100 : 0
  const allDone = total > 0 && done === total
  const tone = accent === "indigo" ? "text-indigo-300" : "text-rose-300"
  const bar = accent === "indigo" ? "bg-indigo-400" : "bg-rose-400"
  return (
    <Card className="rounded-2xl border-border/60 bg-card/85 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {done}
            <span className="text-muted-foreground"> / {total}</span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
        </div>
        {allDone ? (
          <CheckCircle2 className={`size-6 ${tone}`} />
        ) : (
          <div className={`text-xs font-medium ${tone}`}>{pct.toFixed(0)}%</div>
        )}
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
        <div
          className={`h-full rounded-full transition-[width] ${bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Card>
  )
}

function BillRow({
  paid,
  onToggle,
  title,
  subtitle,
  amount,
  icon,
  disabled = false,
}: {
  paid: boolean
  onToggle: (next: boolean) => void
  title: string
  subtitle: string
  amount: string | null
  icon?: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(!paid)}
      className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
        paid
          ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
          : "border-border/60 bg-muted/15 hover:border-indigo-400/40 hover:bg-muted/25"
      } ${disabled ? "cursor-default opacity-80 hover:bg-emerald-500/5" : ""}`}
    >
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full transition ${
          paid
            ? "bg-emerald-500/25 text-emerald-300"
            : "bg-muted/40 text-muted-foreground group-hover:text-indigo-300"
        }`}
      >
        {paid ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className={`text-sm font-semibold ${
              paid ? "text-foreground line-through decoration-emerald-400/40" : "text-foreground"
            }`}
          >
            {title}
          </span>
          {icon}
        </div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>

      {amount ? (
        <div className={`shrink-0 text-right text-sm font-semibold ${paid ? "text-emerald-300" : "text-foreground"}`}>
          {amount}
        </div>
      ) : null}
    </button>
  )
}

function YearGrid({
  year,
  cards,
  bills,
  currentYear,
  currentMonth,
  onToggle,
}: {
  year: number
  cards: { id: string; name: string }[]
  bills: Record<string, { paid: boolean }>
  currentYear: number
  currentMonth: number
  onToggle: (cardId: string, month: number, paid: boolean) => void
}) {
  const monthsPerCard = cards.map((c) => {
    const paidCount = MONTHS.reduce((acc, _, idx) => {
      const paid = Boolean(bills[ccBillKey(year, idx + 1, c.id)]?.paid)
      return acc + (paid ? 1 : 0)
    }, 0)
    return { card: c, paidCount }
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="pb-2 pr-3 text-left font-normal">Card</th>
            {MONTHS.map((m, idx) => {
              const isCurrent = year === currentYear && idx + 1 === currentMonth
              return (
                <th
                  key={m}
                  className={`px-1 pb-2 text-center font-normal ${
                    isCurrent ? "text-indigo-300" : ""
                  }`}
                >
                  {m}
                </th>
              )
            })}
            <th className="pb-2 pl-3 pr-1 text-right font-normal">Done</th>
          </tr>
        </thead>
        <tbody>
          {monthsPerCard.map(({ card, paidCount }) => (
            <tr key={card.id} className="border-t border-border/40">
              <td className="py-2 pr-3 align-middle text-sm font-medium">{card.name}</td>
              {MONTHS.map((m, idx) => {
                const month = idx + 1
                const paid = Boolean(bills[ccBillKey(year, month, card.id)]?.paid)
                const isCurrent = year === currentYear && month === currentMonth
                return (
                  <td key={m} className="px-1 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => onToggle(card.id, month, !paid)}
                      className={`inline-flex size-7 items-center justify-center rounded-full transition ${
                        paid
                          ? "bg-emerald-500/25 text-emerald-300 hover:bg-emerald-500/40"
                          : isCurrent
                            ? "bg-indigo-500/15 text-indigo-300/70 ring-1 ring-indigo-400/40 hover:bg-indigo-500/25"
                            : "bg-muted/30 text-muted-foreground/50 hover:bg-muted/50 hover:text-muted-foreground"
                      }`}
                      aria-label={`${card.name} ${m} ${year} ${paid ? "paid" : "unpaid"}`}
                    >
                      {paid ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                    </button>
                  </td>
                )
              })}
              <td className="pl-3 pr-1 text-right text-xs">
                <span className={paidCount === 12 ? "text-emerald-300" : "text-muted-foreground"}>
                  {paidCount}/12
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
