import { useEffect, useState } from "react"

import { AppShell, type NavKey } from "@/components/layout/AppShell"
import { OverviewPage } from "@/components/pages/OverviewPage"
import { HoldingsPage } from "@/components/pages/HoldingsPage"
import { CardsPage } from "@/components/pages/CardsPage"
import { BillsPage } from "@/components/pages/BillsPage"
import { SettingsPage } from "@/components/pages/SettingsPage"
import { usePortfolioStore } from "@/store/usePortfolioStore"

export default function App() {
  const [active, setActive] = useState<NavKey>("overview")
  const hydrate = usePortfolioStore((s) => s.hydrate)
  const loaded = usePortfolioStore((s) => s.loaded)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  if (!loaded) {
    return (
      <div className="dark min-h-screen bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      </div>
    )
  }

  return (
    <AppShell active={active} onNavigate={setActive}>
      {active === "overview" ? <OverviewPage /> : null}
      {active === "holdings" ? <HoldingsPage /> : null}
      {active === "cards" ? <CardsPage /> : null}
      {active === "bills" ? <BillsPage /> : null}
      {active === "settings" ? <SettingsPage /> : null}
    </AppShell>
  )
}
