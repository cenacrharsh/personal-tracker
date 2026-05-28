import type { BillsData, CreditCardsData, PortfolioData, Snapshot } from "./types"

export interface PortfolioRepository {
  getPortfolio(): Promise<PortfolioData | null>
  savePortfolio(data: PortfolioData): Promise<void>

  getCreditCards(): Promise<CreditCardsData | null>
  saveCreditCards(data: CreditCardsData): Promise<void>

  listSnapshots(): Promise<Snapshot[]>
  upsertSnapshot(snapshot: Snapshot): Promise<void>

  getBills(): Promise<BillsData | null>
  saveBills(data: BillsData): Promise<void>

  reset(): Promise<void>
}
