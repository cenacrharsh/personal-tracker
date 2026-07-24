import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NumberInput } from "@/components/forms/NumberInput"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { CreditCardConfig } from "@/data"
import { MONTHS, getMonthValue, type DataField } from "./shared"

export function CardBreakdownTable({
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
