import { create } from "zustand"
import { toast } from "sonner"

export type SyncStatus = "idle" | "saving" | "saved" | "error"

type SyncState = {
  status: SyncStatus
  lastError: string | null

  beginSave: () => void
  saveOk: () => void
  saveFailed: (message: string) => void
}

export const useSyncStore = create<SyncState>()((set, get) => ({
  status: "idle",
  lastError: null,

  beginSave: () => set({ status: "saving" }),

  saveOk: () => {
    const wasError = get().status === "error"
    set({ status: "saved", lastError: null })
    if (wasError) toast.success("Back online — changes saved")
  },

  saveFailed: (message) => {
    const wasError = get().status === "error"
    set({ status: "error", lastError: message })
    if (!wasError) toast.error("Couldn't save changes — will retry on your next edit")
  },
}))

// Wrap a repository save so sync status (badge + toasts) tracks it.
// onError lets the caller invalidate its fingerprint so the next edit retries.
export function trackSave(save: () => Promise<void>, onError?: () => void): void {
  const sync = useSyncStore.getState()
  sync.beginSave()
  save()
    .then(() => useSyncStore.getState().saveOk())
    .catch((e: unknown) => {
      useSyncStore.getState().saveFailed(e instanceof Error ? e.message : "Save failed")
      onError?.()
    })
}
