import mongoose from "mongoose"

// One document per visited city.
const visitedCitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cityId: { type: String, required: true }, // "gn:<geonameid>"
    name: { type: String, required: true },
    stateCode: { type: String, required: true }, // region code, e.g. "KA"
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { timestamps: true },
)

visitedCitySchema.index({ userId: 1, cityId: 1 }, { unique: true })
visitedCitySchema.index({ userId: 1, stateCode: 1 })

export const VisitedCity = mongoose.model("VisitedCity", visitedCitySchema)
