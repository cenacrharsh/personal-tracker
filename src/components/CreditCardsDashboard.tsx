import { useMemo, useState } from "react"
import { CalendarRange, CreditCard, IndianRupee, Plus, ShieldCheck, StickyNote, Trash2, Wallet } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { formatINR } from "@/lib/money"
import { usePortfolioStore, type CreditCardConfig } from "@/store/usePortfolioStore"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

type DataField = "cashback" | "expenses"

function safeNumber(n: unknown) {
  const parsed = typeof n === "number" ? n : Number(n)
  return Number.isFinite(parsed) ? parsed : 0
}

function MonthValueInput({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <Input
      type="number"
      className="h-7 min-w-[92px] bg-transparent text-right"
      value={value}
      min={0}
      step={1}
      onChange={(e) => onChange(safeNumber(e.target.value))}
    />
  )
}

function getCardMonthValue(
  yearData: Record<number, Record<string, { cashback: Record<number, number>; expenses: Record<number, number> }>>,
  year: number,
  cardId: string,
  month: number,
  field: DataField,
) {
  return safeNumber(yearData[year]?.[cardId]?.[field]?.[month] ?? 0)
}

function AllCardsTable({
  year,
  cards,
  yearData,
  field,
  onValueChange,
}: {
  year: number
  cards: CreditCardConfig[]
  yearData: Record<number, Record<string, { cashback: Record<number, number>; expenses: Record<number, number> }>>
  field: DataField
  onValueChange: (params: {
    year: number
    cardId: string
    month: number
    field: DataField
    value: number
  }) => void
}) {
  const title = field === "cashback" ? "Cashback" : "Expenses"

  const totalsByCard = useMemo(() => {
    return cards.map((card) =>
      MONTHS.reduce((sum, _, idx) => sum + getCardMonthValue(yearData, year, card.id, idx + 1, field), 0),
    )
  }, [cards, field, year, yearData])

  const grandTotal = totalsByCard.reduce((sum, value) => sum + value, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title} {year}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              {cards.map((card) => (
                <TableHead key={card.id}>
                  {card.name}
                  {card.status === "closed" ? (
                    <span className="ml-1 text-[10px] text-amber-400">(Closed)</span>
                  ) : null}
                </TableHead>
              ))}
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MONTHS.map((month, monthIndex) => {
              const monthNum = monthIndex + 1
              const rowTotal = cards.reduce(
                (sum, card) => sum + getCardMonthValue(yearData, year, card.id, monthNum, field),
                0,
              )

              return (
                <TableRow key={month}>
                  <TableCell className="font-medium">{month}</TableCell>
                  {cards.map((card) => {
                    const value = getCardMonthValue(yearData, year, card.id, monthNum, field)
                    return (
                      <TableCell key={card.id}>
                        <MonthValueInput
                          value={value}
                          onChange={(next) =>
                            onValueChange({
                              year,
                              cardId: card.id,
                              month: monthNum,
                              field,
                              value: next,
                            })
                          }
                        />
                      </TableCell>
                    )
                  })}
                  <TableCell className="font-medium">{Math.round(rowTotal).toLocaleString("en-IN")}</TableCell>
                </TableRow>
              )
            })}
            <TableRow>
              <TableCell className="font-semibold">SUM</TableCell>
              {totalsByCard.map((total, i) => (
                <TableCell key={`${cards[i]?.id}-sum`} className="font-semibold">
                  {Math.round(total).toLocaleString("en-IN")}
                </TableCell>
              ))}
              <TableCell className="font-semibold">{Math.round(grandTotal).toLocaleString("en-IN")}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function CreditCardsDashboard() {
  const {
    creditCards,
    creditCardDataByYear,
    setCreditCardMonthValue,
    setCreditCardMeta,
    addCreditCard,
    removeCreditCard,
  } = usePortfolioStore()

  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [scope, setScope] = useState<"all" | "single">("all")
  const [creditSection, setCreditSection] = useState<"tabular" | "profiles">("tabular")
  const [selectedCardId, setSelectedCardId] = useState<string>(creditCards[0]?.id ?? "")
  const [singleView, setSingleView] = useState<"calendar" | "cardYear">("calendar")
  const [newCardName, setNewCardName] = useState("")

  const selectedCard = creditCards.find((c) => c.id === selectedCardId) ?? creditCards[0]
  const selectedId = selectedCard?.id ?? ""
  const activeCards = useMemo(() => creditCards.filter((card) => card.status === "active"), [creditCards])

  const monthSum = (field: DataField, month: number) =>
    activeCards.reduce((sum, card) => sum + getCardMonthValue(creditCardDataByYear, year, card.id, month, field), 0)

  const yearlySum = (field: DataField) => MONTHS.reduce((sum, _, i) => sum + monthSum(field, i + 1), 0)

  const cardCalendarYearExpense = useMemo(() => {
    if (!selectedCard) return 0
    return MONTHS.reduce(
      (sum, _, i) =>
        sum + getCardMonthValue(creditCardDataByYear, year, selectedCard.id, i + 1, "expenses"),
      0,
    )
  }, [creditCardDataByYear, selectedCard, year])

  const cardAnniversaryRows = useMemo(() => {
    if (!selectedCard) return []
    const rows: { label: string; year: number; month: number; expense: number; cashback: number }[] = []
    for (let i = 0; i < 12; i += 1) {
      const month = ((selectedCard.anniversaryStartMonth - 1 + i) % 12) + 1
      const rowYear = year + (selectedCard.anniversaryStartMonth - 1 + i >= 12 ? 1 : 0)
      rows.push({
        label: `${MONTHS[month - 1]} ${rowYear}`,
        year: rowYear,
        month,
        expense: getCardMonthValue(creditCardDataByYear, rowYear, selectedCard.id, month, "expenses"),
        cashback: getCardMonthValue(creditCardDataByYear, rowYear, selectedCard.id, month, "cashback"),
      })
    }
    return rows
  }, [creditCardDataByYear, selectedCard, year])

  const anniversarySpent = cardAnniversaryRows.reduce((sum, row) => sum + row.expense, 0)
  const waiverTarget = selectedCard?.feeWaiverTarget ?? 0
  const waiverProgress = waiverTarget > 0 ? Math.min(100, (anniversarySpent / waiverTarget) * 100) : 0
  const waiverGap = waiverTarget - anniversarySpent

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="size-5" />
            Credit Cards Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_220px_1fr]">
            <div className="grid gap-1.5">
              <Label>Year</Label>
              <Input type="number" value={year} onChange={(e) => setYear(Math.round(safeNumber(e.target.value)))} />
            </div>
            <div className="grid gap-1.5">
              <Label>View Scope</Label>
              <select
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={scope}
                onChange={(e) => setScope(e.target.value as "all" | "single")}
              >
                <option value="all">All Cards Together</option>
                <option value="single">One Card</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Add New Card</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Card name"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    addCreditCard(newCardName)
                    setNewCardName("")
                  }}
                >
                  <Plus className="mr-1 size-4" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button
          variant={creditSection === "tabular" ? "default" : "outline"}
          onClick={() => setCreditSection("tabular")}
        >
          Tabular View
        </Button>
        <Button
          variant={creditSection === "profiles" ? "default" : "outline"}
          onClick={() => setCreditSection("profiles")}
        >
          All Cards Info
        </Button>
      </div>

      {creditSection === "tabular" ? (
        scope === "all" ? (
        <div className="space-y-4">
          {activeCards.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="text-sm text-muted-foreground">
                  No active cards available. Mark at least one card as active from single-card view.
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <AllCardsTable
                year={year}
                cards={activeCards}
                yearData={creditCardDataByYear}
                field="cashback"
                onValueChange={setCreditCardMonthValue}
              />
              <AllCardsTable
                year={year}
                cards={activeCards}
                yearData={creditCardDataByYear}
                field="expenses"
                onValueChange={setCreditCardMonthValue}
              />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Monthly Cashback Total</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {MONTHS.map((month, i) => (
                      <div key={month} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{month}</span>
                        <span className="font-medium">{formatINR(monthSum("cashback", i + 1))}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                      <span>Yearly Total</span>
                      <span>{formatINR(yearlySum("cashback"))}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Monthly Expenses Total</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {MONTHS.map((month, i) => (
                      <div key={month} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{month}</span>
                        <span className="font-medium">{formatINR(monthSum("expenses", i + 1))}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                      <span>Yearly Total</span>
                      <span>{formatINR(yearlySum("expenses"))}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {creditCards.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="text-sm text-muted-foreground">
                  No cards added yet. Add a new card to begin tracking.
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <div className="grid gap-1.5">
                  <Label>Select Card</Label>
                  <select
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    value={selectedId}
                    onChange={(e) => setSelectedCardId(e.target.value)}
                  >
                    {creditCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Card Anniversary Start Month</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={selectedCard?.anniversaryStartMonth ?? 1}
                    onChange={(e) =>
                      selectedId &&
                      setCreditCardMeta(selectedId, {
                        anniversaryStartMonth: Math.round(safeNumber(e.target.value)),
                      })
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Fee Waiver Target (INR)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={selectedCard?.feeWaiverTarget ?? 0}
                    onChange={(e) =>
                      selectedId &&
                      setCreditCardMeta(selectedId, {
                        feeWaiverTarget: safeNumber(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Card Status</Label>
                  <select
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    value={selectedCard?.status ?? "active"}
                    onChange={(e) =>
                      selectedId &&
                      setCreditCardMeta(selectedId, {
                        status: e.target.value as "active" | "closed",
                      })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Delete Selected Card</Label>
                  <Button
                    variant="destructive"
                    disabled={!selectedId}
                    onClick={() => {
                      if (!selectedId) return
                      const nextCards = creditCards.filter((c) => c.id !== selectedId)
                      removeCreditCard(selectedId)
                      setSelectedCardId(nextCards[0]?.id ?? "")
                    }}
                  >
                    <Trash2 className="mr-1 size-4" />
                    Delete Card
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={singleView} onValueChange={(v) => setSingleView(v as "calendar" | "cardYear")}>
            <TabsList variant="line">
              <TabsTrigger value="calendar" className="gap-1.5">
                <CalendarRange className="size-4" />
                Calendar Year View
              </TabsTrigger>
              <TabsTrigger value="cardYear" className="gap-1.5">
                <IndianRupee className="size-4" />
                Card Anniversary Year View
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {selectedCard?.name} - {year} Calendar Year{" "}
                    {selectedCard?.status === "closed" ? (
                      <span className="text-sm text-amber-400">(Closed)</span>
                    ) : null}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Cashback</TableHead>
                        <TableHead>Expenses</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {MONTHS.map((month, idx) => {
                        const monthNum = idx + 1
                        const cashback = getCardMonthValue(creditCardDataByYear, year, selectedId, monthNum, "cashback")
                        const expenses = getCardMonthValue(creditCardDataByYear, year, selectedId, monthNum, "expenses")
                        return (
                          <TableRow key={month}>
                            <TableCell className="font-medium">{month}</TableCell>
                            <TableCell>
                              <MonthValueInput
                                value={cashback}
                                onChange={(value) =>
                                  setCreditCardMonthValue({
                                    year,
                                    cardId: selectedId,
                                    month: monthNum,
                                    field: "cashback",
                                    value,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <MonthValueInput
                                value={expenses}
                                onChange={(value) =>
                                  setCreditCardMonthValue({
                                    year,
                                    cardId: selectedId,
                                    month: monthNum,
                                    field: "expenses",
                                    value,
                                  })
                                }
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cardYear" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {selectedCard?.name} - Card Year Progress{" "}
                    {selectedCard?.status === "closed" ? (
                      <span className="text-sm text-amber-400">(Closed)</span>
                    ) : null}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Card-Year Expenses</div>
                      <div className="text-lg font-semibold">{formatINR(anniversarySpent)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Fee Waiver Target</div>
                      <div className="text-lg font-semibold">{formatINR(waiverTarget)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Current Calendar Year Expenses</div>
                      <div className="text-lg font-semibold">{formatINR(cardCalendarYearExpense)}</div>
                    </div>
                  </div>
                  <Progress value={waiverProgress} className="h-2" />
                  <div className={`text-sm font-medium ${waiverGap <= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                    {waiverGap <= 0
                      ? `Target achieved by ${formatINR(Math.abs(waiverGap))}`
                      : `Need ${formatINR(waiverGap)} more to waive renewal fee`}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Card-Year Monthly Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Billing Month</TableHead>
                        <TableHead>Cashback</TableHead>
                        <TableHead>Expenses</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cardAnniversaryRows.map((row) => (
                        <TableRow key={row.label}>
                          <TableCell className="font-medium">{row.label}</TableCell>
                          <TableCell>{formatINR(row.cashback)}</TableCell>
                          <TableCell>{formatINR(row.expense)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )) : (
        <Card className="border-border/60 bg-card/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Card Profiles</CardTitle>
            <div className="text-xs text-muted-foreground">
              Manage card metadata separately from monthly cashback/expense tables.
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {creditCards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-xl border border-border/60 bg-muted/15 p-3"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="size-4 text-muted-foreground" />
                      <div className="text-sm font-semibold">{card.name}</div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        card.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {card.status === "active" ? "Active" : "Closed"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label className="flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5 text-muted-foreground" />
                        Status
                      </Label>
                      <select
                        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
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
                      <Label className="flex items-center gap-1.5">
                        <IndianRupee className="size-3.5 text-muted-foreground" />
                        Annual Fee Type
                      </Label>
                      <select
                        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                        value={card.annualFeeType}
                        onChange={(e) =>
                          setCreditCardMeta(card.id, { annualFeeType: e.target.value as "ltf" | "paid" })
                        }
                      >
                        <option value="ltf">Lifetime Free (LTF)</option>
                        <option value="paid">Paid Annual Fee</option>
                      </select>
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="flex items-center gap-1.5">
                        <IndianRupee className="size-3.5 text-muted-foreground" />
                        Annual Fee Amount
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        disabled={card.annualFeeType === "ltf"}
                        value={card.annualFeeType === "ltf" ? 0 : card.annualFeeAmount}
                        onChange={(e) =>
                          setCreditCardMeta(card.id, { annualFeeAmount: safeNumber(e.target.value) })
                        }
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="flex items-center gap-1.5">
                        <IndianRupee className="size-3.5 text-muted-foreground" />
                        Fee Waiver Amount
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={card.feeWaiverTarget}
                        onChange={(e) =>
                          setCreditCardMeta(card.id, { feeWaiverTarget: safeNumber(e.target.value) })
                        }
                      />
                    </div>

                    <div className="grid gap-1.5 md:col-span-2">
                      <Label className="flex items-center gap-1.5">
                        <Wallet className="size-3.5 text-muted-foreground" />
                        Credit Limit
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={card.creditLimit}
                        onChange={(e) =>
                          setCreditCardMeta(card.id, { creditLimit: safeNumber(e.target.value) })
                        }
                      />
                    </div>

                    <div className="grid gap-1.5 md:col-span-2">
                      <Label className="flex items-center gap-1.5">
                        <StickyNote className="size-3.5 text-muted-foreground" />
                        Benefits / Usage Reminder
                      </Label>
                      <textarea
                        className="min-h-20 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        placeholder="Example: Use for utility bills, travel lounges, or online subscriptions."
                        value={card.benefitsNote}
                        onChange={(e) => setCreditCardMeta(card.id, { benefitsNote: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

