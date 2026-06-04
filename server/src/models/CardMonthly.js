import mongoose from "mongoose"

// One document per (user, card, year). cashback/expenses are month(1-12) -> amount maps.
const cardMonthlySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cardId: { type: String, required: true },
    year: { type: Number, required: true },
    cashback: { type: Map, of: Number, default: {} },
    expenses: { type: Map, of: Number, default: {} },
  },
  { timestamps: true },
)

cardMonthlySchema.index({ userId: 1, cardId: 1, year: 1 }, { unique: true })

export const CardMonthly = mongoose.model("CardMonthly", cardMonthlySchema)
