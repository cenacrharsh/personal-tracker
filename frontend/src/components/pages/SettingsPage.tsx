import { useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/forms/NumberInput"
import { usePortfolioStore } from "@/store/usePortfolioStore"
import { useAuthStore } from "@/store/useAuthStore"
import { importLocalData } from "@/lib/importLocalData"

export function SettingsPage() {
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

  const [importState, setImportState] = useState<"idle" | "busy" | "done" | "empty" | "error">("idle")

  const onImport = async () => {
    if (!confirm("Import data saved in this browser into your account? This overwrites your current account data.")) return
    setImportState("busy")
    try {
      const { imported } = await importLocalData()
      setImportState(imported ? "done" : "empty")
      if (imported) window.location.reload()
    } catch {
      setImportState("error")
    }
  }

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
          <CardTitle className="text-base">Import from this browser</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            If you used this app before signing in, your data was stored locally in this browser.
            Import it once to move it into your account.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onImport} disabled={importState === "busy"}>
              {importState === "busy" ? "Importing…" : "Import local data"}
            </Button>
            {importState === "empty" && (
              <span className="text-xs text-muted-foreground">No local data found in this browser.</span>
            )}
            {importState === "error" && (
              <span className="text-xs text-rose-400">Import failed. Is the backend running?</span>
            )}
          </div>
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
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Reset all data? This cannot be undone.")) void reset()
            }}
          >
            Reset all data
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
