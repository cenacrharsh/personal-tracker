import type { BillsData, PortfolioData } from "./types"

export const DEFAULT_PORTFOLIO: PortfolioData = {
  age: 30,
  monthlyIncome: 100000,
  monthlyExpenses: 0,
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
  bondsAmount: 0,
  npsAmount: 0,
  currentEmergencyFund: 0,
  emergencyFdAmount: 0,
  emergencyRdAmount: 0,
  emergencyMonthsTarget: 6,
  lifeInsurance: { enabled: true, coverAmount: 0, premium: 0, renewalDate: "2030-01-01" },
  healthInsurance: { enabled: true, coverAmount: 0, premium: 0, renewalDate: "2030-01-01" },
}

export const DEFAULT_BILLS: BillsData = {
  creditCards: {},
  insurance: {},
}
