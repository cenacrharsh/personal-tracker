import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Check, ChevronLeft, Globe, MapPin, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { VisitedCity } from "@/data/types"
import { REGIONS_BY_NAME, regionByCode } from "@/lib/indiaRegions"
import { searchPlacesOnline, type OnlinePlace } from "@/lib/placeSearch"
import {
  buildCityIndex,
  cityIdFromRow,
  formatPopulation,
  searchCities,
  type CityIndexEntry,
  type CityRow,
} from "@/lib/travel"

// ~300 KB, so it loads the first time the dialog opens rather than with the page.
let cityIndex: Promise<CityIndexEntry[]> | null = null
function loadCityIndex() {
  cityIndex ??= import("@/data/geo/india-cities.json")
    .then((m) => buildCityIndex(m.default as unknown as CityRow[]))
    .catch((err: unknown) => {
      cityIndex = null // let the next open retry
      throw err
    })
  return cityIndex
}

// A place from either source, ready to confirm.
type Candidate = VisitedCity & { detail: string }

const regionName = (code: string) => regionByCode[code]?.name ?? ""

const fromRow = (row: CityRow): Candidate => ({
  id: cityIdFromRow(row),
  name: row[1],
  stateCode: row[2],
  lat: row[3],
  lng: row[4],
  detail: `${regionName(row[2])} · ${formatPopulation(row[5])}`,
})

const fromOnline = (p: OnlinePlace): Candidate => ({
  id: p.id,
  name: p.name,
  stateCode: p.stateCode,
  lat: p.lat,
  lng: p.lng,
  detail: p.context || regionName(p.stateCode) || "India",
})

type OnlineSearch = { query: string; status: "loading" | "done" | "error"; places: OnlinePlace[] }

function ResultList({
  candidates,
  addedIds,
  onPick,
}: {
  candidates: Candidate[]
  addedIds: Set<string>
  onPick: (c: Candidate) => void
}) {
  return (
    <ul className="space-y-1">
      {candidates.map((c) => {
        const added = addedIds.has(c.id)
        return (
          <li key={c.id}>
            <button
              type="button"
              disabled={added}
              onClick={() => onPick(c)}
              className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60 active:bg-muted disabled:opacity-60"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <MapPin className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{c.detail}</span>
              </span>
              {added ? (
                <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-300">
                  <Check className="size-3.5" /> Added
                </span>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function AddCityDialog({
  initialStateCode,
  addedIds,
  onOpenChange,
  onAdd,
}: {
  initialStateCode?: string
  addedIds: Set<string>
  onOpenChange: (open: boolean) => void
  onAdd: (city: VisitedCity) => void
}) {
  const [index, setIndex] = useState<CityIndexEntry[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [query, setQuery] = useState("")
  const [stateFilter, setStateFilter] = useState(initialStateCode)
  const [online, setOnline] = useState<OnlineSearch | null>(null)
  const [picked, setPicked] = useState<Candidate | null>(null)
  const [pickedState, setPickedState] = useState("")

  useEffect(() => {
    let cancelled = false
    loadCityIndex().then(
      (i) => !cancelled && setIndex(i),
      () => !cancelled && setLoadFailed(true),
    )
    return () => {
      cancelled = true
    }
  }, [])

  const results = useMemo(
    () => (index ? searchCities(index, query, { stateCode: stateFilter }).map(fromRow) : []),
    [index, query, stateFilter],
  )

  const filterName = stateFilter ? regionName(stateFilter) : undefined
  const trimmed = query.trim()
  // Naming the state helps online search when the dialog is limited to one.
  const onlineQuery = filterName ? `${trimmed}, ${filterName}` : trimmed
  const canSearchOnline = trimmed.length >= 2
  const onlineShown = online && online.query === onlineQuery ? online : null

  // Only ever on an explicit tap or Enter: the free service forbids search-as-you-type.
  const searchOnline = () => {
    if (!canSearchOnline || onlineShown?.status === "loading") return
    const q = onlineQuery
    setOnline({ query: q, status: "loading", places: [] })
    searchPlacesOnline(q).then(
      (places) => setOnline((o) => (o?.query === q ? { query: q, status: "done", places } : o)),
      () => setOnline((o) => (o?.query === q ? { query: q, status: "error", places: [] } : o)),
    )
  }

  const pick = (c: Candidate) => {
    setPicked(c)
    setPickedState(c.stateCode)
  }

  // The keyboard's search key takes the top match, or looks online if none.
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const top = results.find((c) => !addedIds.has(c.id))
    if (top) pick(top)
    else if (results.length === 0) searchOnline()
  }

  const add = () => {
    if (!picked || !pickedState) return
    onAdd({ id: picked.id, name: picked.name, stateCode: pickedState, lat: picked.lat, lng: picked.lng })
    onOpenChange(false)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      {/* Anchored near the top on phones so the keyboard doesn't cover the results. */}
      <DialogContent className="top-[calc(env(safe-area-inset-top)+0.75rem)] flex max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top))] translate-y-0 flex-col gap-3 sm:top-[12vh] sm:max-h-[76vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{picked ? "Add city" : "Where did you go?"}</DialogTitle>
          <DialogDescription className="sr-only">Search for a city in India to add it to your map.</DialogDescription>
        </DialogHeader>

        {picked ? (
          <div className="space-y-4">
            <div>
              <div className="text-xl font-semibold">{picked.name}</div>
              <div className="text-xs text-muted-foreground">{picked.detail}</div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">State / UT</span>
              {/* Native select: the phone's own picker is the easiest way through 36 names. */}
              <select
                value={pickedState}
                onChange={(e) => setPickedState(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-input/30 px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {pickedState ? null : (
                  <option value="" disabled>
                    Choose a state / UT
                  </option>
                )}
                {REGIONS_BY_NAME.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
              <span className="block text-xs text-muted-foreground">
                {picked.stateCode
                  ? "Filled in automatically — change it if it's wrong."
                  : "Couldn't tell which state this is in — pick it here."}
              </span>
            </label>
            <div className="flex gap-2">
              <Button variant="outline" size="lg" className="h-11 flex-1" onClick={() => setPicked(null)}>
                <ChevronLeft className="size-4" />
                Back
              </Button>
              <Button size="lg" className="h-11 flex-[2]" onClick={add} disabled={!pickedState}>
                Add to map
              </Button>
            </div>
          </div>
        ) : (
          <>
            <form className="relative" onSubmit={submit}>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cities, e.g. Hampi"
                className="h-11 pl-9 text-base"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
                aria-label="Search cities"
              />
            </form>

            {filterName ? (
              <div className="flex">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-3 text-xs">
                  In {filterName}
                  <button
                    type="button"
                    onClick={() => setStateFilter(undefined)}
                    className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-background/60 hover:text-foreground"
                    aria-label="Search all of India"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              </div>
            ) : null}

            <div className="-mx-1 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1">
              {loadFailed ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Couldn't load the city list. Check your connection and reopen this.
                </p>
              ) : !index ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : results.length > 0 ? (
                <ResultList candidates={results} addedIds={addedIds} onPick={pick} />
              ) : (
                <p className="pt-4 text-center text-sm text-muted-foreground">
                  {trimmed
                    ? `"${trimmed}" isn't in the city list${filterName ? ` for ${filterName}` : ""}`
                    : "Start typing a city name"}
                </p>
              )}

              {canSearchOnline ? (
                <div className="space-y-2 border-t border-border/60 pt-3">
                  {!onlineShown ? (
                    <Button variant="outline" size="lg" className="h-11 w-full" onClick={searchOnline}>
                      <Globe className="size-4" />
                      {results.length > 0 ? "Not here? Search online" : `Search online for "${trimmed}"`}
                    </Button>
                  ) : onlineShown.status === "loading" ? (
                    <div className="space-y-2" aria-label="Searching online">
                      {[0, 1].map((i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : onlineShown.status === "error" ? (
                    <div className="space-y-2 text-center">
                      <p className="text-sm text-muted-foreground">Online search needs a connection.</p>
                      <Button variant="outline" size="sm" onClick={searchOnline}>
                        Try again
                      </Button>
                    </div>
                  ) : onlineShown.places.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">Nothing found online either.</p>
                  ) : (
                    <>
                      <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                        From OpenStreetMap
                      </div>
                      <ResultList candidates={onlineShown.places.map(fromOnline)} addedIds={addedIds} onPick={pick} />
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <p className="text-[11px] text-muted-foreground">
              City data © GeoNames (CC BY 4.0)
              {onlineShown?.status === "done" ? " · Search results © OpenStreetMap contributors" : ""}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
