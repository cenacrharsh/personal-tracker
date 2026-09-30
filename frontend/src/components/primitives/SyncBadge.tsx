import { useState } from "react"
import { Check, CloudOff, RefreshCw } from "lucide-react"

import { useSyncStore } from "@/store/useSyncStore"

// Persistent save-state indicator (sidebar footer on desktop, floating on mobile).
// `compact` (phones) floats over page content, so it is icon-only and the tick
// shows for a moment after each save rather than staying on top of the page.
export function SyncBadge({ compact = false }: { compact?: boolean }) {
  const status = useSyncStore((s) => s.status)

  // Counts arrivals at "saved", so each save replays the tick.
  const [prevStatus, setPrevStatus] = useState(status)
  const [savedCount, setSavedCount] = useState(0)
  if (status !== prevStatus) {
    setPrevStatus(status)
    if (status === "saved") setSavedCount((n) => n + 1)
  }

  if (status === "idle") return null

  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-medium text-rose-300">
        <CloudOff className="size-3.5" />
        Not saved
      </span>
    )
  }

  if (status === "saving") {
    return compact ? (
      <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted/80 text-muted-foreground shadow-sm backdrop-blur" aria-label="Saving">
        <RefreshCw className="size-3.5 animate-spin" />
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
        <RefreshCw className="size-3.5 animate-spin" />
        Saving…
      </span>
    )
  }

  if (compact) {
    return (
      <span
        key={savedCount}
        className="inline-flex size-7 animate-[save-tick_2s_ease-out_forwards] items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 shadow-sm backdrop-blur"
        aria-label="Saved"
      >
        <Check className="size-4" />
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      <Check className="size-3.5 text-emerald-400" />
      Saved
    </span>
  )
}
