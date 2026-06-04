import mongoose from "mongoose"

// Defines a tracker and its characteristics. New tracker = new def, no schema change.
const trackerDefSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    key: { type: String, required: true }, // e.g. "gym"
    title: { type: String, default: "" },
    type: { type: String, default: "daily-boolean" }, // future: "counter", "duration", ...
    config: { type: mongoose.Schema.Types.Mixed, default: {} }, // e.g. { weeklyGoal: 3, color, icon }
  },
  { timestamps: true },
)

trackerDefSchema.index({ userId: 1, key: 1 }, { unique: true })

export const TrackerDef = mongoose.model("TrackerDef", trackerDefSchema)
