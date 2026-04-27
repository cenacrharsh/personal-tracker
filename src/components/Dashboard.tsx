import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

import { NumberInput } from "@/components/forms/NumberInput"
import { Charts } from "@/components/Charts"
import { formatINR } from "@/lib/money"
import {
  computeCurrentAllocationPercents,
  computeTargetAllocationPercents,
  computeTargetEmergencyFund,
  computeTotals,
  computeEmergencyFundDelta,
  type PortfolioInputs,
} from "@/lib/portfolioMath"
import { usePortfolioStore } from "@/store/usePortfolioStore"

function KpiCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string
  subtitle: string
}) {
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
      </CardContent>
    </Card>
  )
}

function formatDelta(delta: number) {
  const n = Number.isFinite(delta) ? delta : 0
  const sign = n >= 0 ? "+" : "-"
  return `${sign}₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`
}

export function Dashboard() {
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

    currentEmergencyFund: store.currentEmergencyFund,
  }

  const totals = computeTotals(inputs)
  const currentPercents = computeCurrentAllocationPercents(inputs)
  const targetPercents = computeTargetAllocationPercents(inputs)

  const targetEmergency = computeTargetEmergencyFund(store.monthlyIncome)
  const emergencyProgress = targetEmergency > 0 ? Math.min(100, (store.currentEmergencyFund / targetEmergency) * 100) : 0
  const delta = computeEmergencyFundDelta(store.currentEmergencyFund, store.monthlyIncome)

  const deltaText = formatDelta(delta)
  const deltaTone = delta >= 0 ? "text-emerald-400" : "text-amber-400"

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard
          title="Total Net Worth"
          value={formatINR(totals.totalPortfolioValue)}
          subtitle="Equity + Gold + Silver + Debt"
        />
        <KpiCard
          title="Current Equity Total"
          value={formatINR(totals.totalEquity)}
          subtitle="Brokerage equity + Mutual fund equity"
        />
        <KpiCard
          title="Current Debt Total"
          value={formatINR(totals.totalDebt)}
          subtitle="FD + RD + EPF/PPF"
        />
      </div>

      <Charts
        current={currentPercents}
        target={targetPercents}
        currentAmounts={{
          equity: totals.totalEquity,
          gold: totals.totalGold,
          silver: totals.totalSilver,
          debt: totals.totalDebt,
        }}
        portfolioValue={totals.totalPortfolioValue}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Emergency Fund (Shields)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/25 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Current</div>
                    <div className="text-lg font-semibold">{formatINR(store.currentEmergencyFund)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Target</div>
                    <div className="text-lg font-semibold">{formatINR(targetEmergency)}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <Progress value={emergencyProgress} />
                </div>

                <div className={`mt-3 text-sm font-medium ${deltaTone}`}>
                  {deltaText} vs target
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Update Current Emergency Fund</Label>
                <NumberInput
                  value={store.currentEmergencyFund}
                  onChange={(v) => store.setCurrentEmergencyFund(v)}
                  min={0}
                  step={500}
                  ariaLabel="Current emergency fund"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Life Insurance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Cover Amount (INR)</Label>
                  <NumberInput
                    value={store.lifeInsurance.coverAmount}
                    onChange={(v) => store.setLifeInsurance({ coverAmount: v })}
                    min={0}
                    step={5000}
                    ariaLabel="Life insurance cover amount"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Premium (INR)</Label>
                  <NumberInput
                    value={store.lifeInsurance.premium}
                    onChange={(v) => store.setLifeInsurance({ premium: v })}
                    min={0}
                    step={500}
                    ariaLabel="Life insurance premium"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Renewal Date</Label>
                  <Input
                    type="date"
                    value={store.lifeInsurance.renewalDate}
                    onChange={(e) => store.setLifeInsurance({ renewalDate: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Health Insurance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Cover Amount (INR)</Label>
                  <NumberInput
                    value={store.healthInsurance.coverAmount}
                    onChange={(v) => store.setHealthInsurance({ coverAmount: v })}
                    min={0}
                    step={5000}
                    ariaLabel="Health insurance cover amount"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Premium (INR)</Label>
                  <NumberInput
                    value={store.healthInsurance.premium}
                    onChange={(v) => store.setHealthInsurance({ premium: v })}
                    min={0}
                    step={500}
                    ariaLabel="Health insurance premium"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Renewal Date</Label>
                  <Input
                    type="date"
                    value={store.healthInsurance.renewalDate}
                    onChange={(e) => store.setHealthInsurance({ renewalDate: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

