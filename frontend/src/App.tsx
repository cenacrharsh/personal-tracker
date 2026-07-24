import { useEffect } from "react"
import { Redirect, Route, Switch } from "wouter"

import { AppShell } from "@/components/layout/AppShell"
import { AppSkeleton } from "@/components/layout/AppSkeleton"
import { Toaster } from "@/components/ui/sonner"
import { OverviewPage } from "@/components/pages/OverviewPage"
import { HoldingsPage } from "@/components/pages/HoldingsPage"
import { CardsPage } from "@/components/pages/CardsPage"
import { BillsPage } from "@/components/pages/BillsPage"
import { SettingsPage } from "@/components/pages/SettingsPage"
import { TrackersPage } from "@/components/pages/TrackersPage"
import { VitalsPage } from "@/components/pages/VitalsPage"
import { AuthPage } from "@/components/pages/AuthPage"
import { usePortfolioStore } from "@/store/usePortfolioStore"
import { useVitalsStore } from "@/store/useVitalsStore"
import { useAuthStore } from "@/store/useAuthStore"

export default function App() {
  const status = useAuthStore((s) => s.status)
  const checkAuth = useAuthStore((s) => s.checkAuth)

  const hydrate = usePortfolioStore((s) => s.hydrate)
  const loaded = usePortfolioStore((s) => s.loaded)
  const hydrateVitals = useVitalsStore((s) => s.hydrate)

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (status === "authed") {
      void hydrate()
      void hydrateVitals()
    }
  }, [status, hydrate, hydrateVitals])

  return (
    <>
      {status === "checking" ? (
        <AppSkeleton />
      ) : status === "anon" ? (
        <AuthPage />
      ) : !loaded ? (
        <AppSkeleton />
      ) : (
        <AppShell>
          <Switch>
            <Route path="/" component={OverviewPage} />
            <Route path="/holdings" component={HoldingsPage} />
            <Route path="/cards/:view?" component={CardsPage} />
            <Route path="/bills" component={BillsPage} />
            <Route path="/trackers" component={TrackersPage} />
            <Route path="/vitals" component={VitalsPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route>
              <Redirect to="/" />
            </Route>
          </Switch>
        </AppShell>
      )}
      <Toaster />
    </>
  )
}
