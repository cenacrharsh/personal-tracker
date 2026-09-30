import { useState } from "react"
import { MapPin, Plus, Undo2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog"
import type { VisitedCity } from "@/data/types"
import { regionByCode } from "@/lib/indiaRegions"

// Details for one state/UT. A bottom sheet on phones, a centred dialog above.
export function StateSheet({
  code,
  states,
  cities: allCities,
  onOpenChange,
  onMark,
  onUnmark,
  onRemoveCity,
  onRestoreCity,
  onAddCity,
}: {
  code: string | null
  states: string[]
  cities: VisitedCity[]
  onOpenChange: (open: boolean) => void
  onMark: (code: string) => void
  onUnmark: (code: string) => void
  onRemoveCity: (id: string) => void
  onRestoreCity: (city: VisitedCity) => void
  onAddCity: (code: string) => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Keep showing the last state while the sheet animates closed.
  const [shown, setShown] = useState(code)
  if (code && code !== shown) setShown(code)
  // The last city removed here, for a one-tap undo. Inline rather than a
  // toast: the open sheet would block taps on a toast.
  const [removed, setRemoved] = useState<VisitedCity | null>(null)
  if (removed && removed.stateCode !== code) setRemoved(null)
  const region = shown ? regionByCode[shown] : undefined
  const marked = shown ? states.includes(shown) : false
  const cities = allCities.filter((c) => c.stateCode === shown)
  const visited = marked || cities.length > 0
  const cityWord = cities.length === 1 ? "city" : "cities"

  const toggle = (on: boolean) => {
    if (!shown) return
    if (on) onMark(shown)
    else if (cities.length > 0) setConfirmOpen(true)
    else onUnmark(shown)
  }

  return (
    <>
      <Dialog open={!!code} onOpenChange={onOpenChange}>
        <DialogContent className="top-auto bottom-0 max-w-full translate-y-0 rounded-b-none pb-[calc(1rem+env(safe-area-inset-bottom))] data-open:slide-in-from-bottom-4 sm:top-1/2 sm:bottom-auto sm:max-w-sm sm:-translate-y-1/2 sm:rounded-b-xl sm:pb-4">
          <DialogHeader>
            <DialogTitle className="pr-8 text-lg leading-tight">{region?.name}</DialogTitle>
            <DialogDescription>
              {region?.type === "ut" ? "Union territory" : "State"}
              {cities.length > 0 ? ` · ${cities.length} ${cityWord} visited` : ""}
            </DialogDescription>
          </DialogHeader>

          <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2">
            <span>
              <span className="block font-medium">Visited</span>
              {visited && !marked ? (
                <span className="block text-xs text-muted-foreground">Marked because you added cities here</span>
              ) : null}
            </span>
            <Switch checked={visited} onCheckedChange={toggle} aria-label={`Visited ${region?.name ?? ""}`} />
          </label>

          {cities.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label={`Cities visited in ${region?.name ?? ""}`}>
              {cities.map((c) => (
                <li
                  key={c.id}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 py-1 pr-1 pl-2.5 text-sm text-emerald-200"
                >
                  <MapPin className="size-3.5" />
                  {c.name}
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveCity(c.id)
                      setRemoved(c)
                    }}
                    className="flex size-7 items-center justify-center rounded-full text-emerald-200/70 hover:bg-emerald-500/20 hover:text-emerald-100"
                    aria-label={`Remove ${c.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {removed ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 py-1 pr-1 pl-3 text-sm">
              <span className="min-w-0 truncate text-muted-foreground">Removed {removed.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => {
                  onRestoreCity(removed)
                  setRemoved(null)
                }}
              >
                <Undo2 className="size-4" />
                Undo
              </Button>
            </div>
          ) : null}

          <Button size="lg" className="h-11 w-full" onClick={() => shown && onAddCity(shown)}>
            <Plus className="size-4" />
            Add a city in {region?.name}
          </Button>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Mark ${region?.name ?? ""} as not visited?`}
        description={`This also removes the ${cities.length} ${cityWord} you added there.`}
        confirmLabel="Remove"
        onConfirm={() => shown && onUnmark(shown)}
      />
    </>
  )
}
