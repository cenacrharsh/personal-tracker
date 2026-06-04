import { Router } from "express"

import { TrackerEntry } from "../models/TrackerEntry.js"
import { TrackerDef } from "../models/TrackerDef.js"

const router = Router()

// Per-activity characteristics. Gym has a weekly goal; badminton is goal-free.
// Adding an activity later is just another entry here.
const ACTIVITY_DEFS = {
  gym: { title: "Gym", type: "daily-boolean", config: { weeklyGoal: 3 } },
  badminton: { title: "Badminton", type: "daily-boolean", config: {} },
}
const ACTIVITY_KEYS = Object.keys(ACTIVITY_DEFS)

// GET assembles { <key>: { entries: ["YYYY-MM-DD", ...] } } per tracker.
router.get("/", async (req, res) => {
  const entries = await TrackerEntry.find({ userId: req.userId }).sort({ date: 1 })
  const out = {}
  for (const e of entries) {
    if (!out[e.trackerKey]) out[e.trackerKey] = { entries: [] }
    out[e.trackerKey].entries.push(e.date)
  }
  // Ensure every known activity is present so the frontend has a stable shape.
  for (const key of ACTIVITY_KEYS) if (!out[key]) out[key] = { entries: [] }
  res.json(out)
})

// PUT replaces entries per tracker key with the posted arrays.
router.put("/", async (req, res) => {
  const body = req.body ?? {}

  for (const [key, tracker] of Object.entries(body)) {
    const dates = Array.isArray(tracker?.entries) ? tracker.entries : []
    const def = ACTIVITY_DEFS[key] ?? { title: key, type: "daily-boolean", config: {} }

    // Ensure a definition exists (holds characteristics like weekly goal).
    await TrackerDef.findOneAndUpdate(
      { userId: req.userId, key },
      { $setOnInsert: { userId: req.userId, key, ...def } },
      { upsert: true, setDefaultsOnInsert: true },
    )

    await TrackerEntry.deleteMany({ userId: req.userId, trackerKey: key })
    if (dates.length) {
      await TrackerEntry.insertMany(
        dates.map((date) => ({ userId: req.userId, trackerKey: key, date, value: true })),
      )
    }
  }

  res.json({ ok: true })
})

export default router
