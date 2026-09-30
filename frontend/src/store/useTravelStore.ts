import { create } from "zustand"

import { repository, type VisitedCity } from "@/data"
import { trackSave } from "@/store/useSyncStore"

type TravelState = {
  states: string[] // marked directly; see lib/travel.ts for "visited"
  cities: VisitedCity[]
  loaded: boolean

  hydrate: () => Promise<void>
  markState: (code: string) => void
  // Also removes the state's cities, which would otherwise keep it visited.
  unmarkState: (code: string) => void
  saveCity: (city: VisitedCity) => void
  removeCity: (id: string) => void
}

// Saves are optimistic like the activity trackers: the map updates on tap and
// the sync badge reports the request. All travel saves share one queue so an
// unmark can't overtake a city save still in flight.
const QUEUE = "travel"

export const useTravelStore = create<TravelState>()((set, get) => ({
  states: [],
  cities: [],
  loaded: false,

  hydrate: async () => {
    const data = await repository.getTravel()
    set({ states: data.states, cities: data.cities, loaded: true })
  },

  markState: (code) => {
    // Until the saved data arrives, a tap would be overwritten by it.
    if (!get().loaded || get().states.includes(code)) return
    set((s) => ({ states: [...s.states, code] }))
    trackSave(`travel:state:${code}`, () => repository.markTravelState(code), QUEUE)
  },

  unmarkState: (code) => {
    if (!get().loaded) return
    set((s) => ({
      states: s.states.filter((c) => c !== code),
      cities: s.cities.filter((c) => c.stateCode !== code),
    }))
    trackSave(`travel:state:${code}`, () => repository.unmarkTravelState(code), QUEUE)
  },

  saveCity: (city) => {
    if (!get().loaded) return
    set((s) => ({
      cities: [...s.cities.filter((c) => c.id !== city.id), city].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    trackSave(`travel:city:${city.id}`, () => repository.saveTravelCity(city), QUEUE)
  },

  removeCity: (id) => {
    if (!get().loaded) return
    set((s) => ({ cities: s.cities.filter((c) => c.id !== id) }))
    trackSave(`travel:city:${id}`, () => repository.deleteTravelCity(id), QUEUE)
  },
}))
