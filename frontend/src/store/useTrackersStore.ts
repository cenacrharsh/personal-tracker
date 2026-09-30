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
    set({ trackers: data, loaded: true })
  },

  toggleDay: (activity, date) => {
    // Until the saved days arrive, a tap would be overwritten by them.
    if (!get().loaded) return
    const marked = get().isActiveDay(activity, date)
    set((s) => {
      const entries = s.trackers[activity]?.entries ?? NO_ENTRIES
      const next = marked ? entries.filter((d) => d !== date) : [...entries, date].sort()
      return { trackers: { ...s.trackers, [activity]: { entries: next } } }
    })
    trackSave(`tracker:${activity}:${date}`, () =>
      marked ? repository.unmarkTrackerDay(activity, date) : repository.markTrackerDay(activity, date),
    )
  },

  entriesFor: (activity) => get().trackers[activity]?.entries ?? NO_ENTRIES,

  isActiveDay: (activity, date) => get().entriesFor(activity).includes(date),

  datesInRange: (activity, start, end) =>
    get()
      .entriesFor(activity)
      .filter((d) => d >= start && d <= end),
}))
