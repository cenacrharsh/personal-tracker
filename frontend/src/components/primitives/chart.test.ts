import { describe, expect, it } from "vitest"

import { formatAxisNumber, niceAxisTicks } from "./chart"
import { VITALS_CATALOG } from "@/lib/vitalsCatalog"

describe("niceAxisTicks", () => {
  it("returns evenly spaced round ticks covering the domain", () => {
    expect(niceAxisTicks(12.4, 17.6)).toEqual([12, 14, 16, 18])
    expect(niceAxisTicks(0, 100)).toEqual([0, 25, 50, 75, 100])
  })

  it("keeps sub-unit steps free of float drift", () => {
    // Potassium 3.5–5.1 padded: the old raw domain produced 4.0920000000000005.
    for (const tick of niceAxisTicks(3.26, 5.34)) {
      expect(formatAxisNumber(tick)).toBe(String(tick))
      expect(String(tick).replace("-", "").replace(".", "").length).toBeLessThanOrEqual(5)
    }
  })

  it("keeps a fractional step evenly spaced", () => {
    // ESR (< 15) lands on a 2.5 step; rounding it to integers gave 5, 8, 10, 13.
    const ticks = niceAxisTicks(6.375, 16.125)
    const gaps = ticks.slice(1).map((t, i) => Number((t - ticks[i]).toFixed(6)))
    expect(new Set(gaps).size).toBe(1)
    expect(ticks).toEqual([5, 7.5, 10, 12.5, 15, 17.5])
  })

  it("spans every catalog axis with an even gap", () => {
    for (const m of VITALS_CATALOG) {
      const low = m.range.low ?? (m.range.high as number) * 0.5
      const high = m.range.high ?? (m.range.low as number) * 1.5
      const pad = (high - low) * 0.15
      const ticks = niceAxisTicks(Math.max(0, low - pad), high + pad)
      const gaps = ticks.slice(1).map((t, i) => Number((t - ticks[i]).toFixed(6)))
      expect(new Set(gaps).size, `${m.key}: ${ticks.join(", ")}`).toBe(1)
    }
  })

  it("spans the requested domain", () => {
    const ticks = niceAxisTicks(137, 4321)
    expect(ticks[0]).toBeLessThanOrEqual(137)
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(4321)
  })

  it("survives a degenerate domain", () => {
    expect(niceAxisTicks(5, 5).length).toBeGreaterThan(1)
    expect(niceAxisTicks(0, 0).length).toBeGreaterThan(1)
    expect(niceAxisTicks(Number.NaN, 10)).toEqual([])
  })

  it("produces a readable axis for every catalog range", () => {
    for (const m of VITALS_CATALOG) {
      const low = m.range.low ?? (m.range.high as number) * 0.5
      const high = m.range.high ?? (m.range.low as number) * 1.5
      const pad = (high - low) * 0.15
      const ticks = niceAxisTicks(Math.max(0, low - pad), high + pad)

      expect(ticks.length).toBeGreaterThanOrEqual(2)
      expect(ticks.length).toBeLessThanOrEqual(12)
      expect(ticks[0]).toBeLessThanOrEqual(low)
      expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(high)
      // No tick may render as a float-noise string like "4.0920000000000005".
      for (const t of ticks) expect(formatAxisNumber(t).length).toBeLessThanOrEqual(7)
    }
  })
})

describe("formatAxisNumber", () => {
  it("drops trailing float noise and keeps integers bare", () => {
    expect(formatAxisNumber(11000)).toBe("11000")
    expect(formatAxisNumber(4.0920000000000005)).toBe("4.092")
    expect(formatAxisNumber(0.4)).toBe("0.4")
    expect(formatAxisNumber(Number.NaN)).toBe("")
  })
})
