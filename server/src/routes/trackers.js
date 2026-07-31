import { Router } from "express"

import { TrackerEntry } from "../models/TrackerEntry.js"
import { TrackerDef } from "../models/TrackerDef.js"
import { trackersSchema, validate } from "../validation.js"

const router = Router()

// Per-activity characteristics. "good" trackers carry a weekly goal to hit,
// "bad" ones a weekly limit to stay under. Adding a tracker later is just
// another entry here plus a matching def in the frontend TrackersPage.
const ACTIVITY_DEFS = {
  gym: { title: "Gym", type: "daily-boolean", config: { polarity: "good", weeklyGoal: 3 } },
  badminton: { title: "Badminton", type: "daily-boolean", config: { polarity: "good" } },
  junk: { title: "Junk food", type: "daily-boolean", config: { polarity: "bad", weeklyLimit: 2 } },
  social: { title: "Social media", type: "daily-boolean", config: { polarity: "bad", weeklyLimit: 2 } },
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
// Upsert-then-prune so there is never a window where the old entries are
// gone and the new ones aren't written yet.
router.put("/", validate(trackersSchema), async (req, res) => {
  const body = req.body

  for (const [key, tracker] of Object.entries(body)) {
    const dates = tracker.entries ?? []
    const def = ACTIVITY_DEFS[key] ?? { title: key, type: "daily-boolean", config: {} }

    // Ensure a definition exists (holds characteristics like weekly goal).
    await TrackerDef.findOneAndUpdate(
      { userId: req.userId, key },
      { $setOnInsert: { userId: req.userId, key, ...def } },
      { upsert: true, setDefaultsOnInsert: true },
    )

    if (dates.length) {
      await TrackerEntry.bulkWrite(
        dates.map((date) => ({
          updateOne: {
            filter: { userId: req.userId, trackerKey: key, date },
            update: { $set: { value: true } },
            upsert: true,
          },
        })),
      )
    }
    await TrackerEntry.deleteMany({ userId: req.userId, trackerKey: key, date: { $nin: dates } })
  }

  res.json({ ok: true })
})

export default router
