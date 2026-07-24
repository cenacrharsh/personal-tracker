import { useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/forms/NumberInput"
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog"
import { usePortfolioStore } from "@/store/usePortfolioStore"
import { useAuthStore } from "@/store/useAuthStore"

export function SettingsPage() {
  const [resetOpen, setResetOpen] = useState(false)
  const {
    age,
    monthlyIncome,
    silverEnabled,
    lifeInsurance,
    healthInsurance,
    setAge,
    setMonthlyIncome,
    setSilverEnabled,
    setLifeInsurance,
    setHealthInsurance,
    reset,
  } = usePortfolioStore()

  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const onLogout = async () => {
    await logout()
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Profile, allocation rules, insurance and account.
        </p>
      </header>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{user?.name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">{user?.email ?? ""}</div>
          </div>
          <Button variant="outline" onClick={onLogout}>
            Log out
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Age (years)</Label>
            <NumberInput value={age} onChange={setAge} min={0} step={1} ariaLabel="Age" />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Monthly Income (INR)</Label>
            <NumberInput value={monthlyIncome} onChange={setMonthlyIncome} min={0} step={500} ariaLabel="Monthly income" />
          </div>
          <div className="flex items-end justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Silver Investments</Label>
              <div className="text-sm font-medium">Include silver in allocation</div>
            </div>
            <Switch
              checked={silverEnabled}
              onCheckedChange={setSilverEnabled}
              aria-label="Enable silver investments"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Life Insurance</CardTitle>
              <Switch
                checked={lifeInsurance.enabled}
                onCheckedChange={(v) => setLifeInsurance({ enabled: v })}
                aria-label="Enable life insurance"
              />
            </div>
          </CardHeader>
          {lifeInsurance.enabled ? (
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Cover Amount (INR)</Label>
                <NumberInput
                  value={lifeInsurance.coverAmount}
                  onChange={(v) => setLifeInsurance({ coverAmount: v })}
                  min={0}
                  step={50000}
                  ariaLabel="Life insurance cover"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Premium (INR)</Label>
                <NumberInput
                  value={lifeInsurance.premium}
                  onChange={(v) => setLifeInsurance({ premium: v })}
                  min={0}
                  step={500}
                  ariaLabel="Life insurance premium"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Renewal Date</Label>
                <Input
                  type="date"
                  value={lifeInsurance.renewalDate}
                  onChange={(e) => setLifeInsurance({ renewalDate: e.target.value })}
                />
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <p className="text-xs text-muted-foreground">Turned off — hidden from Overview and Bills.</p>
            </CardContent>
          )}
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Health Insurance</CardTitle>
              <Switch
                checked={healthInsurance.enabled}
                onCheckedChange={(v) => setHealthInsurance({ enabled: v })}
                aria-label="Enable health insurance"
              />
            </div>
          </CardHeader>
          {healthInsurance.enabled ? (
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Cover Amount (INR)</Label>
                <NumberInput
                  value={healthInsurance.coverAmount}
                  onChange={(v) => setHealthInsurance({ coverAmount: v })}
                  min={0}
                  step={50000}
                  ariaLabel="Health insurance cover"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Premium (INR)</Label>
                <NumberInput
                  value={healthInsurance.premium}
                  onChange={(v) => setHealthInsurance({ premium: v })}
                  min={0}
                  step={500}
                  ariaLabel="Health insurance premium"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Renewal Date</Label>
                <Input
                  type="date"
                  value={healthInsurance.renewalDate}
                  onChange={(e) => setHealthInsurance({ renewalDate: e.target.value })}
                />
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <p className="text-xs text-muted-foreground">Turned off — hidden from Overview and Bills.</p>
            </CardContent>
          )}
        </Card>
      </div>

      <Card className="rounded-2xl border-rose-500/30 bg-rose-500/5">
        <CardHeader>
          <CardTitle className="text-base text-rose-200">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Resets all portfolio inputs, credit-card data and snapshots. This cannot be undone.
          </p>
          <Button variant="destructive" onClick={() => setResetOpen(true)}>
            Reset all data
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset all data?"
        description="Erases all portfolio inputs, credit-card history, bills and snapshots from your account. This cannot be undone."
        confirmLabel="Reset everything"
        onConfirm={() => void reset()}
      />
    </div>
  )
}
