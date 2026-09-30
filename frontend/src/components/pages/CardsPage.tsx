import { useMemo, useState } from "react"
import { CalendarRange, CreditCard as CreditCardIcon, Pencil } from "lucide-react"

import { YearPicker } from "@/components/primitives/YearPicker"
import { usePortfolioStore } from "@/store/usePortfolioStore"
import { MONTHS, colorFor, getMonthValue, rankForCard, type View } from "./cards/shared"
import { OverviewView } from "./cards/OverviewView"
import { SingleCardView } from "./cards/SingleCardView"
import { ProfilesView } from "./cards/ProfilesView"

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

  // Read on every render (not inside the memo) so a long-open app moves to the
  // new cycle once the month changes.
  const today = new Date()
  const thisYear = today.getFullYear()
  const thisMonth = today.getMonth() + 1

  const cardSummaries = useMemo(() => {
    return creditCards.map((card, idx) => {
      let spend = 0
      let cashback = 0
      for (let m = 1; m <= 12; m += 1) {
        spend += getMonthValue(creditCardDataByYear, year, card.id, m, "expenses")
        cashback += getMonthValue(creditCardDataByYear, year, card.id, m, "cashback")
      }

      // For the current year, show the cycle that contains today — that's the
      // one whose fee waiver is still in play. For other years, anchor to the
      // cycle that overlaps that calendar year the most: for a late
      // anniversary month (Aug–Dec) that cycle started the previous year.
      const annivStartYear =
        year === thisYear
          ? thisMonth >= card.anniversaryStartMonth ? year : year - 1
          : card.anniversaryStartMonth >= 8 ? year - 1 : year
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
  }, [creditCards, creditCardDataByYear, year, thisYear, thisMonth])

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
