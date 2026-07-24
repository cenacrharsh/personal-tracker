import type {
  BillsData,
  CreditCardsData,
  PortfolioData,
  Snapshot,
  TrackersData,
  VitalsReport,
} from "./types"

export interface PortfolioRepository {
  getPortfolio(): Promise<PortfolioData | null>
  savePortfolio(data: PortfolioData): Promise<void>

  getCreditCards(): Promise<CreditCardsData | null>
  saveCreditCards(data: CreditCardsData): Promise<void>

  listSnapshots(): Promise<Snapshot[]>
  upsertSnapshot(snapshot: Snapshot): Promise<void>

  getBills(): Promise<BillsData | null>
  saveBills(data: BillsData): Promise<void>

  getTrackers(): Promise<TrackersData | null>
  saveTrackers(data: TrackersData): Promise<void>

  listVitals(): Promise<VitalsReport[]>
  upsertVitalsReport(report: VitalsReport): Promise<void>
  deleteVitalsReport(date: string): Promise<void>

  reset(): Promise<void>
}
