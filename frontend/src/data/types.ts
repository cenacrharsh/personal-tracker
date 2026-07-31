export type InsuranceDetails = {
  enabled: boolean
  coverAmount: number
  premium: number
  renewalDate: string
}

export type CreditCardConfig = {
  id: string
  name: string
  anniversaryStartMonth: number
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

export type PortfolioData = {
  age: number
  monthlyIncome: number
  silverEnabled: boolean

  zerodhaTotal: number
  zerodhaGoldEtf: number
  zerodhaSilverEtf: number

  mfTotal: number
  mfGold: number
  mfSilver: number

  fdAmount: number
  rdAmount: number
  epfPpfAmount: number

  currentEmergencyFund: number

  lifeInsurance: InsuranceDetails
  healthInsurance: InsuranceDetails
}

export type CreditCardsData = {
  creditCards: CreditCardConfig[]
  creditCardDataByYear: Record<number, CreditCardYearData>
}

export type Snapshot = {
  date: string
  ts: number
  netWorth: number
  equity: number
  gold: number
  silver: number
  debt: number
  emergencyFund: number
}

export type BillStatus = {
  paid: boolean
  paidAt?: number
}

export type BillsData = {
  // Credit card bills, key format: `${year}-${month}-${cardId}` (month is 1-12)
  creditCards: Record<string, BillStatus>
  // Insurance premiums, key format: `${year}-life` | `${year}-health`
  insurance: Record<string, BillStatus>
}

export type ActivityKey = string

export type ActivityTracker = {
  entries: string[] // sorted "YYYY-MM-DD" date strings
}

export type TrackersData = Record<ActivityKey, ActivityTracker>

export type VitalsReport = {
  date: string // "YYYY-MM-DD"
  lab: string
  notes: string
  results: Record<string, number> // metricKey -> value; absent key = not tested
}

export type MetricRange = { low?: number; high?: number } // at least one set

export type VitalPanel =
  | "sugar"
  | "lipid"
  | "cbc"
  | "vitamins"
  | "iron"
  | "kidney"
  | "electrolytes"
  | "liver"
  | "thyroid"

export type VitalMetricDef = {
  key: string // stable id, e.g. "fasting-glucose"
  label: string // "Blood Glucose (Fasting)"
  shortLabel?: string // for matrix column headers, e.g. "Glucose"
  unit: string // "mg/dL"
  range: MetricRange
  panel: VitalPanel
  core?: boolean // the 11 Notion metrics — always visible in the matrix
  decimals?: number // display precision, default 1
}
