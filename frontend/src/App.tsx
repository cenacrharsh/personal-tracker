import { useEffect, useState } from "react"

import { AppShell, type NavKey } from "@/components/layout/AppShell"
import { OverviewPage } from "@/components/pages/OverviewPage"
import { HoldingsPage } from "@/components/pages/HoldingsPage"
import { CardsPage } from "@/components/pages/CardsPage"
import { BillsPage } from "@/components/pages/BillsPage"
import { SettingsPage } from "@/components/pages/SettingsPage"
import { TrackersPage } from "@/components/pages/TrackersPage"
import { AuthPage } from "@/components/pages/AuthPage"
import { usePortfolioStore } from "@/store/usePortfolioStore"
import { useAuthStore } from "@/store/useAuthStore"

function FullScreenMessage({ text }: { text: string }) {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">{text}</div>
      </div>
    </div>
  )
}

export default function App() {
  const [active, setActive] = useState<NavKey>("overview")

  const status = useAuthStore((s) => s.status)
  const checkAuth = useAuthStore((s) => s.checkAuth)

  const hydrate = usePortfolioStore((s) => s.hydrate)
  const loaded = usePortfolioStore((s) => s.loaded)

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (status === "authed") void hydrate()
  }, [status, hydrate])

  if (status === "checking") return <FullScreenMessage text="Loading…" />
  if (status === "anon") return <AuthPage />
  if (!loaded) return <FullScreenMessage text="Loading…" />

  return (
    <AppShell active={active} onNavigate={setActive}>
      {active === "overview" ? <OverviewPage /> : null}
      {active === "holdings" ? <HoldingsPage /> : null}
      {active === "cards" ? <CardsPage /> : null}
      {active === "bills" ? <BillsPage /> : null}
      {active === "trackers" ? <TrackersPage /> : null}
      {active === "settings" ? <SettingsPage /> : null}
    </AppShell>
  )
}
