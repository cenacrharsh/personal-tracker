import type { BillsData, PortfolioData } from "./types"

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
  lifeInsurance: { enabled: true, coverAmount: 0, premium: 0, renewalDate: "2030-01-01" },
  healthInsurance: { enabled: true, coverAmount: 0, premium: 0, renewalDate: "2030-01-01" },
}

export const DEFAULT_BILLS: BillsData = {
  creditCards: {},
  insurance: {},
}
