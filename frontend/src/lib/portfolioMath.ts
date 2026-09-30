import { clampNumber } from "./money"

export type AllocationCategory = "equity" | "gold" | "silver" | "debt"

export interface PortfolioInputs {
  age: number
  monthlyIncome: number
  silverEnabled: boolean

  // Brokerage (Zerodha)
  zerodhaTotal: number
  zerodhaGoldEtf: number
  zerodhaSilverEtf: number

  // Mutual Funds
  mfTotal: number
  mfGold: number
  mfSilver: number

  // Debt breakdown
  fdAmount: number
  rdAmount: number
  epfPpfAmount: number
  bondsAmount: number
  npsAmount: number

  // Shields
  currentEmergencyFund: number
  emergencyFdAmount: number
  emergencyRdAmount: number
}

export const EMERGENCY_MONTHS_MIN = 3
export const EMERGENCY_MONTHS_MAX = 6

export interface PortfolioTotals {
  totalDebt: number
  totalGold: number
  totalSilver: number
  totalEquity: number
  totalPortfolioValue: number
}

export interface Percentages {
  equity: number
  gold: number
  silver: number
  debt: number
}

function clampNonNegative(n: number) {
  return n < 0 ? 0 : n
}

// Equity is each account's total minus the gold and silver held inside it.
// Zerodha equity is the direct-stock pile; MF equity is the fund pile.
function equityParts(inputs: PortfolioInputs) {
  const silverZerodha = inputs.silverEnabled ? inputs.zerodhaSilverEtf : 0
  const silverMf = inputs.silverEnabled ? inputs.mfSilver : 0
  return {
    fromZerodha: clampNonNegative(
      clampNumber(inputs.zerodhaTotal) - clampNumber(inputs.zerodhaGoldEtf) - clampNumber(silverZerodha),
    ),
    fromMf: clampNonNegative(clampNumber(inputs.mfTotal) - clampNumber(inputs.mfGold) - clampNumber(silverMf)),
  }
}

export function computeTotals(inputs: PortfolioInputs): PortfolioTotals {
  const silverZerodha = inputs.silverEnabled ? inputs.zerodhaSilverEtf : 0
  const silverMf = inputs.silverEnabled ? inputs.mfSilver : 0

  const totalDebt = clampNonNegative(
    clampNumber(inputs.fdAmount) +
      clampNumber(inputs.rdAmount) +
      clampNumber(inputs.epfPpfAmount) +
      clampNumber(inputs.bondsAmount) +
      clampNumber(inputs.npsAmount),
  )
  const totalGold = clampNonNegative(clampNumber(inputs.zerodhaGoldEtf) + clampNumber(inputs.mfGold))
  const totalSilver = clampNonNegative(clampNumber(silverZerodha) + clampNumber(silverMf))

  const { fromZerodha, fromMf } = equityParts(inputs)
  const totalEquity = clampNonNegative(fromZerodha + fromMf)

  const totalPortfolioValue = clampNonNegative(totalEquity + totalGold + totalSilver + totalDebt)

  return {
    totalDebt,
    totalGold,
    totalSilver,
    totalEquity,
    totalPortfolioValue,
  }
}

export function computeCurrentAllocationPercents(inputs: PortfolioInputs): Percentages {
  const totals = computeTotals(inputs)
  const denom = totals.totalPortfolioValue
  if (denom <= 0) return { equity: 0, gold: 0, silver: 0, debt: 0 }

  return {
    equity: (totals.totalEquity / denom) * 100,
    gold: (totals.totalGold / denom) * 100,
    silver: (totals.totalSilver / denom) * 100,
    debt: (totals.totalDebt / denom) * 100,
  }
}

export function computeTargetAllocationPercents(inputs: PortfolioInputs): Percentages {
  const age = clampNonNegative(clampNumber(inputs.age))
  const remaining = age // Remaining % as per requirements

  const targetEquity = 100 - age
  const targetDebt = remaining / 2
  const targetPrecious = remaining / 2

  if (inputs.silverEnabled) {
    const targetGold = targetPrecious * (2 / 3)
    const targetSilver = targetPrecious * (1 / 3)
    return {
      equity: clampNonNegative(targetEquity),
      gold: clampNonNegative(targetGold),
      silver: clampNonNegative(targetSilver),
      debt: clampNonNegative(targetDebt),
    }
  }

  return {
    equity: clampNonNegative(targetEquity),
    gold: clampNonNegative(targetPrecious),
    silver: 0,
    debt: clampNonNegative(targetDebt),
  }
}

export function computeVariancePercents(
  current: Percentages,
  target: Percentages,
): Record<AllocationCategory, number> {
  return {
    equity: current.equity - target.equity,
    gold: current.gold - target.gold,
    silver: current.silver - target.silver,
    debt: current.debt - target.debt,
  }
}

export function clampEmergencyMonths(months: number) {
  const n = clampNumber(months)
  if (n < EMERGENCY_MONTHS_MIN) return EMERGENCY_MONTHS_MIN
  if (n > EMERGENCY_MONTHS_MAX) return EMERGENCY_MONTHS_MAX
  return Math.round(n)
}

// Liquid balance plus the FDs and RDs earmarked for the emergency fund.
export function computeEmergencyFundTotal(
  inputs: Pick<PortfolioInputs, "currentEmergencyFund" | "emergencyFdAmount" | "emergencyRdAmount">,
) {
  return clampNonNegative(
    clampNumber(inputs.currentEmergencyFund) +
      clampNumber(inputs.emergencyFdAmount) +
      clampNumber(inputs.emergencyRdAmount),
  )
}

export function computeTargetEmergencyFund(monthlyIncome: number, months = EMERGENCY_MONTHS_MIN) {
  return clampNonNegative(clampNumber(monthlyIncome)) * clampEmergencyMonths(months)
}

export function computeEmergencyFundDelta(
  current: number,
  monthlyIncome: number,
  months = EMERGENCY_MONTHS_MIN,
) {
  return clampNumber(current) - computeTargetEmergencyFund(monthlyIncome, months)
}


// Direct stocks are the hand-picked half of equity — capped as a share of equity,
// not of net worth, so a growing portfolio doesn't quietly loosen the limit.
export const DIRECT_STOCK_CAP_PCT = 20

export interface EquitySplit {
  mutualFunds: number
  directStocks: number
  total: number
  directStocksPct: number
  mutualFundsPct: number
  // Amount that would have to move out of stocks to get back under the cap.
  excessAmount: number
  withinCap: boolean
}

export function computeEquitySplit(inputs: PortfolioInputs): EquitySplit {
  const { fromZerodha: directStocks, fromMf: mutualFunds } = equityParts(inputs)
  const total = directStocks + mutualFunds

  if (total <= 0) {
    return {
      mutualFunds: 0,
      directStocks: 0,
      total: 0,
      directStocksPct: 0,
      mutualFundsPct: 0,
      excessAmount: 0,
      withinCap: true,
    }
  }

  const directStocksPct = (directStocks / total) * 100
  const allowed = total * (DIRECT_STOCK_CAP_PCT / 100)

  return {
    mutualFunds,
    directStocks,
    total,
    directStocksPct,
    mutualFundsPct: (mutualFunds / total) * 100,
    excessAmount: clampNonNegative(directStocks - allowed),
    withinCap: directStocksPct <= DIRECT_STOCK_CAP_PCT,
  }
}
