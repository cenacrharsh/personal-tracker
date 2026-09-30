import { useCallback, useEffect, useState } from "react"
import { Redirect, Route, Switch } from "wouter"

import { AppShell } from "@/components/layout/AppShell"
import { AppSkeleton } from "@/components/layout/AppSkeleton"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { OverviewPage } from "@/components/pages/OverviewPage"
import { HoldingsPage } from "@/components/pages/HoldingsPage"
import { CardsPage } from "@/components/pages/CardsPage"
import { BillsPage } from "@/components/pages/BillsPage"
import { SettingsPage } from "@/components/pages/SettingsPage"
import { TrackersPage } from "@/components/pages/TrackersPage"
import { VitalsPage } from "@/components/pages/VitalsPage"
import { TravelPage } from "@/components/pages/TravelPage"
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

  // Installed to a home screen there is no address bar, so a failed first load
  // would otherwise strand the user on the skeleton with no way to retry.
  const [loadFailed, setLoadFailed] = useState(false)

  const load = useCallback(
    () => Promise.all([hydrate(), hydrateVitals()]).catch(() => setLoadFailed(true)),
    [hydrate, hydrateVitals],
  )

  const retry = () => {
    setLoadFailed(false)
    void load()
  }

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (status === "authed") void load()
  }, [status, load])

  return (
    <>
      {status === "checking" ? (
        <AppSkeleton />
      ) : status === "anon" ? (
        <AuthPage />
      ) : loadFailed ? (
        <div className="flex min-h-dvh items-center justify-center px-6 text-center">
          <div className="space-y-3">
            <p className="text-sm font-medium">Couldn't reach the server</p>
            <p className="text-xs text-muted-foreground">
              It may still be waking up. Give it a moment, then try again.
            </p>
            <Button size="sm" onClick={retry}>
              Try again
            </Button>
          </div>
        </div>
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
            <Route path="/travel" component={TravelPage} />
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
