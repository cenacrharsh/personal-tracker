import { ApiAdapter } from "./apiAdapter"
import { LocalStorageAdapter } from "./localStorageAdapter"
import type { PortfolioRepository } from "./repository"

// Primary backend: Express + MongoDB.
export const repository: PortfolioRepository = new ApiAdapter()

// Kept available for one-time migration of data already saved in this browser.
export const localRepository: PortfolioRepository = new LocalStorageAdapter()

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
  ActivityKey,
  ActivityTracker,
  TrackersData,
} from "./types"
export type { PortfolioRepository } from "./repository"
