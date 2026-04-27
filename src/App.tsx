import { InputPanel } from "@/components/InputPanel"
import { Dashboard } from "@/components/Dashboard"
import { CreditCardsDashboard } from "@/components/CreditCardsDashboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function App() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute -right-24 top-24 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute left-1/2 top-[55%] h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1200px] space-y-4 p-4 md:p-6">
        <header className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xl font-semibold tracking-tight md:text-2xl">Portfolio Tracker</div>
            <div className="text-sm text-muted-foreground">
              Allocation analytics + yearly credit card tracker (client-side only)
            </div>
          </div>
        </header>

        <Tabs defaultValue="portfolio">
          <TabsList>
            <TabsTrigger value="portfolio">Portfolio Allocation</TabsTrigger>
            <TabsTrigger value="cards">Credit Cards</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="mt-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
              <aside className="lg:sticky lg:top-6">
                <InputPanel />
              </aside>
              <main className="min-w-0">
                <Dashboard />
              </main>
            </div>
          </TabsContent>

          <TabsContent value="cards" className="mt-4">
            <CreditCardsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
