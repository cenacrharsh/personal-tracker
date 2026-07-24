import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Gift, Percent, Wallet } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCompactINR, formatINR } from "@/lib/money"
import type { CreditCardConfig } from "@/data"
import { colorFor, type DataField } from "./shared"
import { SummaryTile } from "./tiles"
import { CardBreakdownTable } from "./CardBreakdownTable"

export function OverviewView({
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
