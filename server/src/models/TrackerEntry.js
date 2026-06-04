import mongoose from "mongoose"

// One document per logged entry. Range queries + server-side aggregation friendly.
const trackerEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    trackerKey: { type: String, required: true }, // e.g. "gym"
    date: { type: String, required: true }, // "YYYY-MM-DD"
    value: { type: mongoose.Schema.Types.Mixed, default: true }, // boolean for gym; number for counters
  },
  { timestamps: true },
)

trackerEntrySchema.index({ userId: 1, trackerKey: 1, date: 1 }, { unique: true })

export const TrackerEntry = mongoose.model("TrackerEntry", trackerEntrySchema)
