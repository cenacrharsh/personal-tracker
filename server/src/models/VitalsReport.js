import mongoose from "mongoose"

// One document per (user, report date). Sparse metricKey -> value map.
const vitalsReportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    lab: { type: String, default: "" },
    notes: { type: String, default: "" },
    results: { type: Map, of: Number, default: {} },
  },
  { timestamps: true },
)

vitalsReportSchema.index({ userId: 1, date: 1 }, { unique: true })

export const VitalsReport = mongoose.model("VitalsReport", vitalsReportSchema)
