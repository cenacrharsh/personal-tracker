import { describe, expect, it } from "vitest"

import { formatMetricValue, formatRange, metricStatus, statusArrow } from "./vitals"

describe("metricStatus", () => {
  it("flags values below a low bound", () => {
    expect(metricStatus(0.34, { low: 0.4 })).toBe("low") // HDL/LDL ratio from Notion
    expect(metricStatus(12, { low: 13, high: 17 })).toBe("low") // hemoglobin
  })

  it("flags values above a high bound", () => {
    expect(metricStatus(9.1, { low: 4.2, high: 7.2 })).toBe("high") // uric acid from Notion
    expect(metricStatus(5.2, { low: 3.5, high: 5.1 })).toBe("high") // potassium from Notion
    expect(metricStatus(210, { high: 200 })).toBe("high") // total cholesterol
  })

  it("returns ok for values comfortably inside the range", () => {
    expect(metricStatus(88, { low: 70, high: 100 })).toBe("ok") // fasting glucose
    expect(metricStatus(15.6, { low: 13, high: 17 })).toBe("ok") // hemoglobin
  })

  it("marks values within 5% of a bound as borderline", () => {
    expect(metricStatus(97, { low: 70, high: 100 })).toBe("borderline") // just under high (>95)
    expect(metricStatus(72, { low: 70, high: 100 })).toBe("borderline") // just over low (<73.5)
  })

  it("handles open-ended ranges", () => {
    expect(metricStatus(150, { high: 200 })).toBe("ok")
    expect(metricStatus(199, { high: 200 })).toBe("borderline")
    expect(metricStatus(0.5, { low: 0.4 })).toBe("ok")
  })

  it("treats non-finite values as ok (no false alarm)", () => {
    expect(metricStatus(NaN, { low: 1, high: 2 })).toBe("ok")
  })
})

describe("statusArrow", () => {
  it("points up for high and down for low, nothing otherwise", () => {
    expect(statusArrow("high")).toBe("↑")
    expect(statusArrow("low")).toBe("↓")
    expect(statusArrow("ok")).toBe("")
    expect(statusArrow("borderline")).toBe("")
  })
})

describe("formatMetricValue", () => {
  it("drops decimals for whole numbers, keeps them otherwise", () => {
    expect(formatMetricValue(208)).toBe("208")
    expect(formatMetricValue(7.51)).toBe("7.5")
    expect(formatMetricValue(0.34, 2)).toBe("0.34")
    expect(formatMetricValue(NaN)).toBe("—")
  })
})

describe("formatRange", () => {
  it("renders closed, low-only, high-only and empty ranges", () => {
    expect(formatRange({ low: 70, high: 100 })).toBe("70–100")
    expect(formatRange({ low: 0.4 })).toBe("> 0.4")
    expect(formatRange({ high: 200 })).toBe("< 200")
    expect(formatRange({})).toBe("—")
  })
})
