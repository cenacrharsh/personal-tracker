import { create } from "zustand"

import { repository, type ActivityKey, type TrackersData } from "@/data"
import { trackSave } from "@/store/useSyncStore"

const NO_ENTRIES: string[] = []

export type TrackersState = {
  // Keyed by tracker key — a new tracker needs no store change, just a new key.
  trackers: TrackersData
  loaded: boolean

  toggleDay: (activity: ActivityKey, date: string) => void
  isActiveDay: (activity: ActivityKey, date: string) => boolean
  datesInRange: (activity: ActivityKey, start: string, end: string) => string[]
  entriesFor: (activity: ActivityKey) => string[]

  hydrate: () => Promise<void>
}

export const useTrackersStore = create<TrackersState>()((set, get) => ({
  trackers: {},
  loaded: false,

  hydrate: async () => {
    const data = await repository.getTrackers()
    set({ trackers: data ?? {}, loaded: true })
  },

  toggleDay: (activity, date) =>
    set((s) => {
      const entries = s.trackers[activity]?.entries ?? NO_ENTRIES
      const next = entries.includes(date)
        ? entries.filter((d) => d !== date)
        : [...entries, date].sort()
      return { trackers: { ...s.trackers, [activity]: { entries: next } } }
    }),

  entriesFor: (activity) => get().trackers[activity]?.entries ?? NO_ENTRIES,

  isActiveDay: (activity, date) => get().entriesFor(activity).includes(date),

  datesInRange: (activity, start, end) =>
    get()
      .entriesFor(activity)
      .filter((d) => d >= start && d <= end),
}))

// Debounced auto-save
let saveTimer: ReturnType<typeof setTimeout> | null = null
let fingerprint = ""

useTrackersStore.subscribe((state) => {
  if (!state.loaded) return
  const fp = JSON.stringify(state.trackers)
  if (fp === fingerprint) return
  fingerprint = fp
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const s = useTrackersStore.getState()
    trackSave(
      () => repository.saveTrackers(s.trackers),
      () => {
        fingerprint = ""
      },
    )
  }, 400)
})
