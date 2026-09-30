import { ChevronRight, MapPinned } from "lucide-react"

import { EmptyState } from "@/components/primitives/EmptyState"
import type { VisitedCity } from "@/data/types"
import { REGIONS_BY_NAME } from "@/lib/indiaRegions"
import { REGION_COLOR } from "@/components/pages/travel/regionColors"

// Visited states/UTs with their cities, alphabetical. Each row wears its map
// colour and opens the same sheet as tapping the state on the map.
export function VisitedList({
  visited,
  cities,
  onSelect,
}: {
  visited: Set<string>
  cities: VisitedCity[]
  onSelect: (code: string) => void
}) {
  const regions = REGIONS_BY_NAME.filter((r) => visited.has(r.code))

  if (regions.length === 0) {
    return (
      <EmptyState
        icon={<MapPinned />}
        title="No places yet"
        hint="Tap a state on the map to mark it, or add a city — its state fills in on its own."
      />
    )
  }

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card/85 shadow-sm backdrop-blur">
      {regions.map((r) => {
        const here = cities.filter((c) => c.stateCode === r.code)
        return (
          <li key={r.code}>
            <button
              type="button"
              onClick={() => onSelect(r.code)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 active:bg-muted/60"
            >
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: REGION_COLOR[r.code] }} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium">{r.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {here.length > 0 ? `${here.length} ${here.length === 1 ? "city" : "cities"}` : r.type === "ut" ? "UT" : "State"}
                  </span>
                </span>
                {here.length > 0 ? (
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {here.map((c) => (
                      <span key={c.id} className="rounded-full bg-muted/70 px-2 py-0.5 text-xs text-foreground/85">
                        {c.name}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
