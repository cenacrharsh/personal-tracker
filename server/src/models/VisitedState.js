import mongoose from "mongoose"

// One document per state/UT the user marked as visited directly. States with
// visited cities count as visited too; that's derived on the client.
const visitedStateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    code: { type: String, required: true }, // region code, e.g. "KA"
  },
  { timestamps: true },
)

visitedStateSchema.index({ userId: 1, code: 1 }, { unique: true })

export const VisitedState = mongoose.model("VisitedState", visitedStateSchema)
