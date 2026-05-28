import type { ReactNode } from "react"
import { CreditCard, LayoutDashboard, ListChecks, Settings, Wallet } from "lucide-react"

export type NavKey = "overview" | "holdings" | "cards" | "bills" | "settings"

const NAV: { key: NavKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "holdings", label: "Holdings", icon: Wallet },
  { key: "cards", label: "Cards", icon: CreditCard },
  { key: "bills", label: "Bills", icon: ListChecks },
  { key: "settings", label: "Settings", icon: Settings },
]

export function AppShell({
  active,
  onNavigate,
  children,
}: {
  active: NavKey
  onNavigate: (key: NavKey) => void
  children: ReactNode
}) {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-40">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
      </div>

      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-sidebar/60 px-4 py-6 backdrop-blur md:block">
          <div className="mb-8 flex items-center gap-2 px-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-500 text-sm font-bold text-white">
              P
            </div>
            <div>
              <div className="text-sm font-semibold">Portfolio</div>
              <div className="text-[11px] text-muted-foreground">Personal wealth</div>
            </div>
          </div>

          <nav className="space-y-1">
            {NAV.map(({ key, label, icon: Icon }) => {
              const isActive = key === active
              return (
                <button
                  key={key}
                  onClick={() => onNavigate(key)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                  {isActive ? (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  ) : null}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 pb-24 md:pb-6">
          <div className="mx-auto max-w-[1240px] px-4 py-4 md:px-8 md:py-6">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/85 backdrop-blur-md md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ key, label, icon: Icon }) => {
            const isActive = key === active
            return (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                  isActive ? "text-indigo-300" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
