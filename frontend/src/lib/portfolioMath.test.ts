import { describe, expect, it } from "vitest"

import {
  clampEmergencyMonths,
  computeCurrentAllocationPercents,
  computeEmergencyFundDelta,
  computeEmergencyFundTotal,
  computeEquitySplit,
  computeTargetAllocationPercents,
  computeTargetEmergencyFund,
  computeTotals,
  DIRECT_STOCK_CAP_PCT,
  type PortfolioInputs,
} from "./portfolioMath"

const base: PortfolioInputs = {
  age: 30,
  monthlyIncome: 100000,
  silverEnabled: true,
  zerodhaTotal: 100000,
  zerodhaGoldEtf: 20000,
  zerodhaSilverEtf: 10000,
  mfTotal: 100000,
  mfGold: 0,
  mfSilver: 0,
  fdAmount: 50000,
  rdAmount: 0,
  epfPpfAmount: 50000,
  bondsAmount: 0,
  npsAmount: 0,
  currentEmergencyFund: 300000,
  emergencyFdAmount: 0,
  emergencyRdAmount: 0,
}

describe("computeTotals", () => {
  it("splits equity, gold, silver and debt out of the brokerage/MF totals", () => {
    const t = computeTotals(base)
    expect(t.totalGold).toBe(20000)
    expect(t.totalSilver).toBe(10000)
    // equity = (100k - 20k gold - 10k silver) + 100k MF = 170k
    expect(t.totalEquity).toBe(170000)
    expect(t.totalDebt).toBe(100000)
    expect(t.totalPortfolioValue).toBe(300000)
  })

  it("counts bonds and NPS as debt", () => {
    const t = computeTotals({ ...base, bondsAmount: 25000, npsAmount: 75000 })
    expect(t.totalDebt).toBe(200000)
    expect(t.totalPortfolioValue).toBe(400000)
  })

  it("excludes silver holdings when silver is disabled", () => {
    const t = computeTotals({ ...base, silverEnabled: false })
    expect(t.totalSilver).toBe(0)
    // the 10k silver ETF now counts back toward equity
    expect(t.totalEquity).toBe(180000)
  })

  it("never returns negative buckets when sub-holdings exceed the total", () => {
    const t = computeTotals({ ...base, zerodhaGoldEtf: 999999 })
    expect(t.totalEquity).toBeGreaterThanOrEqual(0)
  })
})

describe("allocation percents", () => {
  it("current percents sum to 100 when there is value", () => {
    const p = computeCurrentAllocationPercents(base)
    expect(p.equity + p.gold + p.silver + p.debt).toBeCloseTo(100, 5)
  })

  it("returns all zeros for an empty portfolio", () => {
    const p = computeCurrentAllocationPercents({
      ...base,
      zerodhaTotal: 0,
      zerodhaGoldEtf: 0,
      zerodhaSilverEtf: 0,
      mfTotal: 0,
      fdAmount: 0,
      epfPpfAmount: 0,
    })
    expect(p).toEqual({ equity: 0, gold: 0, silver: 0, debt: 0 })
  })

  it("target equity is 100 - age", () => {
    const p = computeTargetAllocationPercents({ ...base, age: 30 })
    expect(p.equity).toBe(70)
    // remaining 30 splits half debt, half precious; precious 2/3 gold, 1/3 silver
    expect(p.debt).toBe(15)
    expect(p.gold).toBeCloseTo(10, 5)
    expect(p.silver).toBeCloseTo(5, 5)
  })

  it("folds precious metals entirely into gold when silver is off", () => {
    const p = computeTargetAllocationPercents({ ...base, age: 30, silverEnabled: false })
    expect(p.silver).toBe(0)
    expect(p.gold).toBe(15)
  })
})

describe("emergency fund", () => {
  it("targets 3x monthly income by default", () => {
    expect(computeTargetEmergencyFund(100000)).toBe(300000)
  })

  it("scales the target by the chosen months", () => {
    expect(computeTargetEmergencyFund(100000, 6)).toBe(600000)
    expect(computeTargetEmergencyFund(100000, 4)).toBe(400000)
  })

  it("clamps the months multiplier to 3-6", () => {
    expect(clampEmergencyMonths(1)).toBe(3)
    expect(clampEmergencyMonths(12)).toBe(6)
    expect(clampEmergencyMonths(Number.NaN)).toBe(3)
    expect(computeTargetEmergencyFund(100000, 0)).toBe(300000)
  })

  it("sums the liquid balance with its FDs and RDs", () => {
    expect(
      computeEmergencyFundTotal({
        currentEmergencyFund: 200000,
        emergencyFdAmount: 150000,
        emergencyRdAmount: 50000,
      }),
    ).toBe(400000)
  })

  it("delta is current minus target", () => {
    expect(computeEmergencyFundDelta(200000, 100000)).toBe(-100000)
    expect(computeEmergencyFundDelta(400000, 100000)).toBe(100000)
    expect(computeEmergencyFundDelta(400000, 100000, 6)).toBe(-200000)
  })
})

describe("computeEquitySplit", () => {
  it("splits equity into mutual funds and direct stocks", () => {
    // Zerodha equity = 100k - 20k gold - 10k silver = 70k; MF equity = 100k
    const s = computeEquitySplit(base)
    expect(s.directStocks).toBe(70000)
    expect(s.mutualFunds).toBe(100000)
    expect(s.total).toBe(170000)
    expect(s.directStocksPct).toBeCloseTo((70000 / 170000) * 100, 6)
    expect(s.mutualFundsPct).toBeCloseTo((100000 / 170000) * 100, 6)
  })

  it("flags a breach and reports how much is over the cap", () => {
    const s = computeEquitySplit(base)
    expect(s.withinCap).toBe(false)
    // 20% of 170k = 34k allowed, so 70k - 34k = 36k over
    expect(s.excessAmount).toBe(36000)
  })

  it("treats a share exactly at the cap as within it", () => {
    // Zerodha equity 20k, MF equity 80k -> exactly 20%
    const s = computeEquitySplit({ ...base, zerodhaTotal: 50000, zerodhaGoldEtf: 20000, zerodhaSilverEtf: 10000, mfTotal: 80000 })
    expect(s.directStocksPct).toBe(DIRECT_STOCK_CAP_PCT)
    expect(s.withinCap).toBe(true)
    expect(s.excessAmount).toBe(0)
  })

  it("counts silver back into direct stocks when silver is disabled", () => {
    const s = computeEquitySplit({ ...base, silverEnabled: false })
    expect(s.directStocks).toBe(80000)
    expect(s.total).toBe(180000)
  })

  it("returns a zeroed, in-cap split when there is no equity", () => {
    const s = computeEquitySplit({ ...base, zerodhaTotal: 0, zerodhaGoldEtf: 0, zerodhaSilverEtf: 0, mfTotal: 0 })
    expect(s.total).toBe(0)
    expect(s.directStocksPct).toBe(0)
    expect(s.withinCap).toBe(true)
  })
})
