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

export const EMERGENCY_MONTHS_MIN = 6
export const EMERGENCY_MONTHS_MAX = 12

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

  const equityFromZerodha = clampNonNegative(
    clampNumber(inputs.zerodhaTotal) - clampNumber(inputs.zerodhaGoldEtf) - clampNumber(silverZerodha),
  )
  const equityFromMf = clampNonNegative(
    clampNumber(inputs.mfTotal) - clampNumber(inputs.mfGold) - clampNumber(silverMf),
  )
  const totalEquity = clampNonNegative(equityFromZerodha + equityFromMf)

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

