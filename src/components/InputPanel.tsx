import type { ReactNode } from "react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"

import { NumberInput } from "@/components/forms/NumberInput"
import { usePortfolioStore } from "@/store/usePortfolioStore"

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

export function InputPanel() {
  const {
    age,
    monthlyIncome,
    silverEnabled,
    currentEmergencyFund,
    setAge,
    setMonthlyIncome,
    setSilverEnabled,

    zerodhaTotal,
    zerodhaGoldEtf,
    zerodhaSilverEtf,
    setZerodhaTotal,
    setZerodhaGoldEtf,
    setZerodhaSilverEtf,

    mfTotal,
    mfGold,
    mfSilver,
    setMfTotal,
    setMfGold,
    setMfSilver,

    fdAmount,
    rdAmount,
    epfPpfAmount,
    setFdAmount,
    setRdAmount,
    setEpfPpfAmount,

    reset,
  } = usePortfolioStore()

  const targetEmergency = monthlyIncome * 6
  const emergencyProgress = targetEmergency > 0 ? Math.min(100, (currentEmergencyFund / targetEmergency) * 100) : 0

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Global Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Field label="Age (years)">
              <NumberInput
                value={age}
                onChange={setAge}
                min={0}
                step={1}
                ariaLabel="Age"
              />
            </Field>

            <Field label="Monthly Income (INR)">
              <NumberInput
                value={monthlyIncome}
                onChange={setMonthlyIncome}
                min={0}
                step={500}
                ariaLabel="Monthly income"
              />
            </Field>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
              <div className="space-y-0.5">
                <Label className="text-xs text-muted-foreground">Enable Silver Investments</Label>
                <div className="text-sm font-medium">Silver allocation + inputs</div>
              </div>
              <Switch
                checked={silverEnabled}
                onCheckedChange={(checked) => setSilverEnabled(checked)}
                aria-label="Enable silver investments"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Emergency Fund Target</div>
                <div className="text-sm font-medium">6 x Monthly Income</div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                Target: ₹{Math.round(targetEmergency).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="mt-2">
              <Progress value={emergencyProgress} />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button variant="outline" onClick={reset} className="w-full">
              Reset All
            </Button>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible defaultValue="brokerage" className="w-full">
        <AccordionItem value="brokerage">
          <AccordionTrigger className="px-1">Brokerage (Zerodha)</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4">
              <Field label="Total Invested (INR)">
                <NumberInput value={zerodhaTotal} onChange={setZerodhaTotal} min={0} ariaLabel="Zerodha total" />
              </Field>

              <Field label="Gold ETFs (INR)">
                <NumberInput value={zerodhaGoldEtf} onChange={setZerodhaGoldEtf} min={0} ariaLabel="Zerodha gold ETFs" />
              </Field>

              {silverEnabled ? (
                <Field label="Silver ETFs (INR)">
                  <NumberInput
                    value={zerodhaSilverEtf}
                    onChange={setZerodhaSilverEtf}
                    min={0}
                    ariaLabel="Zerodha silver ETFs"
                  />
                </Field>
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="mutual-funds">
          <AccordionTrigger className="px-1">Mutual Funds</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4">
              <Field label="Total Invested (INR)">
                <NumberInput value={mfTotal} onChange={setMfTotal} min={0} ariaLabel="MF total" />
              </Field>

              <Field label="Gold MFs (INR)">
                <NumberInput value={mfGold} onChange={setMfGold} min={0} ariaLabel="MF gold" />
              </Field>

              {silverEnabled ? (
                <Field label="Silver MFs (INR)">
                  <NumberInput value={mfSilver} onChange={setMfSilver} min={0} ariaLabel="MF silver" />
                </Field>
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="debt">
          <AccordionTrigger className="px-1">Debt</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4">
              <Field label="FD Amount (INR)">
                <NumberInput value={fdAmount} onChange={setFdAmount} min={0} ariaLabel="FD amount" step={500} />
              </Field>

              <Field label="RD Amount (INR)">
                <NumberInput value={rdAmount} onChange={setRdAmount} min={0} ariaLabel="RD amount" step={500} />
              </Field>

              <Field label="EPF/PPF Amount (INR)">
                <NumberInput
                  value={epfPpfAmount}
                  onChange={setEpfPpfAmount}
                  min={0}
                  ariaLabel="EPF/PPF amount"
                  step={500}
                />
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Extra spacer so main dashboard doesn't visually clash on small screens */}
      <div className="h-2" />
    </div>
  )
}

