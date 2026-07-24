import { create } from "zustand"
import { toast } from "sonner"

import { repository, type VitalsReport } from "@/data"

type VitalsState = {
  reports: VitalsReport[] // sorted by date asc
  loaded: boolean

  hydrate: () => Promise<void>
  saveReport: (report: VitalsReport) => Promise<void>
  deleteReport: (date: string) => Promise<void>
}

function sortByDate(reports: VitalsReport[]): VitalsReport[] {
  return [...reports].sort((a, b) => a.date.localeCompare(b.date))
}

export const useVitalsStore = create<VitalsState>()((set, get) => ({
  reports: [],
  loaded: false,

  hydrate: async () => {
    const reports = await repository.listVitals()
    set({ reports: sortByDate(reports), loaded: true })
  },

  // Explicit save (not debounced) — reports are entered a few times a year in
  // one sitting, so a submit action with clear success/failure feedback fits
  // better than the auto-save pattern used elsewhere.
  saveReport: async (report) => {
    await repository.upsertVitalsReport(report)
    const existing = get().reports.filter((r) => r.date !== report.date)
    set({ reports: sortByDate([...existing, report]) })
    toast.success("Report saved")
  },

  deleteReport: async (date) => {
    await repository.deleteVitalsReport(date)
    set({ reports: get().reports.filter((r) => r.date !== date) })
    toast.success("Report deleted")
  },
}))
