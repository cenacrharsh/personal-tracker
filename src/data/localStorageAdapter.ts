import type {
  BillsData,
  CreditCardConfig,
  CreditCardsData,
  PortfolioData,
  Snapshot,
} from "./types"
import type { PortfolioRepository } from "./repository"

const KEY_PORTFOLIO = "pt:portfolio"
const KEY_CARDS = "pt:cards"
const KEY_SNAPSHOTS = "pt:snapshots"
const KEY_BILLS = "pt:bills"
const LEGACY_KEY = "portfolio-tracker"
const MAX_SNAPSHOTS = 730

export const DEFAULT_BILLS: BillsData = {
  creditCards: {},
  insurance: {},
}

const DEFAULT_CREDIT_CARDS: CreditCardConfig[] = [
  { id: "sbi-cashback", name: "SBI Cashback", anniversaryStartMonth: 1, feeWaiverTarget: 200000, status: "active", annualFeeType: "paid", annualFeeAmount: 999, creditLimit: 0, benefitsNote: "5% cashback on online spends." },
  { id: "airtel-axis", name: "Airtel Axis", anniversaryStartMonth: 1, feeWaiverTarget: 200000, status: "closed", annualFeeType: "paid", annualFeeAmount: 500, creditLimit: 0, benefitsNote: "Great for Airtel, utilities and selected merchants." },
  { id: "phonepe-sbi", name: "SBI PhonePe", anniversaryStartMonth: 1, feeWaiverTarget: 50000, status: "active", annualFeeType: "paid", annualFeeAmount: 499, creditLimit: 0, benefitsNote: "Use for PhonePe-linked campaigns and reward offers." },
  { id: "kotak-platinum", name: "Kotak Platinum", anniversaryStartMonth: 1, feeWaiverTarget: 75000, status: "active", annualFeeType: "ltf", annualFeeAmount: 0, creditLimit: 0, benefitsNote: "Keep for backup and occasional offer-based transactions." },
  { id: "tata-neu-plus", name: "Tata Neu Plus", anniversaryStartMonth: 1, feeWaiverTarget: 200000, status: "closed", annualFeeType: "paid", annualFeeAmount: 499, creditLimit: 0, benefitsNote: "Closed card. Keep historical records for prior year tracking." },
  { id: "amazon-icici", name: "Amazon ICICI", anniversaryStartMonth: 1, feeWaiverTarget: 0, status: "active", annualFeeType: "ltf", annualFeeAmount: 0, creditLimit: 0, benefitsNote: "Best for Amazon purchases and partner offers." },
  { id: "hdfc-millenia", name: "HDFC Millenia", anniversaryStartMonth: 1, feeWaiverTarget: 100000, status: "active", annualFeeType: "paid", annualFeeAmount: 1000, creditLimit: 0, benefitsNote: "Use for merchant categories with accelerated points." },
  { id: "indusind-tiger", name: "IndusInd Tiger", anniversaryStartMonth: 1, feeWaiverTarget: 50000, status: "active", annualFeeType: "ltf", annualFeeAmount: 0, creditLimit: 0, benefitsNote: "Use for specific card offers and complimentary benefits." },
]

export const DEFAULT_PORTFOLIO: PortfolioData = {
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
  lifeInsurance: { coverAmount: 0, premium: 0, renewalDate: "2030-01-01" },
  healthInsurance: { coverAmount: 0, premium: 0, renewalDate: "2030-01-01" },
}

export const DEFAULT_CARDS: CreditCardsData = {
  creditCards: DEFAULT_CREDIT_CARDS,
  creditCardDataByYear: {},
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded or storage unavailable — ignore for now.
  }
}

function migrateLegacyIfNeeded(): void {
  const hasNew =
    localStorage.getItem(KEY_PORTFOLIO) !== null || localStorage.getItem(KEY_CARDS) !== null
  if (hasNew) return

  const legacyRaw = localStorage.getItem(LEGACY_KEY)
  if (!legacyRaw) return

  try {
    const parsed = JSON.parse(legacyRaw) as { state?: Record<string, unknown> }
    const s = parsed?.state ?? {}

    const portfolio: PortfolioData = {
      age: Number(s.age ?? DEFAULT_PORTFOLIO.age),
      monthlyIncome: Number(s.monthlyIncome ?? DEFAULT_PORTFOLIO.monthlyIncome),
      silverEnabled: Boolean(s.silverEnabled ?? DEFAULT_PORTFOLIO.silverEnabled),
      zerodhaTotal: Number(s.zerodhaTotal ?? 0),
      zerodhaGoldEtf: Number(s.zerodhaGoldEtf ?? 0),
      zerodhaSilverEtf: Number(s.zerodhaSilverEtf ?? 0),
      mfTotal: Number(s.mfTotal ?? 0),
      mfGold: Number(s.mfGold ?? 0),
      mfSilver: Number(s.mfSilver ?? 0),
      fdAmount: Number(s.fdAmount ?? 0),
      rdAmount: Number(s.rdAmount ?? 0),
      epfPpfAmount: Number(s.epfPpfAmount ?? 0),
      currentEmergencyFund: Number(s.currentEmergencyFund ?? 0),
      lifeInsurance: {
        ...DEFAULT_PORTFOLIO.lifeInsurance,
        ...(s.lifeInsurance as object | undefined),
      },
      healthInsurance: {
        ...DEFAULT_PORTFOLIO.healthInsurance,
        ...(s.healthInsurance as object | undefined),
      },
    }

    const cards: CreditCardsData = {
      creditCards: (s.creditCards as CreditCardConfig[] | undefined) ?? DEFAULT_CREDIT_CARDS,
      creditCardDataByYear:
        (s.creditCardDataByYear as Record<number, never> | undefined) ?? {},
    }

    writeJSON(KEY_PORTFOLIO, portfolio)
    writeJSON(KEY_CARDS, cards)
  } catch {
    // Bad legacy blob — leave defaults.
  }
}

export class LocalStorageAdapter implements PortfolioRepository {
  constructor() {
    if (typeof localStorage !== "undefined") {
      migrateLegacyIfNeeded()
    }
  }

  async getPortfolio(): Promise<PortfolioData | null> {
    return readJSON<PortfolioData>(KEY_PORTFOLIO)
  }

  async savePortfolio(data: PortfolioData): Promise<void> {
    writeJSON(KEY_PORTFOLIO, data)
  }

  async getCreditCards(): Promise<CreditCardsData | null> {
    return readJSON<CreditCardsData>(KEY_CARDS)
  }

  async saveCreditCards(data: CreditCardsData): Promise<void> {
    writeJSON(KEY_CARDS, data)
  }

  async listSnapshots(): Promise<Snapshot[]> {
    return readJSON<Snapshot[]>(KEY_SNAPSHOTS) ?? []
  }

  async upsertSnapshot(snapshot: Snapshot): Promise<void> {
    const existing = (await this.listSnapshots()).filter((s) => s.date !== snapshot.date)
    existing.push(snapshot)
    existing.sort((a, b) => a.ts - b.ts)
    const trimmed = existing.length > MAX_SNAPSHOTS ? existing.slice(-MAX_SNAPSHOTS) : existing
    writeJSON(KEY_SNAPSHOTS, trimmed)
  }

  async getBills(): Promise<BillsData | null> {
    return readJSON<BillsData>(KEY_BILLS)
  }

  async saveBills(data: BillsData): Promise<void> {
    writeJSON(KEY_BILLS, data)
  }

  async reset(): Promise<void> {
    localStorage.removeItem(KEY_PORTFOLIO)
    localStorage.removeItem(KEY_CARDS)
    localStorage.removeItem(KEY_SNAPSHOTS)
    localStorage.removeItem(KEY_BILLS)
  }
}
