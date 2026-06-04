import mongoose from "mongoose"

// One document per (user, date) — net-worth time series.
const snapshotSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    ts: { type: Number, required: true },
    netWorth: { type: Number, default: 0 },
    equity: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    silver: { type: Number, default: 0 },
    debt: { type: Number, default: 0 },
    emergencyFund: { type: Number, default: 0 },
  },
  { timestamps: true },
)

snapshotSchema.index({ userId: 1, date: 1 }, { unique: true })

export const Snapshot = mongoose.model("Snapshot", snapshotSchema)
