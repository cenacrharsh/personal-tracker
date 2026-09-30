import { Router } from "express"

import { VisitedState } from "../models/VisitedState.js"
import { VisitedCity } from "../models/VisitedCity.js"
import { cityIdPattern, regionCodePattern, travelCityPutSchema, validate } from "../validation.js"

const router = Router()

// Keeps a runaway client from filling the database.
const MAX_CITIES = 2000

function checkCode(req, res, next) {
  if (!regionCodePattern.test(req.params.code)) return res.status(400).json({ error: "invalid state code" })
  next()
}

function checkCityId(req, res, next) {
  if (!cityIdPattern.test(req.params.id)) return res.status(400).json({ error: "invalid city id" })
  next()
}

// GET returns directly marked states and all visited cities.
router.get("/", async (req, res) => {
  const [states, cities] = await Promise.all([
    VisitedState.find({ userId: req.userId }).sort({ code: 1 }),
    VisitedCity.find({ userId: req.userId }).sort({ name: 1 }),
  ])
  res.json({
    states: states.map((s) => s.code),
    cities: cities.map((c) => ({ id: c.cityId, name: c.name, stateCode: c.stateCode, lat: c.lat, lng: c.lng })),
  })
})

// PUT marks a state visited. Idempotent.
router.put("/states/:code", checkCode, async (req, res) => {
  await VisitedState.updateOne(
    { userId: req.userId, code: req.params.code },
    { $setOnInsert: { userId: req.userId, code: req.params.code } },
    { upsert: true },
  )
  res.json({ ok: true })
})

// DELETE unmarks a state and removes its cities, which would otherwise keep it
// visited. Cities go first: if the second step fails, the state is still
// marked and a retry finishes the job. Idempotent.
router.delete("/states/:code", checkCode, async (req, res) => {
  const { deletedCount } = await VisitedCity.deleteMany({ userId: req.userId, stateCode: req.params.code })
  await VisitedState.deleteOne({ userId: req.userId, code: req.params.code })
  res.json({ ok: true, removedCities: deletedCount })
})

// PUT adds a city, or updates it (e.g. a corrected state).
router.put("/cities/:id", checkCityId, validate(travelCityPutSchema), async (req, res) => {
  const filter = { userId: req.userId, cityId: req.params.id }
  const exists = await VisitedCity.exists(filter)
  if (!exists && (await VisitedCity.countDocuments({ userId: req.userId })) >= MAX_CITIES) {
    return res.status(400).json({ error: `at most ${MAX_CITIES} cities` })
  }
  await VisitedCity.updateOne(filter, { $set: req.body }, { upsert: true })
  res.json({ ok: true })
})

// DELETE removes a city. Idempotent.
router.delete("/cities/:id", checkCityId, async (req, res) => {
  await VisitedCity.deleteOne({ userId: req.userId, cityId: req.params.id })
  res.json({ ok: true })
})

export default router
