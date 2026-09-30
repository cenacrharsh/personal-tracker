import { useState } from "react"
import { CreditCard as CreditCardIcon, Plus, Trash2, X } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/forms/NumberInput"
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog"
import type { CreditCardConfig } from "@/data"

export function ProfilesView({
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
  const [cardPendingDelete, setCardPendingDelete] = useState<CreditCardConfig | null>(null)
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
                <div className="flex min-w-0 flex-wrap items-center gap-2">
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
                  onClick={() => setCardPendingDelete(card)}
                  className="relative touch-target text-muted-foreground transition hover:text-rose-300 pointer-coarse:-m-2 pointer-coarse:flex pointer-coarse:size-9 pointer-coarse:shrink-0 pointer-coarse:items-center pointer-coarse:justify-center"
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
                  className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-base pointer-coarse:h-12 md:pointer-fine:text-sm"
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
                  className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-base pointer-coarse:h-12 md:pointer-fine:text-sm"
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
                  className="min-h-16 rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none md:pointer-fine:text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
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

      <ConfirmDialog
        open={cardPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setCardPendingDelete(null)
        }}
        title={cardPendingDelete ? `Delete ${cardPendingDelete.name}?` : "Delete card?"}
        description="Removes this card and all of its monthly cashback and spend history. This can't be undone."
        onConfirm={() => {
          if (cardPendingDelete) removeCreditCard(cardPendingDelete.id)
        }}
      />
    </div>
  )
}
