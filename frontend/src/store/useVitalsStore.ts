import { create } from "zustand"
import { toast } from "sonner"

import { repository, type VitalsReport } from "@/data"

type VitalsState = {
  reports: VitalsReport[] // sorted by date asc
  loaded: boolean

  hydrate: () => Promise<void>
  saveReport: (report: VitalsReport, previousDate?: string) => Promise<void>
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
  // Reports are keyed by date, so editing the date moves the report: write it
  // under the new date, then remove the one under the old date.
  saveReport: async (report, previousDate) => {
    // The list is updated after each step, so it matches the server even if
    // the delete fails (saving again retries it).
    await repository.upsertVitalsReport(report)
    set({ reports: sortByDate([...get().reports.filter((r) => r.date !== report.date), report]) })
    if (previousDate && previousDate !== report.date) {
      await repository.deleteVitalsReport(previousDate)
      set({ reports: get().reports.filter((r) => r.date !== previousDate) })
    }
    toast.success("Report saved")
  },

  deleteReport: async (date) => {
    await repository.deleteVitalsReport(date)
    set({ reports: get().reports.filter((r) => r.date !== date) })
    toast.success("Report deleted")
  },
}))
