import { create } from "zustand"

import {
  DEFAULT_BILLS,
  DEFAULT_CARDS,
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

export type {
  CreditCardConfig,
  CreditCardMonthlyEntry,
  CreditCardYearData,
  InsuranceDetails,
} from "@/data"

const SEEDED_CREDIT_CARD_DATA_2025: CreditCardYearData = {
  "sbi-cashback": seedYear({
    cashback: { 1: 0, 2: 171, 3: 603, 4: 1347, 5: 585, 6: 1299, 7: 487, 8: 2559, 9: 433, 10: 5000, 11: 607, 12: 507 },
    expenses: { 1: 0, 2: 4637, 3: 15829, 4: 39176, 5: 18465, 6: 28095, 7: 11737, 8: 59227, 9: 7007, 10: 100147, 11: 37657.56, 12: 9581.94 },
  }),
  "airtel-axis": seedYear({
    cashback: { 1: 0, 2: 662, 3: 424, 4: 340, 5: 314, 6: 663, 7: 505, 8: 325, 9: 639, 10: 631, 11: 669, 12: 680 },
    expenses: { 1: 0, 2: 6625.31, 3: 2108, 4: 3203, 5: 7900.07, 6: 4166.76, 7: 2331.31, 8: 8781.08, 9: 5725.11, 10: 6891.54, 11: 7371.3, 12: 1154.24 },
  }),
  "phonepe-sbi": seedYear({
    cashback: { 12: 2500 },
    expenses: { 11: 3268.61, 12: 41740.93 },
  }),
  "kotak-platinum": seedYear({
    cashback: { 9: 43, 10: 486, 11: 500, 12: 500 },
    expenses: {},
  }),
  "tata-neu-plus": seedYear({
    cashback: { 2: 105, 3: 133, 4: 15, 5: 322, 6: 10, 7: 11, 8: 9, 10: 46, 11: 51 },
    expenses: { 3: 24907, 4: 17955, 5: 12794, 6: 29119, 7: 9386, 8: 5286, 9: 4611, 10: 9655, 11: 19241 },
  }),
  "amazon-icici": seedYear({
    cashback: { 3: 297, 4: 1, 5: 576, 9: 446, 11: 993, 12: 496 },
    expenses: { 3: 5946, 4: 50, 5: 11549, 10: 27619.88, 11: 19871, 12: 9926 },
  }),
  "hdfc-millenia": seedYear({
    cashback: { 10: 171 },
    expenses: { 3: 4632, 4: 50, 10: 3384 },
  }),
  "indusind-tiger": seedYear({
    cashback: {},
    expenses: { 10: 2 },
  }),
}

const SEEDED_CREDIT_CARD_DATA_2026: CreditCardYearData = {
  "kotak-platinum": seedYear({
    cashback: { 1: 500, 2: 500, 3: 500, 4: 192, 5: 200 },
    expenses: {},
  }),
  "sbi-cashback": seedYear({
    cashback: { 1: 441, 2: 145, 3: 51, 4: 557 },
    expenses: { 1: 8370, 2: 3661, 4: 10921 },
  }),
  "phonepe-sbi": seedYear({
    cashback: { 1: 3500, 2: 3000, 4: 3000 },
    expenses: { 1: 29507, 2: 147069, 3: 10777, 4: 140738 },
  }),
  "airtel-axis": seedYear({
    cashback: { 1: 183, 2: 557, 3: 397, 4: 662, 5: 317 },
    expenses: { 1: 5993.64, 2: 3440.18, 3: 4781.52, 4: 2517.65 },
  }),
  "amazon-icici": seedYear({
    cashback: { 1: 394, 2: 1092, 4: 4 },
    expenses: { 1: 7895, 2: 21847, 4: 215 },
  }),
  "hdfc-millenia": seedYear({ cashback: {}, expenses: {} }),
  "indusind-tiger": seedYear({
    cashback: {},
    expenses: { 2: 1004, 4: 353 },
  }),
}

const SEEDED_CREDIT_CARDS_BY_YEAR: Record<number, CreditCardYearData> = {
  2025: SEEDED_CREDIT_CARD_DATA_2025,
  2026: SEEDED_CREDIT_CARD_DATA_2026,
}

function emptyMonthMap(): Record<number, number> {
  const m: Record<number, number> = {}
  for (let i = 1; i <= 12; i += 1) m[i] = 0
  return m
}

function seedYear(seed: {
  cashback?: Partial<Record<number, number>>
  expenses?: Partial<Record<number, number>>
}) {
  const cashback = emptyMonthMap()
  const expenses = emptyMonthMap()
  for (const [k, v] of Object.entries(seed.cashback ?? {})) cashback[Number(k)] = Number(v ?? 0)
  for (const [k, v] of Object.entries(seed.expenses ?? {})) expenses[Number(k)] = Number(v ?? 0)
  return { cashback, expenses }
}

// One-time rename of stock cards from earlier defaults to current naming.
// Only applies when the card still carries the previous default name verbatim,
// so user-customized names are never overwritten.
const STOCK_CARD_RENAMES: Record<string, { from: string; to: string }> = {
  "phonepe-sbi": { from: "PhonePe SBI", to: "SBI PhonePe" },
  // Undo an earlier accidental rename of the stock Airtel Axis card.
  "airtel-axis": { from: "HSBC Live+", to: "Airtel Axis" },
}

function renameDefaultCards(cards: CreditCardConfig[]): CreditCardConfig[] {
  return cards.map((card) => {
    const rule = STOCK_CARD_RENAMES[card.id]
    if (!rule) return card
    if (card.name !== rule.from) return card
    return { ...card, name: rule.to }
  })
}

// If a stock card was deleted but historical data for it still exists,
// re-add the card config so the data is reachable in the UI again.
function restoreStockCardIfDataExists(
  cards: CreditCardConfig[],
  dataByYear: Record<number, CreditCardYearData>,
  cardId: string,
): CreditCardConfig[] {
  if (cards.some((c) => c.id === cardId)) return cards

  let hasData = false
  for (const yearData of Object.values(dataByYear)) {
    const entry = yearData[cardId]
    if (!entry) continue
    const values = [
      ...Object.values(entry.cashback ?? {}),
      ...Object.values(entry.expenses ?? {}),
    ]
    if (values.some((v) => Number(v) > 0)) {
      hasData = true
      break
    }
  }
  if (!hasData) return cards

  const stock = DEFAULT_CARDS.creditCards.find((c) => c.id === cardId)
  if (!stock) return cards
  return [...cards, stock]
}

// User-saved values win where set (non-zero). Seed fills empty/zero cells.
function mergeCardsByYear(
  seed: Record<number, CreditCardYearData>,
  user: Record<number, CreditCardYearData>,
): Record<number, CreditCardYearData> {
  const out: Record<number, CreditCardYearData> = {}
  const years = new Set<number>()
  for (const y of Object.keys(seed)) years.add(Number(y))
  for (const y of Object.keys(user)) years.add(Number(y))

  for (const year of years) {
    const seedYearData = seed[year] ?? {}
    const userYearData = user[year] ?? {}
    const cardIds = new Set<string>([
      ...Object.keys(seedYearData),
      ...Object.keys(userYearData),
    ])
    const mergedYear: CreditCardYearData = {}

    for (const cardId of cardIds) {
      const seedCard = seedYearData[cardId]
      const userCard = userYearData[cardId]
      if (!seedCard) {
        mergedYear[cardId] = userCard!
        continue
      }
      if (!userCard) {
        mergedYear[cardId] = seedCard
        continue
      }
      const cashback: Record<number, number> = {}
      const expenses: Record<number, number> = {}
      for (let m = 1; m <= 12; m += 1) {
        const uc = userCard.cashback?.[m] ?? 0
        const sc = seedCard.cashback?.[m] ?? 0
        cashback[m] = uc !== 0 ? uc : sc
        const ue = userCard.expenses?.[m] ?? 0
        const se = seedCard.expenses?.[m] ?? 0
        expenses[m] = ue !== 0 ? ue : se
      }
      mergedYear[cardId] = { cashback, expenses }
    }

    out[year] = mergedYear
  }
  return out
}

const clampNonNeg = (n: number) => (Number.isFinite(n) && n > 0 ? n : Math.max(0, Number.isFinite(n) ? n : 0))
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
  creditCards: DEFAULT_CARDS.creditCards,
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

    const mergedCardsByYear = mergeCardsByYear(
      SEEDED_CREDIT_CARDS_BY_YEAR,
      cards?.creditCardDataByYear ?? {},
    )

    const renamedCards = renameDefaultCards(cards?.creditCards ?? DEFAULT_CARDS.creditCards)
    const migratedCards = restoreStockCardIfDataExists(
      renamedCards,
      mergedCardsByYear,
      "tata-neu-plus",
    )

    const loadedPortfolio = portfolio ?? DEFAULT_PORTFOLIO

    set({
      ...loadedPortfolio,
      // Older saved data has no `enabled` flag; default it on so existing
      // insurance stays visible until the user explicitly turns it off.
      lifeInsurance: { ...loadedPortfolio.lifeInsurance, enabled: loadedPortfolio.lifeInsurance.enabled ?? true },
      healthInsurance: { ...loadedPortfolio.healthInsurance, enabled: loadedPortfolio.healthInsurance.enabled ?? true },
      creditCards: migratedCards,
      creditCardDataByYear: mergedCardsByYear,
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
      creditCards: DEFAULT_CARDS.creditCards,
      creditCardDataByYear: { ...SEEDED_CREDIT_CARDS_BY_YEAR },
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

function todayKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
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
    void repository.savePortfolio(pickPortfolio(s))
  }, 400)
}

function scheduleCardsSave(getState: () => PortfolioState) {
  if (cardsSaveTimer) clearTimeout(cardsSaveTimer)
  cardsSaveTimer = setTimeout(() => {
    const s = getState()
    if (!s.loaded) return
    void repository.saveCreditCards(pickCards(s))
  }, 400)
}

function scheduleBillsSave(getState: () => PortfolioState) {
  if (billsSaveTimer) clearTimeout(billsSaveTimer)
  billsSaveTimer = setTimeout(() => {
    const s = getState()
    if (!s.loaded) return
    void repository.saveBills(s.bills)
  }, 200)
}

function scheduleSnapshot(getState: () => PortfolioState) {
  if (snapshotTimer) clearTimeout(snapshotTimer)
  snapshotTimer = setTimeout(async () => {
    const s = getState()
    if (!s.loaded) return
    const snap = snapshotFromState(s)
    if (snap.netWorth <= 0 && snap.emergencyFund <= 0) return
    await repository.upsertSnapshot(snap)
    const next = await repository.listSnapshots()
    usePortfolioStore.setState({ snapshots: next })
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
