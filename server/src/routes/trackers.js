import { Router } from "express"

import { TrackerEntry } from "../models/TrackerEntry.js"
import { checkDateParam, trackerKeyPattern } from "../validation.js"

const router = Router()

// GET assembles { <key>: { entries: ["YYYY-MM-DD", ...] } } per tracker.
// Trackers with no entries are simply absent.
router.get("/", async (req, res) => {
  const entries = await TrackerEntry.find({ userId: req.userId }).sort({ date: 1 })
  const out = {}
  for (const e of entries) {
    if (!out[e.trackerKey]) out[e.trackerKey] = { entries: [] }
    out[e.trackerKey].entries.push(e.date)
  }
  res.json(out)
})

function checkKey(req, res, next) {
  if (!trackerKeyPattern.test(req.params.key)) return res.status(400).json({ error: "invalid tracker key" })
  next()
}

// PUT marks one day for a tracker; DELETE unmarks it. Both are idempotent.
router.put("/:key/:date", checkKey, checkDateParam, async (req, res) => {
  const { key, date } = req.params
  await TrackerEntry.updateOne(
    { userId: req.userId, trackerKey: key, date },
    { $set: { value: true } },
    { upsert: true },
  )
  res.json({ ok: true })
})

router.delete("/:key/:date", checkKey, checkDateParam, async (req, res) => {
  const { key, date } = req.params
  await TrackerEntry.deleteOne({ userId: req.userId, trackerKey: key, date })
  res.json({ ok: true })
})

export default router
