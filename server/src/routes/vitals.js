import { Router } from "express"

import { VitalsReport } from "../models/VitalsReport.js"
import { validate, vitalsDateParam, vitalsPutSchema } from "../validation.js"

const router = Router()

// Mongoose Map fields are Map instances; JSON.stringify would turn them into {}.
const mapToObj = (m) => {
  if (!m) return {}
  if (m instanceof Map) return Object.fromEntries(m)
  if (typeof m.toObject === "function") return m.toObject()
  return m
}

function toClient(doc) {
  return { date: doc.date, lab: doc.lab, notes: doc.notes, results: mapToObj(doc.results) }
}

// GET all reports for the user, sorted by date ascending.
router.get("/", async (req, res) => {
  const docs = await VitalsReport.find({ userId: req.userId }).sort({ date: 1 })
  res.json(docs.map(toClient))
})

// PUT upserts a report by (userId, date) — atomic, no delete window.
router.put("/:date", (req, res, next) => {
  if (!vitalsDateParam.test(req.params.date)) return res.status(400).json({ error: "date must be YYYY-MM-DD" })
  next()
}, validate(vitalsPutSchema), async (req, res) => {
  const { lab = "", notes = "", results } = req.body
  const doc = await VitalsReport.findOneAndUpdate(
    { userId: req.userId, date: req.params.date },
    { $set: { lab, notes, results, userId: req.userId, date: req.params.date } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
  res.json(toClient(doc))
})

// DELETE a report by date; 404 if nothing matched.
router.delete("/:date", async (req, res) => {
  const result = await VitalsReport.deleteOne({ userId: req.userId, date: req.params.date })
  if (result.deletedCount === 0) return res.status(404).json({ error: "Report not found" })
  res.json({ ok: true })
})

export default router
