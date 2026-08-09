import mongoose from "mongoose"

const insurance = {
  enabled: { type: Boolean, default: true },
  coverAmount: { type: Number, default: 0 },
  premium: { type: Number, default: 0 },
  renewalDate: { type: String, default: "2030-01-01" },
}

// One document per user holding current financial state.
const portfolioSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    age: { type: Number, default: 30 },
    monthlyIncome: { type: Number, default: 100000 },
    monthlyExpenses: { type: Number, default: 0 },
    silverEnabled: { type: Boolean, default: true },

    zerodhaTotal: { type: Number, default: 0 },
    zerodhaGoldEtf: { type: Number, default: 0 },
    zerodhaSilverEtf: { type: Number, default: 0 },

    mfTotal: { type: Number, default: 0 },
    mfGold: { type: Number, default: 0 },
    mfSilver: { type: Number, default: 0 },

    fdAmount: { type: Number, default: 0 },
    rdAmount: { type: Number, default: 0 },
    epfPpfAmount: { type: Number, default: 0 },
    bondsAmount: { type: Number, default: 0 },
    npsAmount: { type: Number, default: 0 },

    currentEmergencyFund: { type: Number, default: 0 },
    emergencyFdAmount: { type: Number, default: 0 },
    emergencyRdAmount: { type: Number, default: 0 },
    emergencyMonthsTarget: { type: Number, default: 6 },

    lifeInsurance: insurance,
    healthInsurance: insurance,
  },
  { timestamps: true },
)

export const Portfolio = mongoose.model("Portfolio", portfolioSchema)
