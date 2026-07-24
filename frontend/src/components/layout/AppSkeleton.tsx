import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"

// App-shaped loading state. After a few seconds shows a hint about the
// backend cold start (free-tier server spins down when idle).
export function AppSkeleton() {
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowHint(true), 4000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-border/60 px-4 py-6 md:block">
          <div className="mb-8 flex items-center gap-2 px-2">
            <Skeleton className="size-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1240px] space-y-6 px-4 py-4 md:px-8 md:py-6">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-64 w-full rounded-3xl" />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <div
              className={`text-center text-xs text-muted-foreground transition-opacity duration-500 ${
                showHint ? "opacity-100" : "opacity-0"
              }`}
            >
              Waking up the server — first load can take a moment.
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
