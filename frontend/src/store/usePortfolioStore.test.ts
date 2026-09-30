import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_PORTFOLIO } from "@/data/defaults"

const repo = vi.hoisted(() => ({
  getPortfolio: vi.fn(),
  updatePortfolio: vi.fn(),
  getCreditCards: vi.fn(),
  createCard: vi.fn(),
  updateCard: vi.fn(),
  deleteCard: vi.fn(),
  setCardMonthValue: vi.fn(),
  listSnapshots: vi.fn(),
  upsertSnapshot: vi.fn(),
  getBills: vi.fn(),
  markBillPaid: vi.fn(),
  markBillUnpaid: vi.fn(),
  getTrackers: vi.fn(),
  markTrackerDay: vi.fn(),
  unmarkTrackerDay: vi.fn(),
  listVitals: vi.fn(),
  upsertVitalsReport: vi.fn(),
  deleteVitalsReport: vi.fn(),
  reset: vi.fn(),
}))

vi.mock("@/data", async () => ({ ...(await import("@/data/defaults")), repository: repo }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { usePortfolioStore } = await import("./usePortfolioStore")
const { useTrackersStore } = await import("./useTrackersStore")
const { useSyncStore } = await import("./useSyncStore")

// A promise the test resolves by hand, to hold a request "in flight".
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((r) => (resolve = r))
  return { promise, resolve }
}

const card = {
  id: "sbi", name: "SBI", anniversaryStartMonth: 1, feeWaiverTarget: 0, status: "active" as const,
  annualFeeType: "ltf" as const, annualFeeAmount: 0, creditLimit: 0, benefitsNote: "",
}

beforeEach(async () => {
  vi.useFakeTimers()
  for (const fn of Object.values(repo)) fn.mockReset().mockResolvedValue(undefined)
  repo.getPortfolio.mockResolvedValue({ ...DEFAULT_PORTFOLIO, fdAmount: 1000 })
  repo.getCreditCards.mockResolvedValue({ creditCards: [card], creditCardDataByYear: {} })
  repo.listSnapshots.mockResolvedValue([])
  repo.getBills.mockResolvedValue({ creditCards: {}, insurance: {} })
  // reset() clears all module-level save state left by the previous test.
  await usePortfolioStore.getState().reset()
  for (const fn of Object.values(repo)) fn.mockClear()
  await usePortfolioStore.getState().hydrate()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("usePortfolioStore saves", () => {
  it("writes nothing back after loading except the daily snapshot", async () => {
    await vi.runAllTimersAsync()
    expect(repo.updatePortfolio).not.toHaveBeenCalled()
    expect(repo.updateCard).not.toHaveBeenCalled()
    expect(repo.setCardMonthValue).not.toHaveBeenCalled()
    expect(repo.markBillPaid).not.toHaveBeenCalled()
    expect(repo.upsertSnapshot).toHaveBeenCalledTimes(1)
  })

  it("sends one request with only the typed field once typing pauses", async () => {
    const { setFdAmount } = usePortfolioStore.getState()
    setFdAmount(1)
    setFdAmount(12)
    setFdAmount(123)
    await vi.runAllTimersAsync()
    expect(repo.updatePortfolio).toHaveBeenCalledTimes(1)
    expect(repo.updatePortfolio).toHaveBeenCalledWith({ fdAmount: 123 })
  })

  it("sends only the changed insurance sub-field", async () => {
    usePortfolioStore.getState().setLifeInsurance({ premium: 900 })
    await vi.runAllTimersAsync()
    expect(repo.updatePortfolio).toHaveBeenCalledWith({ lifeInsurance: { premium: 900 } })
  })

  it("sends a single month cell for a card", async () => {
    usePortfolioStore.getState().setCreditCardMonthValue({ year: 2026, cardId: "sbi", month: 3, field: "expenses", value: 5000 })
    await vi.runAllTimersAsync()
    expect(repo.setCardMonthValue).toHaveBeenCalledWith("sbi", { year: 2026, month: 3, field: "expenses", value: 5000 })
  })

  it("sends only the changed card settings", async () => {
    usePortfolioStore.getState().setCreditCardMeta("sbi", { creditLimit: 50000 })
    await vi.runAllTimersAsync()
    expect(repo.updateCard).toHaveBeenCalledWith("sbi", { creditLimit: 50000 })
  })

  it("marks and unmarks one bill", async () => {
    const { setCreditCardBillPaid } = usePortfolioStore.getState()
    setCreditCardBillPaid({ year: 2026, month: 3, cardId: "sbi", paid: true })
    setCreditCardBillPaid({ year: 2026, month: 3, cardId: "sbi", paid: false })
    await vi.runAllTimersAsync()
    expect(repo.markBillPaid).toHaveBeenCalledWith("card", "2026-3-sbi", expect.any(Number))
    expect(repo.markBillUnpaid).toHaveBeenCalledWith("card", "2026-3-sbi")
  })

  it("keeps a failed edit and resends it with the next edit", async () => {
    repo.updatePortfolio.mockRejectedValueOnce(new Error("down"))
    const { setFdAmount, setRdAmount } = usePortfolioStore.getState()
    setFdAmount(999)
    await vi.runAllTimersAsync()
    expect(usePortfolioStore.getState().fdAmount).toBe(999)
    expect(useSyncStore.getState().status).toBe("error")

    setRdAmount(5)
    await vi.runAllTimersAsync()
    expect(repo.updatePortfolio).toHaveBeenLastCalledWith({ fdAmount: 999, rdAmount: 5 })
    expect(useSyncStore.getState().status).toBe("saved")
  })

  it("retries a failed item when a different item is saved", async () => {
    repo.markBillPaid.mockRejectedValueOnce(new Error("down"))
    const { setCreditCardBillPaid, setFdAmount } = usePortfolioStore.getState()
    setCreditCardBillPaid({ year: 2026, month: 3, cardId: "sbi", paid: true })
    await vi.runAllTimersAsync()
    setFdAmount(5)
    await vi.runAllTimersAsync()
    expect(repo.markBillPaid).toHaveBeenCalledTimes(2)
    expect(useSyncStore.getState().status).toBe("saved")
  })

  it("stays in error while any item is unsaved, even if others succeed", async () => {
    repo.updateCard.mockRejectedValue(new Error("down"))
    const { setCreditCardMeta, setCreditCardBillPaid } = usePortfolioStore.getState()
    setCreditCardMeta("sbi", { creditLimit: 1 })
    await vi.runAllTimersAsync()
    setCreditCardBillPaid({ year: 2026, month: 3, cardId: "sbi", paid: true })
    await vi.runAllTimersAsync()
    expect(repo.markBillPaid).toHaveBeenCalled()
    expect(useSyncStore.getState().status).toBe("error")
  })

  it("sends a bill's paid and unpaid in order", async () => {
    const first = deferred()
    repo.markBillPaid.mockReturnValueOnce(first.promise)
    const { setCreditCardBillPaid } = usePortfolioStore.getState()
    setCreditCardBillPaid({ year: 2026, month: 3, cardId: "sbi", paid: true })
    setCreditCardBillPaid({ year: 2026, month: 3, cardId: "sbi", paid: false })
    await vi.advanceTimersByTimeAsync(0)
    expect(repo.markBillUnpaid).not.toHaveBeenCalled()
    first.resolve()
    await vi.runAllTimersAsync()
    expect(repo.markBillUnpaid).toHaveBeenCalledTimes(1)
  })

  it("holds a new card's edits until the card is created", async () => {
    const created = deferred()
    repo.createCard.mockReturnValueOnce(created.promise)
    const { addCreditCard } = usePortfolioStore.getState()
    addCreditCard("HDFC")
    const id = usePortfolioStore.getState().creditCards.at(-1)!.id
    usePortfolioStore.getState().setCreditCardMeta(id, { creditLimit: 9 })
    await vi.advanceTimersByTimeAsync(1000)
    expect(repo.updateCard).not.toHaveBeenCalled()
    created.resolve()
    await vi.runAllTimersAsync()
    expect(repo.updateCard).toHaveBeenCalledWith(id, { creditLimit: 9 })
  })

  it("skips the snapshot for edits that can't change net worth", async () => {
    await vi.runAllTimersAsync()
    repo.upsertSnapshot.mockClear()
    usePortfolioStore.getState().setAge(40)
    await vi.runAllTimersAsync()
    expect(repo.upsertSnapshot).not.toHaveBeenCalled()
    usePortfolioStore.getState().setFdAmount(2000)
    await vi.runAllTimersAsync()
    expect(repo.upsertSnapshot).toHaveBeenCalledTimes(1)
  })

  it("a failed snapshot is retried without resending the portfolio edit", async () => {
    await vi.runAllTimersAsync()
    repo.upsertSnapshot.mockRejectedValueOnce(new Error("down"))
    usePortfolioStore.getState().setFdAmount(2000)
    await vi.runAllTimersAsync()
    expect(repo.updatePortfolio).toHaveBeenCalledTimes(1)
    usePortfolioStore.getState().setAge(41)
    await vi.runAllTimersAsync()
    expect(repo.updatePortfolio).toHaveBeenLastCalledWith({ age: 41 })
    expect(repo.upsertSnapshot).toHaveBeenCalledTimes(3) // load, failed, retried
    expect(useSyncStore.getState().status).toBe("saved")
  })

  it("ignores a failure from a save that a newer one replaced", async () => {
    const first = deferred()
    repo.markBillPaid.mockReturnValueOnce(first.promise.then(() => Promise.reject(new Error("down"))))
    const { setCreditCardBillPaid, setFdAmount } = usePortfolioStore.getState()
    setCreditCardBillPaid({ year: 2026, month: 3, cardId: "sbi", paid: true })
    setCreditCardBillPaid({ year: 2026, month: 3, cardId: "sbi", paid: false })
    first.resolve()
    await vi.runAllTimersAsync()
    expect(useSyncStore.getState().status).toBe("saved")
    setFdAmount(5)
    await vi.runAllTimersAsync()
    expect(repo.markBillPaid).toHaveBeenCalledTimes(1) // the stale "paid" is never replayed
  })

  it("sends unsent edits and waits for sent ones before resetting", async () => {
    const inFlight = deferred()
    repo.markBillPaid.mockReturnValueOnce(inFlight.promise)
    usePortfolioStore.getState().setCreditCardBillPaid({ year: 2026, month: 3, cardId: "sbi", paid: true })
    usePortfolioStore.getState().setFdAmount(7) // still waiting on its debounce
    const done = usePortfolioStore.getState().reset()
    await vi.advanceTimersByTimeAsync(0)
    expect(repo.updatePortfolio).toHaveBeenCalledWith({ fdAmount: 7 })
    expect(repo.reset).not.toHaveBeenCalled()
    inFlight.resolve()
    await done
    expect(repo.reset).toHaveBeenCalledTimes(1)
    expect(usePortfolioStore.getState().creditCards).toEqual([card]) // reloaded from the (mocked) server
  })

  it("does not replay a save that failed during reset into the wiped account", async () => {
    const inFlight = deferred()
    repo.markBillPaid.mockReturnValueOnce(inFlight.promise.then(() => Promise.reject(new Error("down"))))
    usePortfolioStore.getState().setCreditCardBillPaid({ year: 2026, month: 3, cardId: "sbi", paid: true })
    const done = usePortfolioStore.getState().reset()
    inFlight.resolve()
    await done
    usePortfolioStore.getState().setFdAmount(5)
    await vi.runAllTimersAsync()
    expect(repo.markBillPaid).toHaveBeenCalledTimes(1)
    expect(useSyncStore.getState().status).toBe("saved")
  })

  it("keeps edits for retry when the reset itself fails", async () => {
    repo.updatePortfolio.mockRejectedValueOnce(new Error("down"))
    repo.reset.mockRejectedValueOnce(new Error("down"))
    usePortfolioStore.getState().setFdAmount(7)
    await expect(usePortfolioStore.getState().reset()).rejects.toThrow("down")
    expect(usePortfolioStore.getState().fdAmount).toBe(7)
    usePortfolioStore.getState().setAge(50)
    await vi.runAllTimersAsync()
    expect(repo.updatePortfolio).toHaveBeenLastCalledWith({ fdAmount: 7, age: 50 })
  })
})

describe("useTrackersStore", () => {
  it("ignores taps until the saved days have loaded", () => {
    useTrackersStore.setState({ trackers: {}, loaded: false })
    useTrackersStore.getState().toggleDay("gym", "2026-05-01")
    expect(repo.markTrackerDay).not.toHaveBeenCalled()
    expect(useTrackersStore.getState().isActiveDay("gym", "2026-05-01")).toBe(false)
  })

  it("sends mark and unmark for a day in order", async () => {
    useTrackersStore.setState({ trackers: {}, loaded: true })
    const first = deferred()
    repo.markTrackerDay.mockReturnValueOnce(first.promise)
    const { toggleDay } = useTrackersStore.getState()
    toggleDay("gym", "2026-05-01")
    toggleDay("gym", "2026-05-01")
    await vi.advanceTimersByTimeAsync(0)
    expect(repo.unmarkTrackerDay).not.toHaveBeenCalled()
    first.resolve()
    await vi.runAllTimersAsync()
    expect(repo.unmarkTrackerDay).toHaveBeenCalledWith("gym", "2026-05-01")
  })
})
