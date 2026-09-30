import { Router } from "express"

import { VitalsReport } from "../models/VitalsReport.js"
import { checkDateParam, validate, vitalsPutSchema } from "../validation.js"
import { mapToObj } from "../utils.js"

const router = Router()

function toClient(doc) {
  return { date: doc.date, lab: doc.lab, notes: doc.notes, results: mapToObj(doc.results) }
}

// GET all reports for the user, sorted by date ascending.
router.get("/", async (req, res) => {
  const docs = await VitalsReport.find({ userId: req.userId }).sort({ date: 1 })
  res.json(docs.map(toClient))
})

// PUT upserts a report by (userId, date) — atomic, no delete window.
router.put("/:date", checkDateParam, validate(vitalsPutSchema), async (req, res) => {
  const { lab = "", notes = "", results } = req.body
  const doc = await VitalsReport.findOneAndUpdate(
    { userId: req.userId, date: req.params.date },
    { $set: { lab, notes, results, userId: req.userId, date: req.params.date } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
  res.json(toClient(doc))
})

// DELETE a report by date. Safe to repeat: deleting a report that's already
// gone succeeds, so a retry after a lost response doesn't get stuck.
router.delete("/:date", async (req, res) => {
  await VitalsReport.deleteOne({ userId: req.userId, date: req.params.date })
  res.json({ ok: true })
})

export default router
