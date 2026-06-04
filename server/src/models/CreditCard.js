import mongoose from "mongoose"

// One document per card per user (config only; monthly numbers live in CardMonthly).
const creditCardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cardId: { type: String, required: true }, // stable client-side id
    name: { type: String, required: true },
    anniversaryStartMonth: { type: Number, default: 1 },
    feeWaiverTarget: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "closed"], default: "active" },
    annualFeeType: { type: String, enum: ["ltf", "paid"], default: "ltf" },
    annualFeeAmount: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0 },
    benefitsNote: { type: String, default: "" },
  },
  { timestamps: true },
)

creditCardSchema.index({ userId: 1, cardId: 1 }, { unique: true })

export const CreditCard = mongoose.model("CreditCard", creditCardSchema)
