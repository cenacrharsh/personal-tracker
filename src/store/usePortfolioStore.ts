import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type InsuranceDetails = {
  coverAmount: number
  premium: number
  renewalDate: string // ISO: YYYY-MM-DD
}

export type CreditCardConfig = {
  id: string
  name: string
  anniversaryStartMonth: number // 1-12
  feeWaiverTarget: number
  status: "active" | "closed"
  annualFeeType: "ltf" | "paid"
  annualFeeAmount: number
  creditLimit: number
  benefitsNote: string
}

export type CreditCardMonthlyEntry = {
  cashback: Record<number, number>
  expenses: Record<number, number>
}

export type CreditCardYearData = Record<string, CreditCardMonthlyEntry>

const DEFAULT_CREDIT_CARDS: CreditCardConfig[] = [
  { id: "sbi-cashback", name: "SBI Cashback", anniversaryStartMonth: 1, feeWaiverTarget: 200000, status: "active", annualFeeType: "paid", annualFeeAmount: 999, creditLimit: 0, benefitsNote: "5% cashback on online spends." },
  { id: "airtel-axis", name: "Airtel Axis", anniversaryStartMonth: 1, feeWaiverTarget: 200000, status: "active", annualFeeType: "paid", annualFeeAmount: 500, creditLimit: 0, benefitsNote: "Great for Airtel, utilities and selected merchants." },
  { id: "phonepe-sbi", name: "PhonePe SBI", anniversaryStartMonth: 1, feeWaiverTarget: 50000, status: "active", annualFeeType: "paid", annualFeeAmount: 499, creditLimit: 0, benefitsNote: "Use for PhonePe-linked campaigns and reward offers." },
  { id: "kotak-platinum", name: "Kotak Platinum", anniversaryStartMonth: 1, feeWaiverTarget: 75000, status: "active", annualFeeType: "ltf", annualFeeAmount: 0, creditLimit: 0, benefitsNote: "Keep for backup and occasional offer-based transactions." },
  { id: "tata-neu-plus", name: "Tata Neu Plus", anniversaryStartMonth: 1, feeWaiverTarget: 200000, status: "closed", annualFeeType: "paid", annualFeeAmount: 499, creditLimit: 0, benefitsNote: "Closed card. Keep historical records for prior year tracking." },
  { id: "amazon-icici", name: "Amazon ICICI", anniversaryStartMonth: 1, feeWaiverTarget: 0, status: "active", annualFeeType: "ltf", annualFeeAmount: 0, creditLimit: 0, benefitsNote: "Best for Amazon purchases and partner offers." },
  { id: "hdfc-millenia", name: "HDFC Millenia", anniversaryStartMonth: 1, feeWaiverTarget: 100000, status: "active", annualFeeType: "paid", annualFeeAmount: 1000, creditLimit: 0, benefitsNote: "Use for merchant categories with accelerated points." },
  { id: "indusind-tiger", name: "IndusInd Tiger", anniversaryStartMonth: 1, feeWaiverTarget: 50000, status: "active", annualFeeType: "ltf", annualFeeAmount: 0, creditLimit: 0, benefitsNote: "Use for specific card offers and complimentary benefits." },
]

export type PortfolioState = {
  // Global Inputs
  age: number
  monthlyIncome: number
  silverEnabled: boolean

  // Asset Inputs (Brokerage - Zerodha)
  zerodhaTotal: number
  zerodhaGoldEtf: number
  zerodhaSilverEtf: number

  // Asset Inputs (Mutual Funds)
  mfTotal: number
  mfGold: number
  mfSilver: number

  // Debt Breakdown
  fdAmount: number
  rdAmount: number
  epfPpfAmount: number

  // Shields (Emergency Fund)
  currentEmergencyFund: number

  // Insurance (static defaults; user can edit)
  lifeInsurance: InsuranceDetails
  healthInsurance: InsuranceDetails

  // Credit Cards Tracker
  creditCards: CreditCardConfig[]
  creditCardDataByYear: Record<number, CreditCardYearData>

  // Actions
  setAge: (age: number) => void
  setMonthlyIncome: (monthlyIncome: number) => void
  setSilverEnabled: (enabled: boolean) => void

  setZerodhaTotal: (value: number) => void
  setZerodhaGoldEtf: (value: number) => void
  setZerodhaSilverEtf: (value: number) => void

  setMfTotal: (value: number) => void
  setMfGold: (value: number) => void
  setMfSilver: (value: number) => void

  setFdAmount: (value: number) => void
  setRdAmount: (value: number) => void
  setEpfPpfAmount: (value: number) => void

  setCurrentEmergencyFund: (value: number) => void

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

  reset: () => void
}

const clampNonNegative = (n: number) => (Number.isFinite(n) && n > 0 ? n : Math.max(0, Number.isFinite(n) ? n : 0))
const clampMonth = (n: number) => {
  const v = Math.round(Number.isFinite(n) ? n : 1)
  if (v < 1) return 1
  if (v > 12) return 12
  return v
}
const currentYear = new Date().getFullYear()

function createEmptyMonthMap() {
  const result: Record<number, number> = {}
  for (let month = 1; month <= 12; month += 1) {
    result[month] = 0
  }
  return result
}

function createEmptyCardYearEntry(): CreditCardMonthlyEntry {
  return {
    cashback: createEmptyMonthMap(),
    expenses: createEmptyMonthMap(),
  }
}

function createCardYearEntryWithSeed(seed: {
  cashback?: Partial<Record<number, number>>
  expenses?: Partial<Record<number, number>>
}): CreditCardMonthlyEntry {
  const cashback = createEmptyMonthMap()
  const expenses = createEmptyMonthMap()

  for (const [monthKey, value] of Object.entries(seed.cashback ?? {})) {
    cashback[Number(monthKey)] = Number(value ?? 0)
  }
  for (const [monthKey, value] of Object.entries(seed.expenses ?? {})) {
    expenses[Number(monthKey)] = Number(value ?? 0)
  }

  return {
    cashback,
    expenses,
  }
}

const SEEDED_CREDIT_CARD_YEAR = 2026
const SEEDED_CREDIT_CARD_DATA_2025: CreditCardYearData = {
  "sbi-cashback": createCardYearEntryWithSeed({
    cashback: { 1: 0, 2: 171, 3: 603, 4: 1347, 5: 585, 6: 1299, 7: 487, 8: 2559, 9: 433, 10: 5000, 11: 607, 12: 507 },
    expenses: { 1: 0, 2: 4637, 3: 15829, 4: 39176, 5: 18465, 6: 28095, 7: 11737, 8: 59227, 9: 7007, 10: 100147, 11: 37657.56, 12: 9581.94 },
  }),
  "airtel-axis": createCardYearEntryWithSeed({
    cashback: { 1: 0, 2: 662, 3: 424, 4: 340, 5: 314, 6: 663, 7: 505, 8: 325, 9: 639, 10: 631, 11: 669, 12: 680 },
    expenses: { 1: 0, 2: 6625.31, 3: 2108, 4: 3203, 5: 7900.07, 6: 4166.76, 7: 2331.31, 8: 8781.08, 9: 5725.11, 10: 6891.54, 11: 7371.3, 12: 1154.24 },
  }),
  "phonepe-sbi": createCardYearEntryWithSeed({
    cashback: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 2500 },
    expenses: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 3268.61, 12: 41740.93 },
  }),
  "kotak-platinum": createCardYearEntryWithSeed({
    cashback: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 43, 10: 486, 11: 500, 12: 500 },
    expenses: {},
  }),
  "tata-neu-plus": createCardYearEntryWithSeed({
    cashback: { 1: 0, 2: 105, 3: 133, 4: 15, 5: 322, 6: 10, 7: 11, 8: 9, 9: 0, 10: 46, 11: 51, 12: 0 },
    expenses: { 1: 0, 2: 0, 3: 24907, 4: 17955, 5: 12794, 6: 29119, 7: 9386, 8: 5286, 9: 4611, 10: 9655, 11: 19241, 12: 0 },
  }),
  "amazon-icici": createCardYearEntryWithSeed({
    cashback: { 1: 0, 2: 0, 3: 297, 4: 1, 5: 576, 6: 0, 7: 0, 8: 0, 9: 446, 10: 0, 11: 993, 12: 496 },
    expenses: { 1: 0, 2: 0, 3: 5946, 4: 50, 5: 11549, 6: 0, 7: 0, 8: 0, 9: 0, 10: 27619.88, 11: 19871, 12: 9926 },
  }),
  "hdfc-millenia": createCardYearEntryWithSeed({
    cashback: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 171, 11: 0, 12: 0 },
    expenses: { 1: 0, 2: 0, 3: 4632, 4: 50, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 3384, 11: 0, 12: 0 },
  }),
  "indusind-tiger": createCardYearEntryWithSeed({
    cashback: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
    expenses: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 2, 11: 0, 12: 0 },
  }),
}
const SEEDED_CREDIT_CARD_DATA_2026: CreditCardYearData = {
  "kotak-platinum": createCardYearEntryWithSeed({
    cashback: { 1: 500, 2: 500, 3: 500 },
    expenses: {},
  }),
  "sbi-cashback": createCardYearEntryWithSeed({
    cashback: { 1: 441, 2: 145, 3: 51 },
    expenses: { 1: 8370, 2: 3661, 3: 0 },
  }),
  "phonepe-sbi": createCardYearEntryWithSeed({
    cashback: { 1: 3500, 2: 3000, 3: 0 },
    expenses: { 1: 29507, 2: 147069, 3: 10777 },
  }),
  "airtel-axis": createCardYearEntryWithSeed({
    cashback: { 1: 183, 2: 557, 3: 397, 4: 662 },
    expenses: { 1: 5993.64, 2: 3440.18, 3: 4781.52 },
  }),
  "amazon-icici": createCardYearEntryWithSeed({
    cashback: { 1: 394, 2: 1092, 3: 0, 4: 0 },
    expenses: { 1: 7895, 2: 21847, 3: 0 },
  }),
  "hdfc-millenia": createCardYearEntryWithSeed({
    cashback: { 1: 0, 2: 0, 3: 0, 4: 0 },
    expenses: { 1: 0, 2: 0, 3: 0 },
  }),
  "indusind-tiger": createCardYearEntryWithSeed({
    cashback: { 1: 0, 2: 0, 3: 0, 4: 0 },
    expenses: { 1: 0, 2: 1004, 3: 0 },
  }),
}

type PortfolioStateData = Omit<
  PortfolioState,
  | "setAge"
  | "setMonthlyIncome"
  | "setSilverEnabled"
  | "setZerodhaTotal"
  | "setZerodhaGoldEtf"
  | "setZerodhaSilverEtf"
  | "setMfTotal"
  | "setMfGold"
  | "setMfSilver"
  | "setFdAmount"
  | "setRdAmount"
  | "setEpfPpfAmount"
  | "setCurrentEmergencyFund"
  | "setLifeInsurance"
  | "setHealthInsurance"
  | "setCreditCardMonthValue"
  | "setCreditCardMeta"
  | "addCreditCard"
  | "removeCreditCard"
  | "reset"
>

const initialState: PortfolioStateData = {
  age: 30,
  monthlyIncome: 100000,
  silverEnabled: true,

  zerodhaTotal: 0,
  zerodhaGoldEtf: 0,
  zerodhaSilverEtf: 0,

  mfTotal: 0,
  mfGold: 0,
  mfSilver: 0,

  fdAmount: 0,
  rdAmount: 0,
  epfPpfAmount: 0,

  currentEmergencyFund: 0,

  lifeInsurance: {
    coverAmount: 0,
    premium: 0,
    renewalDate: "2030-01-01",
  },
  healthInsurance: {
    coverAmount: 0,
    premium: 0,
    renewalDate: "2030-01-01",
  },
  creditCards: DEFAULT_CREDIT_CARDS,
  creditCardDataByYear: {
    [currentYear]: {},
    2025: SEEDED_CREDIT_CARD_DATA_2025,
    [SEEDED_CREDIT_CARD_YEAR]: SEEDED_CREDIT_CARD_DATA_2026,
  },
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      ...initialState,

      setAge: (age) => set({ age: clampNonNegative(age) }),
      setMonthlyIncome: (monthlyIncome) => set({ monthlyIncome: clampNonNegative(monthlyIncome) }),
      setSilverEnabled: (enabled) =>
        set(() => {
          if (enabled) return { silverEnabled: true }
          // When silver is disabled, force all silver ETF values to 0 (as required).
          return {
            silverEnabled: false,
            zerodhaSilverEtf: 0,
            mfSilver: 0,
          }
        }),

      setZerodhaTotal: (value) => set({ zerodhaTotal: clampNonNegative(value) }),
      setZerodhaGoldEtf: (value) => set({ zerodhaGoldEtf: clampNonNegative(value) }),
      setZerodhaSilverEtf: (value) =>
        set((state) => ({
          zerodhaSilverEtf: state.silverEnabled ? clampNonNegative(value) : 0,
        })),

      setMfTotal: (value) => set({ mfTotal: clampNonNegative(value) }),
      setMfGold: (value) => set({ mfGold: clampNonNegative(value) }),
      setMfSilver: (value) =>
        set((state) => ({
          mfSilver: state.silverEnabled ? clampNonNegative(value) : 0,
        })),

      setFdAmount: (value) => set({ fdAmount: clampNonNegative(value) }),
      setRdAmount: (value) => set({ rdAmount: clampNonNegative(value) }),
      setEpfPpfAmount: (value) => set({ epfPpfAmount: clampNonNegative(value) }),

      setCurrentEmergencyFund: (value) => set({ currentEmergencyFund: clampNonNegative(value) }),

      setLifeInsurance: (details) =>
        set((state) => ({
          lifeInsurance: {
            ...state.lifeInsurance,
            ...details,
            coverAmount:
              typeof details.coverAmount === "number" ? clampNonNegative(details.coverAmount) : state.lifeInsurance.coverAmount,
            premium:
              typeof details.premium === "number" ? clampNonNegative(details.premium) : state.lifeInsurance.premium,
          },
        })),
      setHealthInsurance: (details) =>
        set((state) => ({
          healthInsurance: {
            ...state.healthInsurance,
            ...details,
            coverAmount:
              typeof details.coverAmount === "number" ? clampNonNegative(details.coverAmount) : state.healthInsurance.coverAmount,
            premium:
              typeof details.premium === "number" ? clampNonNegative(details.premium) : state.healthInsurance.premium,
          },
        })),
      setCreditCardMonthValue: ({ year, cardId, month, field, value }) =>
        set((state) => {
          const safeYear = Math.round(Number.isFinite(year) ? year : currentYear)
          const safeMonth = clampMonth(month)
          const safeValue = clampNonNegative(value)
          const yearData = state.creditCardDataByYear[safeYear] ?? {}
          const cardData = yearData[cardId] ?? createEmptyCardYearEntry()

          return {
            creditCardDataByYear: {
              ...state.creditCardDataByYear,
              [safeYear]: {
                ...yearData,
                [cardId]: {
                  ...cardData,
                  [field]: {
                    ...cardData[field],
                    [safeMonth]: safeValue,
                  },
                },
              },
            },
          }
        }),
      setCreditCardMeta: (cardId, details) =>
        set((state) => ({
          creditCards: state.creditCards.map((card) => {
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
                  ? clampNonNegative(details.feeWaiverTarget)
                  : card.feeWaiverTarget,
              status: details.status === "active" || details.status === "closed" ? details.status : card.status,
              annualFeeType:
                details.annualFeeType === "ltf" || details.annualFeeType === "paid"
                  ? details.annualFeeType
                  : card.annualFeeType,
              annualFeeAmount:
                typeof details.annualFeeAmount === "number"
                  ? clampNonNegative(details.annualFeeAmount)
                  : card.annualFeeAmount,
              creditLimit:
                typeof details.creditLimit === "number" ? clampNonNegative(details.creditLimit) : card.creditLimit,
              benefitsNote: typeof details.benefitsNote === "string" ? details.benefitsNote : card.benefitsNote,
            }
          }),
        })),
      addCreditCard: (name) =>
        set((state) => {
          const trimmed = name.trim()
          if (!trimmed) return {}
          const baseId = trimmed
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
          const uniqueId = `${baseId || "card"}-${Date.now().toString(36)}`
          return {
            creditCards: [
              ...state.creditCards,
              {
                id: uniqueId,
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
        set((state) => {
          const nextCards = state.creditCards.filter((card) => card.id !== cardId)
          const nextDataByYear: Record<number, CreditCardYearData> = {}

          for (const [yearKey, yearData] of Object.entries(state.creditCardDataByYear)) {
            const yearNum = Number(yearKey)
            const nextYearData: CreditCardYearData = {}
            for (const [existingCardId, entry] of Object.entries(yearData)) {
              if (existingCardId !== cardId) nextYearData[existingCardId] = entry
            }
            nextDataByYear[yearNum] = nextYearData
          }

          return {
            creditCards: nextCards,
            creditCardDataByYear: nextDataByYear,
          }
        }),

      reset: () => set(() => ({ ...initialState, silverEnabled: initialState.silverEnabled })),
    }),
    {
      name: "portfolio-tracker",
      version: 2,
      migrate: (persistedState: unknown) => {
        const state = persistedState as Partial<PortfolioState> | undefined
        if (!state) return persistedState as PortfolioState

        const normalizedCards = (state.creditCards ?? []).map((card) => ({
          ...card,
          annualFeeType: card.annualFeeType === "paid" ? "paid" : "ltf",
          annualFeeAmount: Number(card.annualFeeAmount ?? 0),
          creditLimit: Number(card.creditLimit ?? 0),
          benefitsNote: String(card.benefitsNote ?? ""),
        }))

        return {
          ...state,
          creditCards: normalizedCards,
        } as PortfolioState
      },
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

