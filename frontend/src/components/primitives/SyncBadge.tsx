import { Check, CloudOff, RefreshCw } from "lucide-react"

import { useSyncStore } from "@/store/useSyncStore"

// Persistent save-state indicator (sidebar footer on desktop, floating on mobile).
export function SyncBadge() {
  const status = useSyncStore((s) => s.status)

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
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
        <RefreshCw className="size-3.5 animate-spin" />
        Saving…
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
