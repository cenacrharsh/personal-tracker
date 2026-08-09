import { describe, expect, it } from "vitest"

import { goalColor } from "./tokens"

describe("goalColor", () => {
  it("always returns 6-digit hex", () => {
    // Callers append an alpha suffix (`${color}20`) for tinted backgrounds,
    // which silently breaks if this ever returns rgb().
    for (let pct = 0; pct <= 100; pct += 1) {
      expect(goalColor(pct)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it("runs rose → amber → emerald across the range", () => {
    expect(goalColor(0)).toBe("#f43f5e")
    expect(goalColor(50)).toBe("#f59e0b")
    expect(goalColor(100)).toBe("#10b981")
  })

  it("clamps out-of-band and non-finite input to the endpoints", () => {
    expect(goalColor(-20)).toBe("#f43f5e")
    expect(goalColor(180)).toBe("#10b981")
    expect(goalColor(Number.NaN)).toBe("#f43f5e")
  })
})
