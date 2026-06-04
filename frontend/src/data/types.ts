export type InsuranceDetails = {
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

export type ActivityKey = "gym" | "badminton"

export type ActivityTracker = {
  entries: string[] // sorted "YYYY-MM-DD" date strings
}

export type TrackersData = {
  gym: ActivityTracker
  badminton: ActivityTracker
}
