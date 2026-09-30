import { api } from "./api"
import type {
  BillsData,
  CreditCardConfig,
  CreditCardsData,
  InsuranceDetails,
  PortfolioData,
  Snapshot,
  TrackersData,
  VitalsReport,
} from "./types"

// Only the fields that changed; insurance can change one sub-field at a time.
export type PortfolioPatch = Partial<Omit<PortfolioData, "lifeInsurance" | "healthInsurance">> & {
  lifeInsurance?: Partial<InsuranceDetails>
  healthInsurance?: Partial<InsuranceDetails>
}

export type BillKind = "card" | "insurance"

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
})

// Every write changes exactly one item on the server, never a whole collection.
export const repository = {
  getPortfolio: () => api<PortfolioData>("/portfolio"),
  updatePortfolio: (patch: PortfolioPatch) => api<void>("/portfolio", json("PATCH", patch)),

  getCreditCards: () => api<CreditCardsData>("/cards"),
  createCard: (card: CreditCardConfig) => api<void>("/cards", json("POST", card)),
  updateCard: (id: string, patch: Partial<Omit<CreditCardConfig, "id">>) =>
    api<void>(`/cards/${encodeURIComponent(id)}`, json("PATCH", patch)),
  deleteCard: (id: string) => api<void>(`/cards/${encodeURIComponent(id)}`, json("DELETE")),
  setCardMonthValue: (
    id: string,
    cell: { year: number; month: number; field: "cashback" | "expenses"; value: number },
  ) => api<void>(`/cards/${encodeURIComponent(id)}/months`, json("PUT", cell)),

  listSnapshots: () => api<Snapshot[]>("/snapshots"),
  upsertSnapshot: (snapshot: Snapshot) => api<void>("/snapshots", json("POST", snapshot)),

  getBills: () => api<BillsData>("/bills"),
  markBillPaid: (kind: BillKind, key: string, paidAt: number) =>
    api<void>(`/bills/${kind}/${encodeURIComponent(key)}`, json("PUT", { paidAt })),
  markBillUnpaid: (kind: BillKind, key: string) =>
    api<void>(`/bills/${kind}/${encodeURIComponent(key)}`, json("DELETE")),

  getTrackers: () => api<TrackersData>("/trackers"),
  markTrackerDay: (key: string, date: string) =>
    api<void>(`/trackers/${encodeURIComponent(key)}/${date}`, json("PUT")),
  unmarkTrackerDay: (key: string, date: string) =>
    api<void>(`/trackers/${encodeURIComponent(key)}/${date}`, json("DELETE")),

  listVitals: () => api<VitalsReport[]>("/vitals"),
  upsertVitalsReport: (report: VitalsReport) =>
    api<void>(`/vitals/${report.date}`, json("PUT", { lab: report.lab, notes: report.notes, results: report.results })),
  deleteVitalsReport: (date: string) => api<void>(`/vitals/${date}`, json("DELETE")),

  reset: () => api<void>("/data/reset", json("POST")),
}
