import { describe, expect, it } from "vitest"

import { clampNonNeg, clampNumber, formatCompactINR, formatINR, formatPercent } from "./money"

describe("clampNumber", () => {
  it("passes through finite numbers", () => {
    expect(clampNumber(42)).toBe(42)
    expect(clampNumber(-5)).toBe(-5)
  })
  it("coerces numeric strings", () => {
    expect(clampNumber("100")).toBe(100)
  })
  it("falls back to 0 for non-finite input", () => {
    expect(clampNumber(NaN)).toBe(0)
    expect(clampNumber(undefined)).toBe(0)
    expect(clampNumber("abc")).toBe(0)
  })
})

describe("clampNonNeg", () => {
  it("keeps non-negative numbers as-is", () => {
    expect(clampNonNeg(0)).toBe(0)
    expect(clampNonNeg(10)).toBe(10)
  })
  it("floors negative numbers to 0", () => {
    expect(clampNonNeg(-1)).toBe(0)
  })
  it("treats non-finite input as 0", () => {
    expect(clampNonNeg(NaN)).toBe(0)
  })
})

describe("formatCompactINR", () => {
  it("formats crore amounts", () => {
    expect(formatCompactINR(1_50_00_000)).toBe("₹1.50 Cr")
  })
  it("formats lakh amounts", () => {
    expect(formatCompactINR(2_50_000)).toBe("₹2.50 L")
  })
  it("formats thousands", () => {
    expect(formatCompactINR(5_000)).toBe("₹5.0 K")
  })
  it("formats amounts under a thousand without a suffix", () => {
    expect(formatCompactINR(999)).toBe("₹999")
  })
  it("handles the crore boundary exactly", () => {
    expect(formatCompactINR(1_00_00_000)).toBe("₹1.00 Cr")
  })
  it("handles the lakh boundary exactly", () => {
    expect(formatCompactINR(1_00_000)).toBe("₹1.00 L")
  })
  it("preserves the negative sign", () => {
    expect(formatCompactINR(-2_50_000)).toBe("-₹2.50 L")
  })
  it("treats non-finite input as 0", () => {
    expect(formatCompactINR(NaN)).toBe("₹0")
  })
})

describe("formatINR", () => {
  it("formats a positive amount with no decimals", () => {
    expect(formatINR(1000)).toBe("₹1,000")
  })
  it("treats non-finite input as 0", () => {
    expect(formatINR(NaN)).toBe("₹0")
  })
})

describe("formatPercent", () => {
  it("formats with one decimal by default", () => {
    expect(formatPercent(12.345)).toBe("12.3%")
  })
  it("respects a custom digit count", () => {
    expect(formatPercent(12.345, 0)).toBe("12%")
  })
  it("treats non-finite input as 0%", () => {
    expect(formatPercent(NaN)).toBe("0%")
  })
})
