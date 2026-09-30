import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RingProgress } from "@/components/primitives/RingProgress"
import { useTravelStore } from "@/store/useTravelStore"
import type { VisitedCity } from "@/data/types"
import { INDIA_REGIONS, STATE_COUNT, UT_COUNT, regionByCode } from "@/lib/indiaRegions"
import { cityCountByState, visitedStateCodes } from "@/lib/travel"
import { TRAVEL_STATE_COLORS, TRAVEL_UNVISITED } from "@/lib/tokens"
import { IndiaMap } from "@/components/pages/travel/IndiaMap"
import { StateSheet } from "@/components/pages/travel/StateSheet"
import { AddCityDialog } from "@/components/pages/travel/AddCityDialog"
import { VisitedList } from "@/components/pages/travel/VisitedList"

const TOTAL_REGIONS = INDIA_REGIONS.length

export function TravelPage() {
  const states = useTravelStore((s) => s.states)
  const cities = useTravelStore((s) => s.cities)
  const loaded = useTravelStore((s) => s.loaded)
  const hydrate = useTravelStore((s) => s.hydrate)
  const markState = useTravelStore((s) => s.markState)
  const unmarkState = useTravelStore((s) => s.unmarkState)
  const saveCity = useTravelStore((s) => s.saveCity)
  const removeCity = useTravelStore((s) => s.removeCity)

  const [selected, setSelected] = useState<string | null>(null)
  // Open Add City dialog, optionally limited to one state.
  const [adding, setAdding] = useState<{ stateCode?: string } | null>(null)

  useEffect(() => {
    if (!loaded) hydrate().catch(() => toast.error("Couldn't load your travel map — reopen the page to retry"))
  }, [hydrate, loaded])

  const visited = useMemo(() => visitedStateCodes({ states, cities }), [states, cities])
  const cityCounts = useMemo(() => cityCountByState(cities), [cities])
  const addedIds = useMemo(() => new Set(cities.map((c) => c.id)), [cities])

  const statesVisited = INDIA_REGIONS.filter((r) => r.type === "state" && visited.has(r.code)).length
  const utsVisited = INDIA_REGIONS.filter((r) => r.type === "ut" && visited.has(r.code)).length

  const openAdd = (stateCode?: string) => {
    setSelected(null)
    setAdding({ stateCode })
  }

  const addCity = (city: VisitedCity) => {
    saveCity(city)
    toast.success(`Added ${city.name} · ${regionByCode[city.stateCode]?.name ?? city.stateCode}`)
  }

  const explored = Math.round(((statesVisited + utsVisited) / TOTAL_REGIONS) * 100)

  return (
    // Bottom room on phones so the floating add button never covers the last row.
    <div className="space-y-4 pb-20 md:space-y-6 lg:pb-0">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Travel</h1>
          <p className="text-sm text-muted-foreground">
            {!loaded
              ? "Loading your map…"
              : visited.size === 0
                ? "Tap a state or add a city to start"
                : "Tap a state, pinch to zoom"}
          </p>
        </div>
        <Button className="hidden lg:inline-flex" disabled={!loaded} onClick={() => openAdd()}>
          <Plus className="size-4" />
          Add city
        </Button>
      </header>

      {/* One compact summary instead of three tiles: it leaves the map room on a phone. */}
      <Card className="flex-row items-center gap-4 rounded-2xl border-border/60 bg-card/85 p-4 shadow-sm backdrop-blur md:gap-6 md:p-5">
        <RingProgress percent={explored} size={76} stroke={7} color="#0ea5e9">
          <span className="text-center leading-none">
            <span className="block text-lg font-semibold tracking-tight">{explored}%</span>
            <span className="text-[10px] text-muted-foreground">of India</span>
          </span>
        </RingProgress>
        <dl className="grid min-w-0 flex-1 grid-cols-3 gap-3 md:gap-6">
          {[
            { label: "States", value: statesVisited, total: STATE_COUNT },
            { label: "UTs", value: utsVisited, total: UT_COUNT },
            { label: "Cities", value: cities.length },
          ].map((s) => (
            <div key={s.label} className="min-w-0">
              <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{s.label}</dt>
              <dd className="mt-1 text-lg font-semibold tracking-tight md:text-2xl">
                {s.value}
                {s.total ? <span className="text-sm font-normal text-muted-foreground">/{s.total}</span> : null}
              </dd>
              {s.total ? (
                <Progress value={(s.value / s.total) * 100} className="mt-1.5 h-1" />
              ) : (
                <div className="mt-1.5 truncate text-[11px] text-muted-foreground">
                  {cityCounts.size === 0 ? "none yet" : `in ${cityCounts.size} ${cityCounts.size === 1 ? "state" : "states"}`}
                </div>
              )}
            </div>
          ))}
        </dl>
      </Card>

      {/* Phones: map, then the list. Wide screens: side by side. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start md:gap-6">
        <Card className="gap-3 rounded-2xl border-border/60 bg-card/85 p-2 shadow-sm backdrop-blur sm:p-4">
          <div className="mx-auto w-full max-w-[560px]">
            <IndiaMap
              visited={visited}
              cityCounts={cityCounts}
              cities={cities}
              selected={selected}
              onSelect={(code) => loaded && setSelected(code)}
            />
          </div>
          <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 px-2 pb-1 text-[11px] text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded-[3px]" style={{ background: TRAVEL_UNVISITED }} />
              Not visited
            </li>
            <li className="flex items-center gap-1.5">
              <span className="flex">
                {TRAVEL_STATE_COLORS.slice(0, 4).map((c) => (
                  <span key={c} className="-ml-1 size-3 rounded-[3px] ring-2 ring-card first:ml-0" style={{ background: c }} />
                ))}
              </span>
              Visited
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border-[1.5px] border-[#090e12] bg-[#f8fafc]" />
              City
            </li>
          </ul>
        </Card>

        {loaded ? (
          <section className="space-y-2 lg:sticky lg:top-6">
            <h2 className="px-1 text-sm font-medium text-muted-foreground">Your places</h2>
            <VisitedList visited={visited} cities={cities} onSelect={setSelected} />
          </section>
        ) : null}
      </div>

      {/* Phones: the add button sits in thumb reach, just above the bottom nav. */}
      <Button
        size="icon-lg"
        className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 size-14 rounded-full shadow-lg shadow-black/40 lg:hidden"
        data-floating-action
        disabled={!loaded}
        onClick={() => openAdd()}
        aria-label="Add city"
      >
        <Plus className="size-6" />
      </Button>

      <StateSheet
        code={selected}
        states={states}
        cities={cities}
        onOpenChange={(open) => !open && setSelected(null)}
        onMark={markState}
        onUnmark={unmarkState}
        onRemoveCity={removeCity}
        onRestoreCity={saveCity}
        onAddCity={openAdd}
      />

      {adding ? (
        <AddCityDialog
          initialStateCode={adding.stateCode}
          addedIds={addedIds}
          onOpenChange={(open) => !open && setAdding(null)}
          onAdd={addCity}
        />
      ) : null}
    </div>
  )
}
