import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { CheckCircle2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { NumberInput } from "@/components/forms/NumberInput"
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
import type { CreditCardConfig } from "@/data"
import { MONTHS, getMonthValue, type DataField } from "./shared"
import { Stat } from "./tiles"

export function SingleCardView({
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
