import { ApiAdapter } from "./apiAdapter"
import type { PortfolioRepository } from "./repository"

// Single source of truth: Express + MongoDB.
export const repository: PortfolioRepository = new ApiAdapter()

export { DEFAULT_PORTFOLIO, DEFAULT_BILLS } from "./defaults"
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
  VitalsReport,
  MetricRange,
  VitalMetricDef,
  VitalPanel,
} from "./types"
export type { PortfolioRepository } from "./repository"
