import { describe, expect, it } from "vitest"

import { parseDateKey, toDateKey } from "./dates"

describe("parseDateKey", () => {
  it("reads a date key as that calendar day in local time", () => {
    const d = parseDateKey("2027-01-01")
    expect(d.getFullYear()).toBe(2027)
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(1)
    expect(toDateKey(d)).toBe("2027-01-01")
  })

  it("gives an invalid date for an empty key", () => {
    expect(Number.isNaN(parseDateKey("").getTime())).toBe(true)
  })
})
