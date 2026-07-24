import { api } from "./api"
import type {
  BillsData,
  CreditCardsData,
  PortfolioData,
  Snapshot,
  TrackersData,
  VitalsReport,
} from "./types"
import type { PortfolioRepository } from "./repository"

// Talks to the Express/MongoDB backend. Same contract as the localStorage adapter,
// so the stores are unaware of where data lives.
export class ApiAdapter implements PortfolioRepository {
  async getPortfolio(): Promise<PortfolioData | null> {
    return api<PortfolioData | null>("/portfolio")
  }

  async savePortfolio(data: PortfolioData): Promise<void> {
    await api("/portfolio", { method: "PUT", body: JSON.stringify(data) })
  }

  async getCreditCards(): Promise<CreditCardsData | null> {
    return api<CreditCardsData | null>("/cards")
  }

  async saveCreditCards(data: CreditCardsData): Promise<void> {
    await api("/cards", { method: "PUT", body: JSON.stringify(data) })
  }

  async listSnapshots(): Promise<Snapshot[]> {
    return api<Snapshot[]>("/snapshots")
  }

  async upsertSnapshot(snapshot: Snapshot): Promise<void> {
    await api("/snapshots", { method: "POST", body: JSON.stringify(snapshot) })
  }

  async getBills(): Promise<BillsData | null> {
    return api<BillsData | null>("/bills")
  }

  async saveBills(data: BillsData): Promise<void> {
    await api("/bills", { method: "PUT", body: JSON.stringify(data) })
  }

  async getTrackers(): Promise<TrackersData | null> {
    return api<TrackersData | null>("/trackers")
  }

  async saveTrackers(data: TrackersData): Promise<void> {
    await api("/trackers", { method: "PUT", body: JSON.stringify(data) })
  }

  async listVitals(): Promise<VitalsReport[]> {
    return api<VitalsReport[]>("/vitals")
  }

  async upsertVitalsReport(report: VitalsReport): Promise<void> {
    await api(`/vitals/${report.date}`, {
      method: "PUT",
      body: JSON.stringify({ lab: report.lab, notes: report.notes, results: report.results }),
    })
  }

  async deleteVitalsReport(date: string): Promise<void> {
    await api(`/vitals/${date}`, { method: "DELETE" })
  }

  async reset(): Promise<void> {
    await api("/data/reset", { method: "POST" })
  }
}
