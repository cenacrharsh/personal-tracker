import { create } from "zustand"

import { repository, type ActivityKey, type ActivityTracker, type TrackersData } from "@/data"
import { trackSave } from "@/store/useSyncStore"

const DEFAULT_TRACKERS: TrackersData = {
  gym: { entries: [] },
  badminton: { entries: [] },
}

export type TrackersState = {
  gym: ActivityTracker
  badminton: ActivityTracker
  loaded: boolean

  toggleDay: (activity: ActivityKey, date: string) => void
  isActiveDay: (activity: ActivityKey, date: string) => boolean
  datesInRange: (activity: ActivityKey, start: string, end: string) => string[]

  hydrate: () => Promise<void>
}

export const useTrackersStore = create<TrackersState>()((set, get) => ({
  gym: DEFAULT_TRACKERS.gym,
  badminton: DEFAULT_TRACKERS.badminton,
  loaded: false,

  hydrate: async () => {
    const data = await repository.getTrackers()
    set({
      gym: data?.gym ?? DEFAULT_TRACKERS.gym,
      badminton: data?.badminton ?? DEFAULT_TRACKERS.badminton,
      loaded: true,
    })
  },

  toggleDay: (activity, date) =>
    set((s) => {
      const entries = s[activity].entries
      const next = entries.includes(date)
        ? entries.filter((d) => d !== date)
        : [...entries, date].sort()
      return { [activity]: { entries: next } }
    }),

  isActiveDay: (activity, date) => get()[activity].entries.includes(date),

  datesInRange: (activity, start, end) =>
    get()[activity].entries.filter((d) => d >= start && d <= end),
}))

// Debounced auto-save
let saveTimer: ReturnType<typeof setTimeout> | null = null
let fingerprint = ""

useTrackersStore.subscribe((state) => {
  if (!state.loaded) return
  const fp = JSON.stringify({ gym: state.gym, badminton: state.badminton })
  if (fp === fingerprint) return
  fingerprint = fp
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const s = useTrackersStore.getState()
    trackSave(
      () => repository.saveTrackers({ gym: s.gym, badminton: s.badminton }),
      () => {
        fingerprint = ""
      },
    )
  }, 400)
})
