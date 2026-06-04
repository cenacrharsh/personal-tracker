import { Router } from "express"

import { Snapshot } from "../models/Snapshot.js"

const router = Router()

const FIELDS = ["date", "ts", "netWorth", "equity", "gold", "silver", "debt", "emergencyFund"]

function toClient(doc) {
  const out = {}
  for (const f of FIELDS) out[f] = doc[f]
  return out
}

// GET all snapshots, ascending by timestamp.
router.get("/", async (req, res) => {
  const docs = await Snapshot.find({ userId: req.userId }).sort({ ts: 1 })
  res.json(docs.map(toClient))
})

// POST upserts a snapshot by date.
router.post("/", async (req, res) => {
  const { date } = req.body ?? {}
  if (!date) return res.status(400).json({ error: "date is required" })

  const update = {}
  for (const f of FIELDS) if (f in req.body) update[f] = req.body[f]

  await Snapshot.findOneAndUpdate(
    { userId: req.userId, date },
    { $set: { ...update, userId: req.userId } },
    { upsert: true, setDefaultsOnInsert: true },
  )
  res.json({ ok: true })
})

export default router
