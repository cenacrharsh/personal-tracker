import mongoose from "mongoose"

// One document per paid bill. `key` mirrors the client key format so mapping is lossless:
//   credit card:  `${year}-${month}-${cardId}`
//   insurance:    `${year}-${type}`  (type = "life" | "health")
const billPaymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ["card", "insurance"], required: true },
    key: { type: String, required: true },
    paid: { type: Boolean, default: true },
    paidAt: { type: Number },
  },
  { timestamps: true },
)

billPaymentSchema.index({ userId: 1, kind: 1, key: 1 }, { unique: true })

export const BillPayment = mongoose.model("BillPayment", billPaymentSchema)
