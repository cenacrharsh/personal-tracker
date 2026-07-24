import { create } from "zustand"

import {
  DEFAULT_BILLS,
  DEFAULT_PORTFOLIO,
  repository,
  type BillsData,
  type CreditCardConfig,
  type CreditCardsData,
  type CreditCardYearData,
  type InsuranceDetails,
  type PortfolioData,
  type Snapshot,
} from "@/data"
import { computeTotals, type PortfolioInputs } from "@/lib/portfolioMath"
import { clampNonNeg } from "@/lib/money"
import { todayKey } from "@/lib/dates"
import { trackSave } from "@/store/useSyncStore"

export type {
  CreditCardConfig,
  CreditCardMonthlyEntry,
  CreditCardYearData,
  InsuranceDetails,
} from "@/data"

function emptyMonthMap(): Record<number, number> {
  const m: Record<number, number> = {}
  for (let i = 1; i <= 12; i += 1) m[i] = 0
  return m
}

const clampMonth = (n: number) => {
  const v = Math.round(Number.isFinite(n) ? n : 1)
  return Math.min(12, Math.max(1, v))
}

export type PortfolioState = PortfolioData & {
  creditCards: CreditCardConfig[]
  creditCardDataByYear: Record<number, CreditCardYearData>

  loaded: boolean
  snapshots: Snapshot[]
  bills: BillsData

  setAge: (age: number) => void
  setMonthlyIncome: (v: number) => void
  setSilverEnabled: (enabled: boolean) => void

  setZerodhaTotal: (v: number) => void
  setZerodhaGoldEtf: (v: number) => void
  setZerodhaSilverEtf: (v: number) => void

  setMfTotal: (v: number) => void
  setMfGold: (v: number) => void
  setMfSilver: (v: number) => void

  setFdAmount: (v: number) => void
  setRdAmount: (v: number) => void
  setEpfPpfAmount: (v: number) => void

  setCurrentEmergencyFund: (v: number) => void

  setLifeInsurance: (details: Partial<InsuranceDetails>) => void
  setHealthInsurance: (details: Partial<InsuranceDetails>) => void

  setCreditCardMonthValue: (params: {
    year: number
    cardId: string
    month: number
    field: "cashback" | "expenses"
    value: number
  }) => void
  setCreditCardMeta: (cardId: string, details: Partial<Omit<CreditCardConfig, "id">>) => void
  addCreditCard: (name: string) => void
  removeCreditCard: (cardId: string) => void

  setCreditCardBillPaid: (params: { year: number; month: number; cardId: string; paid: boolean }) => void
  setInsuranceBillPaid: (params: { year: number; type: "life" | "health"; paid: boolean }) => void

  reset: () => Promise<void>
  hydrate: () => Promise<void>
}

export const ccBillKey = (year: number, month: number, cardId: string) => `${year}-${month}-${cardId}`
export const insuranceBillKey = (year: number, type: "life" | "health") => `${year}-${type}`

export const usePortfolioStore = create<PortfolioState>()((set) => ({
  ...DEFAULT_PORTFOLIO,
  creditCards: [],
  creditCardDataByYear: {},
  loaded: false,
  snapshots: [],
  bills: DEFAULT_BILLS,

  hydrate: async () => {
    const [portfolio, cards, snapshots, bills] = await Promise.all([
      repository.getPortfolio(),
      repository.getCreditCards(),
      repository.listSnapshots(),
      repository.getBills(),
    ])

    const loadedPortfolio = portfolio ?? DEFAULT_PORTFOLIO

    set({
      ...loadedPortfolio,
      // Older saved data has no `enabled` flag; default it on so existing
      // insurance stays visible until the user explicitly turns it off.
      lifeInsurance: { ...loadedPortfolio.lifeInsurance, enabled: loadedPortfolio.lifeInsurance.enabled ?? true },
      healthInsurance: { ...loadedPortfolio.healthInsurance, enabled: loadedPortfolio.healthInsurance.enabled ?? true },
      creditCards: cards?.creditCards ?? [],
      creditCardDataByYear: cards?.creditCardDataByYear ?? {},
      snapshots,
      bills: bills ?? DEFAULT_BILLS,
      loaded: true,
    })
  },

  setAge: (age) => set({ age: clampNonNeg(age) }),
  setMonthlyIncome: (monthlyIncome) => set({ monthlyIncome: clampNonNeg(monthlyIncome) }),
  setSilverEnabled: (enabled) =>
    set(() =>
      enabled
        ? { silverEnabled: true }
        : { silverEnabled: false, zerodhaSilverEtf: 0, mfSilver: 0 },
    ),

  setZerodhaTotal: (v) => set({ zerodhaTotal: clampNonNeg(v) }),
  setZerodhaGoldEtf: (v) => set({ zerodhaGoldEtf: clampNonNeg(v) }),
  setZerodhaSilverEtf: (v) =>
    set((s) => ({ zerodhaSilverEtf: s.silverEnabled ? clampNonNeg(v) : 0 })),

  setMfTotal: (v) => set({ mfTotal: clampNonNeg(v) }),
  setMfGold: (v) => set({ mfGold: clampNonNeg(v) }),
  setMfSilver: (v) =>
    set((s) => ({ mfSilver: s.silverEnabled ? clampNonNeg(v) : 0 })),

  setFdAmount: (v) => set({ fdAmount: clampNonNeg(v) }),
  setRdAmount: (v) => set({ rdAmount: clampNonNeg(v) }),
  setEpfPpfAmount: (v) => set({ epfPpfAmount: clampNonNeg(v) }),

  setCurrentEmergencyFund: (v) => set({ currentEmergencyFund: clampNonNeg(v) }),

  setLifeInsurance: (details) =>
    set((s) => ({
      lifeInsurance: {
        ...s.lifeInsurance,
        ...details,
        coverAmount:
          typeof details.coverAmount === "number" ? clampNonNeg(details.coverAmount) : s.lifeInsurance.coverAmount,
        premium:
          typeof details.premium === "number" ? clampNonNeg(details.premium) : s.lifeInsurance.premium,
      },
    })),
  setHealthInsurance: (details) =>
    set((s) => ({
      healthInsurance: {
        ...s.healthInsurance,
        ...details,
        coverAmount:
          typeof details.coverAmount === "number" ? clampNonNeg(details.coverAmount) : s.healthInsurance.coverAmount,
        premium:
          typeof details.premium === "number" ? clampNonNeg(details.premium) : s.healthInsurance.premium,
      },
    })),

  setCreditCardMonthValue: ({ year, cardId, month, field, value }) =>
    set((s) => {
      const safeYear = Math.round(Number.isFinite(year) ? year : new Date().getFullYear())
      const safeMonth = clampMonth(month)
      const safeValue = clampNonNeg(value)
      const yearData = s.creditCardDataByYear[safeYear] ?? {}
      const cardData =
        yearData[cardId] ?? { cashback: emptyMonthMap(), expenses: emptyMonthMap() }
      return {
        creditCardDataByYear: {
          ...s.creditCardDataByYear,
          [safeYear]: {
            ...yearData,
            [cardId]: {
              ...cardData,
              [field]: { ...cardData[field], [safeMonth]: safeValue },
            },
          },
        },
      }
    }),

  setCreditCardMeta: (cardId, details) =>
    set((s) => ({
      creditCards: s.creditCards.map((card) => {
        if (card.id !== cardId) return card
        return {
          ...card,
          ...details,
          anniversaryStartMonth:
            typeof details.anniversaryStartMonth === "number"
              ? clampMonth(details.anniversaryStartMonth)
              : card.anniversaryStartMonth,
          feeWaiverTarget:
            typeof details.feeWaiverTarget === "number"
              ? clampNonNeg(details.feeWaiverTarget)
              : card.feeWaiverTarget,
          status: details.status === "active" || details.status === "closed" ? details.status : card.status,
          annualFeeType:
            details.annualFeeType === "ltf" || details.annualFeeType === "paid"
              ? details.annualFeeType
              : card.annualFeeType,
          annualFeeAmount:
            typeof details.annualFeeAmount === "number"
              ? clampNonNeg(details.annualFeeAmount)
              : card.annualFeeAmount,
          creditLimit:
            typeof details.creditLimit === "number" ? clampNonNeg(details.creditLimit) : card.creditLimit,
          benefitsNote: typeof details.benefitsNote === "string" ? details.benefitsNote : card.benefitsNote,
        }
      }),
    })),

  addCreditCard: (name) =>
    set((s) => {
      const trimmed = name.trim()
      if (!trimmed) return {}
      const baseId = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      const id = `${baseId || "card"}-${Date.now().toString(36)}`
      return {
        creditCards: [
          ...s.creditCards,
          {
            id,
            name: trimmed,
            anniversaryStartMonth: 1,
            feeWaiverTarget: 0,
            status: "active",
            annualFeeType: "ltf",
            annualFeeAmount: 0,
            creditLimit: 0,
            benefitsNote: "",
          },
        ],
      }
    }),

  removeCreditCard: (cardId) =>
    set((s) => {
      const nextCards = s.creditCards.filter((c) => c.id !== cardId)
      const nextByYear: Record<number, CreditCardYearData> = {}
      for (const [yk, yv] of Object.entries(s.creditCardDataByYear)) {
        const next: CreditCardYearData = {}
        for (const [cid, entry] of Object.entries(yv)) {
          if (cid !== cardId) next[cid] = entry
        }
        nextByYear[Number(yk)] = next
      }
      return { creditCards: nextCards, creditCardDataByYear: nextByYear }
    }),

  setCreditCardBillPaid: ({ year, month, cardId, paid }) =>
    set((s) => {
      const key = ccBillKey(year, clampMonth(month), cardId)
      const next = { ...s.bills.creditCards }
      if (paid) {
        next[key] = { paid: true, paidAt: Date.now() }
      } else {
        delete next[key]
      }
      return { bills: { ...s.bills, creditCards: next } }
    }),

  setInsuranceBillPaid: ({ year, type, paid }) =>
    set((s) => {
      const key = insuranceBillKey(year, type)
      const next = { ...s.bills.insurance }
      if (paid) {
        next[key] = { paid: true, paidAt: Date.now() }
      } else {
        delete next[key]
      }
      return { bills: { ...s.bills, insurance: next } }
    }),

  reset: async () => {
    await repository.reset()
    set({
      ...DEFAULT_PORTFOLIO,
      creditCards: [],
      creditCardDataByYear: {},
      snapshots: [],
      bills: DEFAULT_BILLS,
    })
  },
}))

function pickPortfolio(s: PortfolioState): PortfolioData {
  return {
    age: s.age,
    monthlyIncome: s.monthlyIncome,
    silverEnabled: s.silverEnabled,
    zerodhaTotal: s.zerodhaTotal,
    zerodhaGoldEtf: s.zerodhaGoldEtf,
    zerodhaSilverEtf: s.zerodhaSilverEtf,
    mfTotal: s.mfTotal,
    mfGold: s.mfGold,
    mfSilver: s.mfSilver,
    fdAmount: s.fdAmount,
    rdAmount: s.rdAmount,
    epfPpfAmount: s.epfPpfAmount,
    currentEmergencyFund: s.currentEmergencyFund,
    lifeInsurance: s.lifeInsurance,
    healthInsurance: s.healthInsurance,
  }
}

function pickCards(s: PortfolioState): CreditCardsData {
  return {
    creditCards: s.creditCards,
    creditCardDataByYear: s.creditCardDataByYear,
  }
}

function snapshotFromState(s: PortfolioState): Snapshot {
  const inputs: PortfolioInputs = pickPortfolio(s)
  const totals = computeTotals(inputs)
  return {
    date: todayKey(),
    ts: Date.now(),
    netWorth: totals.totalPortfolioValue,
    equity: totals.totalEquity,
    gold: totals.totalGold,
    silver: totals.totalSilver,
    debt: totals.totalDebt,
    emergencyFund: s.currentEmergencyFund,
  }
}

let portfolioSaveTimer: ReturnType<typeof setTimeout> | null = null
let cardsSaveTimer: ReturnType<typeof setTimeout> | null = null
let billsSaveTimer: ReturnType<typeof setTimeout> | null = null
let snapshotTimer: ReturnType<typeof setTimeout> | null = null

function schedulePortfolioSave(getState: () => PortfolioState) {
  if (portfolioSaveTimer) clearTimeout(portfolioSaveTimer)
  portfolioSaveTimer = setTimeout(() => {
    const s = getState()
    if (!s.loaded) return
    trackSave(
      () => repository.savePortfolio(pickPortfolio(s)),
      () => {
        portfolioFingerprint = ""
      },
    )
  }, 400)
}

function scheduleCardsSave(getState: () => PortfolioState) {
  if (cardsSaveTimer) clearTimeout(cardsSaveTimer)
  cardsSaveTimer = setTimeout(() => {
    const s = getState()
    if (!s.loaded) return
    trackSave(
      () => repository.saveCreditCards(pickCards(s)),
      () => {
        cardsFingerprint = ""
      },
    )
  }, 400)
}

function scheduleBillsSave(getState: () => PortfolioState) {
  if (billsSaveTimer) clearTimeout(billsSaveTimer)
  billsSaveTimer = setTimeout(() => {
    const s = getState()
    if (!s.loaded) return
    trackSave(
      () => repository.saveBills(s.bills),
      () => {
        billsFingerprint = ""
      },
    )
  }, 200)
}

function scheduleSnapshot(getState: () => PortfolioState) {
  if (snapshotTimer) clearTimeout(snapshotTimer)
  snapshotTimer = setTimeout(() => {
    const s = getState()
    if (!s.loaded) return
    const snap = snapshotFromState(s)
    if (snap.netWorth <= 0 && snap.emergencyFund <= 0) return
    trackSave(
      async () => {
        await repository.upsertSnapshot(snap)
        const next = await repository.listSnapshots()
        usePortfolioStore.setState({ snapshots: next })
      },
      () => {
        snapshotFingerprint = ""
      },
    )
  }, 1500)
}

let portfolioFingerprint = ""
let cardsFingerprint = ""
let billsFingerprint = ""
let snapshotFingerprint = ""

usePortfolioStore.subscribe((state) => {
  if (!state.loaded) return

  const portfolioFp = JSON.stringify(pickPortfolio(state))
  if (portfolioFp !== portfolioFingerprint) {
    portfolioFingerprint = portfolioFp
    schedulePortfolioSave(usePortfolioStore.getState)
  }

  const cardsFp = JSON.stringify(pickCards(state))
  if (cardsFp !== cardsFingerprint) {
    cardsFingerprint = cardsFp
    scheduleCardsSave(usePortfolioStore.getState)
  }

  const billsFp = JSON.stringify(state.bills)
  if (billsFp !== billsFingerprint) {
    billsFingerprint = billsFp
    scheduleBillsSave(usePortfolioStore.getState)
  }

  const snapFp = `${state.zerodhaTotal}|${state.zerodhaGoldEtf}|${state.zerodhaSilverEtf}|${state.mfTotal}|${state.mfGold}|${state.mfSilver}|${state.fdAmount}|${state.rdAmount}|${state.epfPpfAmount}|${state.currentEmergencyFund}|${state.silverEnabled}`
  if (snapFp !== snapshotFingerprint) {
    snapshotFingerprint = snapFp
    scheduleSnapshot(usePortfolioStore.getState)
  }
})
