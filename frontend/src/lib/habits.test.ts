import { describe, expect, it } from "vitest"

import { daysBetween, daysSinceLastLapse, longestLapseFreeRun, shiftKey } from "./habits"

describe("daysBetween", () => {
  it("counts inclusively", () => {
    expect(daysBetween("2026-01-01", "2026-01-01")).toBe(1)
    expect(daysBetween("2026-01-01", "2026-01-03")).toBe(3)
  })

  it("spans month and year boundaries", () => {
    expect(daysBetween("2026-01-30", "2026-02-02")).toBe(4)
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(2)
  })

  it("returns 0 when the range is inverted", () => {
    expect(daysBetween("2026-01-05", "2026-01-01")).toBe(0)
  })
})

describe("shiftKey", () => {
  it("moves backwards across a month boundary", () => {
    expect(shiftKey("2026-03-01", -1)).toBe("2026-02-28")
  })

  it("handles a leap day", () => {
    expect(shiftKey("2024-03-01", -1)).toBe("2024-02-29")
  })
})

describe("daysSinceLastLapse", () => {
  it("is 0 when nothing has ever been logged", () => {
    expect(daysSinceLastLapse([], "2026-07-31")).toBe(0)
  })

  it("is 0 when today is itself a lapse", () => {
    expect(daysSinceLastLapse(["2026-07-20", "2026-07-31"], "2026-07-31")).toBe(0)
  })

  it("counts today plus every day back to the last lapse", () => {
    // lapse on the 28th; 29th, 30th, 31st carry no entry
    expect(daysSinceLastLapse(["2026-07-28"], "2026-07-31")).toBe(3)
  })

  it("measures from the most recent lapse, not an older one", () => {
    expect(daysSinceLastLapse(["2026-07-01", "2026-07-29"], "2026-07-31")).toBe(2)
  })

  it("does not count days before tracking began", () => {
    // first ever entry is the 30th, so the count cannot exceed today alone
    expect(daysSinceLastLapse(["2026-07-30"], "2026-07-31")).toBe(1)
  })
})

describe("longestLapseFreeRun", () => {
  it("is 0 when nothing has ever been logged", () => {
    expect(longestLapseFreeRun([], "2026-07-31")).toBe(0)
  })

  it("measures the gap strictly between two lapses", () => {
    // lapses on the 1st and 5th → the 2nd, 3rd and 4th are free
    expect(longestLapseFreeRun(["2026-07-01", "2026-07-05"], "2026-07-05")).toBe(3)
  })

  it("counts the run still in progress since the last lapse", () => {
    expect(longestLapseFreeRun(["2026-07-01", "2026-07-05"], "2026-07-31")).toBe(26)
  })

  it("returns 0 for back-to-back lapses", () => {
    expect(longestLapseFreeRun(["2026-07-30", "2026-07-31"], "2026-07-31")).toBe(0)
  })

  it("is never smaller than the current run", () => {
    const entries = ["2026-07-01", "2026-07-02", "2026-07-20"]
    expect(longestLapseFreeRun(entries, "2026-07-31")).toBeGreaterThanOrEqual(
      daysSinceLastLapse(entries, "2026-07-31"),
    )
  })
})
