import { LocalStorageAdapter } from "./localStorageAdapter"
import type { PortfolioRepository } from "./repository"

export const repository: PortfolioRepository = new LocalStorageAdapter()

export { DEFAULT_PORTFOLIO, DEFAULT_CARDS, DEFAULT_BILLS } from "./localStorageAdapter"
export type {
  PortfolioData,
  CreditCardsData,
  CreditCardConfig,
  CreditCardMonthlyEntry,
  CreditCardYearData,
  InsuranceDetails,
  Snapshot,
  BillsData,
  BillStatus,
} from "./types"
export type { PortfolioRepository } from "./repository"
