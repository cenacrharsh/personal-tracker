import { describe, expect, it } from "vitest"

import { formatMetricValue, formatRange, isOutOfRange, metricStatus, statusArrow } from "./vitals"
import { VITALS_CATALOG } from "./vitalsCatalog"

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

  it("marks values within 10% of a closed range's width as borderline", () => {
    expect(metricStatus(97, { low: 70, high: 100 })).toBe("borderline") // top 3 of a 30-wide range
    expect(metricStatus(72, { low: 70, high: 100 })).toBe("borderline") // bottom 3
  })

  it("keeps the middle of a narrow range in range", () => {
    // Regression: a bound-relative margin made every sodium/chloride value
    // borderline, because 5% of the bound is wider than the range itself.
    expect(metricStatus(140, { low: 136, high: 145 })).toBe("ok") // sodium
    expect(metricStatus(102, { low: 98, high: 107 })).toBe("ok") // chloride
    expect(metricStatus(4.3, { low: 3.5, high: 5.1 })).toBe("ok") // potassium
    // The edges of those same narrow ranges still warn.
    expect(metricStatus(136.5, { low: 136, high: 145 })).toBe("borderline")
    expect(metricStatus(144.5, { low: 136, high: 145 })).toBe("borderline")
  })

  it("handles open-ended ranges from the near side only", () => {
    expect(metricStatus(150, { high: 200 })).toBe("ok")
    expect(metricStatus(199, { high: 200 })).toBe("borderline")
    expect(metricStatus(20, { high: 200 })).toBe("ok") // nothing is "too low" under a < bound
    expect(metricStatus(0.5, { low: 0.4 })).toBe("ok")
    expect(metricStatus(0.41, { low: 0.4 })).toBe("borderline")
    expect(metricStatus(120, { low: 90 })).toBe("ok") // eGFR — high is good
  })

  it("treats a rangeless metric as ok", () => {
    expect(metricStatus(42, {})).toBe("ok")
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

describe("isOutOfRange", () => {
  it("counts only low and high as out of range", () => {
    expect(isOutOfRange("low")).toBe(true)
    expect(isOutOfRange("high")).toBe(true)
    expect(isOutOfRange("borderline")).toBe(false)
    expect(isOutOfRange("ok")).toBe(false)
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

describe("the catalog against the status logic", () => {
  it("gives every metric a usable bound", () => {
    for (const m of VITALS_CATALOG) {
      expect(m.range.low !== undefined || m.range.high !== undefined).toBe(true)
      if (m.range.low !== undefined && m.range.high !== undefined) {
        expect(m.range.high).toBeGreaterThan(m.range.low)
      }
    }
  })

  it("reads the middle of every closed reference range as in range", () => {
    for (const m of VITALS_CATALOG) {
      const { low, high } = m.range
      if (low === undefined || high === undefined) continue
      expect(metricStatus((low + high) / 2, m.range)).toBe("ok")
    }
  })

  it("flags a value just outside every bound", () => {
    for (const m of VITALS_CATALOG) {
      const { low, high } = m.range
      if (low !== undefined) expect(metricStatus(low * 0.9, m.range)).toBe("low")
      if (high !== undefined) expect(metricStatus(high * 1.1, m.range)).toBe("high")
    }
  })
})
